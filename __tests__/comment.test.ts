import * as core from '@actions/core'
import * as github from '@actions/github'
import * as comment from '../src/comment'
import { populateGitHubContext } from './helpers'

const getInputMock = jest.spyOn(core, 'getInput')
const getOctokitMock = jest.spyOn(github, 'getOctokit')
const warnMock = jest.spyOn(core, 'warning')

const commentText =
  '🚀 Merging this PR will release `v1.2.4`\n\n' +
  '🛠️ _Auto tagging enabled_ with label `bump:patch`'

function makeCommentOctokitMock(
  ...cfg: { comment: string; author: string }[]
): {
  mockFn: (token: string) => any
  createFn: jest.Func
  updateFn: jest.Func
} {
  const createFn = jest.fn(async (args: any): Promise<void> => {
    expect(args.owner).toBe('projectsyn')
    expect(args.repo).toBe('pr-label-tag-action')
    expect(args.issue_number).toBe(123)
    expect(args.comment_id).toBeUndefined()
    return new Promise(resolve => {
      resolve()
    })
  })
  const updateFn = jest.fn(async (args: any): Promise<void> => {
    expect(args.owner).toBe('projectsyn')
    expect(args.repo).toBe('pr-label-tag-action')
    expect(args.issue_number).toBe(123)
    expect(args.comment_id).toBe(12345678)
    return new Promise(resolve => {
      resolve()
    })
  })
  const comments: any[] = []
  let i = 0
  for (const c of cfg) {
    if (c.comment !== '') {
      comments.push({
        id: 12345678 + i,
        body: c.comment,
        user: {
          login: c.author
        },
        created_at: ''
      })
      i++
    }
  }
  const mockFn = (token: string): any => {
    expect(token).toBe('mock-token')
    return {
      paginate: (
        func: (args: Record<string, any>) => any,
        args: Record<string, any>
      ) => func(args),
      rest: {
        issues: {
          listComments: async (args: any): Promise<Comment[]> => {
            expect(args.owner).toBe('projectsyn')
            expect(args.repo).toBe('pr-label-tag-action')
            expect(args.issue_number).toBe(123)
            return new Promise(resolve => {
              resolve(comments)
            })
          },
          createComment: createFn,
          updateComment: updateFn
        }
      }
    }
  }
  return { mockFn, createFn, updateFn }
}

describe('createOrUpdateComment', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    populateGitHubContext()
    getInputMock.mockImplementation((name: string) => {
      switch (name) {
        case 'github-token':
          return 'mock-token'
        default:
          return ''
      }
    })
  })

  it('raises an error when called on a non-PR action', async () => {
    delete github.context.payload.pull_request
    github.context.eventName = 'discussion'

    await expect(async () => {
      await comment.createOrUpdateComment('')
    }).rejects.toThrow(
      new Error(
        "Action is running on a 'discussion' event, only 'pull_request' events are supported"
      )
    )
  })

  it('creates a new comment, if no comment exists yet', async () => {
    const clientMock = makeCommentOctokitMock({
      comment: '',
      author: 'github-actions[bot]'
    })
    getOctokitMock.mockImplementation(clientMock.mockFn)

    await comment.createOrUpdateComment(commentText)

    expect(clientMock.createFn).toHaveBeenCalledTimes(1)
    expect(clientMock.updateFn).toHaveBeenCalledTimes(0)
  })

  it('updates the comment, if a matching one exists already', async () => {
    const clientMock = makeCommentOctokitMock({
      comment: '🛠️ _Auto tagging disabled_',
      author: 'github-actions[bot]'
    })
    getOctokitMock.mockImplementation(clientMock.mockFn)

    await comment.createOrUpdateComment(commentText)

    expect(clientMock.createFn).toHaveBeenCalledTimes(0)
    expect(clientMock.updateFn).toHaveBeenCalledTimes(1)
  })
  it('creates a new comment, when other comments matching the pattern but with a different author exist', async () => {
    const clientMock = makeCommentOctokitMock({
      comment: '🛠️ _Auto tagging disabled_',
      author: 'octocat'
    })
    getOctokitMock.mockImplementation(clientMock.mockFn)

    await comment.createOrUpdateComment(commentText)

    expect(clientMock.createFn).toHaveBeenCalledTimes(1)
    expect(clientMock.updateFn).toHaveBeenCalledTimes(0)
  })

  it('creates a new comment, when other comments by the same author exist', async () => {
    const clientMock = makeCommentOctokitMock({
      comment: 'Other stuff',
      author: 'github-actions[bot]'
    })
    getOctokitMock.mockImplementation(clientMock.mockFn)

    await comment.createOrUpdateComment(commentText)

    expect(clientMock.createFn).toHaveBeenCalledTimes(1)
    expect(clientMock.updateFn).toHaveBeenCalledTimes(0)
  })

  it('edits the oldest comment, and logs a warning if multiple comments match', async () => {
    const clientMock = makeCommentOctokitMock(
      {
        comment: '🛠️ _Auto tagging disabled_',
        author: 'github-actions[bot]'
      },
      {
        comment: '🛠️ _Auto tagging enabled_',
        author: 'github-actions[bot]'
      }
    )
    getOctokitMock.mockImplementation(clientMock.mockFn)

    await comment.createOrUpdateComment(commentText)

    expect(clientMock.createFn).toHaveBeenCalledTimes(0)
    expect(clientMock.updateFn).toHaveBeenCalledTimes(1)
    expect(warnMock).toHaveBeenNthCalledWith(
      1,
      'Multiple potential comments owned by this action found, editing oldest'
    )
  })

  it('does nothing when updateOnly=true and no comment found', async () => {
    const clientMock = makeCommentOctokitMock()
    getOctokitMock.mockImplementation(clientMock.mockFn)

    await comment.createOrUpdateComment(commentText, true)

    expect(clientMock.createFn).toHaveBeenCalledTimes(0)
    expect(clientMock.updateFn).toHaveBeenCalledTimes(0)
  })
})
