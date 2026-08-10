<p align="center">
  <img src="assets/brand/capricorn-mark.svg" alt="Capricorn" width="180">
</p>

<h1 align="center">Capricorn</h1>
<p align="center"><strong>Ambition, orchestrated.</strong></p>

Capricorn is a self-improving coding and research agent built for serious, long-running work. Its **Summit UI** organizes work as Expeditions, Missions, Crew, and a persistent Trail Bar instead of presenting a generic chat shell. It combines a persistent IPython control environment, recursive subagents, durable sessions, executable skills, and a continual harness that can preserve useful operating patterns across conversations.

## Brand direction

- **Voice:** direct, capable, calm
- **Palette:** graphite `#080704`, parchment `#F7F1DF`, constellation gold `#D4A72C`
- **CLI:** `capricorn`
- **State:** `~/.capricorn/agent`
- **Tagline:** *Ambition, orchestrated.*

See [BRAND.md](BRAND.md) for the visual system. See [ROADMAP.md](ROADMAP.md) for Capricorn-native product features.

## Run from source

Requirements: Node.js 22.8 or newer, npm 11.10 or newer, and internet access for the first dependency and Python-kernel setup.

```bash
cd /Users/teck/capricorn-agent
npm install
./capricorn.sh
```

On first launch, run `/login` and choose a subscription or API-key provider. Prime Intellect remains available as an optional model/infrastructure provider; provider names and API contracts are intentionally not rebranded.

Useful commands after building/installing the CLI:

```bash
capricorn agents
capricorn attach <agent>
capricorn --resume <path-or-id>
capricorn status
capricorn doctor --fix
capricorn shutdown
```

## Capricorn-native operating doctrine

Capricorn's default system prompt is built around a five-stage expedition loop: **Orient, Plan, Execute, Verify, Report**. It treats requests as missions, separates observed evidence from inference, evaluates delegated work before accepting it, and forbids confident completion claims that exceed the available proof.

The doctrine is assembled with live workspace, tool, skill, crew, project, goal, and continual-harness context rather than being a static persona. Operational RLM and IPython contracts remain intact for compatibility, while the product identity and decision hierarchy are Capricorn-owned. Inspect the exact prompt for the current session with `/system-prompt`; a configured custom system prompt still replaces the default doctrine.

## Proof-Carrying Goals

Capricorn goals can carry user-approved executable acceptance checks. The host reruns the persisted checks whenever the agent requests completion; every check must pass against a stable worktree before the goal becomes **verified**.

```text
/goal --check "npm test" --check "npm run check" --proof-timeout 180 Ship the release
```

The resulting bounded certificate records exit status, duration, output digests and preview, and before/after Git source-worktree identity. Identity covers HEAD, branch, status, submodules, tracked content, and nonignored untracked content; ignored build artifacts are intentionally excluded. Verified completion requires a Git workspace with a stable identity. Inspect the latest receipt with `/goal proof` or the mission summary with `/mission`.

A policy supports up to eight checks, at most 300 seconds each and 10 minutes total. Each receipt retains at most an 8,000-character preview and fails closed above 10 MiB of command output.

Failed checks leave the goal incomplete. Goals without checks can still complete, but Summit UI labels them **self-reported**. Checks are local shell commands with your user permissions—not a sandbox—and can only be declared through the user-facing `/goal` command, never by `goal.create()` or objective text. Certificates are tamper-evident local receipts, not signatures: Capricorn treats same-user session storage as trusted local state. Timeout cancellation performs best-effort process-tree termination; independently daemonized descendants may require external cleanup.

## Privacy and releases

Telemetry to the upstream Prime endpoint is **off by default** in Capricorn. It can still be explicitly enabled in settings if desired. Automatic update checks are also off until `CAPRICORN_DOWNLOAD_BASE_URL` points to a release manifest host you control; this avoids installing upstream Prime Agent artifacts into a Capricorn installation.

This repository currently supports source builds. Before distributing binaries, configure a Capricorn-owned repository, npm scope, release host, signing process, and installer pipeline.

## Security

Capricorn executes model-generated Python and project commands with your user permissions. Its worker and kernel processes are lifecycle boundaries, not a security sandbox. Review changes and run untrusted projects in an external sandbox.

## Upstream and license

Capricorn is an independent product and repository. Some inherited internal package and protocol identifiers remain temporarily for compatibility with the MIT-licensed foundation; they are not Capricorn repository or product identifiers. Prime Intellect and Prime Inference references identify optional external vendor integrations.

Released under the [MIT License](LICENSE). Existing copyright and license notices are retained as required.
