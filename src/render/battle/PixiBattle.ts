import { Application, Container, Graphics, Polygon, Text } from 'pixi.js'
import type { BattleState, BattleUnit, Position } from '../../engine/battle/types'
import type { TerritoryType } from '../../types'
import { BASE_THICKNESS, ELEV, TILE_H, TILE_W, boardOrigin, depth, gridToScreen, posKey, rotateCoord, type Rotation, type ScreenPoint } from './iso'
import { drawUnitSprite } from './unitSprites'

export interface BattleView {
  /** Tile keys the active unit can move to. */
  reachable: Set<string>
  /** Tile keys the selected ability can target. */
  targets: Set<string>
  activeId: string | null
  /** Biome of the territory being fought over, for tile styling. */
  biome?: TerritoryType
  /** Board rotation about the z-axis (0–3, ×90°). */
  rotation?: Rotation
  onTileClick: (pos: Position) => void
}

// Per-biome top-face palettes (indexed by height), plus a default.
const BIOME_TOPS: Record<TerritoryType, number[]> = {
  foundry: [0x44464a, 0x55585d, 0x676a70, 0x797d84],
  cinder: [0x4a3a2e, 0x5e4736, 0x735540, 0x86634a],
  verdigris: [0x36433d, 0x44544b, 0x53665b, 0x62786b],
  quartz: [0x403c4a, 0x4f4a5d, 0x5e5870, 0x6d6684],
}
const BIOME_ACCENT: Record<TerritoryType, number> = {
  foundry: 0x9aa3ab,
  cinder: 0xd9772b,
  verdigris: 0x3a8d80,
  quartz: 0x9b8cd6,
}
const DEFAULT_TOPS = [0x4a4136, 0x5c5040, 0x70604a, 0x84714f]
const SIDE_DARKEN = 0.62
const SIDE_DARKEN_2 = 0.46

type Pt = { x: number; y: number }
function lerp(a: Pt, c: Pt, k: number): Pt {
  return { x: c.x + (a.x - c.x) * k, y: c.y + (a.y - c.y) * k }
}

function shade(color: number, factor: number): number {
  const r = Math.floor(((color >> 16) & 0xff) * factor)
  const g = Math.floor(((color >> 8) & 0xff) * factor)
  const b = Math.floor((color & 0xff) * factor)
  return (r << 16) | (g << 8) | b
}

interface Floater {
  text: Text
  elapsed: number
}

const FLOAT_DURATION = 850 // ms
const FLOAT_RISE = 26 // px

export class PixiBattle {
  private app: Application | null = null
  private world = new Container()
  private fx = new Container() // floating numbers, not cleared each render
  private host: HTMLElement | null = null
  private resizeObs: ResizeObserver | null = null
  private lastState: BattleState | null = null
  private lastView: BattleView | null = null
  private lastHp: Record<string, number> = {}
  private floaters: Floater[] = []
  private tick = (): void => this.stepFloaters()

  async init(host: HTMLElement): Promise<void> {
    this.host = host
    const app = new Application()
    await app.init({
      width: host.clientWidth || 360,
      height: host.clientHeight || 360,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    })
    this.app = app
    this.world.sortableChildren = true
    app.stage.addChild(this.world)
    app.stage.addChild(this.fx) // floaters render above the board
    host.appendChild(app.canvas)

    app.ticker.add(this.tick)
    this.resizeObs = new ResizeObserver(() => this.handleResize())
    this.resizeObs.observe(host)
  }

  /** Spawn a floating "-N"/"+N" over a unit whose HP changed. */
  private spawnFloater(x: number, y: number, delta: number): void {
    const t = new Text({
      text: delta < 0 ? `${delta}` : `+${delta}`,
      style: {
        fontFamily: 'Georgia, serif',
        fontSize: 15,
        fontWeight: '700',
        fill: delta < 0 ? 0xe0672b : 0x6fbf73,
        stroke: { color: 0x15110d, width: 3 },
      },
    })
    t.anchor.set(0.5)
    t.x = x
    t.y = y - 30
    this.fx.addChild(t)
    this.floaters.push({ text: t, elapsed: 0 })
  }

  private stepFloaters(): void {
    if (this.floaters.length === 0) return
    const dt = this.app?.ticker.deltaMS ?? 16
    this.floaters = this.floaters.filter((f) => {
      f.elapsed += dt
      const p = f.elapsed / FLOAT_DURATION
      if (p >= 1) {
        f.text.destroy()
        return false
      }
      f.text.y -= (FLOAT_RISE * dt) / FLOAT_DURATION
      f.text.alpha = 1 - p * p
      return true
    })
  }

  private handleResize(): void {
    if (!this.app || !this.host) return
    const w = this.host.clientWidth || 360
    const h = this.host.clientHeight || 360
    this.app.renderer.resize(w, h)
    if (this.lastState && this.lastView) this.render(this.lastState, this.lastView)
  }

  render(state: BattleState, view: BattleView): void {
    if (!this.app) return
    this.lastState = state
    this.lastView = view

    // Rebuild the scene each frame — the board is small enough that this is cheap
    // and keeps the renderer a pure function of state.
    for (const child of this.world.removeChildren()) child.destroy({ children: true })

    const rot: Rotation = view.rotation ?? 0
    const W = state.grid.width
    const H = state.grid.height
    const origin = boardOrigin(state.grid, rot, this.app.screen.width, this.app.screen.height)

    // --- Tiles ---
    for (let gy = 0; gy < H; gy++) {
      for (let gx = 0; gx < W; gx++) {
        const h = state.grid.tiles[gy][gx].height
        const r = rotateCoord(gx, gy, rot, W, H)
        const c = gridToScreen(r.x, r.y, h, origin)
        const tile = this.drawTile(gx, gy, h, c, depth(r.x, r.y), view)
        this.world.addChild(tile)
      }
    }

    // --- Units + floating HP-change numbers ---
    const seen = new Set<string>()
    for (const unit of Object.values(state.units)) {
      const h = state.grid.tiles[unit.pos.y][unit.pos.x].height
      const r = rotateCoord(unit.pos.x, unit.pos.y, rot, W, H)
      const c = gridToScreen(r.x, r.y, h, origin)
      const node = this.drawUnit(unit, c, depth(r.x, r.y), view)
      this.world.addChild(node)

      seen.add(unit.id)
      const prev = this.lastHp[unit.id]
      if (prev !== undefined && unit.stats.hp !== prev) {
        this.spawnFloater(c.x, c.y, unit.stats.hp - prev)
      }
      this.lastHp[unit.id] = unit.stats.hp
    }
    for (const id of Object.keys(this.lastHp)) if (!seen.has(id)) delete this.lastHp[id]
  }

  private drawTile(gx: number, gy: number, h: number, c: ScreenPoint, depthVal: number, view: BattleView): Container {
    const e = h * ELEV + BASE_THICKNESS
    const tops = view.biome ? BIOME_TOPS[view.biome] : DEFAULT_TOPS
    const top = tops[Math.min(h, tops.length - 1)]
    const accent = view.biome ? BIOME_ACCENT[view.biome] : 0x9aa3ab

    const T = { x: c.x, y: c.y - TILE_H / 2 }
    const R = { x: c.x + TILE_W / 2, y: c.y }
    const B = { x: c.x, y: c.y + TILE_H / 2 }
    const L = { x: c.x - TILE_W / 2, y: c.y }

    const g = new Graphics()
    // Left + right faces (the "thickness").
    g.poly([L.x, L.y, B.x, B.y, B.x, B.y + e, L.x, L.y + e]).fill(shade(top, SIDE_DARKEN_2))
    g.poly([R.x, R.y, B.x, B.y, B.x, B.y + e, R.x, R.y + e]).fill(shade(top, SIDE_DARKEN))
    // Top face.
    g.poly([T.x, T.y, R.x, R.y, B.x, B.y, L.x, L.y]).fill(top).stroke({ width: 1, color: 0x201c17, alpha: 0.8 })

    // Blueprint texture: inset plate outline + per-biome motif.
    const inset = [lerp(T, c, 0.6), lerp(R, c, 0.6), lerp(B, c, 0.6), lerp(L, c, 0.6)]
    g.poly(inset.flatMap((p) => [p.x, p.y])).stroke({ width: 0.75, color: accent, alpha: 0.16 })
    this.drawTileMotif(g, view.biome, c, { T, R, B, L }, accent)

    // Highlight overlay.
    const key = posKey({ x: gx, y: gy })
    if (view.targets.has(key)) {
      g.poly([T.x, T.y, R.x, R.y, B.x, B.y, L.x, L.y]).fill({ color: 0xd9772b, alpha: 0.5 })
    } else if (view.reachable.has(key)) {
      g.poly([T.x, T.y, R.x, R.y, B.x, B.y, L.x, L.y]).fill({ color: 0x3a8d80, alpha: 0.45 })
    }

    g.eventMode = 'static'
    g.cursor = 'pointer'
    g.hitArea = new Polygon([T.x, T.y, R.x, R.y, B.x, B.y, L.x, L.y])
    g.on('pointertap', () => view.onTileClick({ x: gx, y: gy }))
    g.zIndex = depthVal * 10

    return g
  }

  /** Faint per-biome surface detail on a tile's top face. */
  private drawTileMotif(
    g: Graphics,
    biome: TerritoryType | undefined,
    c: Pt,
    pts: { T: Pt; R: Pt; B: Pt; L: Pt },
    accent: number,
  ): void {
    if (!biome) return
    const a = 0.3
    switch (biome) {
      case 'foundry': {
        // Riveted plate: a stud near each edge.
        for (const p of [pts.T, pts.R, pts.B, pts.L]) {
          const q = lerp(p, c, 0.72)
          g.circle(q.x, q.y, 1.4).fill({ color: accent, alpha: a })
        }
        break
      }
      case 'cinder': {
        // Heat cracks.
        g.moveTo(c.x - 7, c.y + 1.5).lineTo(c.x - 2, c.y - 2.5)
        g.moveTo(c.x + 2, c.y + 2.5).lineTo(c.x + 7, c.y - 1.5)
        g.stroke({ width: 1, color: accent, alpha: a, cap: 'round' })
        break
      }
      case 'verdigris': {
        // Patina speckle.
        for (const [dx, dy] of [[-4, 1], [3, -2], [1, 4]]) {
          g.circle(c.x + dx, c.y + dy, 1.2).fill({ color: accent, alpha: a })
        }
        break
      }
      case 'quartz': {
        // Faceted facet line.
        const iL = lerp(pts.L, c, 0.55)
        const iT = lerp(pts.T, c, 0.55)
        const iR = lerp(pts.R, c, 0.55)
        g.moveTo(iL.x, iL.y).lineTo(c.x, c.y).lineTo(iT.x, iT.y)
        g.moveTo(c.x, c.y).lineTo(iR.x, iR.y)
        g.stroke({ width: 0.8, color: accent, alpha: a, cap: 'round', join: 'round' })
        break
      }
    }
  }

  private drawUnit(unit: BattleUnit, c: ScreenPoint, depthVal: number, view: BattleView): Container {
    const node = new Container()
    node.x = c.x
    node.y = c.y
    node.zIndex = depthVal * 10 + 5

    const ko = unit.status === 'ko'
    const teamColor = unit.team === 'player' ? 0x3a8d80 : 0xd9772b

    // Shadow.
    node.addChild(new Graphics().ellipse(0, 2, TILE_W * 0.28, TILE_H * 0.28).fill({ color: 0x000000, alpha: 0.35 }))

    // Active-turn ring.
    if (view.activeId === unit.id && !ko) {
      node.addChild(
        new Graphics().ellipse(0, 2, TILE_W * 0.32, TILE_H * 0.32).stroke({ width: 3, color: 0xd6a85f }),
      )
    }

    // Blueprint line-art sprite, tinted by team (greyed when downed).
    const lineColor = ko ? 0x6b6155 : teamColor
    const accent = ko ? 0x6b6155 : 0xd6a85f
    const body = new Graphics()
    drawUnitSprite(body, unit.sprite, lineColor, accent)
    node.addChild(body)

    if (ko) {
      const x = new Text({
        text: '✕',
        style: { fontFamily: 'Georgia, serif', fontSize: 12, fontWeight: '700', fill: 0x9a948c },
      })
      x.anchor.set(0.5)
      x.y = -16
      node.addChild(x)
    }

    // HP bar.
    if (!ko) {
      const barW = 22
      const pct = Math.max(0, unit.stats.hp / unit.stats.maxHp)
      const hpColor = pct > 0.5 ? 0x6fbf73 : pct > 0.25 ? 0xd6a85f : 0xd9542b
      const bar = new Graphics()
      bar.roundRect(-barW / 2, -40, barW, 4, 2).fill(0x1a1714)
      bar.roundRect(-barW / 2, -40, barW * pct, 4, 2).fill(hpColor)
      node.addChild(bar)
    }

    if (ko) node.alpha = 0.55

    // Make the unit clickable too (routes to its own tile).
    node.eventMode = 'static'
    node.cursor = 'pointer'
    node.on('pointertap', () => view.onTileClick({ ...unit.pos }))

    return node
  }

  destroy(): void {
    this.resizeObs?.disconnect()
    this.resizeObs = null
    this.floaters = []
    this.lastHp = {}
    if (this.app) {
      this.app.ticker.remove(this.tick)
      this.app.destroy(true, { children: true })
      this.app = null
    }
    this.host = null
  }
}
