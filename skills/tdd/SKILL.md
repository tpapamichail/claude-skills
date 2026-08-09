---
name: tdd
description: Red-green-refactor is mandatory for this user. Load BEFORE writing or modifying any production code, in any language — no implementation line is written until a test exists that fails for the right reason, and the failure is pasted as proof. Triggers on "implement", "add", "build", "fix", "refactor", a bug report, a new function/class/endpoint, or any edit to a file that has (or should have) tests. SKIP only for docs, comments, config/lockfiles, and throwaway scripts.
allowed-tools: Bash(npm:*), Bash(pnpm:*), Bash(yarn:*), Bash(npx:*), Bash(make:*), Bash(composer:*), Bash(vendor/bin/*), Bash(pytest:*), Bash(python:*), Bash(uv:*), Bash(go:*), Bash(cargo:*), Bash(dotnet:*), Bash(mvn:*), Bash(gradle:*), Bash(bundle:*), Bash(rspec:*), Bash(git:*), Read, Glob, Grep, Edit, Write
---

# tdd

One rule, and everything else follows from it:

> **No line of production code is written until a test demands it — and the test has
> been seen to fail first.**

A test written after the implementation proves nothing about the implementation. It
proves only that the code does what it already does.

## The cycle

| Phase | Goal | Done when |
|---|---|---|
| 🔴 **Red** | A test that expresses the *next* behaviour | It fails, and the failure message is the one you predicted |
| 🟢 **Green** | Make it pass | The suite is green, by the least code that could work |
| 🔵 **Refactor** | Remove the mess you just made | The suite is still green, with no new behaviour |

One behaviour per cycle. If the test you are about to write needs three
things to be true, it is three cycles.

---

## Resolve the test command first

Never hardcode the runner or guess an invocation. Detect it once per session, in
this order of precedence:

| Source | Look for |
|---|---|
| `.github/workflows/*.yml` | authoritative — this is what CI actually runs |
| `package.json` | `scripts`: `test`, `test:unit`, `test:watch` |
| `Makefile` | `test`, `check` |
| `composer.json` | `scripts.test`; else `vendor/bin/phpunit` |
| `pyproject.toml` / `pytest.ini` / `tox.ini` | `pytest`, `uv run pytest` |
| `Cargo.toml`, `go.mod`, `*.csproj`, `Gemfile` | `cargo test`, `go test ./...`, `dotnet test`, `bundle exec rspec` |

Then find how the project already writes tests before adding one — mirror its
layout, naming, and assertion style:

```
tests/  test/  spec/  __tests__/  *_test.go  *.test.ts  *.spec.ts  test_*.py
```

Learn the single-test invocation too, not just the whole suite — you will run one
test dozens of times per cycle:

```bash
npx vitest run path/to/file.test.ts -t "name"
pytest tests/test_file.py::test_name -x
go test ./pkg -run TestName
vendor/bin/phpunit --filter testName
```

**No test harness at all?** Stop and say so. Setting one up is a decision for the
user, not a step to take silently — and it changes the shape of the task.

---

## 🔴 Red

Write the smallest test that captures one behaviour the code does not yet have.

### The test comes from the requirement, not from the code

Write the assertion you *want* to be true. Do not read the implementation first and
describe it back — that is how a test ends up asserting the bug.

For a **bug fix**, the red test *is* the reproduction. Reproduce first:

1. Write a test that fails **because the bug exists**.
2. Paste that failure. It is the proof the bug is real and that you found the right
   cause — not a guess at it.
3. Only then fix.

For **legacy code with no coverage** that you must change: pin the current behaviour
with a characterization test first (green immediately), so the refactor has a net.
Then start the red cycle for the new behaviour.

### Run it and read the failure

```bash
{single-test command}
```

**Paste the failure output.** Then check it against what you predicted:

| Failure | Meaning |
|---|---|
| Assertion failed, expected X got Y | ✅ Correct red — proceed |
| `undefined is not a function`, `ImportError`, `NameError` | ✅ Acceptable red for a not-yet-existing unit |
| Syntax error, missing fixture, wrong path, config error | ❌ Broken test, not a red — fix the test |
| **Passes** | ❌ Stop. The behaviour already exists, or the test asserts nothing |

A test that passes on the first run is the most important signal in the cycle, and
the easiest to wave away. It means one of: the feature is already there (say so and
stop), the assertion is vacuous (`expect(true).toBe(true)`, a mock asserting on
itself), or the test never ran (wrong file, filtered out, silently skipped).
Diagnose it — never "fix" it by moving on.

---

## 🟢 Green

Write the **least** code that turns the test green. Not the code you know you will
need — the code this test demands.

- Hardcoding a return value is a legitimate first green. The next red test is what
  forces the generalisation.
- No extra parameters, branches, config, or abstraction "while I'm here". If no test
  fails without it, it does not get written.
- Do not touch unrelated files.

Then run the **whole suite**, not just the new test — green here means nothing else
broke — and paste the output.

Never make a test pass by weakening it: no deleting assertions, no loosening a
comparison, no `skip`/`xfail`/`.only`, no widening a mock to swallow the call. If
the test is wrong, say why and rewrite it deliberately.

---

## 🔵 Refactor

Only with a green suite. Structure changes, behaviour does not.

Remove the duplication the green step introduced, name what appeared, collapse what
was a hardcode. Re-run the suite after each step — a refactor that needs a test
changed is not a refactor, it is a behaviour change, and it needs its own red first.

Then start the next cycle.

---

## When the user asks for code without tests

Do not silently produce untested implementation, and do not refuse. Write the test
first anyway — it is the workflow they asked for, standing. Say in one line what you
are testing, then proceed.

If they explicitly override for a given task ("no tests here"), that is their call:
acknowledge it and write the code. The override applies to that task, not to the
session.

## Out of scope

Docs, comments, formatting, config and lockfiles, generated code, dependency bumps,
and genuine one-off scripts. Everything else is production code.

---

## Rules

- No production code before a failing test.
- Never claim red or green without pasted runner output.
- A test that passes on its first run is a defect in the test — diagnose it, never skip past it.
- One behaviour per cycle; the whole suite green before the next one.
- Never weaken, skip, or delete a test to get to green.
- Never write code no failing test demands.
