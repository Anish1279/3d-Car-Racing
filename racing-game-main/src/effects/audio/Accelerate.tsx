import { useEffect, useRef } from 'react'
import { PositionalAudio } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import type { PositionalAudio as PositionalAudioImpl } from 'three'
import { mutation, useStore } from '../../store'
import { VEHICLE_CONFIG } from '../../physics/constants'

const { lerp } = MathUtils
const maxSpeed = VEHICLE_CONFIG.maxSpeed * 2.237

export const AccelerateAudio = () => {
  const ref = useRef<PositionalAudioImpl>(null)
  const sound = useStore((s) => s.sound)
  const ready = useStore((s) => s.ready)
  const raceState = useStore((s) => s.raceState)

  const shouldPlay = ready && sound && (raceState === 'countdown' || raceState === 'racing')

  useFrame((_, delta) => {
    if (!ref.current || !shouldPlay) return
    // Acceleration sound volume ramps up with speed
    const vol = Math.min((2 * mutation.speed) / maxSpeed, 1.5)
    ref.current.setVolume(vol)
    ref.current.setPlaybackRate(lerp(ref.current.playbackRate, mutation.rpmTarget + 0.5, Math.min(delta * 10, 1)))
  })

  useEffect(() => {
    const audio = ref.current
    if (!audio) return

    if (shouldPlay) {
      const tryPlay = () => {
        if (audio.buffer && !audio.isPlaying) {
          audio.setVolume(0)
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

  // distance=10 → acceleration sound is dominant over environment sounds
  return <PositionalAudio ref={ref} url="/sounds/accelerate.mp3" loop distance={10} />
}
