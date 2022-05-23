import * as Core from '@actions/core'
import * as Github from '@actions/github'
import { getDeploy, getDeploys } from './api'
import { getToken } from './constants'

import { wait } from './wait'

const octokit = Github.getOctokit(getToken, {
  previews: ['flash', 'ant-man'],
})

/*******************************************
 *** Functions
 ******************************************/
export function getContext() {
  const { eventName, payload } = Github.context
  switch (eventName) {
    case 'pull_request':
      const {
        pull_request: { number, head },
      } = payload
      return { pr: number, ...head }
    case 'push':
      return Github.context
    default:
      throw new Error(
        'Invalid event type! Only "pull_request" and "push" are supported. ❌'
      )
  }
}

export async function findDeploy(context, serviceId, retries = 0) {
  try {
    const { sha } = context
    if (retries === 0) {
      Core.info(`Looking deployments for ${serviceId}...`)
    }

    const deploys = await getDeploys(serviceId)
    const { deploy } = deploys?.find(
      ({
        deploy: {
          commit: { id },
        },
      }) => id === sha
    )

    Core.info(`Deployment Found for ${serviceId}...`)
    if (deploy) return deploy

    const max_retries = ~~Core.getInput('retries')
    if (++retries < max_retries) {
      Core.info(
        `No deployments found. Retrying...(${retries}/${max_retries}) ⏱`
      )
      await wait(~~Core.getInput('wait'))
      return findDeploy(context, serviceId, retries)
    } else {
      throw new Error(`No deployment found after ${retries} retries! ⚠️`)
    }
  } catch (error) {
    throw new Error(error)
  }
}

export async function getDeployInfo(serviceId, deployId) {
  const deploy = await getDeploy(serviceId, deployId)
  if (!deploy) {
    throw new Error(`Deployment ${id} disappeared! ❌`)
  }
  return deploy
}

export async function waitForDeploy(deployment, serviceId) {
  switch (deployment?.status) {
    case 'build_in_progress': // Running
      if (await updateDeployment(deployment, 'in_progress')) {
        Core.info(`Deployment still running... ⏱`)
      }
      await wait(~~Core.getInput('wait'))
      return waitForDeploy({
        ...deployment,
        render: await getDeployInfo(serviceId, deployment.id),
      })
    case 'live': // Live
      Core.info(`Deployment ${deployment.id} is Live ✅`)
      await updateDeployment(deployment, 'success')
    case 3: // Succeeded
      await wait(~~Core.getInput('sleep'))
      await updateDeployment(deployment, 'success')
      Core.info(`Deployment ${deployment.id} succeeded ✅`)
      return
    case 'build_failed': // Failed
      await updateDeployment(deployment, 'failure')

      throw new Error(
        `Deployment ${deployment.id} failed! ❌ (${getDeployUrl(deployment)})`
      )
    case 'deactivated': // Cancelled
      await updateDeployment(deployment, 'inactive')
      Core.info(`Deployment ${deployment.id} canceled ⏹`)
      return
  }
}

export async function updateDeployment({ render, github }, state) {
  if (github.state !== state) {
    await octokit.repos.createDeploymentStatus({
      ...Github.context.repo,
      deployment_id: github.id,
      log_url: getDeployUrl(render),
      environment_url: render.server.url,
      description: state,
      state,
    })
    github.state = state
    return true
  }
  return false
}

function getDeployUrl(deploy) {
  return `https://dashboard.render.com/web/${deploy.server.id}/deploys/${deploy.id}`
}
