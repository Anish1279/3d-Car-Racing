import { useEffect, useRef } from 'react'
import { PositionalAudio } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import type { PositionalAudio as PositionalAudioImpl } from 'three'
import { mutation, useStore } from '../../store'
import { VEHICLE_CONFIG } from '../../physics/constants'

const { lerp } = MathUtils
const maxSpeed = VEHICLE_CONFIG.maxSpeed * 2.237

export const EngineAudio = () => {
  const ref = useRef<PositionalAudioImpl>(null)
  const sound = useStore((s) => s.sound)
  const ready = useStore((s) => s.ready)

  useFrame((_, delta) => {
    if (!ref.current || !sound) return
    const vol = Math.max(1 - mutation.speed / maxSpeed, 0.2)
    ref.current.setVolume(vol)
    ref.current.setPlaybackRate(lerp(ref.current.playbackRate, mutation.rpmTarget + 1, Math.min(delta * 10, 1)))
  })

  useEffect(() => {
    if (ref.current && sound && ready) {
      if (!ref.current.isPlaying) { ref.current.setVolume(0.5); ref.current.play() }
    }
    return () => { if (ref.current?.isPlaying) ref.current.stop() }
  }, [sound, ready])

  return <PositionalAudio ref={ref} url="/sounds/engine.mp3" loop distance={5} />
}
