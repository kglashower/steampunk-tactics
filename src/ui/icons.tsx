import type { ResourceType, BuildingType, JobId, ScreenId } from '../types'
import { JOB_SPRITE } from '../data/jobs'

// Blueprint line-art icons. Stroke uses currentColor so they inherit text color.

interface IconProps {
  size?: number | string
  className?: string
}

function Svg({ size = '1em', className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  )
}

// --- Resources ---
const RESOURCE_ICONS: Record<ResourceType, React.ReactNode> = {
  coal: <path d="M7 14l3-6 5 2 3 5-4 4H8z" />,
  iron: (
    <>
      <path d="M3 14l4-3h10l4 3-4 3H7z" />
      <path d="M7 11v6M17 11v6" />
    </>
  ),
  copper: <path d="M6 8c4 0 4 8 8 8M9 8c4 0 4 8 8 8M7 8h2M15 16h2" />,
  quartz: (
    <>
      <path d="M12 3l5 6-5 12-5-12z" />
      <path d="M7 9h10M12 3v18" />
    </>
  ),
}
export function ResourceIcon({ type, ...p }: IconProps & { type: ResourceType }) {
  return <Svg {...p}>{RESOURCE_ICONS[type]}</Svg>
}

// --- Nav ---
const NAV_ICONS: Record<ScreenId, React.ReactNode> = {
  map: (
    <>
      <circle cx="6" cy="7" r="2" />
      <circle cx="18" cy="9" r="2" />
      <circle cx="11" cy="17" r="2" />
      <path d="M8 8l8 1M16 11l-4 4M8 9l3 6" />
    </>
  ),
  roster: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c1.5-4 12.5-4 14 0" />
    </>
  ),
  crafting: (
    <>
      <path d="M4 14l5-5M7 6l4 4-2 2-4-4z" />
      <path d="M14 4l6 6-2 2-6-6z" />
      <path d="M9 15l-4 4" />
    </>
  ),
  buildings: (
    <>
      <path d="M4 20V9l5-3 5 3v11" />
      <path d="M14 20v-7l6-2v9" />
      <path d="M4 20h16" />
    </>
  ),
}
export function NavIcon({ id, ...p }: IconProps & { id: ScreenId }) {
  return <Svg {...p}>{NAV_ICONS[id]}</Svg>
}

// --- Buildings ---
const BUILDING_ICONS: Record<BuildingType, React.ReactNode> = {
  forge: (
    <>
      <path d="M5 16l5-5 2 2-5 5z" />
      <path d="M11 9l4-4 4 4-4 4z" />
      <path d="M4 20h8" />
    </>
  ),
  workshop: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 4v3M12 17v3M4 12h3M17 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" />
    </>
  ),
  gunsmith: (
    <>
      <path d="M16 5a3 3 0 00-1 5l-7 7-2 2 2 2 2-2 7-7a3 3 0 002-7l-2 2-2-2z" />
    </>
  ),
}
export function BuildingIcon({ type, ...p }: IconProps & { type: BuildingType }) {
  return <Svg {...p}>{BUILDING_ICONS[type]}</Svg>
}

// --- Jobs (advanced jobs reuse their root's emblem) ---
const JOB_ICONS: Record<'soldier' | 'gunner' | 'engineer', React.ReactNode> = {
  soldier: (
    <>
      <path d="M6 5l4 4-2 2-4-4z" />
      <path d="M4 19l9-9M14 6l4-2-2 4M12 14l4 4" />
    </>
  ),
  gunner: (
    <>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </>
  ),
  engineer: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 5v2M12 17v2M5 12h2M17 12h2M7 7l1.5 1.5M15.5 15.5L17 17" />
    </>
  ),
}
export function JobIcon({ job, ...p }: IconProps & { job: JobId }) {
  return <Svg {...p}>{JOB_ICONS[JOB_SPRITE[job]]}</Svg>
}

// --- Rotate (circular arrow) ---
export function RotateIcon({ dir = 'right', ...p }: IconProps & { dir?: 'left' | 'right' }) {
  return (
    <Svg {...p}>
      <g transform={dir === 'left' ? 'scale(-1,1) translate(-24,0)' : undefined}>
        <path d="M20 6a8 8 0 1 0 1.6 6" />
        <path d="M20 3v4h-4" />
      </g>
    </Svg>
  )
}

// --- Brand mark (gear + bolt) ---
export function GearMark(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
      <circle cx="12" cy="12" r="1.4" />
    </Svg>
  )
}
