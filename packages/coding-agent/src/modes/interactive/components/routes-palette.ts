import { Container, type Focusable, getKeybindings, matchesKey, Text } from "@earendil-works/pi-tui";
import { theme } from "../theme/theme.js";
import {
	getMenuListLayout,
	MenuList,
	MenuPanel,
	MenuRow,
	MenuSearchInput,
	type MenuViewportProvider,
} from "./menu-panel.js";

export interface RouteItem {
	name: string;
	command: string;
	description: string;
	category: string;
	aliases?: readonly string[];
	source?: string;
	featured?: boolean;
	priority?: number;
	action?: "shortcut-guide";
}

const ROUTE_CATEGORIES: ReadonlyArray<readonly [string, ReadonlySet<string>]> = [
	["Mission", new Set(["mission", "goal", "autonomous", "refine", "context", "compact"])],
	["Expedition", new Set(["new", "name", "session", "tree", "fork", "clone", "export", "import", "share", "copy"])],
	["Crew", new Set(["heartbeat", "heartbeats", "rlm-max-depth"])],
	["Guide", new Set(["model", "effort", "fast", "scoped-models", "btw"])],
	[
		"Basecamp",
		new Set([
			"settings",
			"login",
			"logout",
			"mcp",
			"reload",
			"fullscreen",
			"hotkeys",
			"changelog",
			"update",
			"logs",
			"traces",
			"system-prompt",
			"quit",
		]),
	],
];

export function categorizeRouteName(name: string, fallback = "Extension"): string {
	return ROUTE_CATEGORIES.find(([, names]) => names.has(name))?.[0] ?? fallback;
}

export interface RoutesPaletteOptions extends MenuViewportProvider {
	onSelect: (route: RouteItem) => void;
	onCancel: () => void;
	requestRender: () => void;
}

function routeSearchText(route: RouteItem): string {
	return [route.name, route.command, route.description, route.category, route.source, ...(route.aliases ?? [])]
		.filter((part): part is string => Boolean(part))
		.join(" ")
		.toLowerCase();
}

export function filterRoutes(routes: readonly RouteItem[], query: string): RouteItem[] {
	const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	if (terms.length === 0) return [...routes];
	return routes.filter((route) => {
		const haystack = routeSearchText(route);
		return terms.every((term) => haystack.includes(term));
	});
}

function sortRoutes(routes: readonly RouteItem[]): RouteItem[] {
	return [...routes].sort((left, right) => {
		if (left.featured !== right.featured) return left.featured ? -1 : 1;
		const priority = (left.priority ?? Number.MAX_SAFE_INTEGER) - (right.priority ?? Number.MAX_SAFE_INTEGER);
		if (priority !== 0) return priority;
		const category = left.category.localeCompare(right.category);
		return category || left.name.localeCompare(right.name);
	});
}

export class RoutesPalette extends Container implements Focusable {
	private readonly search = new MenuSearchInput("Search missions, settings, models, sessions, and extension routes…");
	private readonly panel = new MenuPanel({
		title: "ROUTES / COMMAND MAP",
		subtitle: "Search every built-in, prompt, skill, and extension command.",
	});
	private readonly routes: RouteItem[];
	private filteredRoutes: RouteItem[];
	private selectedIndex = 0;
	private _focused = false;

	constructor(
		routes: readonly RouteItem[],
		private readonly options: RoutesPaletteOptions,
	) {
		super();
		this.routes = sortRoutes(routes);
		this.filteredRoutes = [...this.routes];
		this.search.onSubmit = () => this.selectCurrent();
		this.rebuild();
		this.addChild(this.panel);
	}

	override render(width: number): string[] {
		const lines = super.render(width);
		const rows = this.options.getRows?.();
		if (rows === undefined || !Number.isFinite(rows) || rows <= 0) return lines;
		return lines.slice(0, Math.max(1, Math.floor(rows)));
	}

	get focused(): boolean {
		return this._focused;
	}

	set focused(value: boolean) {
		this._focused = value;
		this.search.focused = value;
	}

	getQuery(): string {
		return this.search.getValue();
	}

	getSelectedRoute(): RouteItem | undefined {
		return this.filteredRoutes[this.selectedIndex];
	}

	handleInput(data: string): void {
		const keybindings = getKeybindings();
		if (keybindings.matches(data, "tui.select.cancel") || matchesKey(data, "ctrl+c")) {
			this.options.onCancel();
			return;
		}
		if (keybindings.matches(data, "tui.select.up")) {
			this.move(-1);
			return;
		}
		if (keybindings.matches(data, "tui.select.down") || keybindings.matches(data, "tui.input.tab")) {
			this.move(1);
			return;
		}
		if (keybindings.matches(data, "tui.select.pageUp")) {
			this.move(-this.visibleItemCount());
			return;
		}
		if (keybindings.matches(data, "tui.select.pageDown")) {
			this.move(this.visibleItemCount());
			return;
		}
		if (keybindings.matches(data, "tui.select.confirm")) {
			this.selectCurrent();
			return;
		}

		this.search.handleInput(data);
		this.filteredRoutes = filterRoutes(this.routes, this.search.getValue());
		this.selectedIndex = 0;
		this.rebuild();
		this.options.requestRender();
	}

	private visibleItemCount(): number {
		return getMenuListLayout({
			getRows: this.options.getRows,
			preferredVisibleItems: 9,
			minVisibleItems: 1,
			totalItems: this.filteredRoutes.length,
			reservedRows: 9,
			comfortableItemRows: 4,
			compactItemRows: 2,
			scrollIndicatorRows: 1,
		}).visibleItems;
	}

	private move(delta: number): void {
		if (this.filteredRoutes.length === 0) return;
		this.selectedIndex = Math.max(0, Math.min(this.filteredRoutes.length - 1, this.selectedIndex + delta));
		this.rebuild();
		this.options.requestRender();
	}

	private selectCurrent(): void {
		const route = this.getSelectedRoute();
		if (route) this.options.onSelect(route);
	}

	private rebuild(): void {
		this.panel.clear();
		this.panel.addChild(this.search);
		const visibleCount = this.visibleItemCount();
		const list = new MenuList({ compact: () => this.visibleItemCount() < 6 });

		if (this.filteredRoutes.length === 0) {
			list.addChild(
				new Text(theme.fg("muted", "No route found. Try mission, model, settings, tree, or hotkeys."), 2, 1),
			);
		} else {
			const start = Math.max(
				0,
				Math.min(
					this.selectedIndex - Math.floor(visibleCount / 2),
					Math.max(0, this.filteredRoutes.length - visibleCount),
				),
			);
			const end = Math.min(this.filteredRoutes.length, start + visibleCount);
			for (let index = start; index < end; index++) {
				const route = this.filteredRoutes[index];
				const source = route.source ? `${route.category} · ${route.source}` : route.category;
				list.addChild(
					new MenuRow({
						primary: route.command.trimEnd(),
						secondary: route.description,
						meta: source.toUpperCase(),
						selected: index === this.selectedIndex,
					}),
				);
			}
			if (this.filteredRoutes.length > visibleCount) {
				list.addChild(
					new Text(theme.fg("dim", `${this.selectedIndex + 1}/${this.filteredRoutes.length} routes`), 2, 0),
				);
			}
		}
		this.panel.addChild(list);
		this.panel.addChild(new Text(theme.fg("dim", "↑↓ navigate · enter stage · esc close"), 0, 0));
	}
}
