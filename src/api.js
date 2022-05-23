const sdk = require('api')('@render-api/v1.0#54d5p1kl39a18af')
import { renderApiKey } from './constants'

sdk.auth(renderApiKey)

export { getDeploys, getDeploy }

async function getDeploys(serviceId) {
  try {
    return await sdk['get-deploys']({ limit: '10', serviceId })
  } catch (error) {
    throw new Error(error)
  }
}

async function getDeploy(serviceId, deployId) {
  try {
    return await sdk['get-deploy']({
      serviceId,
      deployId,
    })
  } catch (error) {
    throw new Error(error)
  }
}
