import { realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";

import { selectRoute } from "./routing.mjs";

// vcs-read, external-read, and web-search all map to bash, so the Pi runtime
// has no sandboxed read-only tool set: the external-researcher's read-only
// guarantee is prompt discipline, not enforcement.
const PI_TOOL_MAP = Object.freeze({
  "workspace-read": ["read"],
  "workspace-search": ["grep", "find", "ls"],
  "vcs-read": ["bash"],
  "external-read": ["read", "bash"],
  "web-search": ["bash"],
  "workspace-write": ["edit", "write"],
  execute: ["bash"],
});

function unique(values) {
  return [...new Set(values)];
}

function renderSystemPrompt(agent) {
  return [
    `You are the ${agent.id}.`,
    agent.description,
    `Use when: ${agent.useWhen.join(" ")}`,
    `Do not use when: ${agent.avoidWhen.join(" ")}`,
    `State access: ${agent.stateAccess}.`,
    `Output contract: ${agent.outputContract}`,
    "Complete only the assigned task. Do not perform unrelated validation, cleanup, or state changes. Report missing capabilities instead of broadening permissions.",
  ].join("\n\n");
}

export function preparePiTask(request, { catalog, tiers, models }) {
  const route = selectRoute({ ...request, delegate: true }, catalog, tiers);
  if (route.agent === "main") {
    throw new Error("No eligible subagent covers this task; keep it in the main session.");
  }

  const agent = catalog.agents.find((candidate) => candidate.id === route.agent);
  const tier = tiers.tiers.find((candidate) => candidate.id === route.tier);
  const model = models[route.tier];
  if (!agent || !tier) throw new Error("The routing catalog is internally inconsistent.");
  if (!model) throw new Error(`Missing model mapping for ${route.tier}.`);

  return {
    agent,
    task: request.task,
    tier: route.tier,
    model,
    effort: tier.effort,
    tools: unique(agent.capabilities.flatMap((capability) => PI_TOOL_MAP[capability] ?? [])),
    systemPrompt: renderSystemPrompt(agent),
  };
}

export function buildPiArgs(prepared, promptPath) {
  return [
    "--mode",
    "json",
    "-p",
    "--no-session",
    "--no-extensions",
    "--model",
    prepared.model,
    "--thinking",
    prepared.effort,
    "--tools",
    prepared.tools.join(","),
    "--append-system-prompt",
    promptPath,
    `Task: ${prepared.task}`,
  ];
}

function textFromMessage(message) {
  if (message?.role !== "assistant" || !Array.isArray(message.content)) return "";
  return message.content
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
}

// Raw child-process output stops accumulating past this size; the agent result
// itself stays bounded separately by truncateOutput.
export const OUTPUT_ACCUMULATION_CAP_BYTES = 2 * 1024 * 1024;

export function createPiOutputParser() {
  let buffer = "";
  let plainOutput = "";
  let finalOutput = "";
  let truncated = false;
  let plainBytes = 0;

  function processLine(line) {
    if (!line.trim()) return;
    try {
      const event = JSON.parse(line);
      if (event.type === "message_end") {
        finalOutput = textFromMessage(event.message) || finalOutput;
      }
    } catch {
      const lineBytes = Buffer.byteLength(line, "utf8") + 1;
      if (plainBytes + lineBytes > OUTPUT_ACCUMULATION_CAP_BYTES) {
        truncated = true;
        return;
      }
      plainBytes += lineBytes;
      plainOutput += `${line}\n`;
    }
  }

  return {
    push(chunk) {
      if (Buffer.byteLength(buffer, "utf8") + Buffer.byteLength(chunk, "utf8") > OUTPUT_ACCUMULATION_CAP_BYTES) {
        // A single line larger than the cap can never become a usable event.
        // Drop the partial line and flag; its remnant falls through as
        // non-JSON once the newline arrives and hits the plain-output cap.
        buffer = "";
        truncated = true;
        return;
      }
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) processLine(line);
    },
    flush() {
      if (buffer) {
        processLine(buffer);
        buffer = "";
      }
    },
    get finalOutput() {
      return finalOutput;
    },
    get plainOutput() {
      return plainOutput;
    },
    get truncated() {
      return truncated;
    },
  };
}

export async function resolveWorkspaceCwd(requestCwd, sessionCwd) {
  const request = requestCwd || sessionCwd;
  // Lexical rejection before any filesystem access: UNC and double-slash
  // prefixes must not reach realpath, where they trigger network lookups.
  if (/^[\\/]{2}/.test(request)) {
    throw new Error(`request.cwd escapes the session workspace: ${request}`);
  }
  const target = resolve(sessionCwd, request);
  const [realTarget, realSession] = await Promise.all([
    realpath(target).catch(() => {
      throw new Error(`request.cwd does not exist: ${target}`);
    }),
    realpath(sessionCwd),
  ]);
  // Point-in-time validation: this guards task routing; it is not a sandbox.
  const prefix = realSession.endsWith(sep) ? realSession : realSession + sep;
  if (realTarget !== realSession && !realTarget.startsWith(prefix)) {
    throw new Error(`request.cwd escapes the session workspace: ${realTarget}`);
  }
  return realTarget;
}
