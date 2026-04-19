import { RigidBody, CuboidCollider } from '@react-three/rapier'

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
      onIntersectionEnter={onEnter}
    >
      <CuboidCollider args={[args[0] / 2, args[1] / 2, args[2] / 2]} sensor />
    </RigidBody>
  )
}
