import * as core from '@actions/core'
import * as github from '@actions/github'
import { inc, rcompare, ReleaseType } from 'semver'

export async function latestTag(): Promise<string> {
  const token = core.getInput('github-token')
  const client = github.getOctokit(token)

  const tagsResp = await client.paginate(
    client.rest.repos.listTags,
    github.context.repo
  )
  const tags = tagsResp
    .map(({ name }) => name)
    .filter(tag => {
      return tag.startsWith('v')
    })
    .sort(rcompare)

  const latest = tags.length === 0 ? 'v0.0.0' : tags[0]
  return new Promise(resolve => {
    resolve(latest)
  })
}

export function bumpVersion(currVer: string, bump: ReleaseType): string {
  core.debug(`Current version: ${currVer}`)

  const newVer = inc(currVer, bump)
  if (!newVer) {
    throw new Error(
      `Unable to bump current version '${currVer}' to next ${bump} version`
    )
  }
  // we know newVer is a string here
  return `v${newVer}`
}

export async function createAndPushTag(tag: string): Promise<void> {
  if (!github.context.payload.pull_request) {
    throw Error(
      `Action is running for a '${github.context.eventName}' event. ` +
        "Only 'pull_request' events are supported"
    )
  }
  if (
    !github.context.payload.pull_request.merged ||
    !github.context.payload.pull_request.merge_commit_sha
  ) {
    throw Error("Creating tag for unmerged PRs isn't supported")
  }
  const token = core.getInput('github-token')
  const client = github.getOctokit(token)

  // create tag
  await client.rest.git.createRef({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    ref: `refs/tags/${tag}`,
    sha: github.context.payload.pull_request.merge_commit_sha
  })
}
