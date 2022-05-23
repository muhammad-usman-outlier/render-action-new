import * as Core from '@actions/core'
import * as Github from '@actions/github'
import {GraphQLClient} from 'graphql-request'
import {getToken} from './constants'

import {getSdk} from './generated/sdk'
import {wait} from './wait'

const client = new GraphQLClient('https://api.render.com/graphql')
const sdk = getSdk(client)
const octokit = Github.getOctokit(getToken, {
  previews: ['flash', 'ant-man']
})

/*******************************************
 *** Functions
 ******************************************/
export async function logIn(email, password) {
  Core.info('Signing in...')

  const {signIn} = await sdk.SignIn({email, password})

  if (!signIn?.idToken) {
    throw new Error('Sign-in failed!')
  }
  client.setHeader('authorization', `Bearer ${signIn.idToken}`)
}

export async function findServer(
  {pr},
  serverId
) {
  if (pr) {
    Core.info('Running in Pull Request: Listing Pull Request Servers...')

    const number = pr.toString()
    const {pullRequestServers} = await sdk.PullRequestServers({serverId})
    const server = pullRequestServers?.find(
      s => s?.pullRequest.number === number
    )

    if (server && server.server) {
      return server.server.id
    }
    Core.info('No Pull Request Servers found. Using regular deployment')
  }

  return serverId
}

export function getContext() {
  const {eventName, payload} = Github.context
  switch (eventName) {
    case 'pull_request':
      const {
        pull_request: {number, head}
      } = payload
      return {pr: number, ...head}
    case 'push':
      return Github.context
    default:
      throw new Error(
        'Invalid event type! Only "pull_request" and "push" are supported. ❌'
      )
  }
}

export async function findDeploy(
  context,
  serverId,
  retries = 0
) {
  if (retries === 0) {
    Core.info(`Looking deployments for ${serverId}...`)
  }
  const {deploys} = await sdk.Deploys({serverId})
  const deploy = deploys?.find(
    d =>
      d.commitId === context.sha &&
      d.branch === context.ref.replace('refs/heads/', '')
  )
  if (deploy) return deploy
  const max_retries = ~~Core.getInput('retries')
  if (++retries < max_retries) {
    Core.info(`No deployments found. Retrying...(${retries}/${max_retries}) ⏱`)
    await wait(~~Core.getInput('wait'))
    return findDeploy(context, serverId, retries)
  } else {
    throw new Error(`No deployment found after ${retries} retries! ⚠️`)
  }
}

export async function getDeploy(id) {
  const {deploy} = await sdk.Deploy({id})
  if (!deploy) {
    throw new Error(`Deployment ${id} disappeared! ❌`)
  }
  return deploy
}

export async function waitForDeploy(deployment) {
  const {render} = deployment
  switch (render?.status) {
    case 1: // Running
      if (await updateDeployment(deployment, 'in_progress')) {
        Core.info(`Deployment still running... ⏱`)
      }
      await wait(~~Core.getInput('wait'))
      return waitForDeploy({
        ...deployment,
        render: await getDeploy(render.id)
      })
    case 2: // Live
    case 3: // Succeeded
      await wait(~~Core.getInput('sleep'))
      await updateDeployment(deployment, 'success')
      Core.info(`Deployment ${render.id} succeeded ✅`)
      return
    case 4: // Failed
      await updateDeployment(deployment, 'failure')

      throw new Error(
        `Deployment ${render.id} failed! ❌ (${getDeployUrl(render)})`
      )
    case 5: // Cancelled
      await updateDeployment(deployment, 'inactive')
      Core.info(`Deployment ${render.id} canceled ⏹`)
      return
  }
}

export async function createDeployment(
  context,
  {server}
) {
  Core.info(`Creating ${server.name} GitHub deployment`)
  const state = 'pending'
  const {data} = await octokit.repos.createDeployment({
    ...Github.context.repo,
    ref: context.ref,
    description: server.name,
    environment: `${context.pr ? 'Preview' : 'Production'} – ${server.name}`,
    production_environment: !context.pr,
    transient_environment: !!context.pr,
    auto_merge: false,
    required_contexts: [],
    state
  })
  return {...data, state}
}

export async function updateDeployment(
  {render, github},
  state
) {
  if (github.state !== state) {
    await octokit.repos.createDeploymentStatus({
      ...Github.context.repo,
      deployment_id: github.id,
      log_url: getDeployUrl(render),
      environment_url: render.server.url,
      description: state,
      state
    })
    github.state = state
    return true
  }
  return false
}

function getDeployUrl(deploy) {
  return `https://dashboard.render.com/web/${deploy.server.id}/deploys/${deploy.id}`
}