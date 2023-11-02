/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as github from '@actions/github'
import * as main from '../src/main'
import * as comment from '../src/comment'
import * as version from '../src/version'
import {
  makeGitExecMock,
  makePROctokitMock,
  populateGitHubContext
} from './helpers'

// Mock the GitHub Actions core library
const debugMock = jest.spyOn(core, 'debug')
const getInputMock = jest.spyOn(core, 'getInput')
const getMultilineInputMock = jest.spyOn(core, 'getMultilineInput')
const setFailedMock = jest.spyOn(core, 'setFailed')
const execMock = jest.spyOn(exec, 'exec')
const getOctokitMock = jest.spyOn(github, 'getOctokit')
const createOrUpdateCommentMock = jest.spyOn(comment, 'createOrUpdateComment')
const createAndPushTagMock = jest.spyOn(version, 'createAndPushTag')
const triggerDispatchMock = jest.spyOn(version, 'triggerDispatch')

// Mock the action's main function
const runMock = jest.spyOn(main, 'run')

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock `git tag --sort=-v:refname`
    execMock.mockImplementation(makeGitExecMock('v1.2.3\n'))
    // mock our own createOrUpdateComment to do nothing
    createOrUpdateCommentMock.mockImplementation(
      async (body: string): Promise<void> => {
        return new Promise(resolve => {
          body
          resolve()
        })
      }
    )
    // mock our own createAndPushTag to do nothing
    createAndPushTagMock.mockImplementation(
      async (tag: string): Promise<void> => {
        return new Promise(resolve => {
          tag
          resolve()
        })
      }
    )
    // mock our own triggerDispatch to do nothing
    triggerDispatchMock.mockImplementation(
      async (tag: string): Promise<void> => {
        return new Promise(resolve => {
          tag
          resolve()
        })
      }
    )
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'patch-label':
          return 'bump:patch'
        case 'minor-label':
          return 'bump:minor'
        case 'major-label':
          return 'bump:major'
        case 'github-token':
          return 'mock-token'
        case 'release-comment':
          return '🚀 Merging this PR will release `<next-version>`'
        case 'released-comment':
          return '🚀 This PR has been released as [`<next-version>`](<repo-url>)'
        case 'unmerged-comment':
          return 'This PR has been closed unmerged. No new release will be created for these changes'
        default:
          return ''
      }
    })
    // Mock github.getOctokit to return fake api responses for fetching PR
    // labels
    getOctokitMock.mockImplementation(makePROctokitMock('bump:patch'))
    populateGitHubContext()
  })

  it('creates or updates comment on labeled PR', async () => {
    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(debugMock).toHaveBeenNthCalledWith(
      1,
      'Using bump:patch, bump:minor, bump:major to determine SemVer bump ...'
    )
    expect(createOrUpdateCommentMock).toHaveBeenNthCalledWith(
      1,
      '🚀 Merging this PR will release `v1.2.4`\n\n' +
        '🛠️ _Auto tagging enabled_ with label `bump:patch`'
    )
    expect(createAndPushTagMock).not.toHaveBeenCalled()
    expect(triggerDispatchMock).not.toHaveBeenCalled()
  })

  it('creates or updates comment on PR with multiple bump labels', async () => {
    getOctokitMock.mockImplementation(
      makePROctokitMock('bump:patch', 'bump:minor')
    )

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(debugMock).toHaveBeenNthCalledWith(
      1,
      'Using bump:patch, bump:minor, bump:major to determine SemVer bump ...'
    )
    expect(createOrUpdateCommentMock).toHaveBeenNthCalledWith(
      1,
      'Found 2 bump labels (`bump:patch`, `bump:minor`), please make sure you only add one bump label.\n\n' +
        '🛠️ _Auto tagging disabled_'
    )
    expect(createAndPushTagMock).not.toHaveBeenCalled()
    expect(triggerDispatchMock).not.toHaveBeenCalled()
  })

  it('creates or updates comment on closed unmerged PR', async () => {
    getOctokitMock.mockImplementation(makePROctokitMock('bump:patch'))
    github.context.payload.action = 'closed'
    expect(github.context.payload.pull_request).toBeDefined()
    if (github.context.payload.pull_request) {
      github.context.payload.pull_request['merged'] = false
    }

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(debugMock).toHaveBeenNthCalledWith(
      1,
      'Using bump:patch, bump:minor, bump:major to determine SemVer bump ...'
    )
    expect(createOrUpdateCommentMock).toHaveBeenNthCalledWith(
      1,
      'This PR has been closed unmerged. No new release will be created for these changes\n\n' +
        '🛠️ _Auto tagging disabled_'
    )
    expect(createAndPushTagMock).not.toHaveBeenCalled()
    expect(triggerDispatchMock).not.toHaveBeenCalled()
  })

  it('creates or updates comment on merged PR', async () => {
    getOctokitMock.mockImplementation(makePROctokitMock('bump:patch'))
    github.context.payload.action = 'closed'
    expect(github.context.payload.pull_request).toBeDefined()
    if (github.context.payload.pull_request) {
      github.context.payload.pull_request['merged'] = true
    }

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(debugMock).toHaveBeenNthCalledWith(
      1,
      'Using bump:patch, bump:minor, bump:major to determine SemVer bump ...'
    )
    expect(createOrUpdateCommentMock).toHaveBeenNthCalledWith(
      1,
      '🚀 This PR has been released as [`v1.2.4`](https://github.com/projectsyn/pr-label-tag-action/releases/tag/v1.2.4)\n\n' +
        '🛠️ _Auto tagging enabled_ with label `bump:patch`'
    )
    expect(createAndPushTagMock).toHaveBeenNthCalledWith(1, 'v1.2.4')
    expect(triggerDispatchMock).toHaveBeenNthCalledWith(1, 'v1.2.4')
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

  it('raises an error on non-PR events', async () => {
    delete github.context.payload.pull_request
    github.context.eventName = 'discussion'

    await main.run()
    expect(runMock).toHaveReturned()

    expect(setFailedMock).toHaveBeenNthCalledWith(
      1,
      "Action is running for a 'discussion' event. Only 'pull_request' events are supported"
    )
  })

  it('lists triggered workflows in comment', async () => {
    getOctokitMock.mockImplementation(makePROctokitMock('bump:patch'))
    github.context.payload.action = 'closed'
    expect(github.context.payload.pull_request).toBeDefined()
    if (github.context.payload.pull_request) {
      github.context.payload.pull_request['merged'] = true
    }
    getMultilineInputMock.mockImplementation((name: string): string[] => {
      switch (name) {
        case 'trigger':
          return ['Foo', 'bar']
        default:
          return []
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(debugMock).toHaveBeenNthCalledWith(
      1,
      'Using bump:patch, bump:minor, bump:major to determine SemVer bump ...'
    )
    expect(createOrUpdateCommentMock).toHaveBeenNthCalledWith(
      1,
      '🚀 This PR has been released as [`v1.2.4`](https://github.com/projectsyn/pr-label-tag-action/releases/tag/v1.2.4)\n\n' +
        'Triggering workflows `Foo`, `bar`\n\n' +
        '🛠️ _Auto tagging enabled_ with label `bump:patch`'
    )
    expect(createAndPushTagMock).toHaveBeenNthCalledWith(1, 'v1.2.4')
    expect(triggerDispatchMock).toHaveBeenNthCalledWith(1, 'v1.2.4')
  })

  it('lists workflows to trigger in comment', async () => {
    getOctokitMock.mockImplementation(makePROctokitMock('bump:patch'))
    getMultilineInputMock.mockImplementation((name: string): string[] => {
      switch (name) {
        case 'trigger':
          return ['Foo', 'bar']
        default:
          return []
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(debugMock).toHaveBeenNthCalledWith(
      1,
      'Using bump:patch, bump:minor, bump:major to determine SemVer bump ...'
    )
    expect(createOrUpdateCommentMock).toHaveBeenNthCalledWith(
      1,
      '🚀 Merging this PR will release `v1.2.4`\n\n' +
        'Merging will trigger workflows `Foo`, `bar`\n\n' +
        '🛠️ _Auto tagging enabled_ with label `bump:patch`'
    )
    expect(createAndPushTagMock).not.toHaveBeenCalled()
    expect(triggerDispatchMock).not.toHaveBeenCalled()
  })
})
