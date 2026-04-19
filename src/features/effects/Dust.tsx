import { Vector3, Matrix4, Object3D, Quaternion, MathUtils } from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { InstancedMesh } from 'three'
import { getState, mutation, useStore } from '@/game/state/store'

const v = new Vector3()
const m = new Matrix4()
const o = new Object3D()
const q = new Quaternion()

interface DustProps {
  count?: number
  opacity?: number
  size?: number
}

export function Dust({ count = 200, opacity = 0.1, size = 1 }: DustProps): JSX.Element {
  const wheels = useStore((state) => state.wheels)
  const ref = useRef<InstancedMesh>(null)
  const indexRef = useRef(0)
  const lastTimeRef = useRef(0)
  const intensityRef = useRef(0)

  useFrame((state, delta) => {
    if (!ref.current) return
    const brake = getState().controls.brake
    const dt = Math.min(delta, 1 / 30)
    intensityRef.current = MathUtils.lerp(
      intensityRef.current,
      (Number(mutation.sliding || brake) * mutation.speed) / 40,
      1 - Math.exp(-8 * dt)
    )

    const elapsed = state.clock.getElapsedTime()
    if (elapsed - lastTimeRef.current > 0.02 && wheels[2].current && wheels[3].current) {
      lastTimeRef.current = elapsed
      setItemAt(ref.current, wheels[2].current.getWorldPosition(v), indexRef.current++, intensityRef.current)
      setItemAt(ref.current, wheels[3].current.getWorldPosition(v), indexRef.current++, intensityRef.current)
      if (indexRef.current >= count) indexRef.current = 0
    } else {
      // Shrink existing particles
      let changed = false
      for (let i = 0; i < count; i++) {
        ref.current.getMatrixAt(i, m)
        m.decompose(o.position, q, v)
        if (v.x > 0.001) {
          o.scale.setScalar(Math.max(0, v.x - 0.005))
          o.updateMatrix()
          ref.current.setMatrixAt(i, o.matrix)
          changed = true
        }
      }
      if (changed) ref.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[size, 8, 8]} />
      <meshBasicMaterial color="#d4a574" transparent opacity={opacity} depthWrite={false} />
    </instancedMesh>
  )
}

function setItemAt(mesh: InstancedMesh, position: Vector3, index: number, intensity: number): void {
  const n = MathUtils.randFloatSpread(0.25)
  o.position.set(position.x + n, position.y - 0.4, position.z + n)
  o.scale.setScalar(Math.random() * intensity)
  o.updateMatrix()
  mesh.setMatrixAt(index, o.matrix)
  mesh.instanceMatrix.needsUpdate = true
}
