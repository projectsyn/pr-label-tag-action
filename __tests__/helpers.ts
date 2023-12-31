import * as github from '@actions/github'
import { expect } from '@jest/globals'

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

export function ghContextSetPRLabels(...labels: string[]): void {
  if (github.context.payload.pull_request) {
    github.context.payload.pull_request.labels = labels.map(l => {
      return { name: l }
    })
  } else {
    throw Error('Failed to set PR labels, expect test to fail')
  }
}

export function makeTagsOctokitMock(...tags: string[]): {
  mockFn: jest.Mock
} {
  return {
    mockFn: jest.fn((token: string) => {
      expect(token).toBe('mock-token')
      return {
        paginate: (
          func: (args: Record<string, any>) => any,
          args: Record<string, any>
        ) => func(args),
        rest: {
          repos: {
            listTags: async (args: {
              owner: string
              repo: string
            }): Promise<{ name: string }[]> => {
              expect(args.owner).toBe('projectsyn')
              expect(args.repo).toBe('pr-label-tag-action')
              return new Promise(resolve => {
                resolve(
                  tags.map(t => {
                    return { name: t }
                  })
                )
              })
            }
          }
        }
      }
    })
  }
}
