import stripAnsi from "strip-ansi";
import { beforeAll, describe, expect, test } from "vitest";
import { emptyGoalState } from "../src/core/goals.js";
import type { AgentConnectionState } from "../src/modes/agent-connection/types.js";
import {
	formatMissionStatus,
	type MissionStatusInput,
	parseMissionGitStatus,
} from "../src/modes/interactive/components/mission-status.js";
import { initTheme } from "../src/modes/interactive/theme/theme.js";

function state(overrides: Partial<AgentConnectionState> = {}): AgentConnectionState {
	return {
		activeSessionId: "root-session",
		cwd: "/work/capricorn",
		thinkingLevel: "high",
		serviceTier: "default",
		availableThinkingLevels: ["low", "medium", "high"],
		isStreaming: false,
		isCompacting: false,
		isBashRunning: false,
		retryAttempt: 0,
		steeringMode: "all",
		followUpMode: "all",
		sessionId: "session-1",
		sessionName: "launch",
		leafId: null,
		autoCompactionEnabled: true,
		messageCount: 12,
		sessionActions: { queuedCount: 0, steering: [], followUps: [] },
		compactionCount: 0,
		goal: emptyGoalState(),
		scopedModels: [],
		activeToolNames: ["ipython"],
		contextUsage: { tokens: 20_000, contextWindow: 100_000, percent: 20 },
		...overrides,
	};
}

function input(overrides: Partial<MissionStatusInput> = {}): MissionStatusInput {
	return {
		state: state(),
		children: [],
		queue: { steering: [], followUp: [] },
		workspace: {
			branch: "feature/mission",
			detached: false,
			staged: 0,
			modified: 0,
			untracked: 0,
			conflicts: 0,
			ahead: 0,
			behind: 0,
		},
		...overrides,
	};
}

describe("mission status", () => {
	beforeAll(() => initTheme("capricorn"));

	test("parses branch movement and worktree counts", () => {
		expect(
			parseMissionGitStatus(
				"## feature/mission...origin/feature/mission [ahead 2, behind 1]\nM  staged.ts\n M changed.ts\n?? new.ts\nUU conflict.ts\n",
			),
		).toEqual({
			branch: "feature/mission",
			detached: false,
			staged: 2,
			modified: 2,
			untracked: 1,
			conflicts: 1,
			ahead: 2,
			behind: 1,
		});
	});

	test("renders an idle mission and clean workspace", () => {
		const output = stripAnsi(formatMissionStatus(input(), 84));
		expect(output).toContain("CAPRICORN MISSION CONTROL");
		expect(output).toContain("No mission set");
		expect(output).toContain("feature/mission");
		expect(output).toContain("clean");
		expect(output).toContain("Set a mission with /goal <objective>");
	});

	test("renders active goal, direct subagents, queue, and workspace changes", () => {
		const activeState = state({
			goal: {
				active: true,
				status: "active",
				objective: "Ship a distinctive Capricorn release",
				tokenBudget: 50_000,
				tokensUsed: 12_500,
				timeUsedSeconds: 90,
				continuationsUsed: 1,
			},
			recap: "Building Mission Control",
		});
		const output = stripAnsi(
			formatMissionStatus(
				input({
					state: activeState,
					parentId: "root-node",
					queue: { steering: ["Run the focused tests"], followUp: [] },
					children: [
						{ id: "one", parentId: "root-node", label: "UI review", status: "running", sessionDir: "/tmp/one" },
						{ id: "two", parentId: "root-node", label: "Test review", status: "error", sessionDir: "/tmp/two" },
						{ id: "nested", parentId: "one", label: "Nested", status: "done", sessionDir: "/tmp/nested" },
					],
					workspace: {
						branch: "feature/mission",
						detached: false,
						staged: 1,
						modified: 2,
						untracked: 1,
						conflicts: 0,
						ahead: 1,
						behind: 0,
					},
				}),
				92,
			),
		);
		expect(output).toContain("Ship a distinctive Capricorn release");
		expect(output).toContain("12,500 / 50,000 tokens");
		expect(output).toContain("2 total  ·  1 active  ·  0 done  ·  1 failed");
		expect(output).not.toContain("Nested");
		expect(output).toContain("1 staged · 2 modified · 1 untracked");
		expect(output).toContain("Queued: Run the focused tests");
	});

	test("distinguishes verified proof from self-reported completion", () => {
		const verifiedGoal = {
			active: false,
			status: "complete" as const,
			objective: "Ship verified output",
			tokensUsed: 100,
			timeUsedSeconds: 3,
			continuationsUsed: 0,
			acceptanceChecks: [{ command: "npm test", timeoutSeconds: 120 }],
			completionKind: "verified" as const,
			proof: {
				version: 1 as const,
				verifiedAt: 10,
				durationMs: 20,
				passed: true,
				worktree: {
					before: {
						cwd: "/work/capricorn",
						gitRoot: "/work/capricorn",
						head: "abcdef123456",
						snapshotDigest: "sha256:a",
					},
					after: {
						cwd: "/work/capricorn",
						gitRoot: "/work/capricorn",
						head: "abcdef123456",
						snapshotDigest: "sha256:a",
					},
					stable: true,
				},
				checks: [
					{
						command: "npm test",
						timeoutSeconds: 120,
						exitCode: 0,
						timedOut: false,
						aborted: false,
						outputLimitExceeded: false,
						durationMs: 20,
						passed: true,
						stdoutDigest: "sha256:out",
						stderrDigest: "sha256:err",
						outputDigest: "sha256:all",
						outputBytes: 2,
						outputPreview: "ok",
						truncated: false,
					},
				],
				certificateDigest: "sha256:certificate",
			},
		};
		const verified = stripAnsi(formatMissionStatus(input({ state: state({ goal: verifiedGoal }) }), 92));
		expect(verified).toContain("VERIFIED");
		expect(verified).toContain("1/1 checks passed");
		expect(verified).toContain("abcdef12");

		const selfReported = stripAnsi(
			formatMissionStatus(
				input({
					state: state({
						goal: {
							...verifiedGoal,
							acceptanceChecks: undefined,
							proof: undefined,
							completionKind: "self_reported",
						},
					}),
				}),
				92,
			),
		);
		expect(selfReported).toContain("SELF-REPORTED");
		expect(selfReported).toContain("No executable acceptance checks declared");
	});

	test("keeps every rendered line within the requested width", () => {
		const output = stripAnsi(formatMissionStatus(input(), 48));
		for (const line of output.split("\n")) expect([...line].length).toBeLessThanOrEqual(48);
	});
});
