import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { StringDecoder } from "node:string_decoder";
import { waitForChildProcess } from "../utils/child-process.js";
import { getShellConfig, getShellEnv, killProcessTree, sanitizeBinaryOutput } from "../utils/shell.js";
import {
	type GoalAcceptanceCheck,
	type GoalProofCertificate,
	type GoalProofCheckResult,
	type GoalWorktreeIdentity,
	goalProofCertificateDigest,
} from "./goals.js";

export const DEFAULT_GOAL_CHECK_TIMEOUT_SECONDS = 120;
export const MAX_GOAL_CHECK_TIMEOUT_SECONDS = 300;
export const MAX_GOAL_ACCEPTANCE_CHECKS = 8;
export const MAX_GOAL_CHECK_COMMAND_CHARS = 1000;
export const MAX_GOAL_CHECK_OUTPUT_PREVIEW_CHARS = 8000;
export const MAX_GOAL_CHECK_OUTPUT_BYTES = 10 * 1024 * 1024;
export const MAX_GOAL_VERIFICATION_SECONDS = 600;

function digest(value: string | Buffer): string {
	return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function validateGoalCheckTimeoutSeconds(value: number): number {
	if (!Number.isInteger(value) || value <= 0 || value > MAX_GOAL_CHECK_TIMEOUT_SECONDS) {
		throw new Error(
			`Goal acceptance check timeout must be an integer from 1 to ${MAX_GOAL_CHECK_TIMEOUT_SECONDS} seconds.`,
		);
	}
	return value;
}

export function validateGoalAcceptanceChecks(
	checks: readonly GoalAcceptanceCheck[],
): Array<GoalAcceptanceCheck & { timeoutSeconds: number }> {
	if (checks.length > MAX_GOAL_ACCEPTANCE_CHECKS) {
		throw new Error(`A goal may declare at most ${MAX_GOAL_ACCEPTANCE_CHECKS} acceptance checks.`);
	}
	return checks.map((check, index) => {
		const command = check.command.trim();
		if (!command) throw new Error(`Goal acceptance check ${index + 1} must not be empty.`);
		if (command.includes("\0")) throw new Error(`Goal acceptance check ${index + 1} must not contain NUL bytes.`);
		if ([...command].length > MAX_GOAL_CHECK_COMMAND_CHARS) {
			throw new Error(
				`Goal acceptance check ${index + 1} must be at most ${MAX_GOAL_CHECK_COMMAND_CHARS} characters.`,
			);
		}
		const timeoutSeconds = check.timeoutSeconds ?? DEFAULT_GOAL_CHECK_TIMEOUT_SECONDS;
		validateGoalCheckTimeoutSeconds(timeoutSeconds);
		return { command, timeoutSeconds };
	});
}

function gitResult(cwd: string, args: string[]): ReturnType<typeof spawnSync> {
	return spawnSync("git", args, {
		cwd,
		env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
		stdio: ["ignore", "pipe", "ignore"],
		timeout: 3000,
		maxBuffer: 32 * 1024 * 1024,
	});
}

function gitOutput(cwd: string, args: string[]): string | undefined {
	const result = gitResult(cwd, args);
	return result.status === 0 && result.stdout ? result.stdout.toString("utf8").trim() : undefined;
}

function gitBuffer(cwd: string, args: string[]): Buffer | undefined {
	const result = gitResult(cwd, args);
	return result.status === 0 && result.stdout ? Buffer.from(result.stdout) : undefined;
}

export function readGoalWorktreeIdentity(cwd: string): GoalWorktreeIdentity {
	const gitRoot = gitOutput(cwd, ["rev-parse", "--show-toplevel"]);
	if (!gitRoot) return { cwd };
	const head = gitOutput(cwd, ["rev-parse", "HEAD"]);
	const branch = gitOutput(cwd, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
	const status = gitBuffer(cwd, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]) ?? Buffer.alloc(0);
	const snapshotHash = createHash("sha256");
	let snapshotAvailable = true;
	snapshotHash.update(head ?? "unborn");
	const trackedDiff = gitBuffer(cwd, ["diff", "--binary", "--no-ext-diff", "HEAD", "--"]);
	if (trackedDiff) snapshotHash.update(trackedDiff);
	else snapshotAvailable = false;
	const untracked = gitBuffer(cwd, ["ls-files", "--others", "--exclude-standard", "-z"]);
	if (!untracked) snapshotAvailable = false;
	const submodules = gitBuffer(cwd, ["submodule", "status", "--recursive"]);
	if (!submodules) snapshotAvailable = false;
	const submoduleDigest = submodules ? digest(submodules) : undefined;
	if (submodules) snapshotHash.update(submodules);
	for (const pathBuffer of untracked?.toString("utf8").split("\0").filter(Boolean).sort() ?? []) {
		snapshotHash.update("\0path\0");
		snapshotHash.update(pathBuffer);
		const object = gitOutput(cwd, ["hash-object", "--no-filters", "--", pathBuffer]);
		if (!object) snapshotAvailable = false;
		snapshotHash.update("\0object\0");
		snapshotHash.update(object ?? "unreadable");
	}
	return {
		cwd,
		gitRoot,
		head,
		branch,
		dirty: status.length > 0,
		statusDigest: digest(status),
		snapshotDigest: snapshotAvailable ? `sha256:${snapshotHash.digest("hex")}` : undefined,
		submoduleDigest,
	};
}

function sameWorktreeIdentity(before: GoalWorktreeIdentity, after: GoalWorktreeIdentity): boolean {
	if (!before.gitRoot || !after.gitRoot) return false;
	return (
		before.cwd === after.cwd &&
		before.gitRoot === after.gitRoot &&
		before.head === after.head &&
		before.branch === after.branch &&
		before.statusDigest === after.statusDigest &&
		before.submoduleDigest === after.submoduleDigest &&
		before.snapshotDigest !== undefined &&
		before.snapshotDigest === after.snapshotDigest
	);
}

async function runGoalAcceptanceCheck(
	check: GoalAcceptanceCheck & { timeoutSeconds: number },
	cwd: string,
	signal?: AbortSignal,
	remainingVerificationMs = Number.POSITIVE_INFINITY,
): Promise<GoalProofCheckResult> {
	const startedAt = Date.now();
	const shell = getShellConfig();
	const child = spawn(shell.shell, [...shell.args, check.command], {
		cwd,
		detached: process.platform !== "win32",
		env: getShellEnv(),
		stdio: ["ignore", "pipe", "pipe"],
	});
	const stdoutHash = createHash("sha256");
	const stderrHash = createHash("sha256");
	const stdoutDecoder = new StringDecoder("utf8");
	const stderrDecoder = new StringDecoder("utf8");
	let outputBytes = 0;
	let outputPreview = "";
	let truncated = false;
	let timedOut = false;
	let aborted = false;
	let outputLimitExceeded = false;
	let spawnError: string | undefined;

	const capture = (stream: "stdout" | "stderr", chunk: Buffer | string) => {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		outputBytes += buffer.length;
		if (stream === "stdout") stdoutHash.update(buffer);
		else stderrHash.update(buffer);
		if (outputBytes > MAX_GOAL_CHECK_OUTPUT_BYTES && !outputLimitExceeded) {
			outputLimitExceeded = true;
			if (child.pid) killProcessTree(child.pid);
		}
		if (outputPreview.length >= MAX_GOAL_CHECK_OUTPUT_PREVIEW_CHARS) {
			truncated = true;
			return;
		}
		const text = (stream === "stdout" ? stdoutDecoder : stderrDecoder).write(buffer);
		const prefix = outputPreview && !outputPreview.endsWith("\n") ? "" : `[${stream}] `;
		const remaining = MAX_GOAL_CHECK_OUTPUT_PREVIEW_CHARS - outputPreview.length;
		const addition = `${prefix}${text}`;
		outputPreview += addition.slice(0, remaining);
		if (addition.length > remaining) truncated = true;
	};
	child.stdout?.on("data", (chunk) => capture("stdout", chunk));
	child.stderr?.on("data", (chunk) => capture("stderr", chunk));
	child.once("error", (error) => {
		spawnError = error.message;
		capture("stderr", error.message);
	});

	const abort = () => {
		aborted = true;
		if (child.pid) killProcessTree(child.pid);
	};
	if (signal?.aborted) abort();
	else signal?.addEventListener("abort", abort, { once: true });
	const timer = setTimeout(
		() => {
			timedOut = true;
			if (child.pid) killProcessTree(child.pid);
		},
		Math.max(1, Math.min(check.timeoutSeconds * 1000, remainingVerificationMs)),
	);
	let exitCode: number | null = null;
	try {
		exitCode = await waitForChildProcess(child);
	} catch (error) {
		spawnError = error instanceof Error ? error.message : String(error);
	} finally {
		clearTimeout(timer);
		signal?.removeEventListener("abort", abort);
	}
	const stdoutDigest = `sha256:${stdoutHash.digest("hex")}`;
	const stderrDigest = `sha256:${stderrHash.digest("hex")}`;
	const previewTail = stdoutDecoder.end() + stderrDecoder.end();
	if (previewTail && outputPreview.length < MAX_GOAL_CHECK_OUTPUT_PREVIEW_CHARS) {
		outputPreview += previewTail.slice(0, MAX_GOAL_CHECK_OUTPUT_PREVIEW_CHARS - outputPreview.length);
	}
	return {
		command: check.command,
		timeoutSeconds: check.timeoutSeconds,
		exitCode,
		signal: child.signalCode ?? undefined,
		timedOut,
		aborted,
		outputLimitExceeded,
		durationMs: Math.max(0, Date.now() - startedAt),
		passed: !spawnError && !timedOut && !aborted && !outputLimitExceeded && exitCode === 0,
		stdoutDigest,
		stderrDigest,
		outputDigest: digest(`${stdoutDigest}\n${stderrDigest}`),
		outputBytes,
		outputPreview: sanitizeBinaryOutput(outputPreview).trimEnd(),
		truncated,
		...(spawnError ? { error: spawnError } : {}),
	};
}

export async function verifyGoalAcceptanceChecks(input: {
	goalId?: string;
	checks: readonly GoalAcceptanceCheck[];
	cwd: string;
	signal?: AbortSignal;
}): Promise<GoalProofCertificate> {
	const checks = validateGoalAcceptanceChecks(input.checks);
	const startedAt = Date.now();
	const deadline = startedAt + MAX_GOAL_VERIFICATION_SECONDS * 1000;
	const before = readGoalWorktreeIdentity(input.cwd);
	const results: GoalProofCheckResult[] = [];
	for (const check of checks) {
		const remainingMs = deadline - Date.now();
		if (input.signal?.aborted || remainingMs <= 0) break;
		results.push(await runGoalAcceptanceCheck(check, input.cwd, input.signal, remainingMs));
	}
	const after = readGoalWorktreeIdentity(input.cwd);
	const stable = sameWorktreeIdentity(before, after);
	const certificate = {
		version: 1 as const,
		goalId: input.goalId,
		verifiedAt: Date.now(),
		durationMs: Math.max(0, Date.now() - startedAt),
		passed:
			input.signal?.aborted !== true &&
			results.length === checks.length &&
			stable &&
			results.every((result) => result.passed),
		worktree: { before, after, stable },
		checks: results,
	};
	return { ...certificate, certificateDigest: goalProofCertificateDigest(certificate) };
}
