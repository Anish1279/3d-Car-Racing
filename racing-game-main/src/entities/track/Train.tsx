import { useRef, useEffect } from 'react'
import { Vector3 } from 'three'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, PositionalAudio } from '@react-three/drei'
import { RigidBody, CuboidCollider, interactionGroups } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import type { Group, Mesh, MeshStandardMaterial, PositionalAudio as PositionalAudioImpl } from 'three'
import type { GLTF } from 'three-stdlib'
import { COLLISION_GROUP_CHASSIS, COLLISION_GROUP_ENVIRONMENT } from '@/game/config/constants'
import { useStore } from '@/game/state/store'

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

const TRAIN_AUDIBLE_RANGE = 60      // start hearing train within this distance
const TRAIN_FULL_VOLUME_RANGE = 10  // full volume when very close
const _camPos = new Vector3()
const _trainWorldPos = new Vector3()

export function Train({
  position = [-145.84, 3.42, 54.67],
  rotation = [0, -0.09, 0],
}: TrainProps): JSX.Element {
  const groupRef = useRef<Group>(null!)
  const rbRef = useRef<RapierRigidBody>(null)
  const trainAudioRef = useRef<PositionalAudioImpl>(null)
  const audioStarted = useRef(false)
  const { animations, nodes: n, materials: m } = useGLTF('/models/track-draco.glb') as unknown as TrainGLTF
  const { actions } = useAnimations(animations, groupRef)
  const sound = useStore((s) => s.sound)
  const ready = useStore((s) => s.ready)
  const paused = useStore((s) => s.paused)
  const raceState = useStore((s) => s.raceState)
  const config = { receiveShadow: true, castShadow: true, 'material-roughness': 1 }
  const trainAction = actions.train

  const isRacing = ready && sound && !paused && (raceState === 'countdown' || raceState === 'racing')

  useEffect(() => {
    if (!trainAction) return

    trainAction.play()

    return () => {
      trainAction.stop()
    }
  }, [trainAction])

  useEffect(() => {
    if (!trainAction) return

    trainAction.paused = paused
  }, [paused, trainAction])

  useEffect(() => {
    const audio = trainAudioRef.current
    if (!audio) return

    let active = true
    let retryTimeout: number | null = null

    const stopAudio = () => {
      if (retryTimeout !== null) {
        window.clearTimeout(retryTimeout)
        retryTimeout = null
      }

      if (audio.isPlaying) audio.stop()
      audioStarted.current = false
    }

    if (isRacing) {
      const tryPlay = () => {
        if (!active) return

        if (audio.buffer && !audio.isPlaying) {
          audio.setVolume(0) // start silent — useFrame controls volume by proximity
          audio.play()
          audioStarted.current = true
        } else if (!audio.buffer) {
          retryTimeout = window.setTimeout(tryPlay, 200)
        }
      }
      tryPlay()
    } else {
      stopAudio()
    }

    return () => {
      active = false
      stopAudio()
    }
  }, [isRacing])

  useFrame((state) => {
    // Sync Rapier kinematic body with animated mesh
    if (rbRef.current && groupRef.current) {
      const p = groupRef.current.position
      rbRef.current.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z })
    }

    // --- Train volume by proximity ---
    const audio = trainAudioRef.current
    if (!audio || !audioStarted.current || !audio.isPlaying) return

    // Get the train's current world position (it moves via animation)
    if (groupRef.current) {
      groupRef.current.getWorldPosition(_trainWorldPos)
    }
    _camPos.copy(state.camera.position)

    const dist = _camPos.distanceTo(_trainWorldPos)

    if (dist > TRAIN_AUDIBLE_RANGE) {
      audio.setVolume(0)
    } else if (dist < TRAIN_FULL_VOLUME_RANGE) {
      audio.setVolume(0.5)
    } else {
      const t = 1 - (dist - TRAIN_FULL_VOLUME_RANGE) / (TRAIN_AUDIBLE_RANGE - TRAIN_FULL_VOLUME_RANGE)
      audio.setVolume(t * 0.5)
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
        {/* Audio starts silent — volume controlled by proximity in useFrame */}
        <PositionalAudio ref={trainAudioRef} url="/sounds/train.mp3" loop distance={1} />
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
