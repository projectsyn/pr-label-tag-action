/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as main from '../src/main'

// Mock the GitHub Actions core library
const debugMock = jest.spyOn(core, 'debug')
const getInputMock = jest.spyOn(core, 'getInput')
const setFailedMock = jest.spyOn(core, 'setFailed')
const execMock = jest.spyOn(exec, 'exec')

// Mock the action's main function
const runMock = jest.spyOn(main, 'run')

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
            options.listeners.stdout(Buffer.from('v1.2.3\n'))
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
  })

  it('parses the bump labels', async () => {
    // Set the action's inputs as return values from core.getInput()
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

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(debugMock).toHaveBeenNthCalledWith(
      1,
      'Using patch, bump:minor, bump:major to determine SemVer bump ...'
    )
  })

  it('raises an error on an empty input', async () => {
    // Set the action's inputs as return values from core.getInput()
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

    await main.run()
    expect(runMock).toHaveReturned()

    expect(setFailedMock).toHaveBeenNthCalledWith(
      1,
      "Empty bump labels aren't supported"
    )
  })
})
