import * as core from '@actions/core'
import * as exec from '@actions/exec'
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
