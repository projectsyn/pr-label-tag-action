import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { BumpLabels, bumpFromLabels } from './bump-labels'
import { inc } from 'semver'

export async function latestTag(): Promise<string> {
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
  const retval = await exec.exec('git', ['tag', '--sort=-v:refname'], options)
  if (retval !== 0) {
    throw Error(`Call to git failed:\n${stdout}\n${stderr}`)
  }
  const latest = stdout === '' ? 'v0.0.0' : stdout.split('\n')[0]
  return new Promise(resolve => {
    resolve(latest)
  })
}

export async function bumpVersion(b: BumpLabels): Promise<string> {
  const bump = await bumpFromLabels(b)
  const currVer = await latestTag()
  core.debug(`Current version: ${currVer}`)

  const newVer = inc(currVer, bump)
  if (!newVer) {
    throw new Error(
      `Unable to bump current version '${currVer}' to next ${bump} version`
    )
  }
  // we know newVer is a string here
  return new Promise(resolve => {
    resolve(`v${newVer}`)
  })
}
