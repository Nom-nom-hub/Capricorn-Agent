# Capricorn V1 Release Contract

Capricorn V1 is the **Adaptive Workspace** release: it learns how a project should be built, keeps user-approved guidance across sessions, supports reversible experiments, and stays with a mission until its evidence is honest.

This document is a release gate, not a list of aspirations. A capability is not V1-complete until its acceptance criteria and safety boundary pass.

## Product promise

> Capricorn learns how you like to build, preserves that knowledge under your control, and does not call the work finished beyond the evidence it can show.

## One control surface

`/mission` remains the deterministic, model-free control center and gains project subcommands. `/finish` is the only new top-level workflow command. Routes stages every action rather than executing it.

```text
/mission
/mission project
/mission learn instinct <text>
/mission learn taste <text>
/mission learn correction <text>
/mission suggestions
/mission approve|edit|forget|why <id>
/mission references
/mission reference add|remove|use ...
/mission experiments
/mission experiment start|note|decide|discard ...
/mission continuity
/mission checkpoint [note]
/mission continue
/mission playbooks
/finish [note]
```

## V1 capabilities and release gates

### 1. Project Instincts

- Deterministically inspect manifests, lockfiles, scripts, and CI configuration without executing discovery commands.
- Remember package manager, native run/check commands, layout conventions, and guardrails per project.
- Repository text is evidence, never executable policy.
- Show the source and reason for every instinct; tentative instincts never override corrections.

### 2. Taste Memory

- Persist explicit user preferences at project scope by default.
- Global reuse is opt-in and private entries never enter model context.
- Every preference can be inspected, edited, exported, or forgotten.
- Capricorn never silently infers or promotes visual taste in V1.

### 3. Correction Learning

- Capture explicit “do X, not Y” corrections as confirmed user rules.
- Observed patterns remain candidates until the user approves them.
- Corrections outrank taste and instincts, and rejections suppress equivalent suggestions.
- The agent cannot approve its own candidate.

### 4. Verified Finish

- `/finish` audits the complete mission, runs only user-owned checks, records proof, and checkpoints the result.
- Checked active goals use the existing Proof-Carrying Goal gate; failures remain blocked.
- Unchecked goals are labeled **SELF-REPORTED**. No active goal produces a validation report, never a fabricated certificate.
- Finish is bounded, cancellable, resumable, and cannot add, weaken, or rewrite acceptance checks.

### 5. Visual QA Memory

- Accept user-provided PNG, JPEG, GIF, and WebP references through existing image input paths.
- Store content-addressed artifacts plus JSON provenance, dimensions, workspace identity, notes, and structured observations.
- Gate on readable artifact, image policy, size limits, and a vision-capable model; unavailable is never pass.
- V1 does not claim automatic browser capture. A future screenshot provider must be explicit, pinned, host-owned, and separately approved.

### 6. Safe Experiments

- Conversation forks are labeled as conversation-only and never presented as filesystem isolation.
- Isolated experiments use host-owned Git linked worktrees rooted in Capricorn state, a recorded base HEAD, and an ownership registry.
- Require a clean Git source for V1. Promotion is an explicit user decision; conflicts preserve the parent unchanged.
- Cleanup never deletes an unowned or dirty worktree. Worktrees provide source reversibility, not a security sandbox.

### 7. Continuity Briefing

- Deterministically summarize the last checkpoint, goal/proof state, Git identity, active guidance versions, experiments, and next action.
- Mark briefings current or stale against the live workspace.
- `/mission continue` injects bounded sourced context without claiming stale facts are current.
- Ctrl+S draft stash remains separate and unchanged.

### 8. Personal Playbooks

- Reuse existing project/user prompt templates and their current invocation semantics.
- Inventory available, invalid, missing, and colliding playbooks in Mission Control.
- A playbook records intent, preconditions, confirmations, evidence, and rollback guidance.
- Natural-language recipes never become executable proof checks without explicit user declaration.

### 9. Plain-Language Control Center

- `/mission` adds a compact PROJECT row; `/mission project` exposes Guidance, References, Experiments, Continuity, Playbooks, and Next.
- Every entry shows status, source, and the next legal action without requiring prompt-engineering vocabulary.
- Cards remain deterministic, no-model, no-color accessible, and tested at compact, standard, and wide widths.

## Persistence and trust

Project learning lives outside the repository by default at:

```text
~/.capricorn/agent/workspaces/<sha256-project-key>/
```

The project key derives from the canonical Git common directory/root, falling back to canonical cwd. Directories are `0700`; state files are `0600`, schema-validated, bounded, atomically replaced, and protected by cross-process locking. A separate index stores only display path and last-seen time. Sharing is an explicit export/import action; Capricorn never edits `.gitignore`.

Adaptive entries carry scope, state, provenance, evidence, confidence, sensitivity, version, and timestamps. Prompt injection order is bounded:

```text
active corrections > taste > confirmed instincts > tentative instincts
```

Only the current checkpoint and active experiment are added. Raw transcripts, images, repository text, and tool output remain untrusted evidence.

## Delivery sequence

1. **Foundation** — project identity/store, schemas, locking, permissions, settings, bounded prompt projection, audit records.
2. **Learning and continuity** — instincts, explicit taste/corrections, candidate inbox, checkpoint/briefing, Mission Control project cards.
3. **Workflows** — playbook inventory, visual reference registry, `/finish`, Routes entries.
4. **Reversibility** — worktree experiment manager, explicit promotion/cleanup, crash recovery.
5. **Release hardening** — migrations, concurrency, privacy/export/delete, daemon/RPC/ACP parity, compact/standard/wide UI, installer and full regression validation.

## V1 release checklist

- [ ] All nine capability gates above are implemented and documented.
- [ ] Learning-off produces zero adaptive writes and zero prompt injection.
- [ ] No model-originated command can become a proof check, visual verifier, or promotion hook.
- [ ] Project state survives restart/resume and never leaks across project keys.
- [ ] Corrupt or future state is quarantined rather than overwritten.
- [ ] Cross-process TS/Python writes cannot silently lose updates.
- [ ] Verified, self-reported, failed, stale, unavailable, and blocked remain textually distinct.
- [ ] Existing commands, extension precedence, prompt templates, editor behavior, providers, and session compatibility pass regression tests.
- [ ] Source distribution, privacy language, migration behavior, and release notes are complete.
