/**
 * Unit tests for the action's version parsing and bumping, src/version.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as exec from '@actions/exec'
import * as version from '../src/version'

// Mock the GitHub Actions core library
const execMock = jest.spyOn(exec, 'exec')

describe('latestTag', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('parses the latest version', async () => {
    // Mock `git tag --sort=-v:refname`
    execMock.mockImplementation((commandLine, args?, options?) => {
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
            options.listeners.stdout(
              Buffer.from('v1.2.3\nv1.2.2\nv1.2.1\nv1.2.0\nv1.1.0\nv1.0.0')
            )
          }
          if (options.listeners.stderr) {
            options.listeners.stderr(Buffer.from(''))
          }
        }
      }
      return new Promise(resolve => {
        resolve(0)
      })
    })

    // latest tag should be v1.2.3
    expect(version.latestTag()).resolves.toBe('v1.2.3')
  })

  it('raises an error on git exec errors', async () => {
    // Mock `git tag --sort=-v:refname`
    execMock.mockImplementation((commandLine, args?, options?) => {
      expect(commandLine).toBe('git')
      expect(args).toStrictEqual(['tag', '--sort=-v:refname'])
      expect(options).not.toBeUndefined()
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

    expect(version.latestTag).rejects.toThrow(
      new Error('Call to git failed:\n\ndummy error')
    )
  })

  it('returns v0.0.0 for no tags', async () => {
    // Mock `git tag --sort=-v:refname`
    execMock.mockImplementation((commandLine, args?, options?) => {
      expect(commandLine).toBe('git')
      expect(args).toStrictEqual(['tag', '--sort=-v:refname'])
      expect(options).not.toBeUndefined()
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
            options.listeners.stderr(Buffer.from(''))
          }
        }
      }
      return new Promise(resolve => {
        resolve(0)
      })
    })

    expect(version.latestTag()).resolves.toBe('v0.0.0')
  })
})
