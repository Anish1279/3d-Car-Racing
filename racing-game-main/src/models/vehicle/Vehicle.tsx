import { useRef } from 'react'
import { Euler, MathUtils, Quaternion, Vector3 } from 'three'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, interactionGroups } from '@react-three/rapier'
import type { ContactForcePayload, RapierRigidBody } from '@react-three/rapier'
import type { Group } from 'three'
import type { PropsWithChildren } from 'react'

import { AccelerateAudio, Boost, BoostAudio, BrakeAudio, Dust, EngineAudio, HonkAudio, Skid } from '../../effects'
import { Cameras } from '../../effects/Cameras'
import {
  COLLISION_GROUP_CHASSIS,
  COLLISION_GROUP_ENVIRONMENT,
  SPAWN_POSITION,
  SPAWN_ROTATION,
  VEHICLE_CONFIG,
} from '../../physics/constants'
import { fillClosestTrackSample, createTrackSample } from '../../physics/trackPath'
import { mutation, useStore } from '../../store'
import { useVehiclePhysics } from '../../physics/useVehiclePhysics'
import { Chassis } from './Chassis'
import { Wheel } from './Wheel'

const { lerp } = MathUtils

const [halfX, halfY, halfZ] = VEHICLE_CONFIG.chassisHalfExtents
const chassisMassProperties = {
  mass: VEHICLE_CONFIG.chassisMass,
  centerOfMass: {
    x: VEHICLE_CONFIG.centerOfMassOffset.x,
    y: VEHICLE_CONFIG.centerOfMassOffset.y,
    z: VEHICLE_CONFIG.centerOfMassOffset.z,
  },
  principalAngularInertia: {
    x: (VEHICLE_CONFIG.chassisMass / 3) * (halfY * halfY + halfZ * halfZ),
    y: (VEHICLE_CONFIG.chassisMass / 3) * (halfX * halfX + halfZ * halfZ),
    z: (VEHICLE_CONFIG.chassisMass / 3) * (halfX * halfX + halfY * halfY),
  },
  angularInertiaLocalFrame: { x: 0, y: 0, z: 0, w: 1 },
} as const

const _respawnEuler = new Euler()
const _respawnQuat = new Quaternion()
const _bodyQuat = new Quaternion()
const _bodyPos = new Vector3()
const _bodyUp = new Vector3()
const _worldUp = new Vector3(0, 1, 0)

const IMPACT_FORCE_GAME_OVER = 65000
const IMPACT_SPEED_GAME_OVER = 42
const IMPACT_GRACE_PERIOD = 1.25
const SAFE_TRACK_DISTANCE = 12
const FLIP_GAME_OVER_DELAY = 2.25
const RESPAWN_BACK_OFFSET = 5
const STUCK_SAMPLE_INTERVAL_MS = 250
const STUCK_RESTART_DELAY_MS = 20000
const STUCK_RADIUS = 4
const STUCK_RADIUS_SQ = STUCK_RADIUS * STUCK_RADIUS

interface PositionSample {
  time: number
  x: number
  z: number
}

interface VehicleProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
}

export function Vehicle({
  children,
  position = [...SPAWN_POSITION],
  rotation = [...SPAWN_ROTATION],
}: PropsWithChildren<VehicleProps>) {
  const chassisRigidBody = useRef<RapierRigidBody>(null)
  const chassisBody = useStore((s) => s.chassisBody)
  const wheels = useStore((s) => s.wheels)
  const raceState = useStore((s) => s.raceState)
  const paused = useStore((s) => s.paused)
  const respawnNonce = useStore((s) => s.respawnNonce)
  const respawnPosition = useStore((s) => s.respawnPosition)
  const respawnRotation = useStore((s) => s.respawnRotation)
  const { gameOver, reset } = useStore((s) => s.actions)
  const visualRoot = useRef<Group>(null)

  const appliedRespawnNonce = useRef(-1)
  const impactCooldown = useRef(IMPACT_GRACE_PERIOD)
  const flipTimer = useRef(0)
  const lastSafePosition = useRef(new Vector3(...SPAWN_POSITION))
  const lastSafeRotationY = useRef(SPAWN_ROTATION[1])
  const settledRaceState = useRef<string>('')
  const closestTrackSample = useRef(createTrackSample())
  const stuckSamples = useRef<PositionSample[]>([])
  const lastStuckSampleAt = useRef(0)

  useVehiclePhysics(chassisRigidBody)

  const seedStuckWatchdog = (x: number, z: number, time = Date.now()) => {
    stuckSamples.current = [{ time, x, z }]
    lastStuckSampleAt.current = time
  }

  const resetStuckWatchdog = () => {
    stuckSamples.current = []
    lastStuckSampleAt.current = 0
  }

  const applyRespawn = (nextPosition: [number, number, number], nextRotation: [number, number, number]) => {
    const rb = chassisRigidBody.current
    if (!rb) return

    _respawnEuler.set(nextRotation[0], nextRotation[1], nextRotation[2])
    _respawnQuat.setFromEuler(_respawnEuler)

    rb.setTranslation({ x: nextPosition[0], y: nextPosition[1], z: nextPosition[2] }, false)
    rb.setRotation({ x: _respawnQuat.x, y: _respawnQuat.y, z: _respawnQuat.z, w: _respawnQuat.w }, false)
    rb.setLinvel({ x: 0, y: 0, z: 0 }, false)
    rb.setAngvel({ x: 0, y: 0, z: 0 }, false)

    lastSafePosition.current.set(nextPosition[0], nextPosition[1], nextPosition[2])
    lastSafeRotationY.current = nextRotation[1]
    flipTimer.current = 0
    impactCooldown.current = IMPACT_GRACE_PERIOD
    settledRaceState.current = ''
    seedStuckWatchdog(nextPosition[0], nextPosition[2])
  }

  const freezeVehicle = () => {
    const rb = chassisRigidBody.current
    if (!rb) return
    rb.setLinvel({ x: 0, y: 0, z: 0 }, false)
    rb.setAngvel({ x: 0, y: 0, z: 0 }, false)
  }

  const handleContactForce = ({ totalForceMagnitude }: ContactForcePayload) => {
    if (raceState !== 'racing') return
    if (impactCooldown.current > 0) return
    if (mutation.speed < IMPACT_SPEED_GAME_OVER) return
    if (totalForceMagnitude < IMPACT_FORCE_GAME_OVER) return

    gameOver('Major collision')
  }

  useFrame((_, delta) => {
    const rb = chassisRigidBody.current
    if (!rb) return

    const dt = Math.min(delta, 1 / 30)

    if (appliedRespawnNonce.current !== respawnNonce) {
      applyRespawn(respawnPosition, respawnRotation)
      appliedRespawnNonce.current = respawnNonce
      return
    }

    impactCooldown.current = Math.max(0, impactCooldown.current - dt)

    if (raceState === 'finished' || raceState === 'gameover') {
      if (settledRaceState.current !== raceState) {
        freezeVehicle()
        settledRaceState.current = raceState
        resetStuckWatchdog()
      }
      return
    }

    settledRaceState.current = ''

    if (visualRoot.current) {
      const speed = mutation.speed
      const maxSpeed = VEHICLE_CONFIG.maxSpeed * 2.237
      const steer = mutation.steerAngle
      let groundedWheels = 0
      for (const wheelState of mutation.wheelStates) {
        if (wheelState.isGrounded) groundedWheels++
      }
      const groundedRatio = groundedWheels / 4
      const bankTarget = ((-steer * speed) / maxSpeed) * 0.35 * groundedRatio
      const damp = 1 - Math.exp(-6 * dt)

      visualRoot.current.rotation.x = lerp(visualRoot.current.rotation.x, 0, damp)
      visualRoot.current.rotation.z = lerp(visualRoot.current.rotation.z, bankTarget, damp)
    }

    const pos = rb.translation()
    const rot = rb.rotation()
    _bodyPos.set(pos.x, pos.y, pos.z)
    _bodyQuat.set(rot.x, rot.y, rot.z, rot.w)
    _bodyUp.set(0, 1, 0).applyQuaternion(_bodyQuat)

    fillClosestTrackSample(_bodyPos.x, _bodyPos.z, closestTrackSample.current)

    let groundedWheels = 0
    for (const wheelState of mutation.wheelStates) {
      if (wheelState.isGrounded) groundedWheels++
    }

    if (closestTrackSample.current.distance <= SAFE_TRACK_DISTANCE && groundedWheels >= 2) {
      lastSafePosition.current.set(
        closestTrackSample.current.pointX - closestTrackSample.current.dirX * RESPAWN_BACK_OFFSET,
        closestTrackSample.current.pointY + 2.5,
        closestTrackSample.current.pointZ - closestTrackSample.current.dirZ * RESPAWN_BACK_OFFSET,
      )
      lastSafeRotationY.current = closestTrackSample.current.yaw
    }

    if (raceState !== 'racing') {
      resetStuckWatchdog()
      return
    }

    if (paused) {
      resetStuckWatchdog()
      return
    }

    if (_bodyPos.y < -12) {
      resetStuckWatchdog()
      gameOver('Fell off the course')
      return
    }

    if (_bodyUp.dot(_worldUp) < 0.2 && mutation.speed < 12) {
      flipTimer.current += dt
    } else {
      flipTimer.current = 0
    }

    if (flipTimer.current >= FLIP_GAME_OVER_DELAY) {
      resetStuckWatchdog()
      gameOver('Vehicle flipped')
      return
    }

    const now = Date.now()
    if (stuckSamples.current.length === 0) {
      seedStuckWatchdog(_bodyPos.x, _bodyPos.z, now)
    }

    const movedOutsideWatchdog = stuckSamples.current.some((sample) => {
      const dx = _bodyPos.x - sample.x
      const dz = _bodyPos.z - sample.z
      return (dx * dx + dz * dz) > STUCK_RADIUS_SQ
    })

    if (movedOutsideWatchdog) {
      seedStuckWatchdog(_bodyPos.x, _bodyPos.z, now)
      return
    }

    if ((now - lastStuckSampleAt.current) >= STUCK_SAMPLE_INTERVAL_MS) {
      stuckSamples.current.push({ time: now, x: _bodyPos.x, z: _bodyPos.z })
      lastStuckSampleAt.current = now
    }

    const oldestSample = stuckSamples.current[0]
    if (oldestSample && (now - oldestSample.time) >= STUCK_RESTART_DELAY_MS) {
      resetStuckWatchdog()
      reset()
      return
    }
  })

  return (
    <group>
      <RigidBody
        ref={chassisRigidBody}
        type="dynamic"
        colliders={false}
        position={position}
        rotation={rotation}
        linearDamping={VEHICLE_CONFIG.linearDamping}
        angularDamping={VEHICLE_CONFIG.angularDamping}
        collisionGroups={interactionGroups(COLLISION_GROUP_CHASSIS, [COLLISION_GROUP_ENVIRONMENT])}
        canSleep={false}
        ccd
        name="player-chassis"
        onContactForce={handleContactForce}
      >
        <CuboidCollider
          args={[...VEHICLE_CONFIG.chassisHalfExtents]}
          massProperties={chassisMassProperties}
          friction={0.05}
          restitution={0}
        />
        <group ref={chassisBody}>
          <group ref={visualRoot}>
            <Chassis>
              <EngineAudio />
              <AccelerateAudio />
              <BoostAudio />
              <BrakeAudio />
              <HonkAudio />
              <Boost />
              {children}
            </Chassis>
          </group>
        </group>
      </RigidBody>

      {wheels.map((wheelRef, index) => (
        <Wheel
          key={index}
          ref={wheelRef}
          index={index}
          leftSide={index % 2 === 0}
        />
      ))}

      <Dust />
      <Skid />
      <Cameras chassisRef={chassisRigidBody} />
    </group>
  )
}
