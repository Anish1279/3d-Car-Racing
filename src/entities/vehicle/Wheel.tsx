import { forwardRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Quaternion, Vector3 } from 'three'

import { VEHICLE_CONFIG } from '@/game/config/constants'
import { mutation, useStore } from '@/game/state/store'

import type { Group, Mesh, MeshStandardMaterial } from 'three'
import type { GLTF } from 'three-stdlib'

const _chassisWorldPos = new Vector3()
const _chassisWorldQuat = new Quaternion()
const _wheelOffset = new Vector3()

interface WheelGLTF extends GLTF {
  nodes: {
    Mesh_14: Mesh
    Mesh_14_1: Mesh
  }
  materials: {
    'Material.002': MeshStandardMaterial
    'Material.009': MeshStandardMaterial
  }
}

interface WheelProps {
  leftSide?: boolean
  index: number
}

export const Wheel = forwardRef<Group, WheelProps>(({ leftSide, index }, ref) => {
  const { radius } = VEHICLE_CONFIG.wheelRadius ? { radius: VEHICLE_CONFIG.wheelRadius } : { radius: 0.38 }
  const { nodes, materials } = useGLTF('/models/wheel-draco.glb') as unknown as WheelGLTF
  const scale = radius / 0.34
  const chassisBody = useStore((s) => s.chassisBody)

  useFrame(() => {
    if (!ref || typeof ref === 'function' || !ref.current || !chassisBody.current) return

    const wheelState = mutation.wheelStates[index]
    const wCfg = VEHICLE_CONFIG.wheels[index]

    const localPos = wCfg.position
    chassisBody.current.getWorldPosition(_chassisWorldPos)
    chassisBody.current.getWorldQuaternion(_chassisWorldQuat)

    ref.current.position.copy(
      _wheelOffset
        .set(localPos[0], localPos[1] - wheelState.compression * 0.8, localPos[2])
        .applyQuaternion(_chassisWorldQuat)
        .add(_chassisWorldPos)
    )
    ref.current.quaternion.copy(_chassisWorldQuat)

    // Spin
    if (ref.current.children[0]?.children[0]) {
      ref.current.children[0].children[0].rotation.x = wheelState.spinAngle

      // Steer rotation for front wheels
      if (wCfg.isSteer) {
        ref.current.children[0].rotation.y = mutation.steerAngle
      }
    }
  })

  return (
    <group ref={ref} dispose={null}>
      <group scale={scale}>
        <group scale={leftSide ? -1 : 1}>
          <mesh castShadow geometry={nodes.Mesh_14.geometry} material={materials['Material.002']} />
          <mesh castShadow geometry={nodes.Mesh_14_1.geometry} material={materials['Material.009']} />
        </group>
      </group>
    </group>
  )
})
