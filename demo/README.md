# Productivity Dashboard Demo

This folder is a standalone test/demo copy of the Productivity Dashboard.

Host the entire `demo/` folder for external testers. The demo loads mock data from `data/tasks.json` and `data/products.json`, then stores tester changes in isolated `sessionStorage` only. It does not read or modify the real dashboard's tasks, saved products, or Preview/Production version state.

## Demo Data

The demo resets to the same example data on every page load:
- Tasks across Life, Work, and Projects
- Low, medium, and high priorities
- Due today, overdue, future due, and no-date tasks
- Active and completed tasks
- Tasks with one note, multiple notes, four notes, all-complete notes, and mixed-completion notes
- Saved Costs products with realistic pack, quantity, tax, discount, and COGS values

## Reset

Use the in-app **Reset Demo** button to restore the original demo data during a session. Refreshing or reopening the page also resets the demo automatically.
