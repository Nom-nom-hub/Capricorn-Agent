import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
	MAX_GOAL_CHECK_OUTPUT_PREVIEW_CHARS,
	readGoalWorktreeIdentity,
	validateGoalAcceptanceChecks,
	verifyGoalAcceptanceChecks,
} from "../src/core/goal-verification.js";
import { isPersistedGoalState } from "../src/core/goals.js";

const tempDirs: string[] = [];

function makeGitWorkspace(): string {
	const cwd = mkdtempSync(join(tmpdir(), "capricorn-proof-"));
	tempDirs.push(cwd);
	spawnSync("git", ["init", "-q"], { cwd });
	spawnSync("git", ["config", "user.email", "proof@capricorn.local"], { cwd });
	spawnSync("git", ["config", "user.name", "Capricorn Proof"], { cwd });
	writeFileSync(join(cwd, "fixture.txt"), "stable\n");
	spawnSync("git", ["add", "fixture.txt"], { cwd });
	spawnSync("git", ["commit", "-qm", "fixture"], { cwd });
	return cwd;
}

function nodeCommand(script: string): string {
	return `${JSON.stringify(process.execPath)} -e ${JSON.stringify(script)}`;
}

function sha256(value: string): string {
	return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

afterEach(() => {
	while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

describe("goal proof verification", () => {
	test("validates bounded user-declared proof policies", () => {
		expect(validateGoalAcceptanceChecks([{ command: "npm test" }])).toEqual([
			{ command: "npm test", timeoutSeconds: 120 },
		]);
		expect(() => validateGoalAcceptanceChecks([{ command: "" }])).toThrow("must not be empty");
		expect(() => validateGoalAcceptanceChecks([{ command: "true", timeoutSeconds: 301 }])).toThrow(
			"1 to 300 seconds",
		);
	});

	test("records a passing bounded certificate and stable Git identity", async () => {
		const cwd = makeGitWorkspace();
		const certificate = await verifyGoalAcceptanceChecks({
			goalId: "goal-1",
			cwd,
			checks: [{ command: nodeCommand("process.stdout.write('proof-ok')"), timeoutSeconds: 5 }],
		});
		expect(certificate).toMatchObject({ version: 1, goalId: "goal-1", passed: true });
		expect(certificate.worktree.stable).toBe(true);
		expect(certificate.worktree.after).toMatchObject({ dirty: false });
		expect(certificate.worktree.after.head).toMatch(/^[0-9a-f]{40}$/);
		expect(certificate.checks[0]).toMatchObject({
			passed: true,
			exitCode: 0,
			timedOut: false,
			stdoutDigest: sha256("proof-ok"),
			outputBytes: 8,
		});
		expect(certificate.checks[0].outputPreview).toContain("proof-ok");
	});

	test("keeps failed and timed-out checks as auditable failed receipts", async () => {
		const cwd = makeGitWorkspace();
		const failed = await verifyGoalAcceptanceChecks({
			cwd,
			checks: [{ command: nodeCommand("process.stderr.write('nope'); process.exit(7)"), timeoutSeconds: 5 }],
		});
		expect(failed.passed).toBe(false);
		expect(failed.checks[0]).toMatchObject({ passed: false, exitCode: 7, timedOut: false });
		expect(failed.checks[0].outputPreview).toContain("nope");

		const timedOut = await verifyGoalAcceptanceChecks({
			cwd,
			checks: [{ command: nodeCommand("setTimeout(() => {}, 5000)"), timeoutSeconds: 1 }],
		});
		expect(timedOut.passed).toBe(false);
		expect(timedOut.checks[0]).toMatchObject({ passed: false, timedOut: true });
	});

	test("fails closed outside Git and when verification is already aborted", async () => {
		const cwd = mkdtempSync(join(tmpdir(), "capricorn-proof-nongit-"));
		tempDirs.push(cwd);
		const unbound = await verifyGoalAcceptanceChecks({
			cwd,
			checks: [{ command: nodeCommand("process.exit(0)"), timeoutSeconds: 5 }],
		});
		expect(unbound.checks[0].passed).toBe(true);
		expect(unbound).toMatchObject({ passed: false, worktree: { stable: false } });

		const controller = new AbortController();
		controller.abort();
		const aborted = await verifyGoalAcceptanceChecks({
			cwd: makeGitWorkspace(),
			signal: controller.signal,
			checks: [{ command: nodeCommand("process.exit(0)"), timeoutSeconds: 5 }],
		});
		expect(aborted.passed).toBe(false);
		expect(aborted.checks).toHaveLength(0);
	});

	test("detects a same-commit branch switch as a changed worktree identity", async () => {
		const cwd = makeGitWorkspace();
		const certificate = await verifyGoalAcceptanceChecks({
			cwd,
			checks: [{ command: "git switch -q -c proof-branch", timeoutSeconds: 5 }],
		});
		expect(certificate.checks[0].passed).toBe(true);
		expect(certificate).toMatchObject({ passed: false, worktree: { stable: false } });
		expect(certificate.worktree.before.head).toBe(certificate.worktree.after.head);
		expect(certificate.worktree.before.branch).not.toBe(certificate.worktree.after.branch);
	});

	test("cancels the process tree through an abort signal", async () => {
		const cwd = makeGitWorkspace();
		const controller = new AbortController();
		setTimeout(() => controller.abort(), 100);
		const certificate = await verifyGoalAcceptanceChecks({
			cwd,
			signal: controller.signal,
			checks: [{ command: nodeCommand("setTimeout(() => {}, 5000)"), timeoutSeconds: 5 }],
		});
		expect(certificate.passed).toBe(false);
		expect(certificate.checks[0]).toMatchObject({ passed: false, aborted: true });
	});

	test("bounds previews while hashing all captured output", async () => {
		const cwd = makeGitWorkspace();
		const certificate = await verifyGoalAcceptanceChecks({
			cwd,
			checks: [{ command: nodeCommand("process.stdout.write('x'.repeat(20000))"), timeoutSeconds: 5 }],
		});
		const result = certificate.checks[0];
		expect(result.passed).toBe(true);
		expect(result.outputBytes).toBe(20000);
		expect(result.outputPreview.length).toBeLessThanOrEqual(MAX_GOAL_CHECK_OUTPUT_PREVIEW_CHARS);
		expect(result.truncated).toBe(true);
		expect(result.stdoutDigest).toBe(sha256("x".repeat(20000)));
	});

	test("fails closed when a check exceeds the hard output limit", async () => {
		const cwd = makeGitWorkspace();
		const certificate = await verifyGoalAcceptanceChecks({
			cwd,
			checks: [
				{
					command: nodeCommand("process.stdout.write('x'.repeat(11 * 1024 * 1024))"),
					timeoutSeconds: 5,
				},
			],
		});
		expect(certificate.passed).toBe(false);
		expect(certificate.checks[0]).toMatchObject({ passed: false, outputLimitExceeded: true });
	});

	test("round-trips strict persisted proof state and rejects malformed certificates", async () => {
		const cwd = makeGitWorkspace();
		const proof = await verifyGoalAcceptanceChecks({
			goalId: "goal-persist",
			cwd,
			checks: [{ command: nodeCommand("process.exit(0)"), timeoutSeconds: 5 }],
		});
		const state = {
			active: false,
			status: "complete",
			goalId: "goal-persist",
			objective: "persist proof",
			tokensUsed: 1,
			timeUsedSeconds: 2,
			continuationsUsed: 0,
			acceptanceChecks: [{ command: nodeCommand("process.exit(0)"), timeoutSeconds: 5 }],
			proof,
			completionKind: "verified",
		};
		expect(isPersistedGoalState(JSON.parse(JSON.stringify(state)))).toBe(true);
		expect(isPersistedGoalState({ ...state, proof: { ...proof, worktree: { stable: true } } })).toBe(false);
		expect(isPersistedGoalState({ ...state, proof: { ...proof, passed: false } })).toBe(false);
		expect(isPersistedGoalState({ ...state, proof: { ...proof, goalId: "another-goal" } })).toBe(false);
	});

	test("rejects a pass when the check changes the worktree being certified", async () => {
		const cwd = makeGitWorkspace();
		const before = readGoalWorktreeIdentity(cwd);
		const certificate = await verifyGoalAcceptanceChecks({
			cwd,
			checks: [
				{
					command: nodeCommand("require('node:fs').writeFileSync('proof-artifact.txt', 'changed')"),
					timeoutSeconds: 5,
				},
			],
		});
		expect(certificate.checks[0].passed).toBe(true);
		expect(certificate.passed).toBe(false);
		expect(certificate.worktree.stable).toBe(false);
		expect(certificate.worktree.after.snapshotDigest).not.toBe(before.snapshotDigest);
	});
});
