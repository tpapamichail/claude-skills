# claude-skills

My personal [Agent Skills](https://skills.sh) — a test-first GitHub workflow.

## Install

**With the `skills` CLI** — works in Claude Code and every other agent it supports:

```bash
npx skills add tpapamichail/claude-skills            # this project only
npx skills add -g tpapamichail/claude-skills         # globally, all projects
npx skills add tpapamichail/claude-skills -s gh-flow # just one
```

Installs as a symlink by default, so editing a skill here updates every project
that installed it. Pass `--copy` if you want independent copies instead.

**As a Claude Code plugin** — no Node or `npx` required, and versioned:

```
/plugin marketplace add tpapamichail/claude-skills
/plugin install claude-skills@claude-skills
```

Same skills, same directory — the repo is both a skills package and a
self-contained plugin marketplace. The plugin route adds versioned releases
(`claude plugin update`) and is the one that can ship hooks and slash commands
later; the `skills` CLI route is the portable one. Pick either.

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

Plus one that cuts across all of them:

| Skill | Use it when | Owns |
|---|---|---|
| [`tdd`](skills/tdd/SKILL.md) | any production code is written | red-green-refactor |

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

### tdd

Red-green-refactor, enforced rather than described. No production line before a test
that fails *for the predicted reason*; a test that passes on its first run is treated
as a defect in the test, not a lucky break. Bug fixes start from a reproduction test,
legacy code gets a characterization test before it is touched, and neither red nor
green may be claimed without pasted runner output. Detects the project's runner and
its single-test invocation from CI config first — never `npm test` on faith.

Its `description` is written to load in every session, so the rule is present before
the first line of code, not recalled after it.

## Always-on TDD

Installing the skill makes the rule *available*. Making it **standing** — present
before the first line of code in every session, not recalled after it — takes one of
two things.

**Via the plugin (automatic).** The plugin ships a `SessionStart` hook
([`hooks/hooks.json`](hooks/hooks.json)) that prints
[`hooks/tdd-reminder.md`](hooks/tdd-reminder.md) into context on `startup`, `resume`,
`clear` and `compact` — and a `SubagentStart` hook, so delegated work inherits the
rule instead of quietly skipping it. Nothing to configure; it fires from the moment
you install. Edit `tdd-reminder.md` to change the wording.

**Via `CLAUDE.md` (manual).** The `skills` CLI route has no hooks, so add this to
`~/.claude/CLAUDE.md` (user-level, every project) or to a project's `CLAUDE.md`:

```markdown
## Workflow

Work test-first, always: red → green → refactor. Load the `tdd` skill before writing
or changing any production code. No implementation before a test that fails for the
right reason, and no "it passes" without pasted test output.
```

Neither installer writes to your `CLAUDE.md` on its own — that boundary is
deliberate.

## Requirements

- [`gh`](https://cli.github.com) authenticated (`gh auth login`)
- `git`; the [git-flow](https://github.com/nvie/gitflow) extension is optional
- `gh` ≥ 2.97 for `gh-project` — it relies on `item-edit --field/--value` and
  `item-list --query`, which avoid raw GraphQL node IDs

## Companion tools

Not shipped here, but part of how I actually work — install them separately.

| Tool | What it is | Why |
|---|---|---|
| [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) | MCP server | code search over a knowledge graph instead of grep |
| [nestjs-best-practices](https://www.skills.sh/kadajett/agent-nestjs-skills/nestjs-best-practices) | Agent Skill | NestJS conventions on the projects that use it |

**codebase-memory-mcp** indexes the repo into a graph, so "who calls this", "what
breaks if I change it", and "where is X wired" are structural queries
(`search_graph`, `trace_path`, `get_code_snippet`) rather than a text sweep. It pairs
directly with `gh-issue`, whose triage step is mostly exploration: the sub-agents map
the affected areas from the graph instead of grepping their way there.

```bash
curl -fsSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh | bash
```

The installer detects the coding agent and registers the server itself — no
`claude mcp add`, no external database. Restart the agent, then index a repo once
with `index_repository` before the first query.

**nestjs-best-practices** is the stack-specific layer these skills deliberately don't
have — `tdd` and `gh-flow` say *how* to work; its 40 practices, ordered by priority
across architecture, DI, security and performance, say what good looks like in a
NestJS codebase.

```bash
npx skills add https://github.com/kadajett/agent-nestjs-skills --skill nestjs-best-practices
```

## Conventions

Skills here follow three rules, which is most of why they're reusable:

1. **Detect, never hardcode.** Repo name, base branch, branch prefix, test commands,
   board columns — all resolved at runtime.
2. **Evidence over assertion.** No "done" or "green" without pasted output.
3. **Ask before anything irreversible.** No auto-merge, no push to a shared branch,
   no bulk board edits.

## Releasing

The plugin manifests live in [`.claude-plugin/`](.claude-plugin). Both must validate
clean before a release, and the version in `plugin.json` must match the marketplace
entry — `tag` refuses otherwise:

```bash
claude plugin validate . --strict
claude plugin tag . --dry-run          # then drop --dry-run, add --push
```

Bump the version in **both** `plugin.json` and the `plugins[]` entry of
`marketplace.json`.

## License

MIT — see [LICENSE](LICENSE).
