import * as core from '@actions/core'
import { latestTag } from './version'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const patchLabel: string = core.getInput('patch-label')
    const minorLabel: string = core.getInput('minor-label')
    const majorLabel: string = core.getInput('major-label')

    if (patchLabel === '' || minorLabel === '' || majorLabel === '') {
      throw Error("Empty bump labels aren't supported")
    }

    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.debug(
      `Using ${patchLabel}, ${minorLabel}, ${majorLabel} to determine SemVer bump ...`
    )

    const currVer = await latestTag()
    core.debug(`Current version: ${currVer}`)

    // TODO logic
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
