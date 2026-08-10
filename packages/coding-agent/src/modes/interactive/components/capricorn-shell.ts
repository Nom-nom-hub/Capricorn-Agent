import { basename } from "node:path";
import { type Component, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import type { GoalState } from "../../../core/goals.js";
import { theme } from "../theme/theme.js";

export interface CapricornTopBarState {
	sessionName?: string;
	cwd: string;
	model?: string;
	thinkingLevel?: string;
	isStreaming: boolean;
	isCompacting: boolean;
	isBashRunning: boolean;
}

function activityLabel(state: CapricornTopBarState): string {
	if (state.isCompacting) return "COMPACTING";
	if (state.isBashRunning) return "SHELL";
	if (state.isStreaming) return "CLIMBING";
	return "READY";
}

export function formatCapricornTopBar(state: CapricornTopBarState, width: number): string {
	const safeWidth = Math.max(1, width);
	const location = state.sessionName || basename(state.cwd) || "expedition";
	const left = theme.bold(theme.fg("accent", `EXPEDITION / ${location}`));
	const detailParts = [
		activityLabel(state),
		state.model,
		state.thinkingLevel ? `${state.thinkingLevel} effort` : undefined,
	].filter((part): part is string => part !== undefined);
	const right = theme.fg("muted", detailParts.join("  ·  "));
	if (safeWidth < 48) return truncateToWidth(`${left}  ${right}`, safeWidth, "…");
	const rightWidth = Math.min(visibleWidth(right), Math.max(0, Math.floor(safeWidth * 0.55)));
	const leftWidth = Math.max(1, safeWidth - rightWidth - 2);
	const renderedLeft = truncateToWidth(left, leftWidth, "…");
	const renderedRight = truncateToWidth(right, rightWidth, "…");
	const padding = " ".repeat(Math.max(2, safeWidth - visibleWidth(renderedLeft) - visibleWidth(renderedRight)));
	return theme.bg("toolPanelBg", truncateToWidth(`${renderedLeft}${padding}${renderedRight}`, safeWidth, ""));
}

export function formatExpeditionDockHeader(goal: GoalState | undefined): string {
	if (!goal || goal.status === "idle") {
		return `${theme.bold(theme.fg("accent", "GUIDE · READY"))}${theme.fg("dim", "  / commands · /mission")}`;
	}
	const objective = goal.objective?.replace(/\s+/g, " ").trim();
	const tone = goal.status === "error" ? "error" : goal.status === "complete" ? "success" : "accent";
	const checks = goal.acceptanceChecks ?? [];
	const proofLabel =
		checks.length === 0
			? goal.status === "complete"
				? " · SELF-REPORTED"
				: ""
			: goal.proof?.passed && goal.completionKind === "verified"
				? " · VERIFIED"
				: goal.proof
					? " · PROOF FAILED"
					: " · PROOF PENDING";
	const status = theme.bold(theme.fg(tone, `MISSION · ${goal.status.toUpperCase()}${proofLabel}`));
	return objective ? `${status}${theme.fg("dim", `  ${objective}`)}` : status;
}

export class CapricornTopBar implements Component {
	constructor(private readonly getState: () => CapricornTopBarState) {}
	invalidate(): void {}
	render(width: number): string[] {
		return [formatCapricornTopBar(this.getState(), width)];
	}
}
