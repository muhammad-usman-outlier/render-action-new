import * as Core from '@actions/core'

export const getToken = Core.getInput('token')
export const renderApiKey = Core.getInput('RENDER_API_KEY')

// RegEx Pattern for render Progress URL, [^!.] omits "." picked up from the url
export const regexPattern =
  /(?<=dashboard.render.com\/static\/srv-)[\s\S][^!.]*/
export const regexFlags = 'gim'
export const commentPattern = 'Follow its progress at'
export const previewURLIndex = 2
export const progressURLIndex = 3
