import { visibleWidth } from "@earendil-works/pi-tui";
import stripAnsi from "strip-ansi";
import { beforeAll, describe, expect, test } from "vitest";
import { emptyGoalState } from "../src/core/goals.js";
import {
	CapricornTopBar,
	formatCapricornTopBar,
	formatExpeditionDockHeader,
} from "../src/modes/interactive/components/capricorn-shell.js";
import { initTheme } from "../src/modes/interactive/theme/theme.js";

describe("Capricorn Summit shell", () => {
	beforeAll(() => initTheme("capricorn"));

	test("renders a wide expedition bar with live run state", () => {
		const output = stripAnsi(
			formatCapricornTopBar(
				{
					sessionName: "release",
					cwd: "/work/capricorn",
					model: "claude-sonnet",
					thinkingLevel: "high",
					isStreaming: true,
					isCompacting: false,
					isBashRunning: false,
				},
				100,
			),
		);
		expect(output).toContain("EXPEDITION / release");
		expect(output).toContain("CLIMBING");
		expect(output).toContain("claude-sonnet");
		expect(visibleWidth(output)).toBeLessThanOrEqual(100);
	});

	test("degrades without overflowing narrow terminals", () => {
		const component = new CapricornTopBar(() => ({
			cwd: "/a/very/long/workspace/path",
			model: "a-very-long-model-name",
			thinkingLevel: "xhigh",
			isStreaming: false,
			isCompacting: false,
			isBashRunning: false,
		}));
		for (const width of [1, 20, 47, 80]) {
			for (const line of component.render(width)) expect(visibleWidth(line)).toBeLessThanOrEqual(width);
		}
	});

	test("turns the editor header into a mission-aware prompt dock", () => {
		expect(stripAnsi(formatExpeditionDockHeader(emptyGoalState()))).toContain("GUIDE · READY");
		const active = stripAnsi(
			formatExpeditionDockHeader({
				active: true,
				status: "active",
				objective: "Ship  a\n distinct interface",
				tokensUsed: 0,
				timeUsedSeconds: 0,
				continuationsUsed: 0,
			}),
		);
		expect(active).toContain("MISSION · ACTIVE");
		expect(active).toContain("Ship a distinct interface");
	});
});
