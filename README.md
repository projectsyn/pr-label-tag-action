# GitHub action to create new SemVer tags based on PR labels

[![GitHub Super-Linter](https://github.com/projectsyn/pr-label-tag-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/projectsyn/pr-label-tag-action/actions/workflows/ci.yml/badge.svg)

This action looks for specific labels (by default `bump:major`, `bump:minor`, and
`bump:patch`) on PRs, and creates a new SemVer tag based on the current latest
version of the repository after a PR with one of the labels is merged.

Currently, the action doesn't allow customizing the tag format. It will always
look for SemVer version tags prefixed with `v` and will create such tags.

The action adds a PR comment which shows what will happen if the PR is merged.
The comment is updated when labels are added or removed, if the workflow has
the appropriate triggers (see section "Usage").

The action can optionally trigger follow-up workflows (for example if you want
to automatically create a release after a new tag has been created). This
feature requires that any workflows that should be triggered by the action
have the `workflow_dispatch` trigger option.

## Usage

To use the action with the default configuration you can use the following
workflow config:

```yaml
on:
  pull_request:
    # Run when PR head branch is updated (synchronize), when the set of PR
    # labels is changed (labeled, unlabeled), and after the PR is closed. We
    # additionally check for `merged==true` in the event payload on `closed`
    # before actually pushing the tag.
    types:
      - synchronize
      - labeled
      - unlabeled
      - closed

steps:
  - name: Create new tag
    uses: projectsyn/pr-label-tag-action@v1
```

### Triggering follow-up actions

```yaml
on:
  pull_request:
    types:
      - synchronize
      - labeled
      - unlabeled
      - closed

steps:
  - name: Create new tag
    uses: projectsyn/pr-label-tag-action@v1
    with:
      trigger: |
        Release
```

See [this repository's "Release" workflow](https://github.com/projectsyn/pr-label-tag-action/blob/main/.github/workflows/release.yml)
for an example workflow that is be triggered correctly on both manually pushed
tags, and tags created by this action.

## Action inputs

| Name | Description | Default |
|------|-------------|---------|
| `github-token` | Token to access GitHub | `github.token` |
| `patch-label` | Label which indicates a patch-level SemVer bump | `bump:patch` |
| `minor-label` | Label which indicates a minor-level SemVer bump | `bump:minor` |
| `major-label` | Label which indicates a major-level SemVer bump | `bump:major` |
| `trigger` | Workflow names of workflows that should be triggered when a new tag is created. Multiple workflows can be specified on separate lines. | "" |
| `release-comment` | Comment that gets posted when a tag will be pushed on merge | "🚀 Merging this PR will release \`\<next-version\>\`" |
| `released-comment` | Comment that gets posted when a tag has been pushed | "🚀 This PR has been released as \[\`\<next-version\>\`\]\(\<release-url\>\)" |
| `unmerged-comment` | Comment that gets posted when a labeled PR gets closed unmerged | "This PR has been closed unmerged. No new release will be created for these changes" |

For inputs `release-comment`, `released-comment` and `unmerged-comment` the action supports the following placeholders:

* `<next-version>` is replaced with the computed new version
* `<release-url>` is replaced with the URL to the new tag
