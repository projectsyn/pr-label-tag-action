/**
 * Unit tests for the action's workflow triggering, src/dispatch.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as github from '@actions/github'
import * as dispatch from '../src/dispatch'

import { populateGitHubContext } from './helpers'

const getInputMock = jest.spyOn(core, 'getInput')
const infoMock = jest.spyOn(core, 'info')
const warnMock = jest.spyOn(core, 'warning')
const getOctokitMock = jest.spyOn(github, 'getOctokit')
const getMultilineInputMock = jest.spyOn(core, 'getMultilineInput')

function makeWorkflowOctokitMock(): {
  mockFn: any
  createFn: jest.Mock
} {
  const createFn = jest.fn(
    async (args: {
      owner: string
      repo: string
      workflow_id: number
      ref: string
    }): Promise<void> => {
      expect(args.owner).toBe('projectsyn')
      expect(args.repo).toBe('pr-label-tag-action')
      return new Promise(resolve => {
        resolve()
      })
    }
  )
  const mockFn = (token: string): any => {
    expect(token).toBe('mock-token')
    return {
      rest: {
        actions: {
          listRepoWorkflows: async (args: { owner: string; repo: string }) => {
            expect(args.owner).toBe('projectsyn')
            expect(args.repo).toBe('pr-label-tag-action')
            return new Promise(resolve => {
              resolve({
                data: {
                  workflows: [
                    {
                      name: 'foo',
                      id: 1234
                    },
                    {
                      name: 'bar',
                      id: 1235
                    },
                    {
                      name: 'bar',
                      id: 1236
                    },
                    {
                      name: 'baz',
                      id: 1237
                    }
                  ]
                }
              })
            })
          },
          createWorkflowDispatch: createFn
        }
      }
    }
  }
  return { mockFn, createFn }
}

describe('triggerDispatch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    populateGitHubContext()
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'github-token':
          return 'mock-token'
        default:
          return ''
      }
    })
    getMultilineInputMock.mockImplementation((name: string): string[] => {
      switch (name) {
        case 'trigger':
          return ['foo', 'bar', 'qux']
        default:
          return []
      }
    })
  })

  it('triggers workflows', async () => {
    const mockClient = makeWorkflowOctokitMock()
    getOctokitMock.mockImplementation(mockClient.mockFn)

    await dispatch.triggerDispatch('v1.2.4')

    expect(mockClient.createFn).toHaveBeenCalledTimes(3)
    expect(warnMock).toHaveBeenCalledTimes(1)
    expect(warnMock).toHaveBeenNthCalledWith(
      1,
      'No workflow with name qux found, skipping'
    )
    expect(infoMock).toHaveBeenCalledTimes(3)
    expect(mockClient.createFn.mock.calls[0][0]).toStrictEqual({
      owner: 'projectsyn',
      repo: 'pr-label-tag-action',
      workflow_id: 1234,
      ref: 'refs/tags/v1.2.4'
    })
    expect(infoMock).toHaveBeenNthCalledWith(
      1,
      "Triggering workflow foo (1234). If the workflow doesn't run, " +
        "please make sure that it's configured with the `workflow_dispatch` event"
    )
    expect(mockClient.createFn.mock.calls[1][0]).toStrictEqual({
      owner: 'projectsyn',
      repo: 'pr-label-tag-action',
      workflow_id: 1235,
      ref: 'refs/tags/v1.2.4'
    })
    expect(infoMock).toHaveBeenNthCalledWith(
      2,
      "Triggering workflow bar (1235). If the workflow doesn't run, " +
        "please make sure that it's configured with the `workflow_dispatch` event"
    )
    expect(mockClient.createFn.mock.calls[2][0]).toStrictEqual({
      owner: 'projectsyn',
      repo: 'pr-label-tag-action',
      workflow_id: 1236,
      ref: 'refs/tags/v1.2.4'
    })
    expect(infoMock).toHaveBeenNthCalledWith(
      3,
      "Triggering workflow bar (1236). If the workflow doesn't run, " +
        "please make sure that it's configured with the `workflow_dispatch` event"
    )
  })
})
