import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as github from '@actions/github'
import { inc, ReleaseType } from 'semver'

async function execCaptured(
  command: string,
  args: string[]
): Promise<{ stdout: string; stderr: string; retval: number }> {
  let stdout = ''
  let stderr = ''
  const options: exec.ExecOptions = {}
  options.listeners = {
    stdout: (data: Buffer) => {
      stdout += data.toString()
    },
    stderr: (data: Buffer) => {
      stderr += data.toString()
    }
  }
  const retval = await exec.exec(command, args, options)
  return new Promise(resolve => {
    resolve({ stdout, stderr, retval })
  })
}

export async function latestTag(): Promise<string> {
  const result = await execCaptured('git', ['tag', '--sort=-v:refname'])
  if (result.retval !== 0) {
    throw Error(`Call to git failed:\n${result.stdout}\n${result.stderr}`)
  }
  const latest = result.stdout === '' ? 'v0.0.0' : result.stdout.split('\n')[0]
  return new Promise(resolve => {
    resolve(latest)
  })
}

export function bumpVersion(currVer: string, bump: ReleaseType): string {
  core.debug(`Current version: ${currVer}`)

  const newVer = inc(currVer, bump)
  if (!newVer) {
    throw new Error(
      `Unable to bump current version '${currVer}' to next ${bump} version`
    )
  }
  // we know newVer is a string here
  return `v${newVer}`
}

export async function createAndPushTag(tag: string): Promise<void> {
  const tagres = await execCaptured('git', ['tag', tag])
  if (tagres.retval !== 0) {
    throw Error(`Creating tag failed:\n${tagres.stdout}\n${tagres.stderr}`)
  }

  const pushres = await execCaptured('git', ['push', 'origin', tag])
  if (pushres.retval !== 0) {
    throw Error(`Pushing tag failed:\n${pushres.stdout}\n${pushres.stderr}`)
  }

  return new Promise(resolve => {
    resolve()
  })
}

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
