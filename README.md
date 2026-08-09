# claude-skills

My personal [Agent Skills](https://skills.sh) — installable with the `skills` CLI
into Claude Code or any other agent it supports.

```bash
npx skills add tpapamichail/claude-skills            # this project only
npx skills add -g tpapamichail/claude-skills         # globally, all projects
npx skills add tpapamichail/claude-skills -s gh-flow # just one
```

Installs as a symlink by default, so editing a skill here updates every project
that installed it. Pass `--copy` if you want independent copies instead.

## The skills

A single workflow, split by how big the work is:

| Skill | Use it when | Owns |
|---|---|---|
| [`gh-flow`](skills/gh-flow/SKILL.md) | always | branches, checks, merge/PR |
| [`gh-issue`](skills/gh-issue/SKILL.md) | the task is a GitHub issue | triage, affected areas, plan |
| [`gh-project`](skills/gh-project/SKILL.md) | the repo plans on a Projects board | what's next, card status |

They compose downward — `gh-project` picks the item, `gh-issue` triages it, `gh-flow`
branches it. Each one defers to the next instead of restating its rules, so `gh-flow`
alone is enough for a small repo.

### gh-flow

Every task gets its own feature branch off the integration branch; nothing is ever
committed straight to `develop`/`main`. Detects the repo's git flow config, branch
prefix, and check commands rather than assuming them — works in a `git flow` repo and
in a plain-git one. `finish` refuses to claim green without pasted test output, and
never auto-merges.

### gh-issue

Issue → ready-to-code. Reads the issue and its comments, maps labels to code areas,
fans the code exploration out to read-only sub-agents so the main session stays
clean, then presents a triage and waits for approval before anything is edited.

### gh-project

Drives work from a GitHub Projects board. Discovers the board's real field and column
names instead of hardcoding them, filters server-side with `--query` (a years-old
board is not something to paginate), and keeps cards in sync at the transitions that
actually matter: branch created, PR opened, PR merged.

Needs the `project` token scope — `gh auth refresh -s project`.

## Requirements

- [`gh`](https://cli.github.com) authenticated (`gh auth login`)
- `git`; the [git-flow](https://github.com/nvie/gitflow) extension is optional
- `gh` ≥ 2.97 for `gh-project` — it relies on `item-edit --field/--value` and
  `item-list --query`, which avoid raw GraphQL node IDs

## Conventions

Skills here follow three rules, which is most of why they're reusable:

1. **Detect, never hardcode.** Repo name, base branch, branch prefix, test commands,
   board columns — all resolved at runtime.
2. **Evidence over assertion.** No "done" or "green" without pasted output.
3. **Ask before anything irreversible.** No auto-merge, no push to a shared branch,
   no bulk board edits.

## License

MIT — see [LICENSE](LICENSE).
