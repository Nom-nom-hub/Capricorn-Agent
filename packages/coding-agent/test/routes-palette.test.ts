import { setKeybindings, visibleWidth } from "@earendil-works/pi-tui";
import stripAnsi from "strip-ansi";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { KeybindingsManager } from "../src/core/keybindings.js";
import {
	categorizeRouteName,
	filterRoutes,
	type RouteItem,
	RoutesPalette,
} from "../src/modes/interactive/components/routes-palette.js";
import { initTheme } from "../src/modes/interactive/theme/theme.js";

const routes: RouteItem[] = [
	{
		name: "mission",
		command: "/mission",
		description: "Open Mission Control",
		category: "Mission",
		aliases: ["objective"],
		featured: true,
	},
	{
		name: "model",
		command: "/model ",
		description: "Choose an inference model",
		category: "Guide",
	},
	{
		name: "deploy-preview",
		command: "/deploy-preview ",
		description: "Deploy a preview environment",
		category: "Extensions",
		source: "release-kit",
	},
];

describe("Routes palette", () => {
	beforeAll(() => initTheme("capricorn"));
	beforeEach(() => setKeybindings(new KeybindingsManager()));

	test("searches across names, descriptions, aliases, categories, and sources", () => {
		expect(filterRoutes(routes, "objective").map((route) => route.name)).toEqual(["mission"]);
		expect(filterRoutes(routes, "inference").map((route) => route.name)).toEqual(["model"]);
		expect(filterRoutes(routes, "extensions release-kit").map((route) => route.name)).toEqual(["deploy-preview"]);
	});

	test("uses Capricorn workspace categories", () => {
		expect(categorizeRouteName("goal")).toBe("Mission");
		expect(categorizeRouteName("tree")).toBe("Expedition");
		expect(categorizeRouteName("heartbeats")).toBe("Crew");
		expect(categorizeRouteName("model")).toBe("Guide");
		expect(categorizeRouteName("settings")).toBe("Basecamp");
	});

	test("filters interactively and stages the selected canonical route", () => {
		const onSelect = vi.fn();
		const palette = new RoutesPalette(routes, {
			getRows: () => 30,
			onSelect,
			onCancel: vi.fn(),
			requestRender: vi.fn(),
		});
		palette.focused = true;
		palette.handleInput("d");
		palette.handleInput("e");
		palette.handleInput("p");
		expect(palette.getSelectedRoute()?.name).toBe("deploy-preview");
		palette.handleInput("\r");
		expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ command: "/deploy-preview " }));
	});

	test("supports navigation, cancellation, and a bounded responsive render", () => {
		const onCancel = vi.fn();
		const palette = new RoutesPalette(routes, {
			getRows: () => 18,
			onSelect: vi.fn(),
			onCancel,
			requestRender: vi.fn(),
		});
		palette.focused = true;
		palette.handleInput("\x1b[B");
		expect(palette.getSelectedRoute()?.name).not.toBe("mission");
		palette.handleInput("\x1b");
		expect(onCancel).toHaveBeenCalledOnce();

		for (const width of [20, 48, 88]) {
			const lines = palette.render(width);
			expect(lines.length).toBeLessThanOrEqual(18);
			expect(stripAnsi(lines.join("\n"))).toContain(width < 24 ? "ROUTES /" : "ROUTES / COMMAND MAP");
			for (const line of lines) expect(visibleWidth(line)).toBeLessThanOrEqual(width);
		}
	});

	test("renders a useful empty state", () => {
		const palette = new RoutesPalette(routes, {
			getRows: () => 20,
			onSelect: vi.fn(),
			onCancel: vi.fn(),
			requestRender: vi.fn(),
		});
		palette.focused = true;
		for (const character of "zzzz") palette.handleInput(character);
		expect(stripAnsi(palette.render(60).join("\n"))).toContain("No route found");
	});
});
