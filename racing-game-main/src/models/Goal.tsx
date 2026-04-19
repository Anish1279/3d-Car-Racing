import { useRef } from 'react'
import { RigidBody, CuboidCollider, interactionGroups } from '@react-three/rapier'
import { COLLISION_GROUP_CHASSIS, COLLISION_GROUP_ENVIRONMENT } from '../physics/constants'

interface GoalProps {
  args?: [number, number, number]
  position?: [number, number, number]
  rotation?: [number, number, number]
  onEnter?: () => void
}

// Generous sensor thickness so fast vehicles can never skip through.
const SENSOR_THICKNESS = 8

export function Goal({ args = [SENSOR_THICKNESS, 12, 22], position = [0, 0, 0], rotation = [0, 0, 0], onEnter }: GoalProps) {
  const firedRef = useRef(false)

  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={position}
      rotation={rotation}
      sensor
      collisionGroups={interactionGroups(COLLISION_GROUP_ENVIRONMENT, [COLLISION_GROUP_CHASSIS])}
      onIntersectionEnter={() => {
        console.log('[GOAL] Sensor triggered at position', position)
        // Debounce to prevent double-firing during a single pass
        if (firedRef.current) return
        firedRef.current = true
        onEnter?.()
        // Reset after cooldown so it fires again on the next lap
        setTimeout(() => { firedRef.current = false }, 2000)
      }}
    >
      <CuboidCollider args={[args[0] / 2, args[1] / 2, args[2] / 2]} sensor />
    </RigidBody>
  )
}
