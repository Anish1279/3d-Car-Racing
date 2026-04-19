import { Environment, PerspectiveCamera, Sky } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { AIVehicle, BoundingBox, Goal, Ramp, Track, Train, Vehicle } from '@/entities'
import {
  AI_COUNT,
  CHECKPOINT_POSITION,
  CHECKPOINT_ROTATION,
  FINISH_LINE_POSITION,
  FINISH_LINE_ROTATION,
  SPAWN_POSITION,
  SPAWN_ROTATION,
} from '@/game/config/constants'
import { useStore } from '@/game/state/store'
import { Minimap } from '@/game/ui/components'

export function RaceScene(): JSX.Element {
  const dpr = useStore((state) => state.dpr)
  const map = useStore((state) => state.map)
  const paused = useStore((state) => state.paused)
  const shadows = useStore((state) => state.shadows)
  const { completeLap, hitCheckpoint } = useStore((state) => state.actions)

  return (
    <Canvas dpr={[1, dpr]} shadows={shadows} camera={{ position: [0, 5, 15], fov: 65 }}>
      <fog attach="fog" args={['#d4a574', 200, 600]} />
      <Sky sunPosition={[100, 10, 100]} distance={1000} />
      <ambientLight intensity={0.15} />
      <directionalLight
        position={[0, 50, 150]}
        intensity={1.2}
        shadow-bias={-0.001}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={150}
        shadow-camera-bottom={-150}
        castShadow
      />
      <PerspectiveCamera makeDefault fov={65} position={[0, 20, 20]} />

      <Physics gravity={[0, -9.81, 0]} debug={false} paused={paused}>
        <Vehicle position={[...SPAWN_POSITION]} rotation={[...SPAWN_ROTATION]} />
        <Train />
        <Ramp args={[30, 6, 8]} position={[2, -1, 168.55]} rotation={[0, 0.49, Math.PI / 15]} />
        <Goal onEnter={completeLap} rotation={[...FINISH_LINE_ROTATION]} position={[...FINISH_LINE_POSITION]} />
        <Goal onEnter={hitCheckpoint} rotation={[...CHECKPOINT_ROTATION]} position={[...CHECKPOINT_POSITION]} />
        <BoundingBox depth={512} height={100} position={[0, 40, 0]} width={512} />

        {Array.from({ length: AI_COUNT }, (_, index) => (
          <AIVehicle key={index} index={index} startOffset={index * 8} />
        ))}

        <Track />
      </Physics>

      <Environment files="textures/dikhololo_night_1k.hdr" />
      {map && <Minimap />}
    </Canvas>
  )
}
