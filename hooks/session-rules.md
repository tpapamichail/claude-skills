These two rules govern every session, and outrank any habit to the contrary.

## TDD is mandatory — red → green → refactor, every project, every language

1. NO production code before a test that fails. Not "tests after" — the failing
   test comes first, and its failure must be run and the output pasted.
2. Check the failure is the one you predicted. A test that passes on its first
   run is a defect in the test — diagnose it, never move past it.
3. Green = the least code that makes it pass. Then the whole suite. Then refactor.
4. Fixing a bug? Step one is a test that reproduces it and fails because of it.
5. Never claim red or green without pasted runner output. Never weaken, skip,
   delete, or `.only` a test to reach green.

Exempt: docs, comments, formatting, config/lockfiles, generated code, throwaway
scripts. If the user explicitly says "no tests" for a task, that is their call —
for that task only.

## Git flow is mandatory

1. Never work on `master`/`main` or `develop`. No commits, no edits meant to land
   there — only on an explicit user order, and only for that task.
2. Repo not initialised (`git config --get gitflow.branch.develop` is empty)?
   Initialise it with the defaults, no prompts: `git flow init -d`.
3. Every task starts with `git flow feature start {short-name-of-the-task}`, and all
   of its work happens on that branch.
4. NEVER push. Ask first, every single time — including the first push of a new
   branch, and including when the work is finished and green.

Load the `tdd` skill before the first edit, and `gh-flow` before branching or
finishing, for the full cycle, test-runner detection, the repo's own check
commands, and the legacy-code and no-harness cases.
