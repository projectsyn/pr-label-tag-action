import * as core from '@actions/core'
import * as github from '@actions/github'

export interface GHComment {
  id: number
  body?: string
  user: {
    login: string
  } | null
  created_at: string
}

export async function createOrUpdateComment(
  body: string,
  updateOnly?: boolean
): Promise<void> {
  if (!github.context.payload.pull_request) {
    throw new Error(
      `Action is running on a '${github.context.eventName}' event, only 'pull_request' events are supported`
    )
  }
  const token = core.getInput('github-token')
  const client = github.getOctokit(token)
  const prNum = github.context.payload.pull_request.number

  const allComments = await client.paginate(client.rest.issues.listComments, {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: prNum
  })
  const comments = allComments.filter(
    (comment: GHComment) =>
      comment.user &&
      comment.user.login === 'github-actions[bot]' &&
      comment.body &&
      comment.body.includes('🛠️ _Auto tagging ')
  )

  if (comments.length > 0) {
    if (comments.length > 1) {
      core.warning(
        'Multiple potential comments owned by this action found, editing oldest'
      )
    }
    // update comment
    await client.rest.issues.updateComment({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: prNum,
      comment_id: comments[0].id,
      body
    })
  } else if (!updateOnly) {
    // new comment
    client.rest.issues.createComment({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: prNum,
      body
    })
  } else {
    core.debug('No comment exists, and updateOnly=true, do nothing')
  }
}
