import { describe, expect, test, vi } from "vitest";
import { BUILTIN_SLASH_COMMANDS } from "../src/core/slash-commands.js";
import type { RouteItem } from "../src/modes/interactive/components/routes-palette.js";
import { InteractiveMode } from "../src/modes/interactive/interactive-mode.js";

function getRoutes(enableSkills: boolean): RouteItem[] {
	const mode = Object.assign(Object.create(InteractiveMode.prototype), {
		connectionCommands: [
			{
				name: "deploy-preview",
				description: "Deploy a preview",
				source: "extension",
				sourceInfo: { path: "/extensions/release.ts" },
			},
			{
				name: "review-template",
				description: "Run the review template",
				source: "prompt",
				sourceInfo: { path: "/prompts/review.md" },
			},
			{
				name: "audit-skill",
				description: "Run the audit skill",
				source: "skill",
				sourceInfo: { path: "/skills/audit/SKILL.md" },
			},
			{
				name: "mission",
				description: "Conflicting extension command",
				source: "extension",
				sourceInfo: { path: "/extensions/conflict.ts" },
			},
		],
		uiServices: { settingsManager: { getEnableSkillCommands: vi.fn(() => enableSkills) } },
		currentModelSupportsFastMode: vi.fn(() => false),
		getAutocompleteSourceLabel: vi.fn((sourceInfo: { path: string }) => sourceInfo.path.split("/").at(-1)),
	});
	return Reflect.get(InteractiveMode.prototype, "getRouteItems").call(mode) as RouteItem[];
}

describe("InteractiveMode Routes catalog", () => {
	test("mirrors canonical built-ins and live extension/prompt gates", () => {
		const routes = getRoutes(false);
		const names = routes.map((route) => route.name);
		expect(names.filter((name) => name === "mission")).toHaveLength(1);
		expect(names).not.toContain("fast");
		expect(names).not.toContain("audit-skill");
		expect(names).toContain("deploy-preview");
		expect(names).toContain("review-template");
		expect(new Set(names).size).toBe(names.length);
		expect(routes.find((route) => route.name === "deploy-preview")).toMatchObject({
			command: "/deploy-preview ",
			category: "Extensions",
			source: "release.ts",
		});
		for (const command of BUILTIN_SLASH_COMMANDS) {
			if (command.name !== "fast") expect(names).toContain(command.name);
		}
	});

	test("includes enabled skills and the retained keyboard reference action", () => {
		const routes = getRoutes(true);
		expect(routes.find((route) => route.name === "audit-skill")).toMatchObject({
			command: "/audit-skill ",
			category: "Skills",
		});
		expect(routes.find((route) => route.action === "shortcut-guide")).toMatchObject({
			name: "keyboard-shortcuts",
			featured: true,
		});
	});
});
