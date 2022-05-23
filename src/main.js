import * as Core from '@actions/core'
import { extractURLs } from './fetcher'
import { findDeploy, getContext, waitForDeploy } from './render'

async function run() {
  try {
    const [serviceId, preview] = await extractURLs()
    Core.info('Starting Render Wait Action')
    const context = getContext()
    const render = await findDeploy(context, serviceId)
    await waitForDeploy(render, serviceId)
    Core.setOutput('preview-url', preview)
  } catch (error) {
    Core.setFailed(error.message)
  }
}

run()
