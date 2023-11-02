import * as core from '@actions/core'
import * as github from '@actions/github'
import { readBumpLabels, prBumpLabel } from './bump-labels'
import { bumpVersion, latestTag } from './version'
import { createOrUpdateComment } from './comment'

function formatCode(text: string): string {
  return `\`${text}\``
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

    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.debug(
      `Using ${bumpLabels.patch}, ${bumpLabels.minor}, ${bumpLabels.major} to determine SemVer bump ...`
    )

    // check if we need to do something
    const bumpAction = await prBumpLabel(bumpLabels)

    if (!bumpAction.bump) {
      // update comment if multiple labels found
      if (bumpAction.labels.length > 1) {
        await createOrUpdateComment(
          `Found ${bumpAction.labels.length} bump labels, ` +
            'please make sure you only add one bump label.\n\n🛠️ _Auto release disabled_'
        )
      }
      return
    }

    const label = bumpAction.labels[0]
    const currVer = await latestTag()
    const nextVer = bumpVersion(currVer, bumpAction.bump)
    core.debug(`Bumping ${currVer} to ${nextVer}`)

    const ghAction = github.context.payload.action
    const ghMerged = github.context.payload.pull_request['merged']
    if (ghAction === 'closed' && ghMerged === true) {
      // TODO: create tag
      // TODO: trigger follow-up actions
      // update comment
      const repoURL =
        `${github.context.serverUrl}/${github.context.repo.owner}` +
        `/${github.context.repo.repo}/releases/tag/${nextVer}`
      await createOrUpdateComment(
        `🚀 This PR has been released as [${formatCode(
          nextVer
        )}](${repoURL})\n\n` +
          `🛠️ _Auto release enabled_ with label ${formatCode(label)}`
      )
    } else if (ghAction === 'closed') {
      await createOrUpdateComment(
        '🚀 This PR has been closed unmerged. No new release will be created for these changes\n\n' +
          '🛠️ _Auto release disabled_'
      )
    } else {
      await createOrUpdateComment(
        `🚀 Merging this PR will release ${formatCode(nextVer)}\n\n` +
          `🛠️ _Auto release enabled_ with label ${formatCode(label)}`
      )
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
