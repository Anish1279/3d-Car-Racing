import { useRef } from 'react'
import { Vector3, MathUtils, Quaternion } from 'three'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, interactionGroups } from '@react-three/rapier'
import { useGLTF } from '@react-three/drei'
import type { RapierRigidBody } from '@react-three/rapier'
import type { Group, Mesh, MeshStandardMaterial } from 'three'
import type { GLTF } from 'three-stdlib'
import { TRACK_WAYPOINTS, AI_CONFIG, COLLISION_GROUP_AI, COLLISION_GROUP_ENVIRONMENT, COLLISION_GROUP_CHASSIS, VEHICLE_LOCAL_FORWARD, VEHICLE_LOCAL_RIGHT } from '../physics/constants'

const _targetDir = new Vector3()
const _fwd = new Vector3()
const _pos = new Vector3()
const _waypoint = new Vector3()
const _force = new Vector3()
const _quat = new Quaternion()
const _planarVelocity = new Vector3()
const _right = new Vector3()

interface ChassisGLTF extends GLTF {
  nodes: { Chassis_1: Mesh; Chassis_2: Mesh; Glass: Mesh }
  materials: { BodyPaint: MeshStandardMaterial; Glass: MeshStandardMaterial }
}

const AI_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#e67e22']

interface AIVehicleProps {
  index: number
  startOffset?: number
}

export function AIVehicle({ index, startOffset = 0 }: AIVehicleProps) {
  const rbRef = useRef<RapierRigidBody>(null)
  const meshRef = useRef<Group>(null)
  const currentWaypoint = useRef((index * 3 + startOffset) % TRACK_WAYPOINTS.length)
  const { nodes: n, materials: m } = useGLTF('/models/chassis-draco.glb') as unknown as ChassisGLTF

  const color = AI_COLORS[index % AI_COLORS.length]
  const speedMult = 1 + (index - 1) * AI_CONFIG.speedVariation * (index % 2 === 0 ? 1 : -1)

  // Start position based on waypoint offset
  const startWp = TRACK_WAYPOINTS[(index * 5) % TRACK_WAYPOINTS.length]
  const startPos: [number, number, number] = [startWp[0] + index * 4, startWp[1] + 1, startWp[2]]

  useFrame((_, delta) => {
    const rb = rbRef.current
    if (!rb) return

    const dt = Math.min(delta, 1 / 30)
    const cfg = AI_CONFIG

    // Get AI position
    const pos = rb.translation()
    const rot = rb.rotation()
    _pos.set(pos.x, pos.y, pos.z)
    _quat.set(rot.x, rot.y, rot.z, rot.w)

    // Forward direction
    _fwd.set(...VEHICLE_LOCAL_FORWARD).applyQuaternion(_quat)

    // Get target waypoint (look ahead)
    const wpIdx = currentWaypoint.current
    const lookAheadIdx = (wpIdx + cfg.lookAheadPoints) % TRACK_WAYPOINTS.length
    const wp = TRACK_WAYPOINTS[lookAheadIdx]
    _waypoint.set(wp[0], wp[1], wp[2])

    // Direction to waypoint
    _targetDir.copy(_waypoint).sub(_pos)
    const distToWp = _targetDir.length()
    _targetDir.y = 0
    _targetDir.normalize()

    // Check if reached waypoint
    if (distToWp < cfg.waypointReachDistance) {
      currentWaypoint.current = (wpIdx + 1) % TRACK_WAYPOINTS.length
    }

    // Steering: calculate signed angle between forward and target
    const cross = _fwd.z * _targetDir.x - _fwd.x * _targetDir.z
    const dot = _fwd.x * _targetDir.x + _fwd.z * _targetDir.z
    const angle = Math.atan2(cross, dot)

    // Apply torque for steering
    const steerTorque = MathUtils.clamp(angle * cfg.steerResponsiveness, -3, 3)
    rb.applyTorqueImpulse({ x: 0, y: steerTorque * dt * 50, z: 0 }, true)

    // Speed control
    _planarVelocity.set(rb.linvel().x, 0, rb.linvel().z)
    const currentSpeed = _fwd.dot(_planarVelocity)
    const targetSpeed = cfg.maxSpeed * speedMult

    // Reduce speed in tight turns
    const turnFactor = 1 - Math.min(Math.abs(angle) / Math.PI, 0.5) * 0.6

    if (currentSpeed < targetSpeed * turnFactor) {
      _force.copy(_fwd).multiplyScalar(cfg.engineForce * dt)
      rb.applyImpulse({ x: _force.x, y: 0, z: _force.z }, true)
    }

    // Apply lateral friction to prevent sliding
    _right.set(...VEHICLE_LOCAL_RIGHT).applyQuaternion(_quat)
    const lateralVel = _right.dot(_planarVelocity)
    const lateralCorrection = _right.multiplyScalar(-lateralVel * 0.8 * dt * 60)
    rb.applyImpulse({ x: lateralCorrection.x, y: 0, z: lateralCorrection.z }, true)

    // Sync visual mesh
    if (meshRef.current) {
      meshRef.current.position.set(pos.x, pos.y, pos.z)
      meshRef.current.quaternion.set(rot.x, rot.y, rot.z, rot.w)
    }
  })

  return (
    <>
      <RigidBody
        ref={rbRef}
        type="dynamic"
        colliders={false}
        position={startPos}
        mass={600}
        linearDamping={0.5}
        angularDamping={3}
        collisionGroups={interactionGroups(COLLISION_GROUP_AI, [COLLISION_GROUP_ENVIRONMENT, COLLISION_GROUP_CHASSIS])}
        canSleep={false}
        ccd={true}
      >
        <CuboidCollider args={[1.0, 0.55, 2.35]} mass={600} friction={0.5} />
      </RigidBody>

      <group ref={meshRef} dispose={null}>
        <group position={[0, -0.2, -0.2]}>
          <mesh castShadow receiveShadow geometry={n.Chassis_1.geometry}>
            <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} />
          </mesh>
          <mesh castShadow geometry={n.Chassis_2.geometry} material={n.Chassis_2.material} material-color="#353535" />
          <mesh castShadow geometry={n.Glass.geometry}>
            <meshStandardMaterial color="black" transparent opacity={0.75} />
          </mesh>
        </group>
      </group>
    </>
  )
}
