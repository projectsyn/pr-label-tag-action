import * as core from '@actions/core'
import * as github from '@actions/github'
import { ReleaseType } from 'semver'

export interface BumpLabels {
  patch: string
  minor: string
  major: string
}

export function readBumpLabels(): BumpLabels {
  const patchLabel: string = core.getInput('patch-label')
  const minorLabel: string = core.getInput('minor-label')
  const majorLabel: string = core.getInput('major-label')

  if (patchLabel === '' || minorLabel === '' || majorLabel === '') {
    throw Error("Empty bump labels aren't supported")
  }
  return {
    patch: patchLabel,
    minor: minorLabel,
    major: majorLabel
  } as BumpLabels
}

async function getPRLabels(): Promise<string[]> {
  if (!github.context.payload.pull_request) {
    throw new Error(
      `Action is running on a '${github.context.eventName}' event, only 'pull_request' events are supported`
    )
  }
  const token = core.getInput('github-token')
  const client = github.getOctokit(token)
  const prNum = github.context.payload.pull_request.number
  const { data: pullRequest } = await client.rest.pulls.get({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: prNum
  })
  const labels = pullRequest.labels.map(({ name }) => name)
  return new Promise(resolve => {
    resolve(labels)
  })
}

export function bumpFromLabel(b: BumpLabels, bump: string): ReleaseType {
  switch (bump) {
    case b.patch:
      return 'patch' as ReleaseType
    case b.minor:
      return 'minor' as ReleaseType
    case b.major:
      return 'major' as ReleaseType
    default:
      throw new Error(`Unknown version bump ${bump}. This shouldn't happen`)
  }
}

interface BumpAction {
  bump: ReleaseType | null
  labels: string[]
}

export async function prBumpLabel(b: BumpLabels): Promise<BumpAction> {
  const prLabels = await getPRLabels()
  const bumpLabels = prLabels.filter(
    (l: string) => l === b.patch || l === b.minor || l === b.major
  )
  if (bumpLabels.length === 0) {
    core.info('No bump labels found')
    return new Promise(resolve => {
      resolve({ bump: null, labels: bumpLabels } as BumpAction)
    })
  }
  if (bumpLabels.length > 1) {
    core.warning(`Multiple bump labels found: ${JSON.stringify(bumpLabels)}`)
    // TODO: PR comment
    return new Promise(resolve => {
      resolve({ bump: null, labels: bumpLabels } as BumpAction)
    })
  }
  // here we know that bumpLabels must have exactly 1 element
  return new Promise(resolve => {
    resolve({
      bump: bumpFromLabel(b, bumpLabels[0]),
      labels: bumpLabels
    } as BumpAction)
  })
}
