# Contributing to Transpile Webpack Plugin

## Submission Guidelines

### Submitting an Issue

If you have discovered a bug or have a feature suggestion, please [submit a new issue on GitHub](https://github.com/licg9999/transpile-webpack-plugin/issues/new).

Also, in case an issue for your problem might already exist, please search the issue tracker first.

### Submitting a Pull Request

For changes to commit, please checkout a new branch with a format of `author-name/change-brief` from the latest `master` branch.

On writing commits messages, please briefly state what changes are included in each commit.

Then, on commits ready, please create a PR with a descriptive title following [Conventional Commits](https://www.conventionalcommits.org/).

With one approval, the PR will become mergeable.

On a PR merged into `master` branch, a new alpha version will be released. Just feel free to use it for some initial trials.

## Local Setup

In this repo, `npm` is used. Please run `npm i` in the root dir of the repo to get dependencies installed. Preset scripts are available in `scripts` field of `package.json` as well as `scripts` dir. Just try them to help yourself as you see fit.

## Directory Structure

```sh
.
├── additional-configs  # Various non-default configs
├── e2e                 # End-to-end tests
├── scripts             # Runnable helpers
├── src                 # The source code of main logics
└── support-helpers     # Helpers for logics outside src
```

## Code Of Conduct

Transpile Webpack Plugin has adopted a Code of Conduct that we expect project participants to adhere to. Please read [the full text](https://github.com/licg9999/transpile-webpack-plugin/blob/master/CODE_OF_CONDUCT.md) so that you can understand what actions will and will not be tolerated.
