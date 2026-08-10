<p align="center">
  <img src="assets/brand/capricorn-mark.svg" alt="Capricorn" width="180">
</p>

<h1 align="center">Capricorn</h1>
<p align="center"><strong>Ambition, orchestrated.</strong></p>

Capricorn is a self-improving coding and research agent built for serious, long-running work. It combines a persistent IPython control environment, recursive subagents, durable sessions, executable skills, and a continual harness that can preserve useful operating patterns across conversations.

## Brand direction

- **Voice:** direct, capable, calm
- **Palette:** graphite `#080704`, parchment `#F7F1DF`, constellation gold `#D4A72C`
- **CLI:** `capricorn`
- **State:** `~/.capricorn/agent`
- **Tagline:** *Ambition, orchestrated.*

See [BRAND.md](BRAND.md) for the visual system.

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

## Privacy and releases

Telemetry to the upstream Prime endpoint is **off by default** in Capricorn. It can still be explicitly enabled in settings if desired. Automatic update checks are also off until `CAPRICORN_DOWNLOAD_BASE_URL` points to a release manifest host you control; this avoids installing upstream Prime Agent artifacts into a Capricorn installation.

This repository currently supports source builds. Before distributing binaries, configure a Capricorn-owned repository, npm scope, release host, signing process, and installer pipeline.

## Security

Capricorn executes model-generated Python and project commands with your user permissions. Its worker and kernel processes are lifecycle boundaries, not a security sandbox. Review changes and run untrusted projects in an external sandbox.

## Upstream and license

Capricorn is an independent product and repository. Some inherited internal package and protocol identifiers remain temporarily for compatibility with the MIT-licensed foundation; they are not Capricorn repository or product identifiers. Prime Intellect and Prime Inference references identify optional external vendor integrations.

Released under the [MIT License](LICENSE). Existing copyright and license notices are retained as required.
