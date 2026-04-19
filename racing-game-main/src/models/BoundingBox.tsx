import { RigidBody, CuboidCollider, interactionGroups } from '@react-three/rapier'
import { useStore } from '../store'
import { COLLISION_GROUP_CHASSIS, COLLISION_GROUP_ENVIRONMENT } from '../physics/constants'

type Props = {
  depth: number
  height: number
  position: [number, number, number]
  width: number
}

export const BoundingBox = ({ depth, height, position: [x, y, z], width }: Props) => {
  const reset = useStore((s) => s.actions.reset)
  const halfDepth = depth / 2
  const halfHeight = height / 2
  const halfWidth = width / 2
  const thickness = 1

  const walls: { pos: [number, number, number]; size: [number, number, number] }[] = [
    { pos: [x - halfWidth, y, z], size: [thickness, halfHeight, halfDepth] },
    { pos: [x + halfWidth, y, z], size: [thickness, halfHeight, halfDepth] },
    { pos: [x, y - halfHeight, z], size: [halfWidth, thickness, halfDepth] },
    { pos: [x, y + halfHeight, z], size: [halfWidth, thickness, halfDepth] },
    { pos: [x, y, z - halfDepth], size: [halfWidth, halfHeight, thickness] },
    { pos: [x, y, z + halfDepth], size: [halfWidth, halfHeight, thickness] },
  ]

  return (
    <>
      {walls.map((wall, i) => (
        <RigidBody
          key={i}
          type="fixed"
          colliders={false}
          position={wall.pos}
          sensor
          collisionGroups={interactionGroups(COLLISION_GROUP_ENVIRONMENT, [COLLISION_GROUP_CHASSIS])}
          onIntersectionEnter={() => reset()}
        >
          <CuboidCollider args={wall.size} sensor />
        </RigidBody>
      ))}
    </>
  )
}
