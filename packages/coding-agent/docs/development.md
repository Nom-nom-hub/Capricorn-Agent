# Development

See the repository [AGENTS.md](../../../AGENTS.md) for the current contribution rules and required validation.

## Setup

Capricorn requires Node.js 22.8.0 or newer.

```bash
git clone <your-capricorn-repository-url> capricorn-agent
cd capricorn-agent
npm ci
```

Run from source:

```bash
/path/to/capricorn-agent/capricorn.sh
```

The script can be called from any directory and preserves the caller's working directory. Use that behavior to run a source checkout against a separate test project.

## Product and Source Names

Capricorn is the product, public CLI, release artifact, and repository name. The monorepo still retains inherited `@earendil-works/pi-*` npm workspace names, a source-package `pi` bin entry, the `pi` package manifest key, and some `PI_*` compatibility environment variables. These names are source and compatibility details, not a signal that contributors should install or develop against pi-mono.

Capricorn currently supports source builds. Configure a Capricorn-owned remote, package scope, release host, and signing pipeline before enabling public binary distribution. Inherited release scripts are compatibility scaffolding, not a Capricorn release channel.

## Local Configuration

User configuration lives under `~/.capricorn/agent/`. Project-local settings, prompts, themes, extensions, skills, and system-prompt files live under `.capricorn/agent/` in the project root. Override the user config directory with `CAPRICORN_CODING_AGENT_DIR` and the session directory with `CAPRICORN_SESSION_DIR`.

Use an isolated config directory when manually exercising daemon behavior so development sessions do not collide with normal sessions:

```bash
CAPRICORN_CODING_AGENT_DIR=/tmp/capricorn-dev /path/to/capricorn-agent/capricorn.sh
```

## Daemon Protocol Changes

Classify every daemon command, event, or response-shape change as backward-compatible, capability-gated, or incompatible. Optional behavior must be negotiated and degrade locally. Follow the protocol-version, schema-revision, compatibility-map, and cross-version test requirements in the root `AGENTS.md` before changing the wire contract.

## Package Asset Resolution

Capricorn runs from source, Node.js package output, and standalone release artifacts. Always use `src/config.ts` helpers for package assets:

```typescript
import { getPackageDir, getThemeDir } from "./config.js";
```

Do not resolve packaged assets directly from `__dirname`.

## Debugging

The hidden `/debug` command writes `~/.capricorn/agent/capricorn-debug.log` with rendered TUI lines, their visible widths, and the current agent messages. Daemon, worker, client, and provider diagnostic logs live under `~/.capricorn/agent/logs/`.

Useful service commands:

```bash
capricorn status
capricorn doctor
capricorn doctor --fix
capricorn shutdown
```

## Validation

After code changes, run the repository check from the root:

```bash
npm run check
```

This performs formatting, linting, type checking, installer rendering checks, and the browser smoke check. It does not run the test suite.

Run focused tests from the package root. For example:

```bash
cd packages/coding-agent
npx tsx ../../node_modules/vitest/dist/cli.js --run test/specific.test.ts
```

If you create or modify a test file, run that file and iterate until it passes. Coding-agent suite regressions belong under `test/suite/regressions/` and use the suite harness and faux provider rather than live provider credentials.
