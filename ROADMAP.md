# Capricorn Product Roadmap

Capricorn is focused on verifiable, long-running agent work. These features are Capricorn product directions, not upstream rename work.

## Shipped

### Capricorn Mission Doctrine

The default system prompt is Capricorn-owned: missions move through **Orient, Plan, Execute, Verify, Report**, with explicit rules for evidence, uncertainty, recovery, user-work preservation, and evaluation of delegated results. Runtime API names remain stable compatibility contracts rather than product identity.

### Mission Control

`/mission` provides a live, model-free view of the active goal, Git workspace, model/run state, context usage, direct subagents, queued input, and the next deterministic action. It does not spend tokens or ask a model to invent status.

### Proof-Carrying Goals

`/goal --check "<command>"` attaches user-approved executable acceptance checks. Capricorn reruns them before completion and records a bounded certificate with exit status, duration, output digests and preview, plus tamper-evident, stable before/after Git source-worktree identity. Failed checks keep the goal incomplete; goals without checks are visibly self-reported.

## Next

### Campaigns

A workspace-level objective graph spanning sessions and agents, with milestones, dependencies, owners, budgets, blockers, and completion evidence.

### Research Dossiers

Claims linked to source snapshots, file and commit hashes, commands, and agent provenance, with stale-source detection and Markdown/HTML/JSON export.

### Evaluated Delegation

Run isolated subagents or models against the same task, apply explicit tests or rubrics, and retain the evidence used to select a result.

### Harness Lab

Treat self-improvement changes as candidates. Evaluate them against local canaries before promotion, and quarantine or roll them back when quality or cost regresses.

## Product principles

- Verify outcomes instead of trusting completion claims.
- Show current state without spending a model turn.
- Keep evidence durable, bounded, and inspectable.
- Preserve provider choice and local-first operation.
- Make every autonomous action attributable to a session, agent, and objective.
