# Steampunk Tactics — MVP Content & Systems Design

This is the concrete, buildable design for the **vertical-slice MVP**. It turns
the high-level [PLAN.md](../PLAN.md) into specific numbers, tables, and rules.

**Hard theme rule: technology only, no magic.** Every ability, resource,
monster, and stat is grounded in steam, clockwork, gunpowder, and metallurgy.
There is no mana, no spells, no enchantment. The "mana" pool is **Steam**
(boiler pressure); the "magic" stat is **Tech** (engineering skill); the
"caster/healer" is the **Engineer** (gadgets + field repair).

All numbers below are **starting values for tuning**, not final balance.

---

## 1. Fiction (just enough framing)

A frontier expedition lands at **Ironhold**, an old foundry-fortress on the edge
of a derelict industrial wasteland. The region is infested by the **Rusthorde**:
abandoned war-automatons gone feral, scavenging metal and steam. You lead a
small crew to reclaim territory, restart the machines that produce raw
materials, and rebuild — fighting the Rusthorde for every district.

---

## 2. Resources (3)

| Resource | Flavor | Produced by territory type | Primary use |
|---|---|---|---|
| **Coal** | Fuel for everything | Cinder Flats | Smelting (weapons), building fuel |
| **Iron** | Structural metal | Foundry Hills | Weapons, armor, building frames |
| **Copper** | Wiring & precision parts | Verdigris Mesa | Armor, accessories, advanced tiers |

- Resources are a **single global stockpile** (simplest for MVP; per-territory
  storage is a later refinement).
- A territory produces **its resource each time a turn/day resolves**, *unless*
  it is **overrun**.

**Base production per turn:** +3 of the territory's resource per owned,
non-overrun territory of that type (tunable).

---

## 3. World map (4 territories, node graph)

```
            [ Ironhold ]  (HOME, Foundry Hills → Iron, owned at start)
              /      \
   [ Cinder Flats ]  [ Verdigris Mesa ]   (Coal)        (Copper)
              \      /
          [ The Rust Marches ]   (Foundry Hills → Iron, wild, monster-dense)
```

**Adjacency (edges):**
- Ironhold ↔ Cinder Flats
- Ironhold ↔ Verdigris Mesa
- Cinder Flats ↔ The Rust Marches
- Verdigris Mesa ↔ The Rust Marches

| Territory | Type | Resource | Start owner | Notes |
|---|---|---|---|---|
| **Ironhold** | Foundry Hills | Iron | **Player** | Home base; can build a Forge here |
| **Cinder Flats** | Cinder Flats | Coal | Wild | First easy expansion |
| **Verdigris Mesa** | Verdigris Mesa | Copper | Wild | Hosts the Workshop |
| **The Rust Marches** | Foundry Hills | Iron | Wild | Toughest fight; deep frontier |

**Why this shape:** At start, Ironhold's only neighbors are both wild → it's
under threat, teaching the defense loop immediately. Taking Cinder + Verdigris
makes Ironhold safe (0 wild neighbors → 0% attack) but those two now border the
Rust Marches and remain frontier until it's cleared. Taking all four = a fully
secure region (the win state of the slice).

---

## 4. Overworld turn loop

A **turn ("day")** resolves when the player presses **End Turn** (or after a
battle that the world flow triggers). On resolve, in order:

1. **Production** — each owned, non-overrun territory adds its resource.
2. **Attack rolls** — for each owned territory, roll for a monster incursion
   (see §5).
3. **Incursions resolve** — triggered attacks become defense battles (or
   auto-resolve against a garrison; see §6).
4. **Autosave** to IndexedDB.

Between turns the player freely: builds/upgrades buildings, crafts/upgrades
equipment, manages roster & garrisons, and launches an **expansion attack** on
an adjacent wild territory (winning claims it).

---

## 5. Monster incursions & attack probability

**Probability a given owned territory is attacked this turn:**

```
P(attack) = BASE_RATE × (wildNeighbors / totalNeighbors)
```

- `BASE_RATE = 0.2` (tunable). `wildNeighbors` = adjacent territories that are
  wild **or owned-but-overrun** (an infested neighbor still threatens you). If
  `wildNeighbors == 0` → **P = 0** (fully surrounded by your own healthy
  territory is safe — a core design rule).
- Example: Ironhold at start has 2/2 wild neighbors → `0.5 × 1.0 = 50%`.
  After taking both neighbors → `0%`.

**Incursion strength** scales with how deep you are (turn count / territories
held), pulling monsters from the Rusthorde table (§5.1) at an appropriate level.

### 5.1 Monster family: The Rusthorde (1 family, 3 levels)

Feral automatons. No magic — all attacks are mechanical/steam/gunpowder.

| Monster | Lvl | HP | Spd | Move/Jump | Attack | Abilities | Flavor |
|---|---|---|---|---|---|---|---|
| **Scrapling** | 1 | 18 | 11 | 4 / 2 | 6 | *Bite* (melee 1) | Cat-sized salvage bot; swarms |
| **Rust Hound** | 2 | 34 | 13 | 5 / 2 | 11 | *Bite*; *Steam Vent* (cone 2, dmg, pushes back) | Boiler-bodied quadruped |
| **Boiler Brute** | 3 | 70 | 8 | 3 / 1 | 18 | *Slam* (melee, knockback); *Overpressure* (self-buff Attack, then bigger Slam) | Slow siege automaton; anchors enemy lines |

- Encounter composition scales: early incursions are 2–3 Scraplings; later add
  Rust Hounds; the Rust Marches battle features a Boiler Brute.
- Monsters drop a small resource bonus on victory (themed as salvage).

---

## 6. Garrisons & defense

- Once the roster is large enough, the player can assign characters as a
  **garrison** on a territory instead of taking them into the active party.
- When an incursion hits a **garrisoned** territory, the player chooses:
  - **Defend (hand-played battle)** — full tactical battle on that territory's
    map, using the garrison as the player party.
  - **Auto-resolve** — quick deterministic resolution comparing garrison power
    vs. incursion power (MVP: simple power-sum compare with small variance).
- If the defenders **lose** (or the territory is **ungarrisoned** and attacked),
  the territory becomes **overrun**: production stops, its buildings go
  **inactive**. The player must **recapture** it (an expansion-style attack) to
  restore it.

---

## 7. Job classes (3)

No magic. The trio covers melee / ranged / support-tech, so all combat systems
(movement, height, ranged accuracy, gadgets, repair, buffs) are exercised.

### Shared stats
- **HP** — health; 0 → knocked out (revived after battle at low HP).
- **Steam** — boiler-pressure pool that powers special abilities; regenerates a
  little each turn the unit acts. *(This is the "mana" analog — purely steam.)*
- **Speed** — drives Charge Time / turn frequency (§8).
- **Attack** — physical/ballistic damage scalar.
- **Defense** — incoming physical damage reduction.
- **Tech** — engineering skill; scales gadget output and field-repair amount.
  *(This is the "magic stat" analog — purely engineering, no magic.)*
- **Move** — tiles per move action.
- **Jump** — max height delta the unit can traverse.

### 7.1 Soldier (frontline)
High HP/Defense melee anchor. Weapon: sabers/bayonets.

| Stat | HP | Steam | Spd | Atk | Def | Tech | Move | Jump |
|---|---|---|---|---|---|---|---|---|
| Lv1 | 40 | 6 | 10 | 12 | 10 | 3 | 4 | 2 |

| Ability | Cost | Range | Effect |
|---|---|---|---|
| **Strike** | 0 | melee 1 | Basic melee attack |
| **Bayonet Lunge** | 3 Steam | melee, move-into | Move up to 2 tiles then attack with +damage |
| **Bulwark** | 2 Steam | self | Stance: +Defense until the unit's next turn; small taunt pull on AI |

### 7.2 Gunner (ranged)
Fragile, high range; loves high ground (height bonuses, §8). Weapon: firearms.

| Stat | HP | Steam | Spd | Atk | Def | Tech | Move | Jump |
|---|---|---|---|---|---|---|---|---|
| Lv1 | 28 | 6 | 12 | 13 | 6 | 4 | 4 | 2 |

| Ability | Cost | Range | Effect |
|---|---|---|---|
| **Shoot** | 0 | ranged 4 | Basic ranged attack; accuracy/damage boosted from higher elevation |
| **Piercing Shot** | 4 Steam | line, range 5 | Hits all units in a straight line |
| **Suppress** | 3 Steam | ranged 4 | Damage + slows target (delays its next turn) |

### 7.3 Engineer (support / tech — the "caster" reframed)
The utility class. Repairs allies, deploys gadgets. No magic — all engineering.

| Stat | HP | Steam | Spd | Atk | Def | Tech | Move | Jump |
|---|---|---|---|---|---|---|---|---|
| Lv1 | 32 | 10 | 11 | 7 | 7 | 12 | 4 | 2 |

| Ability | Cost | Range | Effect |
|---|---|---|---|
| **Wrench Strike** | 0 | melee 1 | Weak melee attack |
| **Field Repair** | 4 Steam | range 3 | Restore HP to an ally (or revive an adjacent KO'd ally at low HP); amount scales with Tech |
| **Deploy Turret** | 6 Steam | adjacent tile | Place a stationary auto-turret unit (ranged, ~3 HP, fires each round) until destroyed |
| **Caltrops** | 3 Steam | tile, range 2 | Place a hazard tile that damages/slows monsters entering it |

---

## 8. Battle engine rules

### Grid & height
- Square grid, each tile has an integer **height**.
- **Movement:** costs 1 per tile; a unit may step to an adjacent tile only if
  the height delta ≤ its **Jump**.
- **Height combat bonuses:** attacking from higher ground gives an accuracy and
  small damage bonus; ranged units gain effective range downhill. (Start simple:
  +1 damage and +accuracy per height advantage; refine later.)

### Turn order — FFT-style Charge Time (CT)
- Each tick, every unit gains `CT += Speed`.
- When a unit's `CT ≥ 100`, it acts.
- A turn = optional **Move** + optional **Action** (ability / attack / Wait).
- After acting, CT is reduced (e.g., full turn −100; lighter actions cost less),
  so higher-Speed units act more often.
- Turn-order forecast is shown to the player (a queue UI).

### A unit's turn
1. Optionally **Move** (within Move range, respecting height/Jump and occupancy).
2. Optionally **Act** (an ability from its job, paying Steam cost).
3. End turn (or **Wait** to bank position).

### Win / loss & KO
- **Win:** all enemies defeated (MVP objective = elimination).
- **Loss:** all player units knocked out.
- **KO:** HP 0 → unit is downed and removed from the fight; **no permadeath** —
  downed units are revived at low HP after the battle. (Engineer's Field Repair
  can revive mid-battle.)

### Enemy AI
Utility-based and **ability-aware** ([ai.ts](../src/engine/battle/ai.ts)). For the
active unit it enumerates every (reachable tile × ability × target) and scores:
- **Attacks** by effective damage (capped at target HP, no overkill credit) +
  a kill bonus + a small debuff bonus; **AoE** sums damage over everyone splashed.
- **Heals** by HP actually restored (+ a revive bonus), and never on healthy allies.
- **Buffs** by a per-ability heuristic value, but only when a foe is engaged.

It takes the best-scoring action (move + act), or advances toward the nearest foe
if nothing useful is in reach. Both teams use it (it also drives Auto-battle).

### Balance
Combat is deterministic, so matchups are reproducible. A simulation spec
([balance.sim.test.ts](../src/engine/world/balance.sim.test.ts)) auto-resolves
representative parties against each tier and pins the curve: a fresh level-1 crew
clears the inner ring, mid-ring needs ~level 4, and the tier-3 capstones (Glass
Spire hardest) need a leveled and/or kitted crew. These run as tests so balance
regressions are caught.

---

## 9. Buildings (2 types)

Each building type can only be built on its matching **territory type** and
unlocks/upgrades recipes. Buildings have levels; **overrun** territories make
their buildings **inactive**.

| Building | Buildable on | Lv1 unlocks | Lv2 unlocks | Build cost (Lv1) | Upgrade cost (→Lv2) |
|---|---|---|---|---|---|
| **Forge** | Foundry Hills (Iron) | Tier-1 **weapons** | Tier-2 **weapons** | 15 Iron, 10 Coal | 30 Iron, 20 Coal, 10 Copper |
| **Workshop** | Verdigris Mesa (Copper) | Tier-1 **armor & accessories** | Tier-2 **armor & accessories** | 15 Copper, 10 Iron | 30 Copper, 20 Iron, 10 Coal |

*(Three territory types but only two building types in the MVP — Cinder Flats is
a pure resource territory for now. More building types come post-MVP.)*

---

## 10. Equipment & crafting (recipe + 2 tiers)

Craft an item by paying its **resource recipe** at a building of the required
type/level. Equipment fills **weapon / armor / accessory** slots.

### Weapons (require Forge)
| Item | Tier | Slot | Class fit | Effect | Recipe |
|---|---|---|---|---|---|
| **Iron Saber** | 1 | weapon | Soldier | +Attack | 8 Iron, 4 Coal |
| **Flintlock Carbine** | 1 | weapon | Gunner | +Attack, range | 6 Iron, 6 Coal |
| **Spanner** | 1 | weapon | Engineer | +Attack, small +Tech | 6 Iron, 2 Copper |
| **Steel Saber** | 2 | weapon | Soldier | ++Attack | upgrade Iron Saber: 14 Iron, 8 Coal, 4 Copper |
| **Pneumatic Rifle** | 2 | weapon | Gunner | ++Attack, +range | upgrade Carbine: 12 Iron, 8 Coal, 6 Copper |
| **Powered Wrench** | 2 | weapon | Engineer | +Attack, ++Tech | upgrade Spanner: 10 Iron, 10 Copper |

### Armor & accessories (require Workshop)
| Item | Tier | Slot | Effect | Recipe |
|---|---|---|---|---|
| **Riveted Vest** | 1 | armor | +Defense, +HP | 8 Copper, 4 Iron |
| **Brass Goggles** | 1 | accessory | +accuracy / +height-bonus | 6 Copper |
| **Plated Cuirass** | 2 | armor | ++Defense, ++HP | upgrade Vest: 14 Copper, 8 Iron, 4 Coal |
| **Pressure Regulator** | 2 | accessory | +max Steam, +Steam regen | upgrade Goggles: 12 Copper, 6 Iron |

**Tier rule:** Tier-2 items are **upgrades of their Tier-1 version** (consumes
the T1 item + resources) and require the relevant building at **Level 2**.

---

## 11. Progression (light, for MVP) — *implemented*

- Characters earn **XP** from won battles: each participant gains the battle's
  full enemy-XP total, where an enemy is worth `round(maxHp × 0.5 + attack)`
  (Scrapling 15, Rust Hound 28, Boiler Brute 53).
- **XP curve:** advancing from level *L* costs `50 + 50 × L` (L1→2 = 100,
  L2→3 = 150, …), capped at level 20.
- **Per-level stat growth** (applied on top of the job template + equipment):
  - Soldier: +6 HP, +1 Atk, +1 Def
  - Gunner: +4 HP, +1 Steam, +2 Atk
  - Engineer: +5 HP, +1 Steam, +1 Def, +2 Tech
- MVP keeps **job switching/promotion** out — the three classes are fixed roles
  and abilities don't change with level; the deep FFT job tree is post-MVP.
- Starting roster: **one Soldier, one Gunner, one Engineer**. Active battle party
  size: up to **4** (room to recruit a 4th and/or field a deployed turret).

---

## 12. The MVP play session (end-to-end acceptance)

A successful slice lets the player do all of this, offline, on a phone:

1. Start at **Ironhold** with a Soldier, Gunner, Engineer.
2. See the **node map**; note Ironhold is threatened (2 wild neighbors).
3. **Attack Cinder Flats** → win an isometric, height-aware, CT-ordered battle
   vs. Scraplings → **claim it** (Coal now produces).
4. **End Turn** → Coal + Iron accrue; an **attack roll** may send a Rusthorde
   incursion at Ironhold or Cinder Flats.
5. Build a **Forge** at Ironhold; **craft an Iron Saber**; equip the Soldier.
6. **Take Verdigris Mesa** → build a **Workshop** → craft a **Riveted Vest**.
   Ironhold now has 0 wild neighbors → **0% attack** (feel the map go safe).
7. Recruit/assign a **garrison** to a frontier territory.
8. Push into **The Rust Marches** (Boiler Brute fight); win to **secure the
   whole region**.
9. Lose a defense somewhere → see a territory go **overrun** (production stops,
   buildings inactive) → **recapture** it.
10. Throughout: **KO'd units revive**, the game **autosaves**, and it runs
    installed/offline.

If a player can do all ten, the core loop is proven and we know what to deepen.

---

## 13. What this doc intentionally leaves out (post-MVP)
Deep job tree & promotions, ability inheritance across jobs,
modular/component crafting, real art & audio, narrative scripting,
interactive (hand-played) garrison defenses. Tracked in [PLAN.md](../PLAN.md) §7.

---

## 14. Expansion: families & a bigger world — *implemented*

- **4th biome:** `quartz` territories produce **Quartz**, feeding a **Gunsmith**
  building (built on quartz land) that crafts a **Tier-3 weapon** line (Tempered
  Greatblade / Repeating Rifle / Dynamo Wrench, each upgrading a T2 weapon).
- **10-territory map** in three rings around home Ironhold: inner (tier 1),
  mid (tier 2), outer (tier 3). Authored with `tier` + `coord` per territory and
  rendered as a **spatial SVG node-graph** (tap a node to act).
- **4 monster families, one per biome:** Rusthorde (foundry), Ashborn (cinder,
  aggressive/ranged), Corrosion (verdigris, tanky), Resonance (quartz, fast glass
  cannons). Each has 3 strength tiers; pack composition scales with a territory's
  `tier`, so outer rings hit harder.
- **Biome battle arenas:** each territory type fights on its own height map.
- **Recruiting:** claiming Old Foundry, Ashfields, Patina Gorge, and The Scrapyard
  adds a new crew member (see `src/data/recruits.ts`).
- **Party selection:** attacks open a picker to choose up to **5** crew to deploy,
  so you can hold some back for garrison duty.

---

## 15. Job trees, Job Points & job gear — *implemented*

- **Job Points (JP):** each participant earns JP equal to the battle's enemy-XP
  total on a win (alongside XP). A per-character pool.
- **Ability trees:** each job has ~4 unlockable abilities beyond its innate set,
  spent with JP and gated by **prerequisites** and a couple of **level gates**
  (see `src/data/jobTree.ts`). Innate abilities stay free. Unlocked + innate +
  gear-granted abilities are what a character brings into battle.
  - Soldier: Power Strike → Shield Breaker (Expose); Cleave (AoE) → Rally (party buff).
  - Gunner: Aimed Shot → Scattershot (AoE) / Deadeye; Suppress (Slow).
  - Engineer: Overcharge → EMP Blast (AoE + Slow); Mend Field (AoE heal) → Fortify (ally buff).
- **New battle mechanics:** **Slow** (negative Speed buff → fewer turns),
  **Expose** (defense-down), and **burst AoE** (an ability splashes to units
  within a Manhattan radius of its target/caster — no tile-picker needed).
- **Job-locked equipment with passives** (`src/data/items.ts`): new craftable
  gear only its class can equip, granting strong stats plus one effect — extra
  **Steam/turn**, a **Charge-Time head start**, or **granting an ability** the
  character hasn't unlocked (e.g., Marksman's Rig grants Aimed Shot).

---

## 16. Art: blueprint line-art — *implemented*

Hand-authored vector art in a single blueprint line-art style (thin brass/parchment
strokes, exposed mechanisms; player = teal, enemy = ember).

- **Battle unit sprites** ([unitSprites.ts](../src/render/battle/unitSprites.ts)):
  distinct line-art silhouettes per archetype — soldier (sabre), gunner (rifle),
  engineer (backpack/wrench), and one per monster family (Rusthorde automaton,
  Ashborn drone, Corrosion shell, Resonance crystal) — drawn via Pixi's vector
  API and team-tinted. A `sprite` key flows from the encounter builder.
- **UI icon set** ([icons.tsx](../src/ui/icons.tsx)): inline SVG for resources,
  nav tabs, buildings, jobs, and a gear brand mark — replacing all emoji/glyphs.
- **Node-graph map**: territories show a per-biome glyph (crosshair/flame/droplet/
  crystal) instead of letters.
- **Branding**: blueprint gear app icon ([public/icon.svg](../public/icon.svg)).
- **Per-biome battle arenas** vary terrain, and tiles are **biome-textured**:
  each biome has its own top-face palette plus a faint blueprint motif — foundry
  rivets, cinder heat-cracks, verdigris patina speckle, quartz facet lines. The
  biome flows into the renderer via `BattleView.biome`.

---

## 17. Battle UX: rotation & info boxes — *implemented*

- **Board rotation** about the z-axis in 90° steps via ⟲ ⟳ controls on the stage
  ([iso.ts](../src/render/battle/iso.ts) `rotateCoord`/`rotatedDims`,
  `BattleView.rotation`). Tile click handlers use logical coordinates, so
  movement/targeting still work in any orientation.
- **Ability info box**: tapping an action shows its cost/range/AoE/effect; targeted
  skills then highlight valid targets, self-casts get a **Use** confirm
  ([BattleInfo.tsx](../src/ui/screens/BattleInfo.tsx) `AbilityInfo`).
- **Unit inspect box**: tapping any unit (monster or ally) opens a card with its
  HP, stats, abilities, and active effects (`UnitInfo`).

---

## 18. Job system overhaul & a 22-node world — *implemented*

Supersedes §15's flat trees.

- **Branching 12-job tree** ([jobs.ts](../src/data/jobs.ts)): 3 roots (Soldier/
  Gunner/Engineer, unlocked for all) → 2 tier-2 jobs each (Dragoon/Sentinel,
  Sniper/Grenadier, Machinist/Medic) → 3 tier-3 capstones (Warlord/Sharpshooter/
  Artificer, each requiring both siblings). Jobs unlock per-character with JP +
  prerequisites and are **hidden until their prerequisites are met**. Characters
  **switch freely** among unlocked jobs (stats/growth/basic-attack change).
- **Learn vs. slot:** abilities are *learned* with JP into a pool, then *slotted*
  into **five slots — 2 action, 1 reaction, 1 passive, 1 movement**
  ([jobs.ts](../src/engine/progression/jobs.ts), loadout editor on the Crew screen).
  A job's basic attack is always available.
- **New ability kinds:** **reactions** (Guard = flat damage soak; Counter = melee
  riposte), **passives** (stat bonuses folded into `characterStats`), and
  **movement** (Sprint +Move, Sure-Foot +Jump, Hover ignores height).
- **Asymmetric height movement** ([pathfinding.ts](../src/engine/battle/pathfinding.ts)
  `canStep`): climb ≤ Jump, descend ≤ Jump + 1; Hover ignores height entirely.
- **Job-locked gear is hidden** in the Workshop until some crew member unlocks the
  job (e.g., Dragoon Lance, Sentinel Aegis, Artificer Reactor).
- **22-territory scrollable map** across six tiers (0–5); the SVG node-graph fits
  the viewport width and scrolls vertically. Deeper (quartz) tiers are the
  difficulty gates — validated by the deterministic balance simulation
  ([balance.sim.test.ts](../src/engine/world/balance.sim.test.ts)).

---

## 19. UX pass (P0) — *implemented*

From the UX audit, the three highest-impact fixes:

- **Combat feed:** the battle HUD now shows the last few events, color-coded
  (action / damage / heal / KO / move). `useAbility` snapshots HP and logs exact
  per-unit deltas + counter callouts, so you can see what every action — yours,
  the enemy's, or Auto's — actually did.
- **Floating damage/heal numbers:** the renderer diffs HP each frame and spawns
  rising, fading "−N"/"+N" numbers over units (a persistent `fx` layer on a Pixi
  ticker, separate from the redrawn board).
- **Reactions surfaced:** the active-unit HUD shows a `⟲ <Reaction>` chip, the
  unit-inspect card lists the reaction (and Hover), and Counter fires appear in
  the feed.
- **First-run objective banner:** the Map shows a dismissible, state-derived
  next-step hint (attack → End Day → build → recapture), persisted-dismissed via
  localStorage.

### P1 — *implemented*
- **Resource legend:** tapping the header resources opens a modal naming each
  resource with its icon, amount, and role.
- **Settings menu:** tapping the header gear opens Settings — **New Game**
  (with confirm) and "Show tips again".
- **Map readability:** every node shows a **tier badge** (T0–T5) and an
  attackable **⚔** marker; the selected node shows its **name** on the map, and
  the detail panel scrolls into view on tap.
- **Cross-system hints:** the Workshop points you to the Build tab when the
  required building is missing; the Crew screen explains XP/JP are earned by
  winning battles.
- **Rotate controls:** replaced with high-contrast brass circular-arrow icons.

### P2 — *implemented*
- **Crew-screen scaling:** the roster is now a compact **list → detail** flow.
  Tapping a member opens a full management view (Jobs / Loadout / Gear tabs)
  with a **‹ Crew** back button, so 3–7 crew no longer make one long scroll.
  Rows surface unspent **JP** as a badge.
- **Action feedback (toasts):** consequential spends — craft, build, upgrade,
  learn ability, unlock job, switch job — now fire a brief success **toast**
  (e.g. "Unlocked Dragoon") that floats above the nav and auto-dismisses. Only
  fires when the action actually changed state.
- **Confirm on expensive spends:** unlocking a job (a large, irreversible JP
  spend) requires a **two-tap confirm** ("N JP" → "Confirm N JP" / "Cancel").
  Cheap learns and the frequent End Day are left single-tap by design.
- **Empty-state polish:** selecting a **wild, non-adjacent** territory now shows
  a hint ("Claim a bordering territory first…") instead of a blank action row.
- **Accessibility pass:** disabled buttons are clearly inert (desaturated,
  flattened, dimmed border); a visible **focus-visible** outline was added; and
  tap targets were enlarged — turn pips (28px), rotate buttons (40px min), and
  small buttons (32px min height).
