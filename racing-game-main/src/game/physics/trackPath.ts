import { TRACK_WAYPOINTS } from '@/game/config/constants'

export interface TrackSample {
  distance: number
  progress: number
  pointX: number
  pointY: number
  pointZ: number
  dirX: number
  dirY: number
  dirZ: number
  yaw: number
}

export const createTrackSample = (): TrackSample => ({
  distance: Number.POSITIVE_INFINITY,
  progress: 0,
  pointX: TRACK_WAYPOINTS[0][0],
  pointY: TRACK_WAYPOINTS[0][1],
  pointZ: TRACK_WAYPOINTS[0][2],
  dirX: 0,
  dirY: 0,
  dirZ: 1,
  yaw: 0,
})

export function fillClosestTrackSample(x: number, z: number, target: TrackSample): TrackSample {
  let bestDistanceSq = Number.POSITIVE_INFINITY

  for (let i = 0; i < TRACK_WAYPOINTS.length; i++) {
    const a = TRACK_WAYPOINTS[i]
    const b = TRACK_WAYPOINTS[(i + 1) % TRACK_WAYPOINTS.length]

    const ax = a[0]
    const az = a[2]
    const bx = b[0]
    const by = b[1]
    const bz = b[2]

    const abx = bx - ax
    const abz = bz - az
    const abLenSq = Math.max(abx * abx + abz * abz, 1e-6)
    const tRaw = ((x - ax) * abx + (z - az) * abz) / abLenSq
    const t = Math.min(1, Math.max(0, tRaw))

    const px = ax + abx * t
    const pz = az + abz * t
    const dx = x - px
    const dz = z - pz
    const distSq = dx * dx + dz * dz

    if (distSq >= bestDistanceSq) continue

    const dirLen = Math.max(Math.hypot(abx, abz), 1e-6)

    bestDistanceSq = distSq
    target.distance = Math.sqrt(distSq)
    target.progress = i + t
    target.pointX = px
    target.pointY = a[1] + (by - a[1]) * t
    target.pointZ = pz
    target.dirX = abx / dirLen
    target.dirY = 0
    target.dirZ = abz / dirLen
    target.yaw = Math.atan2(target.dirX, target.dirZ)
  }

  return target
}
