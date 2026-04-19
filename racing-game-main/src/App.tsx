import { Canvas } from '@react-three/fiber'
import { Sky, Environment, PerspectiveCamera } from '@react-three/drei'
import { Physics } from '@react-three/rapier'

import { HideMouse, Keyboard } from './controls'
import { BoundingBox, Ramp, Track, Vehicle, Goal, Train, AIVehicle } from './models'
import { useStore } from './store'
import {
  AI_COUNT,
  CHECKPOINT_POSITION,
  CHECKPOINT_ROTATION,
  FINISH_LINE_POSITION,
  FINISH_LINE_ROTATION,
  SPAWN_POSITION,
  SPAWN_ROTATION,
} from './physics/constants'
import { Countdown } from './ui/Countdown'
import { Clock } from './ui/Clock'
import { Speed } from './ui/Speed'
import { Help } from './ui/Help'
import { Intro } from './ui/Intro'
import { Finished } from './ui/Finished'
import { Minimap } from './ui/Minimap'
import { PickColor } from './ui/PickColor'

export function App(): JSX.Element {
  const dpr = useStore((s) => s.dpr)
  const shadows = useStore((s) => s.shadows)
  const raceState = useStore((s) => s.raceState)
  const { hitCheckpoint, completeLap } = useStore((s) => s.actions)
  const map = useStore((s) => s.map)

  return (
    <Intro>
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

        <Physics gravity={[0, -9.81, 0]} debug={false}>
          <Vehicle
            position={[...SPAWN_POSITION]}
            rotation={[...SPAWN_ROTATION]}
          />
          <Train />
          <Ramp args={[30, 6, 8]} position={[2, -1, 168.55]} rotation={[0, 0.49, Math.PI / 15]} />

          {/* Race triggers */}
          <Goal onEnter={completeLap} rotation={[...FINISH_LINE_ROTATION]} position={[...FINISH_LINE_POSITION]} />
          <Goal onEnter={hitCheckpoint} rotation={[...CHECKPOINT_ROTATION]} position={[...CHECKPOINT_POSITION]} />

          <BoundingBox depth={512} height={100} position={[0, 40, 0]} width={512} />

          {/* AI Opponents */}
          {Array.from({ length: AI_COUNT }, (_, i) => (
            <AIVehicle key={i} index={i} startOffset={i * 8} />
          ))}

          {/* Track with collision */}
          <Track />
        </Physics>

        <Environment files="textures/dikhololo_night_1k.hdr" />
        {map && <Minimap />}
      </Canvas>

      {/* HUD Overlays */}
      <Clock />
      <Speed />
      <Help />
      <Countdown />
      {(raceState === 'finished' || raceState === 'gameover') && <Finished />}
      <PickColor />
      <HideMouse />
      <Keyboard />
    </Intro>
  )
}
