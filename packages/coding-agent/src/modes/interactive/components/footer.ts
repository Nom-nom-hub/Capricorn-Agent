import { type Component, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import type { ReadonlyFooterDataProvider } from "../../../core/footer-data-provider.js";
import { theme } from "../theme/theme.js";

/**
 * Capricorn Trail Bar: a persistent command and workspace dock.
 *
 * Detailed model, token, and context telemetry remains in `/context`; this bar
 * exists for navigation and orientation without changing height while working.
 */
export class FooterComponent implements Component {
	private autoCompactEnabled = true;

	constructor(private readonly footerData: ReadonlyFooterDataProvider) {}

	setAutoCompactEnabled(enabled: boolean): void {
		this.autoCompactEnabled = enabled;
	}

	invalidate(): void {}

	dispose(): void {
		// Git watcher cleanup is owned by FooterDataProvider.
	}

	render(width: number): string[] {
		const safeWidth = Math.max(1, width);
		const branch = this.footerData.getGitBranch();
		const providerCount = this.footerData.getAvailableProviderCount();
		const extensionStatuses = [...this.footerData.getExtensionStatuses().values()].filter(Boolean);
		const left =
			safeWidth < 48
				? `${theme.bold(theme.fg("accent", "CAPRICORN"))}  /mission  ? shortcuts`
				: `${theme.bold(theme.fg("accent", "CAPRICORN"))}  /mission  /model  /settings  ? shortcuts`;
		const rightParts = [
			branch ? `git:${branch}` : undefined,
			providerCount > 0 ? `${providerCount} provider${providerCount === 1 ? "" : "s"}` : undefined,
			this.autoCompactEnabled ? "auto-compact" : undefined,
			...extensionStatuses.slice(0, 2),
		].filter((part): part is string => part !== undefined);
		const right = theme.fg("dim", rightParts.join(" · "));
		const gap = rightParts.length > 0 ? 2 : 0;
		const preferredLeftWidth = safeWidth < 48 ? Math.min(28, safeWidth) : Math.min(52, safeWidth);
		const rightWidth = Math.min(visibleWidth(right), Math.max(0, safeWidth - preferredLeftWidth - gap));
		const leftWidth = Math.max(1, safeWidth - rightWidth - gap);
		const renderedLeft = truncateToWidth(left, leftWidth, "…");
		const renderedRight = rightWidth > 0 ? truncateToWidth(right, rightWidth, "…") : "";
		const padding = " ".repeat(Math.max(0, safeWidth - visibleWidth(renderedLeft) - visibleWidth(renderedRight)));
		const content = `${renderedLeft}${padding}${renderedRight}`;
		return [theme.bg("toolPanelBg", content)];
	}
}
