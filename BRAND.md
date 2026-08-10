# Capricorn Brand System

## Positioning

**Capricorn** is the agent for ambitious, durable work: deliberate enough for research, practical enough for production engineering, and persistent enough for multi-session projects.

**Tagline:** *Ambition, orchestrated.*

## Visual identity

| Role | Color | Hex |
|---|---|---|
| Graphite | Primary background | `#080704` |
| Parchment | Primary text | `#F7F1DF` |
| Constellation Gold | Brand/accent | `#D4A72C` |
| Soft Gold | Secondary accent | `#E2BD59` |
| Mineral Teal | Links/information | `#65B8C8` |

The mark combines symmetrical horns, an ascending tail, and four constellation points. Use `assets/brand/capricorn-mark.svg` on dark or transparent backgrounds. Maintain clear space equal to one constellation-point diameter around the mark.

## Voice

- Direct, capable, and calm
- Technical without sounding mechanical
- Prefer concrete actions over hype
- Avoid astrology clichés in product copy

## Naming

- Product: **Capricorn**
- CLI and process title: `capricorn`
- Repository: `capricorn-agent`
- Config directory: `~/.capricorn/agent`
- Environment prefix for new public settings: `CAPRICORN_`

Legacy Prime Agent identifiers may remain as compatibility aliases or internal protocol names. Prime Intellect and Prime Inference retain their names when referring to those optional services.

## Summit UI

Capricorn's terminal experience is structured as an expedition workspace rather than a generic chat shell:

- **Basecamp** is the workspace and expedition roster.
- **Expedition** is one durable working conversation.
- **Mission** is the persistent objective.
- **Crew** describes delegated workers as a group; technical surfaces may still say subagent.
- **Trail Bar** is the persistent navigation and workspace dock.

The shell uses a compact operational masthead, a mission-aware prompt deck, a persistent command dock, and a searchable **Routes** map opened with `?`. Routes is a discovery layer over canonical commands—not a second command protocol. Gold marks identity and primary focus; teal marks navigation and information; semantic states always include text rather than relying on color. Layouts must remain readable at 40, 80, and 120 columns, progressively removing secondary metadata before actions or status.
