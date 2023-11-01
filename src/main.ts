import * as core from '@actions/core'
import { readBumpLabels } from './bump-labels'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const bumpLabels = readBumpLabels()

    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.debug(
      `Using ${bumpLabels.patch}, ${bumpLabels.minor}, ${bumpLabels.major} to determine SemVer bump ...`
    )

    // TODO logic
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
