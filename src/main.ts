import * as core from '@actions/core'
import * as github from '@actions/github'
import { readBumpLabels, prBumpLabel } from './bump-labels'
import { triggerDispatch } from './dispatch'
import { bumpVersion, latestTag, createAndPushTag } from './version'
import { createOrUpdateComment } from './comment'

function formatCode(text: string): string {
  return `\`${text}\``
}

interface ReleaseComments {
  releaseComment: string
  releasedComment: string
  unmergedComment: string
}

function readCommentInputs(): ReleaseComments {
  return {
    releaseComment: core.getInput('release-comment'),
    releasedComment: core.getInput('released-comment'),
    unmergedComment: core.getInput('unmerged-comment')
  } as ReleaseComments
}

function formatComment(
  comment: string,
  nextVer: string,
  repoURL: string
): string {
  return comment
    .replaceAll('<next-version>', nextVer)
    .replaceAll('<repo-url>', repoURL)
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    if (!github.context.payload.pull_request) {
      core.setFailed(
        `Action is running for a '${github.context.eventName}' event. Only 'pull_request' events are supported`
      )
      return
    }

    const bumpLabels = readBumpLabels()
    const comments = readCommentInputs()

    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.debug(
      `Using ${bumpLabels.patch}, ${bumpLabels.minor}, ${bumpLabels.major} to determine SemVer bump ...`
    )

    // check if we need to do something
    const bumpAction = await prBumpLabel(bumpLabels)

    if (!bumpAction.bump) {
      // update comment if multiple labels found
      if (bumpAction.labels.length > 1) {
        const labels = bumpAction.labels.map(formatCode).join(', ')
        await createOrUpdateComment(
          `Found ${bumpAction.labels.length} bump labels (${labels}), ` +
            'please make sure you only add one bump label.\n\n🛠️ _Auto tagging disabled_'
        )
      }
      return
    }

    const label = bumpAction.labels[0]
    const currVer = await latestTag()
    const nextVer = bumpVersion(currVer, bumpAction.bump)
    core.debug(`Bumping ${currVer} to ${nextVer}`)

    const repoURL =
      `${github.context.serverUrl}/${github.context.repo.owner}` +
      `/${github.context.repo.repo}/releases/tag/${nextVer}`

    const triggers = core
      .getMultilineInput('trigger')
      .map(formatCode)
      .join(', ')

    const ghAction = github.context.payload.action
    const ghMerged = github.context.payload.pull_request['merged']
    if (ghAction === 'closed' && ghMerged === true) {
      // create and push tag
      await createAndPushTag(nextVer)
      // trigger follow-up actions, follow-up actions are given in input
      // `trigger`
      await triggerDispatch(nextVer)
      // update comment
      await createOrUpdateComment(
        `${formatComment(comments.releasedComment, nextVer, repoURL)}\n\n` +
          `${
            triggers.length > 0 ? `Triggering workflows ${triggers}\n\n` : ''
          }` +
          `🛠️ _Auto tagging enabled_ with label ${formatCode(label)}`
      )
    } else if (ghAction === 'closed') {
      await createOrUpdateComment(
        `${formatComment(comments.unmergedComment, nextVer, repoURL)}\n\n` +
          '🛠️ _Auto tagging disabled_'
      )
    } else {
      await createOrUpdateComment(
        `${formatComment(comments.releaseComment, nextVer, repoURL)}\n\n` +
          `${
            triggers.length > 0
              ? `Merging will trigger workflows ${triggers}\n\n`
              : ''
          }` +
          `🛠️ _Auto tagging enabled_ with label ${formatCode(label)}`
      )
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
