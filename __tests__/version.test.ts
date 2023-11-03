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
import * as version from '../src/version'

import { makeTagsOctokitMock, populateGitHubContext } from './helpers'

// Mock the GitHub Actions core library
const execMock = jest.spyOn(exec, 'exec')
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

describe('createAndPushTag', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates and pushes tag', async () => {
    execMock.mockImplementation(
      async (
        command: string,
        args?: string[],
        options?: exec.ExecOptions
      ): Promise<number> => {
        expect(command).toBe('git')
        expect(args).toBeDefined()
        expect(options).toBeDefined()
        return new Promise(resolve => {
          resolve(0)
        })
      }
    )

    await version.createAndPushTag('v1.2.4')
    expect(execMock).toHaveBeenCalledTimes(2)
    expect(execMock.mock.calls[0][0]).toBe('git')
    expect(execMock.mock.calls[0][1]).toStrictEqual(['tag', 'v1.2.4'])
    expect(execMock.mock.calls[1][0]).toBe('git')
    expect(execMock.mock.calls[1][1]).toStrictEqual([
      'push',
      'origin',
      'v1.2.4'
    ])
  })

  it("throws an error if tag can't be created", async () => {
    execMock.mockImplementation(
      async (
        command: string,
        args?: string[],
        options?: exec.ExecOptions
      ): Promise<number> => {
        expect(command).toBe('git')
        expect(args).toBeDefined()
        expect(options).toBeDefined()
        return new Promise(resolve => {
          if (args && args[0] === 'tag') {
            if (options && options.listeners && options.listeners.stdout) {
              options.listeners.stdout(Buffer.from('dummy error'))
            }
            resolve(1)
          } else {
            resolve(0)
          }
        })
      }
    )

    await expect(async () => {
      await version.createAndPushTag('v1.2.4')
    }).rejects.toThrow(new Error('Creating tag failed:\ndummy error\n'))
    expect(execMock).toHaveBeenCalledTimes(1)
    expect(execMock.mock.calls[0][0]).toBe('git')
    expect(execMock.mock.calls[0][1]).toStrictEqual(['tag', 'v1.2.4'])
  })

  it("throws an error if tag can't be pushed", async () => {
    execMock.mockImplementation(
      async (
        command: string,
        args?: string[],
        options?: exec.ExecOptions
      ): Promise<number> => {
        expect(command).toBe('git')
        expect(args).toBeDefined()
        expect(options).toBeDefined()
        return new Promise(resolve => {
          if (args && args[0] === 'push') {
            if (options && options.listeners && options.listeners.stdout) {
              options.listeners.stdout(Buffer.from('dummy error'))
            }
            resolve(1)
          } else {
            resolve(0)
          }
        })
      }
    )

    await expect(async () => {
      await version.createAndPushTag('v1.2.4')
    }).rejects.toThrow(new Error('Pushing tag failed:\ndummy error\n'))
    expect(execMock).toHaveBeenCalledTimes(2)
    expect(execMock.mock.calls[0][0]).toBe('git')
    expect(execMock.mock.calls[0][1]).toStrictEqual(['tag', 'v1.2.4'])
    expect(execMock.mock.calls[0][0]).toBe('git')
    expect(execMock.mock.calls[1][1]).toStrictEqual([
      'push',
      'origin',
      'v1.2.4'
    ])
  })
})
