import { Graphics } from 'pixi.js'

/**
 * Blueprint line-art unit sprites, drawn with Pixi's vector API.
 * Coordinates are in unit space with the feet near (0, 0), rising upward to
 * about y = -34, width within ±11. `color` is the team line color; `accent`
 * is the brass mechanical detailing.
 */

const W = 1.6 // main line weight
const TW = 1.1 // thin detail weight

function line(color: number, w = W) {
  return { width: w, color, alpha: 1, cap: 'round' as const, join: 'round' as const }
}
function faint(color: number) {
  return { color, alpha: 0.12 }
}

type DrawFn = (g: Graphics, color: number, accent: number) => void

const legs = (g: Graphics, color: number) => {
  g.moveTo(-3.5, -7).lineTo(-3.5, -0.5)
  g.moveTo(3.5, -7).lineTo(3.5, -0.5)
  g.stroke(line(color))
}

// --- Player jobs ---

const soldier: DrawFn = (g, c, a) => {
  legs(g, c)
  g.roundRect(-7, -23, 14, 16, 3).fill(faint(c)).stroke(line(c))
  g.circle(0, -29, 5).fill(faint(c)).stroke(line(c)) // head/helmet
  g.moveTo(-5.5, -31).lineTo(5.5, -31).stroke(line(a, TW)) // brim
  g.moveTo(0, -34).lineTo(0, -31).stroke(line(a, TW)) // crest
  // sabre + guard
  g.moveTo(7, -20).lineTo(14, -33).stroke(line(a))
  g.moveTo(5, -22).lineTo(9.5, -18).stroke(line(a, TW))
  g.circle(0, -15, 2.4).stroke(line(a, TW)) // chest cog
}

const gunner: DrawFn = (g, c, a) => {
  legs(g, c)
  g.roundRect(-6, -23, 12, 16, 3).fill(faint(c)).stroke(line(c))
  g.circle(0, -29, 4.6).fill(faint(c)).stroke(line(c))
  g.moveTo(-5, -30.5).lineTo(3, -30.5).stroke(line(a, TW)) // cap visor
  // long rifle across the body + scope tick
  g.moveTo(-7, -14).lineTo(13, -20).stroke(line(a))
  g.moveTo(-7, -14).lineTo(-9, -11).stroke(line(a, TW)) // stock
  g.moveTo(4, -17.5).lineTo(4, -20.5).stroke(line(a, TW)) // scope
}

const engineer: DrawFn = (g, c, a) => {
  legs(g, c)
  g.roundRect(-6, -23, 12, 16, 3).fill(faint(c)).stroke(line(c))
  g.circle(0, -29, 4.6).fill(faint(c)).stroke(line(c))
  // backpack tank + pipe
  g.roundRect(-11, -22, 5, 12, 2).fill(faint(c)).stroke(line(a, TW))
  g.moveTo(-6.5, -20).lineTo(-9, -23).lineTo(-9, -27).stroke(line(a, TW)) // antenna pipe
  g.circle(-9, -28, 1.2).stroke(line(a, TW))
  // wrench
  g.moveTo(6, -16).lineTo(12, -22).stroke(line(a))
  g.moveTo(12, -22).lineTo(13.5, -20.5).moveTo(12, -22).lineTo(13.5, -23.5).stroke(line(a, TW))
}

// --- Monster families (by biome) ---

const foundry: DrawFn = (g, c, a) => {
  // boxy salvage automaton
  g.moveTo(-5, -1).lineTo(-5, -6).moveTo(5, -1).lineTo(5, -6).stroke(line(c)) // stub legs
  g.roundRect(-8, -22, 16, 16, 2).fill(faint(c)).stroke(line(c))
  g.circle(0, -14, 3.4).stroke(line(a)) // big optic
  g.circle(0, -14, 1).fill({ color: a, alpha: 0.9 })
  // antenna gear
  g.moveTo(0, -22).lineTo(0, -26).stroke(line(a, TW))
  g.circle(0, -27.5, 2).stroke(line(a, TW))
}

const cinder: DrawFn = (g, c, a) => {
  // angular hovering drone with heat vents
  g.moveTo(0, -8).lineTo(-9, -16).lineTo(0, -24).lineTo(9, -16).lineTo(0, -8).fill(faint(c)).stroke(line(c))
  g.circle(0, -16, 2.2).stroke(line(a, TW)) // core
  // vent flames below
  g.moveTo(-4, -7).lineTo(-4, -2).moveTo(0, -7).lineTo(0, -1).moveTo(4, -7).lineTo(4, -2).stroke(line(a, TW))
}

const verdigris: DrawFn = (g, c, a) => {
  // hunched armored shell with back spikes
  g.moveTo(-6, -1).lineTo(-6, -6).moveTo(6, -1).lineTo(6, -6).stroke(line(c))
  g.moveTo(-9, -8).arc(0, -8, 9, Math.PI, 0).fill(faint(c)).stroke(line(c)) // dome shell
  g.moveTo(-6, -14).lineTo(-4, -19).moveTo(0, -16).lineTo(0, -21).moveTo(6, -14).lineTo(4, -19).stroke(line(a, TW)) // spikes
  g.moveTo(8, -8).lineTo(12, -10).stroke(line(a)) // claw
}

const quartz: DrawFn = (g, c, a) => {
  // crystalline sentinel
  g.moveTo(0, -2).lineTo(-7, -12).lineTo(-4, -24).lineTo(4, -24).lineTo(7, -12).lineTo(0, -2).fill(faint(c)).stroke(line(c))
  g.moveTo(0, -8).lineTo(0, -18).moveTo(-4, -13).lineTo(4, -13).stroke(line(a, TW)) // facets
  // shard spikes
  g.moveTo(-4, -24).lineTo(-6, -30).moveTo(4, -24).lineTo(6, -30).moveTo(0, -24).lineTo(0, -31).stroke(line(a, TW))
}

const SPRITES: Record<string, DrawFn> = {
  soldier, gunner, engineer,
  foundry, cinder, verdigris, quartz,
}

/** Draw a unit sprite into `g`. Falls back to a simple pawn for unknown keys. */
export function drawUnitSprite(g: Graphics, key: string | undefined, color: number, accent: number): void {
  const fn = key ? SPRITES[key] : undefined
  if (fn) {
    fn(g, color, accent)
    return
  }
  // Fallback pawn.
  g.roundRect(-8, -22, 16, 20, 5).fill(faint(color)).stroke(line(color))
  g.circle(0, -26, 6).fill(faint(color)).stroke(line(color))
}
