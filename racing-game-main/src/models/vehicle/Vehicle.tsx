import { useRef } from 'react'
import { MathUtils } from 'three'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, interactionGroups } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import type { PropsWithChildren } from 'react'
import type { Group } from 'three'

import { BoostAudio, Boost, BrakeAudio, Dust, HonkAudio, Skid } from '../../effects'
import { Cameras } from '../../effects/Cameras'
import { mutation, useStore } from '../../store'
import { useVehiclePhysics } from '../../physics/useVehiclePhysics'
import { VEHICLE_CONFIG, SPAWN_POSITION, SPAWN_ROTATION, COLLISION_GROUP_CHASSIS, COLLISION_GROUP_ENVIRONMENT } from '../../physics/constants'
import { Chassis } from './Chassis'
import { Wheel } from './Wheel'

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
  const visualRoot = useRef<Group>(null)

  // Custom vehicle physics
  useVehiclePhysics(chassisRigidBody)

  // Subtle visual bank that doesn't inject vibration into the rigid-body pose.
  useFrame((_, delta) => {
    if (!visualRoot.current) return

    const speed = mutation.speed
    const maxSpeed = VEHICLE_CONFIG.maxSpeed * 2.237 // to mph
    const steer = mutation.steerAngle
    const dt = Math.min(delta, 1 / 30)
    let groundedWheels = 0
    for (const wheelState of mutation.wheelStates) {
      if (wheelState.isGrounded) groundedWheels++
    }
    const groundedRatio = groundedWheels / 4
    const bankTarget = ((-steer * speed) / maxSpeed) * 0.35 * groundedRatio
    const damp = 1 - Math.exp(-6 * dt)

    visualRoot.current.rotation.x = MathUtils.lerp(visualRoot.current.rotation.x, 0, damp)
    visualRoot.current.rotation.z = MathUtils.lerp(visualRoot.current.rotation.z, bankTarget, damp)
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
        ccd={true}
        name="player-chassis"
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

      {/* Visual wheels - positioned by physics */}
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
