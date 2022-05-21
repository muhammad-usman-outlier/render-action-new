import {context, getOctokit} from '@actions/github'
import {getComment, getUrlFromComment} from './utils'
import {
  commentPattern,
  getToken,
  previewURLIndex,
  progressURLIndex,
  regexFlags,
  regexPattern
} from './constants'

async function fetchComments(
  issueNumber
) {
  try {
    const client = getOctokit(getToken)
    const {data: comments} = await client.issues.listComments({
      ...context.repo,
      issue_number: issueNumber
    })
    return comments
  } catch (error) {
    console.warn(`No issues found for id: ${issueNumber}`)
    return []
  }
}

export async function extractURLs() {
  const issueNumber = context.payload.pull_request?.number

  const settings = {
    pattern: commentPattern?.[0],
    preview_index: previewURLIndex,
    progress_index: progressURLIndex
  }
  const comments = await fetchComments(issueNumber)
  const comment = getComment({comments, pattern: settings.pattern})

  if (comment) {
    console.info('Comment found')
    const previewURL = getUrlFromComment(comment, {
      index: settings.preview_index
    })
    const progressURL = getUrlFromComment(comment, {
      index: settings.progress_index
    })
    const regex = new RegExp(regexPattern, regexFlags ?? '')
    const matches = progressURL?.match(regex)
    const serviceId = `srv-${matches[0]}`
    console.info('Extracted Preview URL', previewURL)
    console.info('Extracted Service ID', serviceId)
    return [serviceId, previewURL]
  }
  console.info('found_url', false)
}
