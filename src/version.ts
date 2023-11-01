import * as exec from '@actions/exec'

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
