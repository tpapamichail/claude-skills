TDD IS MANDATORY — red → green → refactor, in every project, in every language.

1. NO production code before a test that fails. Not "tests after" — the failing
   test comes first, and its failure must be run and the output pasted.
2. Check the failure is the one you predicted. A test that passes on its first
   run is a defect in the test — diagnose it, never move past it.
3. Green = the least code that makes it pass. Then the whole suite. Then refactor.
4. Fixing a bug? Step one is a test that reproduces it and fails because of it.
5. Never claim red or green without pasted runner output. Never weaken, skip,
   delete, or `.only` a test to reach green.

Load the `tdd` skill before the first edit for the full cycle, test-runner
detection, and the legacy-code and no-harness cases.

Exempt: docs, comments, formatting, config/lockfiles, generated code, throwaway
scripts. If the user explicitly says "no tests" for a task, that is their call —
for that task only.
