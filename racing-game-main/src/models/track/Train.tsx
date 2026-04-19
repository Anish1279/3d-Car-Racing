import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, PositionalAudio } from '@react-three/drei'
import { RigidBody, CuboidCollider, interactionGroups } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import type { Group, Mesh, MeshStandardMaterial, PositionalAudio as PositionalAudioImpl } from 'three'
import type { GLTF } from 'three-stdlib'
import { useStore } from '../../store'
import { COLLISION_GROUP_CHASSIS, COLLISION_GROUP_ENVIRONMENT } from '../../physics/constants'

interface TrainGLTF extends GLTF {
  nodes: {
    train_1: Mesh; train_2: Mesh; train_3: Mesh; train_4: Mesh; train_5: Mesh
    train_6: Mesh; train_7: Mesh; train_8: Mesh; train_9: Mesh
  }
  materials: {
    custom7Clone: MeshStandardMaterial; blueSteelClone: MeshStandardMaterial
    custom12Clone: MeshStandardMaterial; custom14Clone: MeshStandardMaterial
    glassClone: MeshStandardMaterial; defaultMatClone: MeshStandardMaterial
    steelClone: MeshStandardMaterial; lightRedClone: MeshStandardMaterial
    darkClone: MeshStandardMaterial
  }
}

interface TrainProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
}

export function Train({
  position = [-145.84, 3.42, 54.67],
  rotation = [0, -0.09, 0],
}: TrainProps): JSX.Element {
  const groupRef = useRef<Group>(null!)
  const rbRef = useRef<RapierRigidBody>(null)
  const trainAudioRef = useRef<PositionalAudioImpl>(null)
  const { animations, nodes: n, materials: m } = useGLTF('/models/track-draco.glb') as unknown as TrainGLTF
  const { actions } = useAnimations(animations, groupRef)
  const sound = useStore((s) => s.sound)
  const ready = useStore((s) => s.ready)
  const raceState = useStore((s) => s.raceState)
  const config = { receiveShadow: true, castShadow: true, 'material-roughness': 1 }

  // Only play train audio when the race is active
  const shouldPlayAudio = ready && sound && (raceState === 'countdown' || raceState === 'racing')

  useEffect(() => {
    const audio = trainAudioRef.current
    if (!audio) return

    if (shouldPlayAudio) {
      // Wait a frame for the buffer to be ready
      const tryPlay = () => {
        if (audio.buffer && !audio.isPlaying) {
          audio.setVolume(0.6)
          audio.setRolloffFactor(2)
          audio.play()
        } else if (!audio.buffer) {
          // Buffer not loaded yet, retry shortly
          setTimeout(tryPlay, 200)
        }
      }
      tryPlay()
    } else {
      if (audio.isPlaying) audio.stop()
    }
    return () => { if (audio?.isPlaying) audio.stop() }
  }, [shouldPlayAudio])

  // Play train animation
  useFrame(() => {
    if (actions.train && !actions.train.isRunning()) {
      actions.train.play()
    }
    // Sync Rapier kinematic body with animated mesh
    if (rbRef.current && groupRef.current) {
      const p = groupRef.current.position
      rbRef.current.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z })
    }
  })

  return (
    <>
      <group ref={groupRef} name="train" position={position} rotation={rotation} dispose={null}>
        <mesh geometry={n.train_1.geometry} material={m.custom7Clone} {...config} />
        <mesh geometry={n.train_2.geometry} material={m.blueSteelClone} {...config} />
        <mesh geometry={n.train_3.geometry} material={m.custom12Clone} {...config} />
        <mesh geometry={n.train_4.geometry} material={m.custom14Clone} {...config} />
        <mesh geometry={n.train_5.geometry} material={m.defaultMatClone} {...config} />
        <mesh geometry={n.train_6.geometry} material={m.glassClone} {...config} />
        <mesh geometry={n.train_7.geometry} material={m.steelClone} {...config} />
        <mesh geometry={n.train_8.geometry} material={m.lightRedClone} {...config} />
        <mesh geometry={n.train_9.geometry} material={m.darkClone} {...config} />
        {/* distance=3 → train sound only audible within ~15-20 units of the train */}
        <PositionalAudio ref={trainAudioRef} url="/sounds/train.mp3" loop distance={3} />
      </group>
      <RigidBody
        ref={rbRef}
        type="kinematicPosition"
        colliders={false}
        position={position}
        rotation={rotation}
        collisionGroups={interactionGroups(COLLISION_GROUP_ENVIRONMENT, [COLLISION_GROUP_CHASSIS])}
      >
        <CuboidCollider args={[19, 4, 5]} />
      </RigidBody>
    </>
  )
}
