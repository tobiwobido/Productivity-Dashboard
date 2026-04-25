# AI DEVELOPMENT RULES (MANDATORY)

This document defines how all AI tools (Claude, Codex, Copilot, etc.) must behave when making changes to this project.

These rules are mandatory and must be applied to every request.

---

# 1. CORE WORKFLOW PRINCIPLE

The AI is responsible for delivering **complete, production-quality user experiences**, not just implementing the literal request.

The AI must:
- Think through the full lifecycle of every feature
- Automatically include missing UX logic
- Ensure consistency with existing patterns
- Avoid partial or incomplete implementations

---

# 2. STRICT MODE (REQUIRED)

Before writing any code, the AI MUST follow this two-step process:

## STEP 1: UX & LOGIC ANALYSIS

The AI must analyze the request and account for:

### A. Core Change
- What is being requested

### B. Supporting Behavior
- State management
- Save/commit behavior
- Cancel/revert behavior
- Blur (click-out) behavior
- Keyboard interactions (Enter, Escape, shortcuts)
- Animation behavior
- Transition consistency
- Preview vs Production impact

### C. Lifecycle Considerations
- Initial load behavior
- Tab switching behavior
- Version switching behavior
- Mount/unmount timing
- Prevent layout flashes

### D. Interaction States
- Hover
- Active
- Focus
- Disabled
- Loading
- Empty states

### E. Edge Cases
- Rapid repeated interactions
- State changes during animations
- Missing or empty data
- Elements removed during transitions

### F. Consistency Check
- Match existing dashboard patterns
- Match animation timing and easing
- Match layout, spacing, and alignment rules

---

## STEP 2: IMPLEMENTATION

Only after completing analysis:
- Implement the feature
- Include ALL required supporting logic
- Ensure no missing UX behaviors
- Ensure no broken or partial states

---

# 3. LIVE VS DEMO ENVIRONMENT RULES

## Live Dashboard
- All changes must be applied to the **live dashboard by default**

## Demo Dashboard
- The demo dashboard must NOT be modified unless explicitly instructed
- The demo is only updated when the user explicitly requests:
  - “Copy live version to demo”

---

## Copy Live → Demo Process

When the user requests “Copy live version to demo”, follow this exact process:

### Step 1 — Copy code only
Copy the following file types from the live directory to the corresponding demo directory:
- `index.html` → `demo/index.html`
- `shared.css` → `demo/shared.css`
- `widgets/*/style.css` → `demo/widgets/*/style.css`
- Widget JS logic (feature code only — see Step 2)

**Never copy:**
- Live localStorage data
- Live user tasks, products, or any user-generated content
- Live version system state or config

### Step 2 — Preserve all demo-specific code
After copying, the following demo-specific elements must be intact in every demo script file:

- **Isolated storage key**: `var TM_KEY = 'taskmanager_demo_v1'` — must never be replaced with the live key (`taskmanager_v2`)
- **Demo seed data**: `getDemoTaskData()` function with all demo tasks, notes, priorities, and due dates — must never be overwritten with live task data
- **Reset logic**: `migrateIfNeeded()` that calls `getDemoTaskData()` on every fresh load — must remain functional
- **URL reset hook**: `DEMO_RESET_REQUESTED` check for `?resetDemo=1` — must remain functional
- **Demo date helpers**: `demoISO(dayOffset)` function for relative demo dates — must be preserved
- **No redo stack**: The demo undo stack has no redo (`redoStack`) — do not add live-only features that break demo isolation

When copying widget JS from live to demo:
1. Copy the feature logic (functions, rendering, interactions)
2. Keep the demo file's storage key, data seed, and reset mechanism unchanged
3. Do not copy the live `migrateIfNeeded()` which reads from `taskmanager_v1` — preserve the demo version

### Step 3 — Reapply demo dataset
After any code copy, verify the demo resets cleanly:
- Open `demo/index.html?resetDemo=1` conceptually — the demo should seed fresh from `getDemoTaskData()`
- Confirm no live task IDs, live task text, or live user data appears anywhere in the demo scripts

### Step 4 — Verify isolation
Confirm after every copy:
- Demo reads/writes only `taskmanager_demo_v1` (and equivalent isolated keys for other widgets)
- Live dashboard reads/writes only `taskmanager_v2` (and equivalent live keys)
- No shared localStorage keys between live and demo
- No live data values hardcoded into demo scripts

---

## Demo Data Rules
- Demo data is the **source of truth** for the demo — it defines what testers see
- Live data must **never** appear in the demo under any circumstances
- The demo must reset to the original demo dataset every time a user opens it
- Tester changes in demo must not persist across reloads or new sessions
- Each user must see the same starting demo state
- Demo edits are temporary and session-only
- Demo data must include enough variety to test all features:
  - Tasks with overdue, due today, future, and no due date
  - Low, medium, and high priority tasks
  - Active and completed tasks
  - Tasks with zero, one, multiple, and all-complete notes

## Global Requirement
- These rules apply across ALL AI tools (Claude, Codex, Copilot, etc.)

---

# 4. PREVIEW VS PRODUCTION SYSTEM

The application uses a Preview → Production workflow.

The AI must ensure:

- All edits are applied to Preview state when applicable
- Production state remains unchanged until explicitly published
- Publishing copies Preview → Production

## Version Switching Behavior
Switching between Preview and Production must behave like full page navigation:

- Current version:
  - fades out
  - slides down

- New version:
  - slides up
  - fades in

## Critical Requirements
- Do NOT render the new version before exit animation completes
- Prevent layout flashes or intermediate states
- Maintain consistent animation timing with tab switching

---

# 5. CONTEXT & FILE SCOPE RULES

The AI must operate with minimal scope and avoid unnecessary file access.

## Requirements
- Only read files relevant to the requested change
- Do NOT scan the entire project unless absolutely necessary
- Identify the minimal set of files required

## Before Coding
- Determine which files are affected
- Limit work to those files only

## During Implementation
- Do NOT modify unrelated files
- Do NOT refactor unrelated code
- Reuse existing patterns and structures

## After Coding
- Confirm that only intended files were modified

---

# 6. PREVIEW REVERT SNAPSHOT RULE

Before making any VS Code, filesystem, or AI-driven code changes, the AI must create a revert snapshot of the current Preview codebase first.

This is a source-level snapshot, not a visual flag and not only a UI state/config value. It represents the exact Preview code/state that must be restored when the user clicks **Revert Changes** or asks an AI tool to revert the most recent update batch.

## Required Behavior

Before every AI-driven update batch:
- Create the Preview revert snapshot before modifying any files
- Identify the files, sections, and behavior areas affected by the prompt
- Capture the current live Preview codebase exactly as it exists before the requested changes, using the smallest snapshot scope that still fully protects revertability
- By default, snapshot only the files and related logic that may be modified by the update batch
- Include all source needed to restore behavior accurately, including:
  - UI styles
  - layout and alignment rules
  - component logic
  - event handlers
  - state logic
  - animation logic
  - interaction behavior
  - configuration
- Include CSS, HTML, JavaScript, state/config, and related behavior code when they are tied to the requested change
- If the change is broad, unclear, cross-cutting, or touches shared behavior, use a larger snapshot
- If the change affects Preview/Production, Revert/Restore, Demo isolation, publishing, storage keys, or migration logic, use a full relevant snapshot of all affected systems
- Store the snapshot separately from Production publish backups
- Do not overwrite the snapshot during the same update batch
- Do not create the snapshot after edits have started
- Do not use Production as the snapshot source
- Do not use Demo as the snapshot source
- Do not substitute visual-only CSS overrides for a full source/code snapshot

After the update batch is complete:
- Save the updated Preview codebase as the matching restore snapshot
- The restore snapshot must include the same scope of files and behavior as the revert snapshot
- Revert and Restore must operate as a pair:
  - Revert = state before the update batch
  - Restore = state after the update batch

## Revert Changes Behavior

When the user clicks **Revert Changes**:
- Restore Preview from the most recent Preview revert snapshot
- Restore the full source/code/state captured before the most recent AI update batch
- Restore all files affected by that update batch, not only visual state
- Restore logic and behavior changes, including examples such as add-note blur behavior, task category header alignment, event handlers, animation logic, and state rules
- Do not restore Preview from Production
- Do not restore Preview from Demo
- Do not delete or overwrite Production
- Do not delete or overwrite Demo
- Do not perform a partial revert

## Restore Changes Behavior

When the user clicks **Restore Changes**:
- Reapply the full update batch that was reverted
- Restore Preview back to the after-update restore snapshot
- Restore all files, logic, styling, animation behavior, event handlers, and config from the update batch

## Important Rules

- Preview revert snapshot must be created before every update batch, before any file edits
- Snapshot must include all related code, state, config, styles, layout, animations, event handlers, and behavior needed to restore Preview accurately
- Snapshot size should match the risk and scope of the request:
  - Small CSS-only tweak: snapshot the affected CSS file and any directly tied HTML/JS only if needed
  - Narrow behavior change: snapshot the changed JS plus directly related HTML/CSS/state config
  - Broad or unclear change: use a larger snapshot
  - Preview/Production/Revert/Demo logic change: use a full relevant snapshot
- Snapshot must persist after tab switches, version switches, and page reloads if possible
- Publishing Preview to Production must not delete the Preview revert snapshot
- Reverting Publish must not delete the Preview revert snapshot
- Preview revert snapshot and Production publish backup are separate systems
- The snapshot must not be overwritten too early
- The changed state must never be saved as the pre-update revert snapshot
- Revert must never be visual-only unless the update batch itself was visual-only and no source logic changed
- If the browser UI cannot physically restore source files, the AI/tooling layer must perform the file-level restore from the saved snapshot
- The AI must report where the snapshot was saved when it creates one

---

## Verification Scope

Verification should match the size and risk of the change.

For small CSS-only tweaks:
- Still follow all CLAUDE.md rules
- Use lighter verification focused on the affected UI/state
- Do not run full dashboard-wide checks unless the change could affect shared layout, Preview/Production behavior, page switching, data/state, or other broad systems
- Prefer targeted inspection, targeted render checks, or focused DOM/style checks

For broader changes:
- Run broader verification when behavior, state, storage, Preview/Production, Demo isolation, migrations, or shared components are affected
- Use full dashboard checks when the risk justifies it

The goal is to preserve revert safety while avoiding unnecessary snapshot size, token usage, and slow verification for narrow changes.

---

# 7. UI / UX CONSISTENCY RULES

All changes must match the existing design system.

## Requirements
- Preserve existing layout unless explicitly changed
- Maintain spacing, alignment, and proportions
- Match component behavior across the app
- Reuse interaction patterns (do not invent new ones unnecessarily)

---

# 8. ANIMATION & TRANSITION RULES

Animations must feel consistent, smooth, and intentional.

## Requirements
- Match existing animation timing and easing
- Ensure consistency across:
  - initial load
  - tab switching
  - version switching
- Avoid:
  - jitter
  - flicker
  - delayed responses
  - layout shifts

---

# 9. INTERACTION & INPUT BEHAVIOR

All interactive elements must behave fully and predictably.

## Editable Elements
- Save on blur (click-out)
- Save on Enter
- Cancel on Escape
- Exit edit mode after save
- Prevent stuck edit states

## UI States
Every interactive element must support:
- Hover
- Active
- Focus
- Disabled
- Loading (if applicable)
- Empty state (if applicable)

---

# 10. CONSTRAINTS (DO NOT BREAK)

The following must always be enforced:

- Do not change unrelated files
- Do not remove existing functionality
- Do not break Preview / Production logic
- Do not modify Demo unless explicitly instructed
- Do not introduce layout shifts
- Do not introduce flicker
- Do not create stuck states
- Do not introduce console errors

---

# 11. PERFORMANCE & STABILITY

- Avoid unnecessary re-renders
- Avoid duplicate rendering states
- Ensure smooth transitions and interactions
- Keep changes minimal and efficient

---

# 12. COMPLETENESS RULE

The AI must NOT stop at the literal request.

If additional logic is required to make the feature complete:
- It must be implemented automatically

---

# 13. OUTPUT REQUIREMENT

Every response must:

1. Perform UX & logic analysis
2. Implement the feature
3. Include all supporting behavior
4. Avoid partial implementations

---

# FINAL RULE

These rules must be applied automatically to every request.

The AI must always:
- Read and follow this file
- Apply Strict Mode thinking
- Deliver complete, production-ready results
