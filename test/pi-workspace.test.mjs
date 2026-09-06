import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { resolveWorkspaceCwd } from "../src/pi-routing.mjs";

async function makeSession(t) {
  const session = await mkdtemp(join(tmpdir(), "workspace-"));
  t.after(() => rm(session, { recursive: true, force: true }));
  await mkdir(join(session, "sub"));
  return session;
}

test("an undefined request cwd resolves to the session workspace", async (t) => {
  const session = await makeSession(t);
  assert.equal(await resolveWorkspaceCwd(undefined, session), await realpath(session));
});

test("an empty request cwd resolves to the session workspace", async (t) => {
  const session = await makeSession(t);
  assert.equal(await resolveWorkspaceCwd("", session), await realpath(session));
});

test("a relative path inside the session resolves and is returned realpathed", async (t) => {
  const session = await makeSession(t);
  assert.equal(await resolveWorkspaceCwd("sub", session), await realpath(join(session, "sub")));
});

test("a sibling directory sharing the session prefix is rejected", async (t) => {
  const session = await makeSession(t);
  const sibling = `${session}-evil`;
  await mkdir(sibling);
  t.after(() => rm(sibling, { recursive: true, force: true }));
  await assert.rejects(() => resolveWorkspaceCwd(sibling, session), /escapes the session workspace/);
});

test("a relative escape above the session is rejected", async (t) => {
  const session = await makeSession(t);
  await assert.rejects(() => resolveWorkspaceCwd("..", session), /escapes the session workspace/);
});

test("an absolute path outside the session is rejected", async (t) => {
  const session = await makeSession(t);
  await assert.rejects(() => resolveWorkspaceCwd(tmpdir(), session), /escapes the session workspace/);
});

test("a UNC-style path is rejected before touching the filesystem", async (t) => {
  const session = await makeSession(t);
  await assert.rejects(() => resolveWorkspaceCwd("\\\\host\\share", session), /escapes the session workspace/);
});

test("a symlink inside the session pointing outside is rejected", async (t) => {
  const session = await makeSession(t);
  await symlink(tmpdir(), join(session, "out-link"));
  await assert.rejects(() => resolveWorkspaceCwd("out-link", session), /escapes the session workspace/);
});

test("a symlink inside the session pointing inside is accepted", async (t) => {
  const session = await makeSession(t);
  await symlink(join(session, "sub"), join(session, "in-link"));
  assert.equal(await resolveWorkspaceCwd("in-link", session), await realpath(join(session, "sub")));
});

test("a nonexistent path is rejected with a clear error", async (t) => {
  const session = await makeSession(t);
  await assert.rejects(() => resolveWorkspaceCwd("missing", session), /does not exist/);
});
