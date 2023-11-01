/**
 * Unit tests for the action's bump label parsing and matching,
 * src/bump-labels.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as github from '@actions/github'
import * as bump_labels from '../src/bump-labels'
import { ReleaseType } from 'semver'
import { expect } from '@jest/globals'

// Mock the GitHub Actions core library
const getInputMock = jest.spyOn(core, 'getInput')
const infoMock = jest.spyOn(core, 'info')
const warningMock = jest.spyOn(core, 'warning')
const getOctokitMock = jest.spyOn(github, 'getOctokit')

describe('readBumpLabels', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('reads labels', async () => {
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'patch-label':
          return 'patch'
        case 'minor-label':
          return 'bump:minor'
        case 'major-label':
          return 'bump:major'
        default:
          return ''
      }
    })

    const bumpLabels = bump_labels.readBumpLabels()
    expect(bumpLabels).toStrictEqual({
      patch: 'patch',
      minor: 'bump:minor',
      major: 'bump:major'
    } as bump_labels.BumpLabels)
  })

  it('throws error when a bump label input is empty', async () => {
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'patch-label':
          return 'patch'
        case 'minor-label':
          return 'bump:minor'
        default:
          return ''
      }
    })

    expect(bump_labels.readBumpLabels).toThrow(
      new Error("Empty bump labels aren't supported")
    )
  })
})

describe('bumpFromLabels', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // set context for tests
    // @ts-ignore
    github.context = {
      event_name: 'pull_request',
      ref: 'refs/pull/123/merge',
      workflow: 'Mock workflow',
      action: 'mock-action-1',
      actor: 'vshn-renovate',
      repo: {
        owner: 'projectsyn',
        repo: 'pr-label-tag-action'
      },
      payload: {
        action: 'synchronize',
        number: 123,
        pull_request: {
          number: 123,
          title: 'Mock PR',
          user: {
            login: 'vshn-renovate'
          }
        }
      },
      issue: {
        owner: 'projectsyn',
        repo: 'pr-label-tag-action',
        number: 123
      },
      sha: ''
    }
  })

  it('raises an error on non-PR events', async () => {
    const bumpLabels = {
      patch: 'bump:patch',
      minor: 'bump:minor',
      major: 'bump:major'
    } as bump_labels.BumpLabels

    github.context.eventName = 'discussion'
    delete github.context.payload.pull_request

    expect(async () => {
      await bump_labels.bumpFromLabels(bumpLabels)
    }).rejects.toThrow(
      new Error(
        "Action is running on a 'discussion' event, only 'pull_request' events are supported"
      )
    )
  })

  it('identifies bump:patch label', async () => {
    const bumpLabels = {
      patch: 'bump:patch',
      minor: 'bump:minor',
      major: 'bump:major'
    } as bump_labels.BumpLabels

    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'github-token':
          return 'mock-token'
        default:
          return ''
      }
    })
    getOctokitMock.mockImplementation((token: string): any => {
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
                    labels: [{ name: 'bump:patch' }, { name: 'dependency' }]
                  }
                })
              })
            }
          }
        }
      }
    })

    expect(bump_labels.bumpFromLabels(bumpLabels)).resolves.toBe(
      'patch' as ReleaseType
    )
  })

  it('identifies bump:minor label', async () => {
    const bumpLabels = {
      patch: 'bump:patch',
      minor: 'bump:minor',
      major: 'bump:major'
    } as bump_labels.BumpLabels

    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'github-token':
          return 'mock-token'
        default:
          return ''
      }
    })
    getOctokitMock.mockImplementation((token: string): any => {
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
                    labels: [{ name: 'bump:minor' }, { name: 'dependency' }]
                  }
                })
              })
            }
          }
        }
      }
    })

    expect(bump_labels.bumpFromLabels(bumpLabels)).resolves.toBe(
      'minor' as ReleaseType
    )
  })

  it('identifies bump:major label', async () => {
    const bumpLabels = {
      patch: 'bump:patch',
      minor: 'bump:minor',
      major: 'bump:major'
    } as bump_labels.BumpLabels

    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'github-token':
          return 'mock-token'
        default:
          return ''
      }
    })
    getOctokitMock.mockImplementation((token: string): any => {
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
                    labels: [{ name: 'bump:major' }, { name: 'dependency' }]
                  }
                })
              })
            }
          }
        }
      }
    })

    expect(bump_labels.bumpFromLabels(bumpLabels)).resolves.toBe(
      'major' as ReleaseType
    )
  })

  it('logs a message when no bump labels are present', async () => {
    const bumpLabels = {
      patch: 'bump:patch',
      minor: 'bump:minor',
      major: 'bump:major'
    } as bump_labels.BumpLabels

    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'github-token':
          return 'mock-token'
        default:
          return ''
      }
    })
    getOctokitMock.mockImplementation((token: string): any => {
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
                    labels: [{ name: 'dependency' }]
                  }
                })
              })
            }
          }
        }
      }
    })

    await expect(async () => {
      await bump_labels.bumpFromLabels(bumpLabels)
    }).rejects.toThrow(new Error('Unknown version bump null'))

    expect(infoMock).toHaveBeenNthCalledWith(1, 'No bump labels found')
  })

  it('logs a warning when multiple bump labels are present', async () => {
    const bumpLabels = {
      patch: 'bump:patch',
      minor: 'bump:minor',
      major: 'bump:major'
    } as bump_labels.BumpLabels

    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'github-token':
          return 'mock-token'
        default:
          return ''
      }
    })
    getOctokitMock.mockImplementation((token: string): any => {
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
                    labels: [
                      { name: 'dependency' },
                      { name: 'bump:patch' },
                      { name: 'bump:minor' }
                    ]
                  }
                })
              })
            }
          }
        }
      }
    })

    await expect(bump_labels.bumpFromLabels(bumpLabels)).rejects.toThrow(
      new Error('Unknown version bump null')
    )

    expect(warningMock).toHaveBeenNthCalledWith(
      1,
      'Multiple bump labels found: ["bump:patch","bump:minor"]'
    )
  })
})
