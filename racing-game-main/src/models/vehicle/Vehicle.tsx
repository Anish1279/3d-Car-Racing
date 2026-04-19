import { useRef } from 'react'
import { Euler, MathUtils, Quaternion, Vector3 } from 'three'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, interactionGroups } from '@react-three/rapier'
import type { ContactForcePayload, RapierRigidBody } from '@react-three/rapier'
import type { Group } from 'three'
import type { PropsWithChildren } from 'react'

import { Boost, BoostAudio, BrakeAudio, Dust, HonkAudio, Skid } from '../../effects'
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
const OFF_TRACK_DISTANCE = 18
const SAFE_TRACK_DISTANCE = 12
const OFF_TRACK_RECOVERY_DELAY = 1
const STUCK_RECOVERY_DELAY = 1.5
const FLIP_GAME_OVER_DELAY = 2.25
const RESPAWN_BACK_OFFSET = 5
const RESPAWN_TIME_PENALTY_MS = 3000

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
  const controls = useStore((s) => s.controls)
  const raceState = useStore((s) => s.raceState)
  const respawnNonce = useStore((s) => s.respawnNonce)
  const respawnPosition = useStore((s) => s.respawnPosition)
  const respawnRotation = useStore((s) => s.respawnRotation)
  const { gameOver, queueRespawn } = useStore((s) => s.actions)
  const visualRoot = useRef<Group>(null)

  const appliedRespawnNonce = useRef(-1)
  const impactCooldown = useRef(IMPACT_GRACE_PERIOD)
  const offTrackTimer = useRef(0)
  const stuckTimer = useRef(0)
  const flipTimer = useRef(0)
  const lastSafePosition = useRef(new Vector3(...SPAWN_POSITION))
  const lastSafeRotationY = useRef(SPAWN_ROTATION[1])
  const lastFramePosition = useRef(new Vector3(...SPAWN_POSITION))
  const hasLastFramePosition = useRef(false)
  const settledRaceState = useRef<string>('')
  const closestTrackSample = useRef(createTrackSample())

  useVehiclePhysics(chassisRigidBody)

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
    lastFramePosition.current.set(nextPosition[0], nextPosition[1], nextPosition[2])
    hasLastFramePosition.current = true
    offTrackTimer.current = 0
    stuckTimer.current = 0
    flipTimer.current = 0
    impactCooldown.current = IMPACT_GRACE_PERIOD
    settledRaceState.current = ''
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

    if (!hasLastFramePosition.current) {
      lastFramePosition.current.copy(_bodyPos)
      hasLastFramePosition.current = true
    }

    const planarTravel = Math.hypot(
      _bodyPos.x - lastFramePosition.current.x,
      _bodyPos.z - lastFramePosition.current.z,
    )
    lastFramePosition.current.copy(_bodyPos)

    if (raceState !== 'racing') return

    if (_bodyPos.y < -12) {
      gameOver('Fell off the course')
      return
    }

    if (_bodyUp.dot(_worldUp) < 0.2 && mutation.speed < 12) {
      flipTimer.current += dt
    } else {
      flipTimer.current = 0
    }

    if (flipTimer.current >= FLIP_GAME_OVER_DELAY) {
      gameOver('Vehicle flipped')
      return
    }

    if (closestTrackSample.current.distance >= OFF_TRACK_DISTANCE) {
      offTrackTimer.current += dt
    } else {
      offTrackTimer.current = 0
    }

    const tryingToDrive = controls.forward || controls.backward
    if (tryingToDrive && groundedWheels >= 2 && mutation.speed < 2 && planarTravel < 0.05) {
      stuckTimer.current += dt
    } else {
      stuckTimer.current = 0
    }

    if (offTrackTimer.current >= OFF_TRACK_RECOVERY_DELAY || stuckTimer.current >= STUCK_RECOVERY_DELAY) {
      queueRespawn(
        [lastSafePosition.current.x, lastSafePosition.current.y, lastSafePosition.current.z],
        [0, lastSafeRotationY.current, 0],
        RESPAWN_TIME_PENALTY_MS,
      )
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
