/**
 * Unit tests for the action's version parsing and bumping, src/version.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as github from '@actions/github'
import * as bump_labels from '../src/bump-labels'
import * as version from '../src/version'
import { makeGitExecMock, makeOctokitMock } from './helpers'

// Mock the GitHub Actions core library
const execMock = jest.spyOn(exec, 'exec')
const getInputMock = jest.spyOn(core, 'getInput')
const getOctokitMock = jest.spyOn(github, 'getOctokit')

describe('latestTag', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('parses the latest version', async () => {
    // Mock `git tag --sort=-v:refname`
    execMock.mockImplementation(
      makeGitExecMock('v1.2.3\nv1.2.2\nv1.2.1\nv1.2.0\nv1.1.0\nv1.0.0')
    )

    // latest tag should be v1.2.3
    await expect(version.latestTag()).resolves.toBe('v1.2.3')
  })

  it('raises an error on git exec errors', async () => {
    // Mock `git tag --sort=-v:refname`
    execMock.mockImplementation(async (commandLine, args?, options?) => {
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
            options.listeners.stdout(Buffer.from(''))
          }
          if (options.listeners.stderr) {
            options.listeners.stderr(Buffer.from('dummy error'))
          }
        }
      }
      return new Promise(resolve => {
        resolve(1)
      })
    })

    await expect(version.latestTag).rejects.toThrow(
      new Error('Call to git failed:\n\ndummy error')
    )
  })

  it('returns v0.0.0 for no tags', async () => {
    // Mock `git tag --sort=-v:refname`
    execMock.mockImplementation(makeGitExecMock(''))

    await expect(version.latestTag()).resolves.toBe('v0.0.0')
  })
})

describe('bumpVersion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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

  it('bumps to next patch version', async () => {
    const bumpLabels = {
      patch: 'bump:patch',
      minor: 'bump:minor',
      major: 'bump:major'
    } as bump_labels.BumpLabels

    // Mock `git tag --sort=-v:refname`
    execMock.mockImplementation(
      makeGitExecMock('v1.2.3\nv1.2.2\nv1.2.1\nv1.2.0\nv1.1.0\nv1.0.0')
    )

    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'github-token':
          return 'mock-token'
        default:
          return ''
      }
    })
    getOctokitMock.mockImplementation(makeOctokitMock('bump:patch'))

    const newVer = await version.bumpVersion(bumpLabels)
    expect(newVer).toBe('v1.2.4')
  })

  it('bumps to next minor version', async () => {
    const bumpLabels = {
      patch: 'bump:patch',
      minor: 'bump:minor',
      major: 'bump:major'
    } as bump_labels.BumpLabels

    // Mock `git tag --sort=-v:refname`
    execMock.mockImplementation(
      makeGitExecMock('v1.2.3\nv1.2.2\nv1.2.1\nv1.2.0\nv1.1.0\nv1.0.0')
    )
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'github-token':
          return 'mock-token'
        default:
          return ''
      }
    })
    getOctokitMock.mockImplementation(makeOctokitMock('bump:minor'))

    const newVer = await version.bumpVersion(bumpLabels)
    expect(newVer).toBe('v1.3.0')
  })

  it('bumps to next major version', async () => {
    const bumpLabels = {
      patch: 'bump:patch',
      minor: 'bump:minor',
      major: 'bump:major'
    } as bump_labels.BumpLabels

    // Mock `git tag --sort=-v:refname`
    execMock.mockImplementation(
      makeGitExecMock('v1.2.3\nv1.2.2\nv1.2.1\nv1.2.0\nv1.1.0\nv1.0.0')
    )
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'github-token':
          return 'mock-token'
        default:
          return ''
      }
    })
    getOctokitMock.mockImplementation(makeOctokitMock('bump:major'))

    const newVer = await version.bumpVersion(bumpLabels)
    expect(newVer).toBe('v2.0.0')
  })

  it('bumps to next patch version for v0', async () => {
    const bumpLabels = {
      patch: 'bump:patch',
      minor: 'bump:minor',
      major: 'bump:major'
    } as bump_labels.BumpLabels

    // Mock `git tag --sort=-v:refname`
    execMock.mockImplementation(
      makeGitExecMock('v0.1.2\nv0.1.1\nv0.1.0\nv0.0.1')
    )
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'github-token':
          return 'mock-token'
        default:
          return ''
      }
    })
    getOctokitMock.mockImplementation(makeOctokitMock('bump:patch'))

    const newVer = await version.bumpVersion(bumpLabels)
    expect(newVer).toBe('v0.1.3')
  })

  it('bumps to next minor version for v0', async () => {
    const bumpLabels = {
      patch: 'bump:patch',
      minor: 'bump:minor',
      major: 'bump:major'
    } as bump_labels.BumpLabels

    // Mock `git tag --sort=-v:refname`
    execMock.mockImplementation(
      makeGitExecMock('v0.1.2\nv0.1.1\nv0.1.0\nv0.0.1')
    )
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'github-token':
          return 'mock-token'
        default:
          return ''
      }
    })
    getOctokitMock.mockImplementation(makeOctokitMock('bump:minor'))

    const newVer = await version.bumpVersion(bumpLabels)
    expect(newVer).toBe('v0.2.0')
  })

  it('bumps to next major version for v0', async () => {
    const bumpLabels = {
      patch: 'bump:patch',
      minor: 'bump:minor',
      major: 'bump:major'
    } as bump_labels.BumpLabels

    // Mock `git tag --sort=-v:refname`
    execMock.mockImplementation(
      makeGitExecMock('v0.1.2\nv0.1.1\nv0.1.0\nv0.0.1')
    )
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'github-token':
          return 'mock-token'
        default:
          return ''
      }
    })
    getOctokitMock.mockImplementation(makeOctokitMock('bump:major'))

    const newVer = await version.bumpVersion(bumpLabels)
    expect(newVer).toBe('v1.0.0')
  })

  it("raises an error when version can't be bumped", async () => {
    const bumpLabels = {
      patch: 'bump:patch',
      minor: 'bump:minor',
      major: 'bump:major'
    } as bump_labels.BumpLabels

    // Mock `git tag --sort=-v:refname`
    execMock.mockImplementation(makeGitExecMock('foo\nbar'))
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'github-token':
          return 'mock-token'
        default:
          return ''
      }
    })
    getOctokitMock.mockImplementation(makeOctokitMock('bump:patch'))

    await expect(async () => {
      await version.bumpVersion(bumpLabels)
    }).rejects.toThrow(
      new Error("Unable to bump current version 'foo' to next patch version")
    )
  })
})
