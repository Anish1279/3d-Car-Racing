import { RigidBody, CuboidCollider, interactionGroups } from '@react-three/rapier'
import { COLLISION_GROUP_CHASSIS, COLLISION_GROUP_ENVIRONMENT } from '@/game/config/constants'

interface RampProps {
  args?: [number, number, number]
  position?: [number, number, number]
  rotation?: [number, number, number]
}

export function Ramp({ args = [30, 6, 8], position = [0, 0, 0], rotation = [0, 0, 0] }: RampProps) {
  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={position}
      rotation={rotation}
      collisionGroups={interactionGroups(COLLISION_GROUP_ENVIRONMENT, [COLLISION_GROUP_CHASSIS])}
      friction={0.8}
    >
      <CuboidCollider args={[args[0] / 2, args[1] / 2, args[2] / 2]} />
      <mesh castShadow receiveShadow>
        <boxGeometry args={args} />
        <meshStandardMaterial color="#8b4513" roughness={0.9} />
      </mesh>
    </RigidBody>
  )
}
