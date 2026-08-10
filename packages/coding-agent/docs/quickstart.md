# Quickstart

This page gets you from install to a useful first Capricorn session.

## Install

Capricorn currently runs from a source checkout and requires Node.js 22.8.0 or newer:

```bash
cd /path/to/capricorn-agent
npm install
./capricorn.sh
```

To launch it while working in another project, call `/path/to/capricorn-agent/capricorn.sh` from that project's directory. A Capricorn-owned binary release channel can be added later without pointing users at upstream Prime Agent artifacts.

## Authenticate

Capricorn can use subscription providers through `/login`, or API-key providers through environment variables or its auth file.

### Option 1: Subscription Login

Start Capricorn and run:

```text
/login
```

Then select a provider. Built-in subscription logins include Claude Pro/Max, ChatGPT Plus/Pro (Codex), and GitHub Copilot.

### Option 2: API Key

Set an API key before launching Capricorn:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
capricorn
```

You can also run `/login` and select an API-key provider to store the key in `~/.capricorn/agent/auth.json`.

See [Providers](providers.md) for all supported providers, environment variables, and cloud-provider setup.

## First Session

Once Capricorn starts, type a request and press Enter:

```text
Summarize this repository and tell me how to run its checks.
```

Capricorn gives the model one built-in tool, `ipython`. The long-lived kernel is a control environment for reading and editing files, running project commands, inspecting data, retaining Python state, and invoking installed skills. The kernel runtime is bootstrapped automatically on first use; set `PRIME_AGENT_KERNEL_PYTHON` to use an existing Python environment with `ipykernel`.

Capricorn runs in your current working directory and can modify files there. Use git or another checkpointing workflow if you want easy rollback.

## Recursive Subagents

Recursive subagents are a built-in Capricorn capability. The model spawns independent work from IPython with `await rlm("subtask")`; each call returns at admission with a child handle and never returns the answer. Children send requested results as explicit `agent_message` replies to the parent or write them to files. Child agents use the same TypeScript agent runtime, providers, tools, skills, and session machinery as the parent.

You can prompt the model to use that capability directly:

```text
Review authentication and test coverage as independent subtasks. Run them in parallel, then synthesize the findings.
```

See [RLM Runtime Architecture](rlm-runtime.md) for the API and execution model.

## Give Capricorn Project Instructions

Capricorn loads context files at startup. Add an `AGENTS.md` file to tell it how to work in a project:

```markdown
# Project Instructions

- Run `npm run check` after code changes.
- Do not run production migrations locally.
- Keep responses concise.
```

Capricorn loads:

- `~/.capricorn/agent/AGENTS.md` for global instructions
- `AGENTS.md` or `CLAUDE.md` from parent directories and the current directory

Restart Capricorn, or run `/reload`, after changing context files.

## Common Things to Try

### Reference Files

Type `@` in the editor to fuzzy-search files, or pass files on the command line:

```bash
capricorn @README.md "Summarize this"
capricorn @src/app.ts @src/app.test.ts "Review these together"
```

Images can be pasted with Ctrl+V (Alt+V on Windows) or dragged into supported terminals.

### Run Shell Commands

In interactive mode:

```text
!npm run lint
```

The command output is sent to the model. Use `!!command` to run a command without adding its output to model context. During agent work, the model normally runs project commands from the IPython control environment with a `%%bash` cell.

### Switch Models

Use `/model` or Ctrl+L to choose a model. Use `/effort` to set the reasoning level. Use Ctrl+P / Shift+Ctrl+P to cycle through scoped models.

### Continue Later

Sessions are saved automatically under `~/.capricorn/agent/sessions/`:

```bash
capricorn -c                  # Continue the most recent session
capricorn -r [path|id]        # Browse sessions or open a specific session
```

Inside Capricorn, use `/resume`, `/new`, `/tree`, `/fork`, and `/clone` to manage sessions. Persistent sessions run in worker processes, so closing the TUI detaches from the agent rather than necessarily stopping it. Use `capricorn agents` to inspect or reattach to active work.

### Non-Interactive Mode

For one-shot prompts:

```bash
capricorn -p "Summarize this codebase"
cat README.md | capricorn -p "Summarize this text"
capricorn -p @screenshot.png "What's in this image?"
```

Use `--mode json` for JSON event output or `--mode rpc` for process integration.

## Next Steps

- [Using Capricorn](usage.md) - interactive mode, slash commands, sessions, context files, and CLI reference.
- [Providers](providers.md) - authentication and model setup.
- [Settings](settings.md) - global and project configuration.
- [Keybindings](keybindings.md) - shortcuts and customization.
- [Capricorn Packages](packages.md) - install shared extensions, skills, prompts, and themes.

Platform notes: [Windows](windows.md), [Termux](termux.md), [tmux](tmux.md), [Terminal setup](terminal-setup.md), [Shell aliases](shell-aliases.md).
