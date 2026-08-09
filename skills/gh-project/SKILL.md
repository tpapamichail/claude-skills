---
name: gh-project
description: Drive work from a GitHub Projects board in any repo — read the board, pick the next task, move cards between Status columns, and keep the board in sync with branches and PRs. Use when the user types /gh-project, says "what's on the board", "what should I work on", "move this to in progress", or when a repo plans with a Project rather than milestones.
allowed-tools: Bash(gh:*), Bash(git:*), Read, Grep, Glob, Skill, Agent
---

# GitHub Projects Workflow

For projects big enough that issues alone don't carry the plan. The board is the
source of truth for **what's next**; the issue is the source of truth for **what it
is**; `gh-flow` owns the **branch**.

Requires the `project` token scope. Check once, and if it's missing stop and ask the
user to run the refresh themselves — it opens a browser:

```bash
gh auth status                       # look for 'project' in Token scopes
gh auth refresh -s project           # only the user can complete this
```

---

## Discover the board

Never hardcode the project number, field names, or column names — they differ per
board. Resolve them once per session, then cache the result in the project's
`CLAUDE.md` so later sessions skip the discovery.

```bash
gh project list --owner @me --limit 20              # personal boards
gh project list --owner {org} --limit 20            # org boards
gh repo view --json nameWithOwner -q .nameWithOwner # which repo we're in
```

A board may be owned by an org while the issues live in a user repo, or one board
may span several repos. If more than one board could apply, **ask** — don't guess.

Then read the schema:

```bash
gh project field-list {N} --owner {owner} --format json
```

What matters in the output:

- The **single-select** fields (`ProjectV2SingleSelectField`) and their `options` —
  these are the columns you can move cards between.
- The default GitHub template gives `Status` (`Backlog`, `In progress`, `In review`,
  `Done`), plus `Priority` and `Size`. Treat those names as *likely*, never certain.
- An **iteration** field (`ProjectV2IterationField`) means the board plans in
  sprints; the current iteration is the planning bucket, not the whole backlog.

Record what you found:

```
Board: {owner}/{N} "{title}"
Status: Backlog → In progress → In review → Done
Other fields: Priority (P0/P1/P2), Size (XS…XL)
```

---

## `/gh-project` — what's on the board

Filter **server-side** with `--query`, using the Projects filter syntax. Never fetch
the whole board and filter afterwards: a long-lived board spans years of closed
items, and paginating it wastes the context you need for the actual work.

```bash
gh project item-list {N} --owner {owner} --format json --limit 50 \
  --query "assignee:@me -status:Done" \
  --field Status --field Priority
```

Useful queries:

| Goal | `--query` |
|---|---|
| My open work | `assignee:@me -status:Done` |
| Ready to pick up | `no:assignee status:Backlog` |
| Current sprint | `iteration:@current` |
| Needs review | `status:"In review"` |
| Hot | `priority:P0 -status:Done` |

Present it grouped by Status in board order (Backlog → In progress → In review),
mine first. Within a group sort by Priority, then Size ascending — smallest useful
thing first. Draft items (no issue URL) can't be branched from; mark them as drafts
and say they need converting to issues first.

## `/gh-project next` — pick the next task

1. List `no:assignee status:Backlog` (plus `iteration:@current` if the board has
   iterations), ordered by Priority.
2. Propose **one** item with a one-line reason, and the two runners-up.
3. On approval: assign it, move it to the in-progress column, then hand off.

```bash
gh issue edit {ID} --add-assignee @me
gh project item-edit {N} --owner {owner} --url {issue-url} \
  --field Status --value "In progress"
```

> `--url` is the **issue or PR** URL, not a project URL. For non-draft issues only
> **one field per invocation** — run `item-edit` once per field you're changing.

4. Then invoke **`gh-issue`** for the triage and **`gh-flow`** for the branch. This
   skill does not duplicate their rules.

## `/gh-project move <ID> <column>` — sync the board

Match the user's word to an actual option name from `field-list` (case-sensitive,
and `"In progress"` needs the quotes). If nothing matches, list the real options
rather than inventing one.

```bash
gh project item-edit {N} --owner {owner} --url {issue-url} --field Status --value "{option}"
```

Keep the board honest at the transitions that matter:

| Moment | Column |
|---|---|
| Branch created, work starting | In progress |
| PR opened | In review |
| PR merged / issue closed | Done |

Before setting `Done` by hand, check whether the board already did it: GitHub's
built-in project workflows move cards on issue-close and PR-merge. Re-setting a
field that's already correct is noise, not sync.

## Adding work to the board

```bash
gh project item-add {N} --owner {owner} --url {issue-url}          # existing issue
gh project item-create {N} --owner {owner} --title "…" --body "…"  # draft idea
```

Prefer real issues over drafts for anything that will be coded — a draft has no
number, so no branch, no commit reference, and no PR link.

---

## Rules

- The board mirrors reality; it does not replace the issue. Acceptance criteria and
  discussion belong in the issue.
- Never move a card to `Done` because the code is written. `Done` means merged.
- Never bulk-edit a board without showing the user the list first and getting an OK.
- One item in progress at a time unless the user says otherwise. A board with six
  cards in progress is a board nobody trusts.
- Don't paginate a board's full item list. Filter with `--query`.
