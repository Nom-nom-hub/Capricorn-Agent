import { visibleWidth } from "@earendil-works/pi-tui";
import stripAnsi from "strip-ansi";
import { beforeAll, describe, expect, test } from "vitest";
import { SummitHeader } from "../src/modes/interactive/components/summit-header.js";
import { initTheme } from "../src/modes/interactive/theme/theme.js";

describe("SummitHeader", () => {
	beforeAll(() => initTheme("capricorn"));

	test("uses a compact operational masthead instead of the inherited logo layout", () => {
		const header = new SummitHeader(
			"0.7.1",
			() => "test/model",
			() => "/work/capricorn",
			{
				topPadding: true,
				getStartHint: () => "Map this repository",
			},
		);
		const output = stripAnsi(header.render(88).join("\n"));
		expect(output).toContain("CAPRICORN / SUMMIT");
		expect(output).toContain("Ambition, orchestrated.");
		expect(output).toContain("/mission");
		expect(output).not.toContain("▄");
	});

	test("never overflows compact, standard, or wide terminals", () => {
		const header = new SummitHeader(
			"0.7.1",
			() => "provider/a-long-model-name",
			() => "/a/long/path",
		);
		for (const width of [1, 20, 40, 80, 120]) {
			for (const line of header.render(width)) expect(visibleWidth(line)).toBeLessThanOrEqual(width);
		}
	});
});
