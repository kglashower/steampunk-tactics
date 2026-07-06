# Steampunk Tactics

A mobile-first, offline-capable **Progressive Web App** game: turn-based tactics
(à la Final Fantasy Tactics) blended with territory expansion and resource
management — pure steampunk technology, no magic.

- 📋 Full plan: [PLAN.md](PLAN.md)
- 🎯 MVP design (numbers, classes, map, recipes): [docs/mvp-design.md](docs/mvp-design.md)

## Running it (for non-coders too)

You only need [Node.js](https://nodejs.org) installed (v20+). Then, in a terminal
opened to this folder:

```bash
npm install      # one time: download the building blocks
npm run dev      # start the game in development mode
```

After `npm run dev`, open the printed URL (usually http://localhost:5173) in your
browser. On a phone, you can "Add to Home Screen" to install it like an app; it
works offline once loaded.

### Other commands
```bash
npm run build      # produce an optimized, installable build (into /dist)
npm run preview    # preview that production build locally
npm test           # run the engine unit tests
```

## What's built so far (Phase 0)
- Installable, offline PWA shell (React + Vite + TypeScript).
- App navigation: **Map**, **Crew**, **Workshop**, **Build** screens.
- Game state with **autosave/restore** to the browser (IndexedDB).
- The **Map** screen shows the 4 starting territories, each one's attack risk,
  and an **End Day** button that produces resources.
- The first tested rules-engine piece: **attack probability** (with unit tests).

## What's next
See the phased roadmap in [PLAN.md](PLAN.md) — next up is the headless,
unit-tested **tactical battle engine** (grid + height + Charge-Time turns).

## Project structure
```
src/
  app/      App shell + boot/load
  data/     Static content (territories, jobs, resources, initial state)
  engine/   Pure, testable game rules (battle / world / crafting / progression)
  state/    Zustand store + IndexedDB save-load
  ui/       React screens and shared components
  styles/   Steampunk design tokens + global CSS
```
