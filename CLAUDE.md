# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules

No code before an approved plan; no commit before an explicit "yes"; push only when asked.

Before you start writing any code, use the AskUserQuestion tool to ask me clarifying questions one by one about the architecture, tech stack, and design preferences. (max 4 questions, 2–4 options each; "Other" is always offered). Where possible, propose a default option and mark it (default — confirm).

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## Commands

- `npm run dev`: dev server (the service worker is not active in dev)
- `npm test`: all tests (Vitest + React Testing Library, jsdom). One file: `npx vitest run src/days.test.ts`
- `npm run build`: type-check (`tsc -b`) then production build to `dist/`
- `npm run preview`: serve `dist/`, needed to test the PWA (manifest, service worker, offline)

## Architecture

Dunnit is a frontend-only daily pushup tracker: React 18 + TypeScript + Vite, an installable PWA via `vite-plugin-pwa`. There is no backend. All state is one JSON object in localStorage under `dunnit:v1`.

- `src/days.ts`: the data model (`Data`, `Day`, `RepSet`) and pure functions for all state changes. Every change goes through here and returns a new object.
- `src/storage.ts`: load/save, export, and import validation (`parseImport`). Stored data is validated the same way imports are.
- `src/useData.ts`: React hook that holds state, saves on every change, and re-checks "today" every minute and when the page becomes visible.
- `src/screens/` (Today, History, Settings) and `src/components/` (Ring, HistoryChart). The chart is hand-written SVG, with no chart library.
- `src/styles.css`: one stylesheet with color tokens on `:root`, overridden for dark mode by `prefers-color-scheme`.

Rules that are easy to break:
- Days are keyed `"YYYY-MM-DD"` in the configured timezone, worked out when a set is logged. A set never moves to another day.
- `todayKey` never returns a date earlier than the newest recorded day, so switching timezone westward does not move "today" back.
- Each day stores its own `target`. `setTarget` updates the settings and today's target only; past days keep theirs.
- Format a day key with `formatDay` (it formats in UTC, so there is no shift). Format a set time with `formatTime` in the configured timezone.
