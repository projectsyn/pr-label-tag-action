import * as core from '@actions/core'
import * as github from '@actions/github'

export async function triggerDispatch(tag: string): Promise<void> {
  const token = core.getInput('github-token')
  const client = github.getOctokit(token)
  const names = core.getMultilineInput('trigger')

  const { data: workflows } = await client.rest.actions.listRepoWorkflows({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo
  })

  for (const name of names) {
    core.debug(`Triggering workflow ${name}`)
    const wfs = workflows.workflows.filter(wf => wf.name === name)
    if (wfs.length > 1) {
      core.debug(`Multiple workflows with name ${name}, triggering all of them`)
    }
    if (wfs.length === 0) {
      core.warning(`No workflow with name ${name} found, skipping`)
    }
    for (const wf of wfs) {
      core.info(
        `Triggering workflow ${name} (${wf.id}). ` +
          "If the workflow doesn't run, please make sure that it's configured with the `workflow_dispatch` event"
      )
      // only returns 204 according to the docs -- we'd have to query the
      // actual target workflow to check if a run has been triggered.
      await client.rest.actions.createWorkflowDispatch({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        workflow_id: wf.id,
        ref: `refs/tags/${tag}`
      })
    }
  }

  return new Promise(resolve => {
    resolve()
  })
}
