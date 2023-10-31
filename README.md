# GitHub action to create new SemVer tags based on PR labels

[![GitHub Super-Linter](https://github.com/projectsyn/pr-label-tag-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/projectsyn/pr-label-tag-action/actions/workflows/ci.yml/badge.svg)

This action looks for specific labels (by default `bump:major`, `bump:minor`, and
`bump:patch`) on PRs, and creates a new SemVer tag based on the current latest
version of the repo after a PR with one of the labels is merged.

The action adds a PR comment which shows what will happen if the PR is merged.
The comment is updated when labels are added or removed, if the workflow has
the appropriate triggers (see section "Usage").

## Usage

TODO: Update this section

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
  - name: Checkout
    id: checkout
    uses: actions/checkout@v3

  - name: Create new version
    uses: projectsyn/pr-label-tag-action@v1 # Commit with the `v1` tag
    with:
      milliseconds: 1000
```
