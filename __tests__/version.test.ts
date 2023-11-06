/**
 * Unit tests for the action's version parsing and bumping, src/version.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as github from '@actions/github'
import * as version from '../src/version'

import { makeTagsOctokitMock, populateGitHubContext } from './helpers'

// Mock the GitHub Actions core library
const inputMock = jest.spyOn(core, 'getInput')
const getOctokitMock = jest.spyOn(github, 'getOctokit')

describe('latestTag', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    populateGitHubContext()
    inputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'github-token':
          return 'mock-token'
        default:
          return ''
      }
    })
  })

  it('parses the latest version', async () => {
    const clientMock = makeTagsOctokitMock(
      'v1.1.0',
      'v1.2.3',
      'v1.1.1',
      'v1.2.0',
      'v1.2.1',
      'v1.0.0',
      'v1.2.2'
    )
    getOctokitMock.mockImplementation(clientMock.mockFn)

    // latest tag should be v1.2.3
    await expect(version.latestTag()).resolves.toBe('v1.2.3')
  })

  it('ignores non-semver tags', async () => {
    const clientMock = makeTagsOctokitMock(
      'v1.1.0',
      'v1.2.3',
      'v1.1.1',
      'v1.2.0',
      'v1.2.1',
      'v1.0.0',
      'v1.2.2',
      'foo-v1.0.0',
      'bar',
      'v1'
    )
    getOctokitMock.mockImplementation(clientMock.mockFn)

    // latest tag should be v1.2.3
    await expect(version.latestTag()).resolves.toBe('v1.2.3')
  })

  it('returns v0.0.0 for no tags', async () => {
    const clientMock = makeTagsOctokitMock()
    getOctokitMock.mockImplementation(clientMock.mockFn)

    await expect(version.latestTag()).resolves.toBe('v0.0.0')
  })
})

describe('bumpVersion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    populateGitHubContext()
  })

  it('bumps to next patch version', async () => {
    expect(version.bumpVersion('v1.2.3', 'patch')).toBe('v1.2.4')
  })

  it('bumps to next minor version', async () => {
    expect(version.bumpVersion('v1.2.3', 'minor')).toBe('v1.3.0')
  })

  it('bumps to next major version', async () => {
    expect(version.bumpVersion('v1.2.3', 'major')).toBe('v2.0.0')
  })

  it('bumps to next patch version for v0', async () => {
    expect(version.bumpVersion('v0.1.2', 'patch')).toBe('v0.1.3')
  })

  it('bumps to next minor version for v0', async () => {
    expect(version.bumpVersion('v0.1.2', 'minor')).toBe('v0.2.0')
  })

  it('bumps to next major version for v0', async () => {
    expect(version.bumpVersion('v0.1.2', 'major')).toBe('v1.0.0')
  })

  it("raises an error when version can't be bumped", async () => {
    expect(() => {
      version.bumpVersion('foo', 'patch')
    }).toThrow(
      new Error("Unable to bump current version 'foo' to next patch version")
    )
  })
})

function makeCreateRefOctokitMock(): {
  mockFn: jest.Mock
  createRefFn: jest.Mock
} {
  const createRefFn = jest.fn(
    async (args: {
      owner: string
      repo: string
      ref: string
      sha: string
    }): Promise<void> => {
      expect(args.owner).toBe('projectsyn')
      expect(args.repo).toBe('pr-label-tag-action')
      return new Promise(resolve => {
        resolve()
      })
    }
  )
  return {
    createRefFn,
    mockFn: jest.fn((token: string): any => {
      expect(token).toBe('mock-token')
      return {
        rest: {
          git: {
            createRef: createRefFn
          }
        }
      }
    })
  }
}

describe('createAndPushTag', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    populateGitHubContext()
    inputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'github-token':
          return 'mock-token'
        default:
          return ''
      }
    })
  })

  it('creates and pushes tag', async () => {
    const clientMock = makeCreateRefOctokitMock()
    getOctokitMock.mockImplementation(clientMock.mockFn)
    // echo -n mock | sha1sum
    const mockSHA = '475e81e79c7880f9b5caa35bec50279c459ad2f9'
    if (github.context.payload.pull_request) {
      github.context.payload.pull_request.merged = true
      github.context.payload.pull_request.merge_commit_sha = mockSHA
    } else {
      throw Error('PR context not set, test probably fails')
    }

    await version.createAndPushTag('v1.2.4')
    expect(clientMock.createRefFn).toHaveBeenCalledTimes(1)
    expect(clientMock.createRefFn).toHaveBeenNthCalledWith(1, {
      owner: 'projectsyn',
      repo: 'pr-label-tag-action',
      ref: 'refs/tags/v1.2.4',
      sha: mockSHA
    })
  })

  it('throws an error running on a non-PR event', async () => {
    github.context.eventName = 'discussion'
    delete github.context.payload.pull_request
    await expect(async () => {
      await version.createAndPushTag('v1.2.4')
    }).rejects.toThrow(
      new Error(
        "Action is running for a 'discussion' event. Only 'pull_request' events are supported"
      )
    )
  })

  it('throws an error running on an unmerged PR', async () => {
    // echo -n mock | sha1sum
    const mockSHA = '475e81e79c7880f9b5caa35bec50279c459ad2f9'
    if (github.context.payload.pull_request) {
      github.context.payload.pull_request.merged = false
      github.context.payload.pull_request.merge_commit_sha = mockSHA
    }
    await expect(async () => {
      await version.createAndPushTag('v1.2.4')
    }).rejects.toThrow(
      new Error("Creating tag for unmerged PRs isn't supported")
    )
  })

  it('throws an error if no merge_commit_sha is present in the context', async () => {
    // echo -n mock | sha1sum
    if (github.context.payload.pull_request) {
      github.context.payload.pull_request.merged = true
    }
    await expect(async () => {
      await version.createAndPushTag('v1.2.4')
    }).rejects.toThrow(
      new Error("Creating tag for unmerged PRs isn't supported")
    )
  })
})
