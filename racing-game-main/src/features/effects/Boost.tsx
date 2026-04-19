import { MathUtils, Object3D, Vector3 } from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { InstancedMesh } from 'three'
import { getState, mutation } from '@/game/state/store'

const o = new Object3D()
const positions = [new Vector3(-0.4, -0.5, -1.8), new Vector3(0.4, -0.5, -1.8)] as const

interface BoostProps {
  count?: number
  opacity?: number
  size?: number
}

export function Boost({ count = 12, opacity = 0.6, size = 0.1 }: BoostProps): JSX.Element {
  const ref = useRef<InstancedMesh>(null)
  let needsUpdate = false

  useFrame((state) => {
    if (!ref.current) return
    const isBoosting = mutation.boost > 0 && getState().controls.boost
    needsUpdate = false

    for (let i = 0; i < count; i += positions.length) {
      const n = MathUtils.randFloatSpread(0.05)
      for (let j = 0; j < positions.length; j++) {
        const progress = (state.clock.getElapsedTime() + (i + j) * 0.2) % 1
        o.position.set(positions[j].x + n, positions[j].y, positions[j].z - progress * 0.75)
        o.rotation.z += progress / 2
        o.scale.setScalar(isBoosting ? (1 - progress) * 2.5 : 0)
        o.updateMatrix()
        ref.current.setMatrixAt(i + j, o.matrix)
        needsUpdate = true
      }
    }
    if (needsUpdate) ref.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <boxGeometry args={[size, size, size]} />
      <meshBasicMaterial color="#00d4ff" transparent opacity={opacity} depthWrite={false} />
    </instancedMesh>
  )
}
