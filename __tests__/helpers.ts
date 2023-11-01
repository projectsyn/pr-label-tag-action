import * as exec from '@actions/exec'
import * as github from '@actions/github'
import { expect } from '@jest/globals'

export function makeGitExecMock(
  stdout: string
): (
  commandLine: string,
  args?: string[] | undefined,
  options?: exec.ExecOptions | undefined
) => Promise<number> {
  return async (
    commandLine: string,
    args?: string[] | undefined,
    options?: exec.ExecOptions | undefined
  ): Promise<number> => {
    expect(commandLine).toBe('git')
    expect(args).toStrictEqual(['tag', '--sort=-v:refname'])
    expect(options).toBeDefined()
    expect(options).not.toBeNull()
    if (options) {
      expect(options.listeners).toBeDefined()
      expect(options.listeners).not.toBeNull()
      if (options.listeners) {
        expect(options.listeners.stdout).toBeDefined()
        expect(options.listeners.stdout).not.toBeNull()
        expect(options.listeners.stderr).toBeDefined()
        expect(options.listeners.stderr).not.toBeNull()
        if (options.listeners.stdout) {
          options.listeners.stdout(Buffer.from(stdout))
        }
        if (options.listeners.stderr) {
          options.listeners.stderr(Buffer.from(''))
        }
      }
    }
    return new Promise(resolve => {
      resolve(0)
    })
  }
}

export function makeOctokitMock(
  ...bumpLabel: string[]
): (token: string) => any {
  const labels = [{ name: 'dependency' }]
  if (bumpLabel !== undefined) {
    labels.push(
      ...bumpLabel.map((l: string) => {
        return { name: l }
      })
    )
  }
  return (token: string): any => {
    expect(token).toBe('mock-token')
    return {
      rest: {
        pulls: {
          get: async (req: any) => {
            expect(req.owner).toBe('projectsyn')
            expect(req.repo).toBe('pr-label-tag-action')
            expect(req.pull_number).toBe(123)
            return new Promise(resolve => {
              resolve({
                data: {
                  labels
                }
              })
            })
          }
        }
      }
    }
  }
}

export function populateGitHubContext(): void {
  process.env['GITHUB_REPOSITORY'] = 'projectsyn/pr-label-tag-action'
  github.context.eventName = 'pull_request'
  github.context.ref = 'refs/pull/123/merge'
  github.context.workflow = 'Mock workflow'
  github.context.action = 'mock-action-1'
  github.context.actor = 'vshn-renovate'
  github.context.payload = {
    action: 'synchronize',
    number: 123,
    pull_request: {
      number: 123,
      title: 'Mock PR',
      user: {
        login: 'vshn-renovate'
      }
    }
  }
  github.context.issue.owner = 'projectsyn'
  github.context.issue.repo = 'pr-label-tag-action'
  github.context.issue.number = 123
  github.context.sha = ''
}
