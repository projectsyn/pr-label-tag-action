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
import { makePROctokitMock, populateGitHubContext } from './helpers'

// Mock the GitHub Actions core library
const getInputMock = jest.spyOn(core, 'getInput')
const infoMock = jest.spyOn(core, 'info')
const warningMock = jest.spyOn(core, 'warning')
const getOctokitMock = jest.spyOn(github, 'getOctokit')

const bumpLabels = {
  patch: 'bump:patch',
  minor: 'bump:minor',
  major: 'bump:major'
} as bump_labels.BumpLabels

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

    const labels = bump_labels.readBumpLabels()
    expect(labels).toStrictEqual({
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

describe('prBumpLabel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // set context for tests
    populateGitHubContext()
    // set input mock
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'github-token':
          return 'mock-token'
        default:
          return ''
      }
    })
  })

  it('raises an error on non-PR events', async () => {
    github.context.eventName = 'discussion'
    delete github.context.payload.pull_request

    await expect(async () => {
      await bump_labels.prBumpLabel(bumpLabels)
    }).rejects.toThrow(
      new Error(
        "Action is running on a 'discussion' event, only 'pull_request' events are supported"
      )
    )
  })

  it('identifies bump:patch label', async () => {
    getOctokitMock.mockImplementation(makePROctokitMock('bump:patch'))

    await expect(bump_labels.prBumpLabel(bumpLabels)).resolves.toStrictEqual({
      bump: 'patch' as ReleaseType,
      labels: ['bump:patch']
    })
  })

  it('identifies bump:minor label', async () => {
    getOctokitMock.mockImplementation(makePROctokitMock('bump:minor'))

    await expect(bump_labels.prBumpLabel(bumpLabels)).resolves.toStrictEqual({
      bump: 'minor' as ReleaseType,
      labels: ['bump:minor']
    })
  })

  it('identifies bump:major label', async () => {
    getOctokitMock.mockImplementation(makePROctokitMock('bump:major'))

    await expect(bump_labels.prBumpLabel(bumpLabels)).resolves.toStrictEqual({
      bump: 'major' as ReleaseType,
      labels: ['bump:major']
    })
  })

  it('logs a message when no bump labels are present', async () => {
    getOctokitMock.mockImplementation(makePROctokitMock())

    await expect(bump_labels.prBumpLabel(bumpLabels)).resolves.toStrictEqual({
      bump: null,
      labels: []
    })

    expect(infoMock).toHaveBeenNthCalledWith(1, 'No bump labels found')
  })

  it('logs a warning when multiple bump labels are present', async () => {
    getOctokitMock.mockImplementation(
      makePROctokitMock('bump:patch', 'bump:minor')
    )

    await expect(bump_labels.prBumpLabel(bumpLabels)).resolves.toStrictEqual({
      bump: null,
      labels: ['bump:patch', 'bump:minor']
    })

    expect(warningMock).toHaveBeenNthCalledWith(
      1,
      'Multiple bump labels found: ["bump:patch","bump:minor"]'
    )
  })
})

describe('bumpFromLabel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('raises an error on an unknown bump label value', () => {
    expect(() => {
      bump_labels.bumpFromLabel(bumpLabels, 'foo')
    }).toThrow(new Error("Unknown version bump foo. This shouldn't happen"))
  })
})
