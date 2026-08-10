import { type Component, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { APP_TITLE } from "../../../config.js";
import { theme } from "../theme/theme.js";

export interface SummitHeaderOptions {
	topPadding?: boolean;
	getHideStartHint?: () => boolean;
	getStartHint?: () => string;
}

function padVisible(text: string, width: number): string {
	const clipped = truncateToWidth(text, Math.max(1, width), "…");
	return clipped + " ".repeat(Math.max(0, width - visibleWidth(clipped)));
}

/** Capricorn's compact operational masthead. */
export class SummitHeader implements Component {
	constructor(
		private readonly version: string,
		private readonly getModelId: () => string | undefined,
		private readonly getCwd: () => string,
		private readonly options: SummitHeaderOptions = {},
	) {}

	invalidate(): void {}

	render(width: number): string[] {
		const safeWidth = Math.max(1, width);
		if (safeWidth < 28) {
			return [
				...(this.options.topPadding ? [""] : []),
				theme.bold(theme.fg("accent", truncateToWidth(APP_TITLE.toUpperCase(), safeWidth, ""))),
				theme.fg("dim", truncateToWidth(`v${this.version} · ${this.getModelId() ?? "no model"}`, safeWidth, "…")),
			];
		}

		const innerWidth = safeWidth - 4;
		const frame = (content: string) =>
			theme.fg("borderMuted", "│ ") + padVisible(content, innerWidth) + theme.fg("borderMuted", " │");
		const topLabel = `─ ${APP_TITLE.toUpperCase()} / SUMMIT `;
		const top =
			theme.fg("accent", `╭${topLabel}`) +
			theme.fg("borderMuted", `${"─".repeat(Math.max(0, safeWidth - visibleWidth(topLabel) - 2))}╮`);
		const rule = theme.fg("borderMuted", `├${"─".repeat(safeWidth - 2)}┤`);
		const bottom = theme.fg("borderMuted", `╰${"─".repeat(safeWidth - 2)}╯`);
		const model = this.getModelId() ?? "No model selected";
		const details =
			safeWidth >= 76
				? [`v${this.version}  ·  ${model}  ·  ${this.getCwd()}`]
				: [`version  v${this.version}`, `model    ${model}`, `cwd      ${this.getCwd()}`];
		const hideStartHint = this.options.getHideStartHint?.() ?? false;
		const startHint = this.options.getStartHint?.() ?? "Type a request";
		const lines = [
			...(this.options.topPadding ? [""] : []),
			top,
			frame(theme.bold("Ambition, orchestrated.")),
			rule,
			...details.map(frame),
			...(!hideStartHint
				? [rule, frame(`${startHint}  ·  /mission overview  ·  / commands  ·  @ files  ·  ! shell`)]
				: []),
			bottom,
		];
		return lines;
	}
}
