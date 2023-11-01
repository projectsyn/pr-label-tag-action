/**
 * Unit tests for the action's version parsing and bumping, src/version.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as exec from '@actions/exec'
import * as version from '../src/version'
import { makeGitExecMock, populateGitHubContext } from './helpers'

// Mock the GitHub Actions core library
const execMock = jest.spyOn(exec, 'exec')

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
