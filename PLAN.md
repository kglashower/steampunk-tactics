# Steampunk Tactics — Game Plan

A mobile-first Progressive Web App. Single-player, offline-capable. A blend of
**Final Fantasy Tactics** combat, **territory expansion**, and **resource
management**, wrapped in a steampunk theme.

---

## 1. Design pillars

1. **Tactics first.** Battles are the heart: a square grid *with elevation*,
   FFT-style Speed/Charge-Time turn order, job classes, and meaningful
   positioning. Everything else feeds the battles or is fed by them.
2. **A living map.** The world is a graph of territories. You expand into wild
   territory by winning battles, and you defend what you hold from monster
   incursions. Frontier territory is dangerous; the interior is safe.
3. **The loop must close.** Win battles → take territory → territory produces a
   resource → resources craft equipment & buildings → better gear/buildings →
   win harder battles. The MVP exists to prove this loop is fun.
4. **Forgiving for mobile.** Sessions are short. Knocked-out characters are
   revived after battle (no permadeath). Time advances only when *you* act, so
   nothing bad happens while the app is closed.
5. **Technology, never magic.** The fiction and every mechanic are pure
   steampunk engineering — steam, clockwork, gunpowder, metallurgy. No spells,
   mana, enchantments, or arcane anything. The "caster" role is the Engineer;
   the "mana" resource is **Steam** (boiler pressure); the "magic" stat is
   **Tech** (engineering skill); healing is **field repair / medkits**.

---

## 2. Locked decisions (from planning Q&A)

| Topic | Decision |
|---|---|
| Players | Single-player only, fully offline-capable PWA |
| Build approach | I build it end-to-end; you direct the vision |
| First milestone | Vertical-slice MVP that proves the full loop |
| Battle grid | Square grid **with height/elevation** (true FFT) |
| World map | **Node graph** of connected territories |
| Art | **Placeholder/abstract first** — clean shapes, icons, steampunk palette; swap in real art later |
| Death | Knocked out → revivable after battle (no permadeath) |
| Turn order | **FFT-style Speed/Charge-Time** |
| Overworld time | Advances per **turn/"day"** when a battle resolves or you end the turn |
| Crafting | **Recipe + tiers** (resources + required building → item; upgrade through tiers) |
| MVP content | **Lean slice:** ~4 territories, 3 resources, 3 job classes, 2 building types, 1 monster family |
| Theme | **Steampunk technology only — no magic of any kind** (Steam = mana, Tech = magic stat, Engineer = caster, field repair = healing) |

---

## 3. Recommended tech stack

- **Language:** TypeScript everywhere (safer for a large game data model).
- **App framework:** **React + Vite**. Vite gives fast dev and first-class PWA
  support via `vite-plugin-pwa` (service worker, offline cache, installable).
- **UI / menus / map / crafting:** React components (DOM + SVG). Great for the
  node-graph map, roster, crafting screens, and HUD.
- **Battle renderer:** **PixiJS** (WebGL canvas) for the isometric tactical
  grid. Reasoning: a *square grid with elevation* means 2.5D isometric rendering
  with depth sorting and per-tile height — that's awkward in plain DOM but
  natural in Pixi, and Pixi is far lighter than a full engine like Phaser while
  still being mobile-fast. React owns the screen; Pixi owns the battle canvas.
- **State:** **Zustand + Immer** for game state (simple, ergonomic, no
  boilerplate). Battle state is a self-contained reducer/state machine.
- **Persistence:** **IndexedDB** (via `idb` or Dexie) for the save file;
  `localStorage` for settings. Single save slot to start, autosave on each
  resolved turn.
- **Styling:** CSS modules or Tailwind with a steampunk design-token palette
  (brass, copper, oxidized teal, soot, parchment).
- **Testing:** Vitest for the rules engines (combat math, attack-probability,
  resource accrual) — these *must* be unit-tested because they're the game.

**Why not a full game engine?** A turn-based tactics game is mostly data,
rules, and UI — not physics or real-time rendering. React + Pixi keeps the
bundle small (good for a PWA), keeps menus accessible, and keeps the rules in
plain testable TypeScript.

---

## 4. Architecture overview

```
src/
  app/                # App shell, routing between screens, PWA setup
  data/               # Static game content (JSON/TS): classes, items, recipes,
                      #   buildings, territories, monsters. Pure data, no logic.
  engine/
    battle/           # Tactical combat: grid, height, CT turn order, abilities,
                      #   movement/range, AI, win/loss. Pure, deterministic.
    world/            # Overworld turn resolution: resource accrual, monster
                      #   attack rolls, garrison checks, territory state.
    crafting/         # Recipe resolution, tier upgrades, building requirements.
    progression/      # XP, leveling, job unlocks, promotions.
  state/              # Zustand stores + save/load (IndexedDB) + selectors.
  render/
    battle/           # PixiJS isometric renderer + input → engine commands.
  ui/                 # React screens: WorldMap, Roster, Character, Crafting,
                      #   Buildings, BattlePrep, BattleHUD, Results.
  styles/             # Design tokens, theme.
  test/               # Vitest specs for engine modules.
```

**Key principle:** the **engine is pure and headless** — it takes state +
input and returns new state. The renderer (Pixi) and UI (React) only *display*
state and *send commands*. This makes the game testable, deterministic, and
easy to debug, and lets us later add an AI auto-resolve, replays, or undo.

---

## 5. Core data model (entities)

These are the nouns of the game. Exact fields will firm up during build.

- **Character** — id, name, portrait, stats (HP, Steam, Speed, Attack, Defense,
  Tech, etc.), currentJob, jobLevels{job: level/XP}, learned abilities,
  equipment slots (weapon, armor, accessory), status (active/KO).
- **Job class** — id, name, stat growth/multipliers, ability list, equipment
  proficiencies, unlock requirements (e.g., "Soldier Lv3 → Engineer").
- **Ability** — id, type (attack/repair/buff/gadget/move), range, area, power,
  Steam/CT cost, targeting rules, elevation interactions.
- **Item / Equipment** — id, slot, stat modifiers, tier, granted abilities,
  the recipe that makes it.
- **Recipe** — output item, required resources + amounts, required building +
  level, upgrade-from (previous tier).
- **Building** — id, type, allowed territory type, level, what it unlocks
  (recipes/upgrades), active/inactive flag.
- **Territory** — id, name, type (which determines resource + monster family +
  buildable buildings), owner (player/wild), adjacency list, buildings,
  garrison (character ids), resource stockpile, overrun flag.
- **Resource** — id, type, amount (held globally and/or per territory).
- **Monster** — id, family (tied to territory type), level, stats, abilities.
- **WorldState** — territories graph, global resources, roster, current turn/day,
  pending incursions.
- **SaveGame** — versioned snapshot of WorldState + roster + settings.

---

## 6. Systems detail

### 6.1 Tactical battle engine (the hard, important part)
- Square grid; each tile has a **height** value. Movement cost and whether a
  unit can step/jump between tiles depends on height delta (jump stat).
- Height affects **accuracy, ranged reach, and damage** (high ground bonus) —
  classic FFT.
- **Turn order = Speed/CT:** each unit accumulates Charge Time each tick; when
  it crosses a threshold it gets a turn. Acting (move + act) resets CT based on
  what it did. Faster units act more often.
- A turn = optional **Move** + optional **Act** (attack/ability/wait).
- **Targeting & range:** abilities define range, area-of-effect, and
  line-of-sight/height rules.
- **Enemy AI:** utility-based — score possible (move, action) pairs by expected
  value (damage, kills, safety, objective) and pick the best. Start simple,
  deepen later.
- **Win/loss:** defeat all enemies (or objective). KO'd allies revive after the
  battle at low HP. Outcome feeds back to the world (territory captured/held,
  XP, loot/resources).

### 6.2 Overworld / territory engine
- Map is a **node graph**: territories are nodes, edges are adjacency.
- **Resource production:** each owned, non-overrun territory adds its resource
  type to your stockpile when a turn/day resolves.
- **Attack probability:** proportional to the number of **wild adjacent
  territories**. If all neighbors are player-owned, probability = 0. (e.g.,
  `P = base × (wildNeighbors / totalNeighbors)`, tunable.)
- **Incursion → battle:** when a roll triggers, monsters (of that territory's
  family, scaled to your progress) attack. If the territory has a **garrison**,
  you fight a defense battle (or auto-resolve). Lose → territory becomes
  **overrun**: production stops and its buildings go inactive until you
  recapture it.
- **Garrisons:** once you have enough characters, assign some to defend a
  territory instead of joining your active party.
- **Expansion:** attack an adjacent wild territory; win to claim it.

### 6.3 Economy: crafting & buildings
- **Buildings** can only be built on their matching **territory type** and
  unlock recipes/upgrades.
- **Equipment** is made via **recipes** (resources + required building) and
  upgraded through **tiers**.
- This is the sink for resources and the source of power growth.

### 6.4 Progression
- Characters gain **XP** from battle, level up, and learn job abilities.
- **Promotion** unlocks new job classes when requirements are met; abilities
  learned in one job carry over (FFT-style flexibility — scope carefully).

---

## 7. MVP — the vertical slice

**Goal:** a player can play one full turn of the loop and feel it.

**Content (lean slice):**
- **4 territories** in a small graph (e.g., 1 starting home + 3 frontier), 3 of
  them representing the 3 resource/territory types.
- **3 resources** (Coal, Iron, Copper), one per territory type.
- **3 job classes** (Soldier, Gunner, Engineer) with a few abilities each.
- **2 building types**, each tied to a territory type, each unlocking some
  recipes.
- **1 monster family** with ~3 levels and a couple of abilities.
- A handful of **equipment recipes** across 2 tiers.

**Playable flow in the MVP:**
1. Start on the home territory with 2–3 recruited characters.
2. View the **node map**; pick an adjacent **wild** territory to attack.
3. Fight an **isometric tactical battle** (height grid, CT turns, abilities, KO/revive).
4. Win → **claim** the territory; it starts producing its resource.
5. **End turn** → resources accrue; an **attack roll** may trigger a monster
   incursion on a frontier territory.
6. Spend resources to **build a building** and **craft/upgrade equipment**.
7. Optionally leave a character as a **garrison** to defend.
8. Repeat. Autosave to IndexedDB each turn. Installable, works offline.

**Explicitly deferred past MVP:** deep job trees & promotions, large maps,
multiple monster families, modular/component crafting, real art, audio, idle
real-time, cloud save, any multiplayer.

---

## 8. Phased roadmap

**Phase 0 — Foundation (scaffold)**
- Vite + React + TS + PWA, Zustand, IndexedDB save/load, design tokens,
  app shell + screen routing, empty data files. Installable offline shell.

**Phase 1 — Battle engine (headless) + tests**
- Grid + height, movement/jump, CT turn order, a few abilities, win/loss,
  KO/revive, basic enemy AI. Fully unit-tested, runnable from a debug screen
  before any pretty rendering.

**Phase 2 — Battle renderer (PixiJS)**
- Isometric tiles with height, unit sprites (placeholder shapes), tap-to-move /
  tap-to-act, range/AoE highlights, turn-order display, battle HUD.

**Phase 3 — Overworld**
- Node-graph map UI, resource production, attack-probability rolls, expansion &
  defense battles, overrun state, garrisons, end-turn flow.

**Phase 4 — Economy**
- Buildings (territory-gated), recipe + tier crafting, resource sinks, wiring
  gear onto characters.

**Phase 5 — Progression & polish**
- XP/leveling, basic ability learning, balance pass on the lean-slice content,
  steampunk visual polish on placeholders, save/versioning hardening.

**Result:** a complete, installable, offline vertical slice. Then we decide what
to deepen (jobs, content, art) toward "core loop complete."

---

## 9. Top risks & how we manage them

1. **Isometric height grid is the hardest piece.** Mitigation: build the engine
   headless and tested *first* (Phase 1), render *second* (Phase 2). Keep
   height rules simple at first (flat-ish maps), add verticality once rendering
   is proven.
2. **Scope creep** (jobs, abilities, content multiply fast). Mitigation: the
   lean slice is a hard boundary; everything else is a named, deferred phase.
3. **Mobile performance / bundle size.** Mitigation: Pixi over a full engine,
   lazy-load the battle module, profile on a real phone early.
4. **Balance/fun is unknown until played.** Mitigation: the whole point of the
   vertical slice is to play the loop early and tune.
5. **Save/data migrations** as the model evolves. Mitigation: version the save
   from day one with a migration step.

---

## 10. Open questions to revisit (not blocking)
- Steampunk **narrative framing** (why are we expanding? who are the monsters?).
- Exact **stat formulas** and the attack-probability constant — tuned in play.
- How flexible **job/ability inheritance** should be (FFT-deep vs. streamlined).
- Whether garrison defenses **auto-resolve** or are always hand-played.
- **Art direction** specifics for when we move past placeholders.
```
