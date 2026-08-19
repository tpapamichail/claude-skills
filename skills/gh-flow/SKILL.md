---
name: gh-flow
description: Work on every new feature or issue in a dedicated git flow feature branch off the integration branch. Never commit on develop/main unless the user explicitly says so. Use whenever starting a new feature, fixing a GitHub issue, or when the user asks to begin new work. Supports `/gh-flow start` (open a feature branch) and `/gh-flow finish` (checks → commit → merge or PR).
allowed-tools: Bash(git:*), Bash(gh:*), Bash(npm:*), Bash(pnpm:*), Bash(yarn:*), Bash(make:*), Bash(composer:*), Read, Glob, Grep
---

# gh-flow

Every new feature or issue gets its own feature branch off the repo's integration
branch. **Never** work directly on that branch or on the production branch — only
on an explicit user order.

## Subcommands

Invoked as `/gh-flow <subcommand>`. Route on the argument:

| Argument | Meaning |
|---|---|
| `start` (or `start {ID}` / `start {slug}`) | Begin a new task → create & switch to a feature branch. Run [**Start**](#start). |
| `finish` | The task is complete → run checks, commit, and merge or open a PR. Run [**Finish**](#finish). |
| _(none / other)_ | Infer from context: no feature branch yet → **Start**; on a feature branch with work done → **Finish**; on a feature branch and the new request is unrelated to it → [**Scope change mid-feature**](#scope-change-mid-feature). If ambiguous, ask the user. |

---

## Resolve the repo's conventions first

Never hardcode the branch names or the prefix. Detect them once per session:

```bash
git config --get gitflow.branch.develop     # e.g. develop — empty → no git flow config
git config --get gitflow.branch.master      # e.g. master or main
git config --get gitflow.prefix.feature     # e.g. feature/
gh repo view --json defaultBranchRef -q .defaultBranchRef.name
```

Resolution order for the **integration branch** (where features branch off and
merge back):

1. `gitflow.branch.develop` if set.
2. Otherwise a remote `develop` — `git branch -r --list '*/develop'` non-empty.
3. Otherwise the repo's default branch (`main` / `master`).

For the **feature prefix**: `gitflow.prefix.feature` if set, else `feature/`.

> If `git flow` config exists but the `git-flow` extension is not installed, the
> plain-git equivalents below still apply — the naming convention is what matters,
> not the tool.

---

## Start

Open a dedicated feature branch for the new task.

### Before touching any code

1. `git branch --show-current`
2. Already on a feature branch that matches the task → continue on it (no new branch).
3. On the integration or production branch → do **not** commit. Create the branch first.
4. A branch for this issue may already exist: `git branch -a --list "*{ID}*"`. If so,
   check it out instead of creating a second one.

### Branch naming

Every branch carries the resolved prefix (`feature/` by default):

| Case | Branch |
|---|---|
| GitHub issue | `{prefix}{ID}-{short-kebab-slug}` (title via `gh issue view {ID}`) |
| Generic feature | `{prefix}{short-kebab-slug}` |

A bare `issue-3-foo` branch (no prefix) is **not** a git flow branch — `git flow
feature finish` won't find it. Keep the prefix.

### Create the branch

```bash
git checkout {integration} && git pull
git flow feature start {ID}-{slug}      # → {prefix}{ID}-{slug}
```

Without the extension, the equivalent is — note the prefix goes **in** the name
here, but **not** in the `git flow` command:

```bash
git checkout -b {prefix}{ID}-{slug}
```

Parallel issues → one worktree per branch, so they don't fight over the checkout:

```bash
git worktree add ../{repo}-{slug} {prefix}{ID}-{slug}   # {repo} = current repo dir name
```

### If the repo plans on a board

When the repo is tracked by a GitHub Project, move the card to the in-progress
column now — see the `gh-project` skill. Skip silently if there is no project.

---

## Scope change mid-feature

A request that has nothing to do with the feature currently checked out does **not**
silently join it. One branch per feature is the whole point — a stray fix riding
along makes the branch impossible to review, revert, or finish cleanly.

When the new request is out of scope:

1. **Ask where it goes** — on this branch, or on a new feature branch. Say which
   feature is currently open so the user can judge.
2. **If the answer is a new branch, ask what happens to the current one** before
   creating anything:
   - **Finish it now** → run [**Finish**](#finish) to the end, then [**Start**](#start)
     the new feature off the integration branch.
   - **Park it** → commit or stash the work in progress, then branch the new feature
     off the integration branch, never off the current one. A feature branched off an
     unmerged feature inherits its commits and cannot be merged independently.
3. **If the answer is this branch**, continue on it — but keep the branch name honest;
   rename it (`git branch -m`) if it no longer describes the work.

Judging scope: same files and same intent as the open feature → in scope. A different
subsystem, an unrelated bug, or a "while you're at it" → out of scope. When it is a
close call, ask; the cost of asking is a sentence, the cost of guessing is a tangled
branch.

---

## Finish

Wrap up a completed task on the current feature branch.

### 1. Checks green

The repo's own checks must be green before committing. **Read them, don't guess** —
in rough order of precedence:

| Source | Look for |
|---|---|
| `package.json` | `scripts`: `lint`, `typecheck`, `test`, `test:e2e`, `build` |
| `Makefile` | `make test`, `make lint`, `make check` |
| `composer.json` | `scripts`: `test`, `phpstan`, `phpcs` |
| `.github/workflows/*.yml` | the authoritative list — CI runs these on the PR |

Rules:

- A monorepo may have per-package suites that the root script does **not** cover.
  Check the workspace config (`pnpm-workspace.yaml`, `workspaces`, `turbo.json`)
  and run each affected package's suite.
- Prefer read-only invocations. A `lint` script that runs with `--fix` dirties the
  tree and will break the merge step — run the non-fixing variant, or commit the
  fixes deliberately.
- In a worktree with a non-standard `node_modules`, call binaries directly
  (`./node_modules/.bin/…`).
- **Paste the output.** Never claim "green" or "done" without it. A red suite is
  work, not an obstacle — do not skip or comment out failing tests.

### 2. Commit

Commit the work with a message that references `#{ID}` for issue work, so GitHub
links the commit to the issue.

### 3. Merge or PR

**Ask the user first** whether they want a PR or a direct merge — never auto-merge,
never push to the integration branch unprompted.

```bash
git flow feature finish {ID}-{slug}     # direct merge (or: git merge --no-ff)
gh pr create --base {integration} --fill --web   # PR instead
```

Closing keywords in the PR body (`Closes #{ID}`) let GitHub close the issue on
merge — and a board card in a `Done` column follows automatically if the project
has the default workflow enabled.

### 4. Clean up

```bash
git worktree remove ../{repo}-{slug}    # if a worktree was used
```

Delete the merged branch.

---

## Rules

- Never commit, push, or merge into the integration or production branch without an
  explicit user instruction.
- One branch per feature/issue. An out-of-scope request pauses for a decision — see
  [Scope change mid-feature](#scope-change-mid-feature) — it never just joins the
  open branch.
- Never auto-merge — hand back for review/PR.
- Never claim checks passed without pasted output.
