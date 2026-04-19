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
  const raceState = useStore((s) => s.raceState)

  const shouldPlay = ready && sound && (raceState === 'countdown' || raceState === 'racing')

  useFrame((_, delta) => {
    if (!ref.current || !shouldPlay) return
    // Engine is always audible — volume based on speed
    const vol = Math.max(1 - mutation.speed / maxSpeed, 0.3)
    ref.current.setVolume(vol)
    ref.current.setPlaybackRate(lerp(ref.current.playbackRate, mutation.rpmTarget + 1, Math.min(delta * 10, 1)))
  })

  useEffect(() => {
    const audio = ref.current
    if (!audio) return

    if (shouldPlay) {
      // Retry until audio buffer is loaded, then play
      const tryPlay = () => {
        if (audio.buffer && !audio.isPlaying) {
          audio.setVolume(0.6)
          audio.play()
        } else if (!audio.buffer) {
          setTimeout(tryPlay, 100)
        }
      }
      tryPlay()
    } else {
      if (audio.isPlaying) audio.stop()
    }
    return () => { if (audio?.isPlaying) audio.stop() }
  }, [shouldPlay])

  // distance=10 → engine is the dominant sound (audible from much further than train/water)
  return <PositionalAudio ref={ref} url="/sounds/engine.mp3" loop distance={10} />
}
