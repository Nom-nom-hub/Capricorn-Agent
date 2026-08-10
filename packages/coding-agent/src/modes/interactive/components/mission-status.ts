import { spawnSync } from "node:child_process";
import { truncateToWidth } from "@earendil-works/pi-tui";
import type { GoalState } from "../../../core/goals.js";
import type {
	AgentConnectionQueueState,
	AgentConnectionRlmChildAgentSnapshot,
	AgentConnectionState,
} from "../../agent-connection/types.js";
import { theme } from "../theme/theme.js";

export interface MissionWorkspaceStatus {
	branch?: string;
	detached: boolean;
	staged: number;
	modified: number;
	untracked: number;
	conflicts: number;
	ahead: number;
	behind: number;
}

export interface MissionStatusInput {
	state: AgentConnectionState;
	children: readonly AgentConnectionRlmChildAgentSnapshot[];
	queue: AgentConnectionQueueState;
	workspace?: MissionWorkspaceStatus;
	parentId?: string;
}

const CONFLICT_CODES = new Set(["DD", "AU", "UD", "UA", "DU", "AA", "UU"]);

export function parseMissionGitStatus(output: string): MissionWorkspaceStatus {
	const lines = output.split(/\r?\n/).filter(Boolean);
	const header = lines[0]?.startsWith("## ") ? lines.shift()!.slice(3) : "";
	const detached = header.startsWith("HEAD ") || header === "HEAD";
	const branch = detached ? undefined : header.split("...")[0]?.trim() || undefined;
	const ahead = Number(header.match(/ahead (\d+)/)?.[1] ?? 0);
	const behind = Number(header.match(/behind (\d+)/)?.[1] ?? 0);
	let staged = 0;
	let modified = 0;
	let untracked = 0;
	let conflicts = 0;
	for (const line of lines) {
		const code = line.slice(0, 2);
		if (code === "??") {
			untracked += 1;
			continue;
		}
		if (CONFLICT_CODES.has(code)) conflicts += 1;
		if (code[0] !== " " && code[0] !== "?") staged += 1;
		if (code[1] !== " " && code[1] !== "?") modified += 1;
	}
	return { branch, detached, staged, modified, untracked, conflicts, ahead, behind };
}

export function readMissionWorkspaceStatus(cwd: string): MissionWorkspaceStatus | undefined {
	const result = spawnSync("git", ["status", "--porcelain=v1", "--branch"], {
		cwd,
		encoding: "utf8",
		env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
		maxBuffer: 512 * 1024,
		stdio: ["ignore", "pipe", "ignore"],
		timeout: 1500,
	});
	if (result.status !== 0 || result.error || typeof result.stdout !== "string") return undefined;
	return parseMissionGitStatus(result.stdout);
}

function formatGoalProof(goal: GoalState): { badge: string; detail: string } {
	const checks = goal.acceptanceChecks ?? [];
	if (checks.length === 0) {
		return {
			badge: goal.status === "complete" ? "SELF-REPORTED" : "NO CHECKS",
			detail: "No executable acceptance checks declared",
		};
	}
	if (!goal.proof) {
		return {
			badge: "PROOF PENDING",
			detail: `${checks.length} acceptance check${checks.length === 1 ? "" : "s"} will run before completion`,
		};
	}
	const passed = goal.proof.checks.filter((check) => check.passed).length;
	const head = goal.proof.worktree.after.head?.slice(0, 8);
	const workspace = !goal.proof.worktree.after.gitRoot
		? " · not Git-bound"
		: goal.proof.worktree.stable
			? head
				? ` · ${head}`
				: " · stable workspace"
			: " · workspace changed";
	return {
		badge: goal.proof.passed && goal.completionKind === "verified" ? "VERIFIED" : "PROOF FAILED",
		detail: `${passed}/${goal.proof.checks.length} checks passed${workspace}`,
	};
}

function formatGoal(goal: GoalState): string[] {
	if (goal.status === "idle") {
		return [theme.fg("muted", "No mission set"), theme.fg("dim", "Set one with /goal <objective>")];
	}
	const usage =
		goal.tokenBudget === undefined
			? `${goal.tokensUsed.toLocaleString()} tokens used`
			: `${goal.tokensUsed.toLocaleString()} / ${goal.tokenBudget.toLocaleString()} tokens`;
	const proof = formatGoalProof(goal);
	return [
		`${theme.fg(goal.status === "error" ? "error" : "accent", goal.status.toUpperCase())}  ${theme.bold(proof.badge)}  ${theme.fg("dim", usage)}`,
		goal.objective ?? "Mission objective unavailable",
		theme.fg(goal.proof && !goal.proof.passed ? "error" : "dim", `Proof: ${proof.detail}`),
		...(goal.lastError
			? [theme.fg("error", goal.lastError)]
			: goal.lastReason
				? [theme.fg("dim", goal.lastReason)]
				: []),
	];
}

function formatWorkspace(cwd: string, workspace: MissionWorkspaceStatus | undefined): string[] {
	if (!workspace) return [cwd, theme.fg("dim", "Not a Git workspace")];
	const branch = workspace.detached ? "detached HEAD" : (workspace.branch ?? "unknown branch");
	const movement = [workspace.ahead ? `↑${workspace.ahead}` : "", workspace.behind ? `↓${workspace.behind}` : ""]
		.filter(Boolean)
		.join(" ");
	const changes = [
		workspace.staged ? `${workspace.staged} staged` : "",
		workspace.modified ? `${workspace.modified} modified` : "",
		workspace.untracked ? `${workspace.untracked} untracked` : "",
		workspace.conflicts ? `${workspace.conflicts} conflicts` : "",
	].filter(Boolean);
	return [
		cwd,
		`${theme.fg("accent", branch)}${movement ? `  ${movement}` : ""}  ${changes.length ? changes.join(" · ") : theme.fg("success", "clean")}`,
	];
}

function directChildren(input: MissionStatusInput): AgentConnectionRlmChildAgentSnapshot[] {
	return input.children.filter((child) => child.parentId === input.parentId && child.status !== "cancelled");
}

function nextAction(
	goal: GoalState,
	children: readonly AgentConnectionRlmChildAgentSnapshot[],
	queue: AgentConnectionQueueState,
): string {
	const queued = queue.steering[0] ?? queue.followUp[0];
	if (queued) return `Queued: ${queued.replace(/\s+/g, " ").trim()}`;
	if (goal.proof && !goal.proof.passed) {
		const failed = goal.proof.checks.filter((check) => !check.passed).length;
		return goal.proof.worktree.stable
			? `Repair ${failed} failed acceptance check${failed === 1 ? "" : "s"}`
			: goal.proof.worktree.after.gitRoot
				? "Review workspace changes, then rerun proof on the stable result"
				: "Use a Git workspace before requesting verified completion";
	}
	const failed = children.filter((child) => child.status === "error").length;
	if (failed > 0) return `Review ${failed} failed subagent${failed === 1 ? "" : "s"}`;
	const running = children.filter((child) => child.status === "running" || child.status === "queued").length;
	if (running > 0) return `Await ${running} active subagent${running === 1 ? "" : "s"}`;
	if (goal.status === "active") return "Continue the active mission";
	return "Set a mission with /goal <objective>";
}

export function formatMissionStatus(input: MissionStatusInput, width: number): string {
	const safeWidth = Math.max(40, Math.min(100, width));
	const contentWidth = safeWidth - 3;
	const clip = (line: string) => `│ ${truncateToWidth(line, contentWidth, "…")}`;
	const rule = (label: string) =>
		theme.fg("accent", `├─ ${label} ${"─".repeat(Math.max(1, safeWidth - label.length - 4))}`);
	const children = directChildren(input);
	const counts = {
		running: children.filter((child) => child.status === "running" || child.status === "queued").length,
		done: children.filter((child) => child.status === "done").length,
		error: children.filter((child) => child.status === "error").length,
	};
	const contextUsage = input.state.contextUsage;
	const context = !contextUsage || contextUsage.percent === null ? "—" : `${Math.round(contextUsage.percent)}%`;
	const model = input.state.model ? `${input.state.model.provider}/${input.state.model.id}` : "No model selected";
	const activity = input.state.isStreaming
		? "responding"
		: input.state.isCompacting
			? "compacting"
			: input.state.isBashRunning
				? "running command"
				: "ready";
	const lines = [
		theme.fg("accent", `╭─ CAPRICORN MISSION CONTROL ${"─".repeat(Math.max(1, safeWidth - 29))}`),
		rule("MISSION"),
		...formatGoal(input.state.goal).map(clip),
		rule("WORKSPACE"),
		...formatWorkspace(input.state.cwd, input.workspace).map(clip),
		rule("RUN"),
		clip(`${model}  ·  ${input.state.thinkingLevel} effort  ·  context ${context}  ·  ${activity}`),
		clip(`session ${input.state.sessionName ?? input.state.sessionId}  ·  ${input.state.messageCount} messages`),
		...(input.state.recap ? [clip(`Current work: ${input.state.recap}`)] : []),
		rule("SUBAGENTS"),
		clip(`${children.length} total  ·  ${counts.running} active  ·  ${counts.done} done  ·  ${counts.error} failed`),
		...children
			.slice(0, 3)
			.map((child) => clip(`${child.status.padEnd(7)} ${child.label}${child.recap ? ` — ${child.recap}` : ""}`)),
		...(children.length > 3 ? [clip(`…and ${children.length - 3} more`)] : []),
		rule("NEXT"),
		clip(nextAction(input.state.goal, children, input.queue)),
		theme.fg("accent", `╰${"─".repeat(safeWidth - 1)}`),
	];
	return lines.join("\n");
}
