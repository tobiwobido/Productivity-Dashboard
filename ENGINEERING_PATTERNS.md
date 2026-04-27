# ENGINEERING PATTERNS

Implementation reference. CLAUDE.md defines rules; this file defines how to implement them.

---

# PRE-EDIT ANALYSIS CHECKLIST

Before writing any code, verify:

A. Core change — what exactly is being modified
B. Supporting behavior — state, save/cancel/blur, keyboard (Enter/Escape), animations, preview impact
C. Lifecycle — initial load, tab switch, version switch, mount/unmount, layout flash prevention
D. Interaction states — hover, active, focus, disabled, loading, empty
E. Edge cases — rapid interaction, state changes during animation, missing data, elements removed mid-transition
F. Consistency — match existing timing, easing, spacing, and component patterns

---

# MOTION READY

prevent animation on first load

```javascript
var widgetMotionReady = false;
requestAnimationFrame(function() { widgetMotionReady = true; });
```

gate all animations: `if (!widgetMotionReady || prefersReducedMotion()) { /* instant */ return; }`

---

# FORCE REFLOW

restart animation

```javascript
el.classList.remove('anim')
void el.offsetWidth
el.classList.add('anim')
```

---

# EXIT CONTENT GUARD

do not update values during exit animation

```javascript
var exitingRows = {};
// hiding:
exitingRows[rowId] = true;
setTimeout(function() { row.style.display = 'none'; delete exitingRows[rowId]; }, 320);
// updating:
if (!exitingRows[rowId]) { updateContent(rowId, val); }
```

---

# STAGGER CLEANUP

clear timers before new run

```javascript
var _cardTimers = {};
cardDefs.forEach(function(c) {
  if (_cardTimers[c.id]) { clearTimeout(_cardTimers[c.id]); delete _cardTimers[c.id]; }
});
```

---

# ACTION BUTTON FEEDBACK

use click → feedback → reset pattern

States: `normal → click-animating (420ms) → show-feedback (2000ms) → preview-reset (380ms) → normal`

Use `triggerActionFeedback(btnId)` and `bindActionFeedbackReset(btnId)`. Never use `alert()`.

Required HTML: `<span class="btn-label">Save</span>` + `<span class="btn-feedback">Saved</span>`

---

# ROLL VALUE TRACKING

use: `el.dataset.rollValue`

```javascript
if (el.dataset.rollValue === newValue) return;   // skip if unchanged
el.dataset.rollValue = next;                      // set before animation HTML
var val = el.dataset.rollValue || el.textContent; // read for clipboard
```

`setTextDirect` must also update `dataset.rollValue` to stay in sync.

---

# FILTER TRANSITIONS

FLIP → small moves, same-column reordering
filter-enter → large moves, filter changes, All↔Done transitions

skip FLIP for elements with `filter-enter` class:
```javascript
if (el.classList.contains('filter-enter')) return;
```

---

# LOAD SEQUENCE

use preload → ready

```
body.app-preload  →  transitions suppressed
↓  PANEL_EXIT_MS (350ms) + requestAnimationFrame
body.app-ready    →  transitions active
```

gate transitions: `body.app-ready .element { transition: ... }`

---

# SWITCH LOCK

prevent double switching

```javascript
if (panelSwitchLocked) return;
panelSwitchLocked = true;
setTimeout(function() { panelSwitchLocked = false; }, PANEL_EXIT_MS);
```

---

# STORAGE

use try/catch, version keys, demo/live separate

```javascript
try { var data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch(e) { var data = null; }
return data || {};
```

Keys must be versioned: `taskmanager_v2` not `taskmanager`
New widgets: assign `widgetname_v1` from the start

---

# UNDO REDO

snapshot before change, manage stacks, prevent recursion

```javascript
el.addEventListener('focusin', function() { el._undoSnapshot = getSnapshot(); });
el.addEventListener('change', function() {
  if (!el._undoSnapshot) return;
  if (el._undoSnapshot !== getSnapshot()) pushUndo(el._undoSnapshot);
  el._undoSnapshot = null;
});
```

stack limit: 50 entries — `undoing = true` guard prevents recursive pushes

---

# CHECKBOX

use SVG toggle, never native UI

```html
<label class="cogs-check-toggle" for="inputId">
  <input type="checkbox" id="inputId">
  <span class="cogs-check-wrap" aria-hidden="true">
    <svg class="cogs-check-svg" viewBox="0 0 22 22" fill="none">
      <circle class="cogs-check-circle" cx="11" cy="11" r="9.5"></circle>
      <polyline class="cogs-check-mark" points="6,11 9.5,14.5 16.5,7.5"></polyline>
    </svg>
  </span>
  <span>Label</span>
</label>
```

Native input: `position:absolute; opacity:0; pointer-events:none`
Use `syncCogsCheckToggle(inputId, animate)` — do not write custom logic
Pass `animate = false` on initial page load

---

# CSS TOKENS

use variables only, no hardcoded values

Colors: `--green` `--green-light` `--green-bg` `--gold` `--red`
Text: `--text-primary` `--text-muted` `--text-hint`
Surfaces: `--surface` `--surface-2` `--bg` `--border` `--border-input`
Easing: `cubic-bezier(0.4, 0, 0.2, 1)` standard / `0.34s` card resize / `0.2s ease` hover / `350ms` panel exit

---

# OPTIONAL ROW

use max-height, opacity, transform — no instant display:none

```css
.optional-row { max-height:0; opacity:0; transform:translateY(8px); display:none;
  transition: max-height .3s ease, opacity .22s ease, transform .3s ease; }
.optional-row.is-visible { max-height:70px; opacity:1; transform:translateY(0); }
```

```javascript
// show:
row.style.display = 'flex'; void row.offsetWidth; row.classList.add('is-visible');
// hide:
row.classList.remove('is-visible');
setTimeout(function() { row.style.display = 'none'; }, 320);
```

---

# SCOPING

scope CSS to widget, never unscoped element selectors

```css
/* Scoped to .cogs-wrap to prevent conflicts */
.cogs-wrap button { ... }
```

---

# RAF

use requestAnimationFrame for focus and DOM updates after state changes

```javascript
requestAnimationFrame(function() { el.focus(); el.setSelectionRange(end, end); });
```

---

# isReverted PATTERN

every behavioral JS change must fork on the reverted flag

```javascript
var isReverted = document.body.classList.contains('preview-update-reverted');
if (isReverted) { /* old behavior */ } else { /* new behavior */ }
```

CSS: `body.preview-update-reverted .selector { /* old style */ }`

---

# PREVIEW_UPDATE_BATCH_ID

increment in `index.html` at the start of every session that edits Preview code
format: `'ai-preview-batch-YYYY-MM-DD-vN'`
never reuse the same ID across sessions

---

# COPY LIVE TO DEMO

When user requests "copy live version to demo":

1. Copy: `index.html`, `shared.css`, `widgets/*/style.css`, widget JS (feature logic only)
2. Never copy: localStorage data, user tasks/products, version system state
3. Preserve in every demo script:
   - `var TM_KEY = 'taskmanager_demo_v1'` — never replace with live key
   - `getDemoTaskData()` — seed data, never overwrite
   - `migrateIfNeeded()` — calls getDemoTaskData on every load
   - `demoISO(dayOffset)` — relative date helper
   - `DEMO_RESET_REQUESTED` check for `?resetDemo=1`
   - no redo stack in demo
4. Verify: demo resets cleanly, no live task IDs or text appear in demo scripts

Demo data must cover: overdue/today/future/no-date, low/medium/high priority, active/completed, notes at 0/1/many/all-complete.

---

# VERIFICATION SCOPE

match verification depth to change risk:

CSS-only → check affected UI only, no full project scan
behavior change → check all affected tabs and widgets
system change (preview/production/demo/storage) → full check including revert/restore
