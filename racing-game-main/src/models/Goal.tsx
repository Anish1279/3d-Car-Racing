import { RigidBody, CuboidCollider, interactionGroups } from '@react-three/rapier'
import { COLLISION_GROUP_CHASSIS, COLLISION_GROUP_ENVIRONMENT } from '../physics/constants'

interface GoalProps {
  args?: [number, number, number]
  position?: [number, number, number]
  rotation?: [number, number, number]
  onEnter?: () => void
}

export function Goal({ args = [1, 10, 18], position = [0, 0, 0], rotation = [0, 0, 0], onEnter }: GoalProps) {
  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={position}
      rotation={rotation}
      sensor
      collisionGroups={interactionGroups(COLLISION_GROUP_ENVIRONMENT, [COLLISION_GROUP_CHASSIS])}
      onIntersectionEnter={onEnter}
    >
      <CuboidCollider args={[args[0] / 2, args[1] / 2, args[2] / 2]} sensor />
    </RigidBody>
  )
}
