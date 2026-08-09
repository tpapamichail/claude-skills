---
name: gh-issue
description: Workflow for going from a GitHub issue to ready-to-code state in any repo — triage, affected areas, branch, plan. Use when the user types /gh-issue <number>, /gh-issue list, or says "let's work on issue N", "what's in issue N", "start issue N".
allowed-tools: Bash(gh:*), Bash(git:*), Read, Grep, Glob, Skill, Agent
---

# GitHub Issue Workflow

Issue → ready-to-code, in any repo. Never hardcode the repo, base branch, or test
commands — resolve them from the working directory each session:

```bash
gh repo view --json nameWithOwner,defaultBranchRef
gh api user -q .login                    # = "@me"
git branch -r --list '*/develop'         # non-empty → git flow repo, base is develop
```

If `gh` is not authenticated, stop and ask the user to run `gh auth login`.

## `/gh-issue list [filters]`

```bash
gh issue list --state open --limit 100 --assignee @me \
  --json number,title,labels,milestone,updatedAt
gh issue list --state open --limit 100 --search '-assignee:@me sort:updated-desc' \
  --json number,title,labels,milestone,updatedAt
```

Render **Mine first**, then Others. Within each group sort by whatever planning
bucket the repo actually uses — milestone due date if milestones are populated,
otherwise `updatedAt` desc. No bucket → bottom.

Filters go in `--label` / `--search`, not in post-processing.

> If the repo plans on a **GitHub Project** board (Status/Sprint/Iteration fields)
> rather than milestones, use the `gh-project` skill for the listing — it reads the
> board directly. Do not reach for raw GraphQL; `gh project item-list` covers it.

## `/gh-issue <N>` — Triage

1. `gh issue view <N> --comments`
2. Check for existing work: `git branch -a --list "*<N>*"` and `gh pr list --search "#<N>"`. If found, say so and stop.
3. Map labels → code areas (see below). Don't infer from the title alone — read the body and comments.
4. **Delegate** the code exploration to read-only sub-agents (`Explore`), in parallel, without asking. Never load the files into the main session.
5. Present the triage below and **wait for approval**.

```
Issue #<N>: <title>
Labels: <labels> · Assignee: <user or unassigned>

Summary
<2-3 sentences, in the issue's language>

Affected areas
- <path/to/area>/

Proposed branch
<branch-name>

Open questions (if any)
1. ...

Next step: shall I start? (/gh-issue start <N>)
```

If the issue has no clear acceptance criteria, ask before planning.

## `/gh-issue start <N>` — Begin work

1. **Branch: invoke the `gh-flow` skill.** It owns the naming and base-branch rules — do not invent your own.
2. Load the domain context first: any project-specific skill, the relevant `CLAUDE.md` / `CONTRIBUTING.md` section, or ADR for the affected area. The plan builds on the project's patterns, not invented ones. Skip only for trivial one-liners.
3. Build the plan in the **main session** from the sub-agents' file maps, present it, get approval.
4. Ask once, in one line, whether the edits go in a dedicated implementer sub-agent (isolated context, optionally `isolation: "worktree"`) or inline. If delegating, hand it a self-contained spec — issue # + branch, approved plan, acceptance criteria, project rules — it starts cold.

## `/gh-issue done <N>` — Wrap up

Run the repo's own commands (read `package.json` scripts / `Makefile` / CI config —
don't guess). Delegate the runs to a test-runner sub-agent:

- [ ] Lint / format
- [ ] Type-check / build
- [ ] Unit tests
- [ ] **Integration/e2e tests** — an area isn't done on green unit tests alone. If an area has no e2e spec, say so explicitly rather than skipping silently.
- [ ] Tests added/updated for the affected area
- [ ] Commit messages reference `#<N>`

Report each suite's pass/fail with pasted output. **Never claim "done" or "works"
without evidence.** Then ask the developer whether they want a PR.

## Label → code area

No universal table — derive it per repo once, then record it in the project's
`CLAUDE.md` so future sessions skip the discovery:

```bash
gh pr list --state merged --label "<label>" --limit 3 --json number -q '.[].number' \
  | xargs -I{} gh pr view {} --json files -q '[.files[].path]|unique'
```

Fallback: `bug`/`fix` → the stack trace or repro in the body names the file. Area
labels (`api: *`, `ui: *`) → the matching top-level source dir. No label → read the
body, ask before guessing. If the issue is in another language and the title names a
domain concept, translate before matching directories.

## Anti-patterns

- Editing before the triage is approved.
- Creating a branch when one already exists for the issue (step 2 of triage).
- Reading affected code inline instead of via sub-agents.
- Hardcoding the repo, base branch, or test/lint commands.
