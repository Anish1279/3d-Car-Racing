import { Vector3 } from 'three'

// ─── COLLISION GROUPS ───────────────────────────────────────────
export const COLLISION_GROUP_CHASSIS = 0
export const COLLISION_GROUP_ENVIRONMENT = 1
export const COLLISION_GROUP_SENSOR = 2
export const COLLISION_GROUP_AI = 3

// ─── VEHICLE PHYSICS CONFIG ────────────────────────────────────
// Canonical vehicle basis used across physics, camera, AI, and minimap:
// +X = right, +Y = up, +Z = forward (car nose / front axle direction).
export const VEHICLE_LOCAL_FORWARD = [0, 0, 1] as const
export const VEHICLE_LOCAL_RIGHT = [1, 0, 0] as const

export const VEHICLE_CONFIG = {
  // Chassis
  chassisMass: 800,
  chassisHalfExtents: [1.0, 0.55, 2.35] as const, // half-size of collision box
  centerOfMassOffset: new Vector3(0, -0.4, 0),
  linearDamping: 0.3,
  angularDamping: 1.5,

  // Engine
  maxEngineForce: 2800,
  maxReverseForce: 1200,
  maxSpeed: 55, // m/s ≈ 123 mph
  boostMultiplier: 1.6,

  // Braking
  maxBrakeForce: 2500,
  handbrakeForce: 3500,

  // Steering
  maxSteerAngle: 0.38, // radians (~21 degrees)
  steerSpeed: 5.0,
  steerReturnSpeed: 8.0,
  speedSteerReduction: 0.6, // at max speed, steer range is reduced by 60%

  // Boost
  maxBoost: 100,
  boostDrainRate: 25, // per second
  boostRechargeRate: 8, // per second when not boosting
  boostRechargeDelay: 1.5, // seconds after releasing boost before recharge starts

  // Downforce & Drag
  downforceCoefficient: 1.8,
  aeroDragCoefficient: 0.012,

  // Wheel configs: [FL, FR, RL, RR]
  wheels: [
    { position: [-0.85, -0.3, 1.35], isDrive: false, isSteer: true },
    { position: [0.85, -0.3, 1.35], isDrive: false, isSteer: true },
    { position: [-0.85, -0.3, -1.3], isDrive: true, isSteer: false },
    { position: [0.85, -0.3, -1.3], isDrive: true, isSteer: false },
  ] as const,

  wheelRadius: 0.38,

  // Suspension
  suspensionRestLength: 0.5,
  suspensionStiffness: 55,
  suspensionDamping: 6,
  maxSuspensionTravel: 0.35,

  // Friction
  frictionSlipFront: 3.2,
  frictionSlipRear: 2.8,
  handbrakeSlipRear: 0.6, // very low grip during handbrake → enables drifting
  lateralFrictionDamping: 0.92,
} as const

// ─── TRACK LANDMARKS ───────────────────────────────────────────
export const START_LINE_POSITION = [-27, 1, 180] as const
export const START_LINE_ROTATION = [0, 0.55, 0] as const
export const FINISH_LINE_POSITION = [-104, 1, -189] as const
export const FINISH_LINE_ROTATION = [0, -1.2, 0] as const
export const CHECKPOINT_POSITION = [-50, 1, -5] as const
export const CHECKPOINT_ROTATION = [0, -0.5, 0] as const

const START_LINE_DIRECTION = [
  Math.cos(START_LINE_ROTATION[1]),
  0,
  -Math.sin(START_LINE_ROTATION[1]),
] as const

const PLAYER_SPAWN_BACK_OFFSET = 12

// Spawn is derived from the actual start gate so retry/menu resets always
// place the player at the same canonical launch point.
export const SPAWN_POSITION = [
  START_LINE_POSITION[0] - START_LINE_DIRECTION[0] * PLAYER_SPAWN_BACK_OFFSET,
  2.5,
  START_LINE_POSITION[2] - START_LINE_DIRECTION[2] * PLAYER_SPAWN_BACK_OFFSET,
] as const
export const SPAWN_ROTATION = [
  0,
  Math.atan2(START_LINE_DIRECTION[0], START_LINE_DIRECTION[2]),
  0,
] as const

// ─── AI WAYPOINTS ──────────────────────────────────────────────
export const TRACK_WAYPOINTS: [number, number, number][] = [
  [-110, 1, 218],
  [-85, 1, 205],
  [-55, 1, 192],
  [-27, 1, 180],
  [0, 1, 170],
  [25, 1, 155],
  [50, 1, 130],
  [70, 1, 100],
  [80, 1, 65],
  [75, 1, 30],
  [55, 1, 0],
  [25, 1, -15],
  [-10, 1, -10],
  [-50, 1, -5],
  [-80, 1, -25],
  [-105, 1, -55],
  [-125, 1, -90],
  [-140, 1, -130],
  [-135, 1, -165],
  [-104, 1, -189],
  [-70, 1, -195],
  [-35, 1, -180],
  [0, 1, -155],
  [30, 1, -120],
  [50, 1, -80],
  [55, 1, -40],
  [40, 1, 10],
  [15, 1, 55],
  [-15, 1, 95],
  [-45, 1, 130],
  [-75, 1, 165],
  [-100, 1, 195],
]

// ─── RACE CONFIG ───────────────────────────────────────────────
export const TOTAL_LAPS = 3
export const COUNTDOWN_DURATION = 3 // seconds
export const AI_COUNT = 3

// ─── AI CONFIG ─────────────────────────────────────────────────
export const AI_CONFIG = {
  maxSpeed: 42, // slightly slower than player max
  steerResponsiveness: 3.5,
  waypointReachDistance: 15,
  lookAheadPoints: 2,
  speedVariation: 0.15, // ±15% speed variation between AI cars
  engineForce: 2200,
} as const
