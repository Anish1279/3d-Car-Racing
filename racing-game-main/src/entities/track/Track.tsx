import { DoubleSide, Vector3 } from 'three'
import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshDistortMaterial, useGLTF, PositionalAudio } from '@react-three/drei'
import { RigidBody, MeshCollider, interactionGroups } from '@react-three/rapier'

import type { GLTF } from 'three-stdlib'
import type { Group, Mesh, MeshStandardMaterial, PositionalAudio as PositionalAudioImpl } from 'three'
import { COLLISION_GROUP_CHASSIS, COLLISION_GROUP_ENVIRONMENT } from '@/game/config/constants'
import { useStore } from '@/game/state/store'

interface TrackGLTF extends GLTF {
  nodes: {
    track_2: Mesh; tube: Mesh; strip: Mesh; track_1: Mesh
    mountains: Mesh; terrain: Mesh; water: Mesh
    bird001: Mesh; bird002: Mesh; bird003: Mesh; bird: Mesh
    blade001: Mesh; blade002: Mesh; blade003: Mesh
    blade004: Mesh; blade005: Mesh; blade006: Mesh; blade: Mesh
    cloud001: Mesh; cloud002: Mesh; cloud003: Mesh; cloud004: Mesh
    cloud005: Mesh; cloud006: Mesh; cloud007: Mesh; cloud008: Mesh
    cloud009: Mesh; cloud010: Mesh; cloud011: Mesh; cloud012: Mesh; cloud: Mesh
  }
  materials: {
    ColorPaletteWater: MeshStandardMaterial
    'Material.001': MeshStandardMaterial
    default: MeshStandardMaterial
  }
}

// Water areas on the track — the car hears water when near these zones
const WATER_ZONES: [number, number, number][] = [
  [-80, 0, -25],   // river/bridge area
  [-125, 0, -90],  // second water crossing
]
const WATER_AUDIBLE_RANGE = 40   // start hearing water within this distance
const WATER_FULL_VOLUME_RANGE = 8 // full volume within this distance

const _camPos = new Vector3()

export function Track(): JSX.Element {
  const level = useStore((state) => state.level)
  const sound = useStore((s) => s.sound)
  const ready = useStore((s) => s.ready)
  const raceState = useStore((s) => s.raceState)
  const { nodes: n, materials: m } = useGLTF('/models/track-draco.glb') as unknown as TrackGLTF
  const config = { receiveShadow: true, castShadow: true, 'material-roughness': 1 }
  const birds = useRef<Group>(null!)
  const clouds = useRef<Group>(null!)
  const waterAudioRef = useRef<PositionalAudioImpl>(null)
  const waterStarted = useRef(false)

  const isRacing = ready && sound && (raceState === 'countdown' || raceState === 'racing')

  // Start/stop water audio based on race state
  useEffect(() => {
    const audio = waterAudioRef.current
    if (!audio) return

    if (isRacing) {
      const tryPlay = () => {
        if (audio.buffer && !audio.isPlaying) {
          audio.setVolume(0) // start silent — useFrame controls volume by proximity
          audio.play()
          waterStarted.current = true
        } else if (!audio.buffer) {
          setTimeout(tryPlay, 200)
        }
      }
      tryPlay()
    } else {
      if (audio.isPlaying) audio.stop()
      waterStarted.current = false
    }
    return () => {
      if (audio?.isPlaying) audio.stop()
      waterStarted.current = false
    }
  }, [isRacing])

  useFrame((state, delta) => {
    // Bird rotation
    if (birds.current) {
      birds.current.children.forEach((bird, index) => {
        bird.rotation.y += delta / (index + 1)
      })
    }
    // Cloud rotation
    if (clouds.current) {
      clouds.current.children.forEach((cloud, index) => {
        cloud.rotation.y += delta / 25 / (index + 1)
      })
    }

    // --- Water volume by proximity ---
    const audio = waterAudioRef.current
    if (!audio || !waterStarted.current || !audio.isPlaying) return

    // Get camera (listener) position
    _camPos.copy(state.camera.position)

    // Find closest water zone
    let minDist = Infinity
    for (const zone of WATER_ZONES) {
      const dx = _camPos.x - zone[0]
      const dz = _camPos.z - zone[2]
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < minDist) minDist = dist
    }

    // Map distance → volume: silent beyond WATER_AUDIBLE_RANGE, full at WATER_FULL_VOLUME_RANGE
    if (minDist > WATER_AUDIBLE_RANGE) {
      audio.setVolume(0)
    } else if (minDist < WATER_FULL_VOLUME_RANGE) {
      audio.setVolume(0.45)
    } else {
      const t = 1 - (minDist - WATER_FULL_VOLUME_RANGE) / (WATER_AUDIBLE_RANGE - WATER_FULL_VOLUME_RANGE)
      audio.setVolume(t * 0.45)
    }
  })

  return (
    <group dispose={null}>
      {/* Track collision geometry - inside Physics via RigidBody */}
      <RigidBody
        type="fixed"
        colliders={false}
        collisionGroups={interactionGroups(COLLISION_GROUP_ENVIRONMENT, [COLLISION_GROUP_CHASSIS])}
        friction={0.8}
        restitution={0.1}
      >
        <MeshCollider type="trimesh">
          <mesh geometry={n.track_1.geometry} material={n.track_1.material} {...config} />
        </MeshCollider>
        <MeshCollider type="trimesh">
          <mesh geometry={n.terrain.geometry} material={n.terrain.material} {...config} />
        </MeshCollider>
      </RigidBody>

      {/* Non-colliding visuals */}
      {/* Keep the canyon walls visual-only so the tunnel opening stays driveable. */}
      <mesh geometry={n.mountains.geometry} material={n.mountains.material} {...config} />
      {/* Keep the decorative strip visual-only so its thin edge detail cannot snag the chassis. */}
      <mesh geometry={n.track_2.geometry} material={m['Material.001']} {...config} />
      <mesh geometry={n.tube.geometry} material={m['default']} {...config} />

      <group ref={level}>
        <mesh geometry={n.strip.geometry} material={n.strip.material} visible={false} />
        <mesh geometry={n.track_1.geometry} material={n.track_1.material} visible={false} />
        <mesh geometry={n.mountains.geometry} material={n.mountains.material} visible={false} />
        <mesh geometry={n.terrain.geometry} material={n.terrain.material} visible={false} />
      </group>

      {/* Water */}
      <mesh geometry={n.water.geometry}>
        <MeshDistortMaterial speed={4} map={m.ColorPaletteWater.map} roughness={0} side={DoubleSide} />
        {/* Audio starts silent — volume controlled by proximity in useFrame */}
        <PositionalAudio ref={waterAudioRef} url="/sounds/water.mp3" loop distance={1} />
      </mesh>

      {/* Birds */}
      <group ref={birds}>
        <mesh geometry={n.bird001.geometry} material={n.bird001.material} {...config} />
        <mesh geometry={n.bird002.geometry} material={n.bird002.material} {...config} />
        <mesh geometry={n.bird003.geometry} material={n.bird003.material} {...config} />
        <mesh geometry={n.bird.geometry} material={n.bird.material} {...config} />
      </group>

      {/* Blades */}
      {[n.blade001, n.blade002, n.blade003, n.blade004, n.blade005, n.blade006, n.blade].map((blade, i) => (
        <mesh key={i} geometry={blade.geometry} material={blade.material} {...config} />
      ))}

      {/* Clouds */}
      <group ref={clouds}>
        <mesh geometry={n.cloud001.geometry} material={n.cloud001.material} position={[-8.55, 27.94, -7.84]} rotation={[0, 0.26, 0]} />
        <mesh geometry={n.cloud003.geometry} material={n.cloud003.material} position={[-8.55, 7.47, -7.84]} />
        <mesh geometry={n.cloud006.geometry} material={n.cloud006.material} position={[-43, 11.66, 8.15]} />
        <mesh geometry={n.cloud008.geometry} material={n.cloud008.material} position={[16.29, 8.22, -7.84]} />
        <mesh geometry={n.cloud010.geometry} material={n.cloud010.material} position={[6.63, 7.79, -7.84]} />
        <mesh geometry={n.cloud011.geometry} material={n.cloud011.material} position={[-8.55, -8.74, -7.84]} />
        <mesh geometry={n.cloud002.geometry} material={n.cloud002.material} position={[49.41, 27.94, -17.5]} rotation={[-Math.PI, 0.92, -Math.PI]} />
        <mesh geometry={n.cloud004.geometry} material={n.cloud004.material} position={[10.77, 11.73, 17]} rotation={[-Math.PI, 1.19, -Math.PI]} />
        <mesh geometry={n.cloud012.geometry} material={n.cloud012.material} position={[11.47, -16.12, -66.08]} rotation={[-Math.PI, 0.92, -Math.PI]} />
        <mesh geometry={n.cloud007.geometry} material={n.cloud007.material} position={[-8.55, 22.81, -7.84]} rotation={[Math.PI, -1.43, Math.PI]} />
        <mesh geometry={n.cloud009.geometry} material={n.cloud009.material} position={[-32.93, 17.92, -7.84]} rotation={[Math.PI, -0.79, Math.PI]} />
        <mesh geometry={n.cloud.geometry} material={n.cloud.material} position={[-66.73, -4.76, -17.35]} rotation={[Math.PI, -0.79, Math.PI]} />
        <mesh geometry={n.cloud005.geometry} material={n.cloud005.material} position={[25.95, 27.94, -23.02]} rotation={[-Math.PI, 0.31, -Math.PI]} />
      </group>
    </group>
  )
}
