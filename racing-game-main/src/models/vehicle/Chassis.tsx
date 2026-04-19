import { forwardRef, useRef, useCallback } from 'react'
import { useGLTF, PositionalAudio } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Color, MathUtils } from 'three'

import type { PropsWithChildren } from 'react'
import type { GLTF } from 'three-stdlib'
import type { Group, Mesh, MeshStandardMaterial, PositionalAudio as PositionalAudioImpl } from 'three'

import { getState, mutation, useStore } from '../../store'
import { VEHICLE_CONFIG } from '../../physics/constants'

const { lerp } = MathUtils

interface ChassisGLTF extends GLTF {
  nodes: {
    Chassis_1: Mesh
    Chassis_2: Mesh
    Glass: Mesh
    BrakeLights: Mesh
    HeadLights: Mesh
    Cabin_Grilles: Mesh
    Undercarriage: Mesh
    TurnSignals: Mesh
    Chrome: Mesh
    Wheel_1: Mesh
    Wheel_2: Mesh
    License_1: Mesh
    License_2: Mesh
    Cube013: Mesh
    Cube013_1: Mesh
    Cube013_2: Mesh
    'pointer-left': Mesh
    'pointer-right': Mesh
  }
  materials: {
    BodyPaint: MeshStandardMaterial
    License: MeshStandardMaterial
    Chassis_2: MeshStandardMaterial
    Glass: MeshStandardMaterial
    BrakeLight: MeshStandardMaterial
    defaultMatClone: MeshStandardMaterial
    HeadLight: MeshStandardMaterial
    Black: MeshStandardMaterial
    Undercarriage: MeshStandardMaterial
    TurnSignal: MeshStandardMaterial
  }
}

type MaterialMesh = Mesh<any, MeshStandardMaterial>

const c = new Color()
const maxSpeed = VEHICLE_CONFIG.maxSpeed * 2.237 // mph

export const Chassis = forwardRef<Group, PropsWithChildren<{}>>(({ children }, ref) => {
  const glass = useRef<MaterialMesh>(null!)
  const brake = useRef<MaterialMesh>(null!)
  const wheel = useRef<Group>(null)
  const needle = useRef<MaterialMesh>(null!)
  const chassis_1 = useRef<MaterialMesh>(null!)
  const crashAudio = useRef<PositionalAudioImpl>(null!)
  const { nodes: n, materials: m } = useGLTF('/models/chassis-draco.glb') as unknown as ChassisGLTF

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const camera = getState().camera
    const controls = getState().controls

    // Brake lights
    if (brake.current) {
      brake.current.material.color.lerp(c.set(controls.brake ? '#555' : 'white'), dt * 10)
      brake.current.material.emissive.lerp(c.set(controls.brake ? '#ff2200' : '#330000'), dt * 10)
      brake.current.material.opacity = lerp(brake.current.material.opacity, controls.brake ? 1 : 0.3, dt * 10)
    }

    // Glass transparency for first-person
    if (glass.current) {
      glass.current.material.opacity = lerp(glass.current.material.opacity, camera === 'FIRST_PERSON' ? 0.1 : 0.75, dt * 2)
      glass.current.material.color.lerp(c.set(camera === 'FIRST_PERSON' ? 'white' : 'black'), dt * 2)
    }

    // Steering wheel
    if (wheel.current) {
      wheel.current.rotation.z = lerp(wheel.current.rotation.z, -mutation.steerAngle * 4, dt * 8)
    }

    // Speedometer needle
    if (needle.current) {
      needle.current.rotation.y = (mutation.speed / maxSpeed) * -Math.PI * 2 - 0.9
    }

    // Car color
    if (chassis_1.current) {
      chassis_1.current.material.color.lerp(c.set(getState().color), dt * 2)
    }
  })

  return (
    <group dispose={null}>
      <group position={[0, -0.2, -0.2]}>
        <mesh ref={chassis_1} castShadow receiveShadow geometry={n.Chassis_1.geometry} material={m.BodyPaint} material-color="#f0c050" />
        <mesh castShadow geometry={n.Chassis_2.geometry} material={n.Chassis_2.material} material-color="#353535" />
        <mesh castShadow ref={glass} geometry={n.Glass.geometry} material={m.Glass} material-transparent />
        <mesh ref={brake} geometry={n.BrakeLights.geometry} material={m.BrakeLight} material-transparent />
        <mesh geometry={n.HeadLights.geometry} material={m.HeadLight} />
        <mesh geometry={n.Cabin_Grilles.geometry} material={m.Black} />
        <mesh geometry={n.Undercarriage.geometry} material={m.Undercarriage} />
        <mesh geometry={n.TurnSignals.geometry} material={m.TurnSignal} />
        <mesh geometry={n.Chrome.geometry} material={n.Chrome.material} />
        <group ref={wheel} position={[0.37, 0.25, 0.46]}>
          <mesh geometry={n.Wheel_1.geometry} material={n.Wheel_1.material} />
          <mesh geometry={n.Wheel_2.geometry} material={n.Wheel_2.material} />
        </group>
        <group>
          <mesh geometry={n.License_1.geometry} material={m.License} />
          <mesh geometry={n.License_2.geometry} material={n.License_2.material} />
        </group>
        <group position={[0.2245, 0.3045, 0.6806]} scale={[0.0594, 0.0594, 0.0594]}>
          <mesh geometry={n.Cube013.geometry} material={n.Cube013.material} />
          <mesh geometry={n.Cube013_1.geometry} material={n.Cube013_1.material} />
          <mesh geometry={n.Cube013_2.geometry} material={n.Cube013_2.material} />
        </group>
        <mesh
          geometry={n['pointer-left'].geometry}
          material={n['pointer-left'].material}
          position={[0.5107, 0.3045, 0.6536]}
          rotation={[Math.PI / 2, -1.1954, 0]}
          scale={[0.0209, 0.0209, 0.0209]}
        />
        <mesh
          ref={needle}
          geometry={n['pointer-right'].geometry}
          material={n['pointer-right'].material}
          position={[0.2245, 0.3045, 0.6536]}
          rotation={[-Math.PI / 2, -0.9187, Math.PI]}
          scale={[0.0209, 0.0209, 0.0209]}
        />
      </group>
      {children}
      <PositionalAudio ref={crashAudio} url="/sounds/crash.mp3" loop={false} distance={5} />
    </group>
  )
})
