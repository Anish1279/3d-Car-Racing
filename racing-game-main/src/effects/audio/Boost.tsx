import { useEffect, useRef } from 'react'
import { PositionalAudio } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { PositionalAudio as PositionalAudioImpl } from 'three'
import { mutation, useStore } from '../../store'
import { VEHICLE_CONFIG } from '../../physics/constants'

const maxSpeed = VEHICLE_CONFIG.maxSpeed * 2.237

export const BoostAudio = () => {
  const ref = useRef<PositionalAudioImpl>(null)
  const boost = useStore((s) => s.controls.boost)
  const sound = useStore((s) => s.sound)

  useFrame(() => {
    if (!ref.current) return
    const rate = Math.pow(mutation.speed / maxSpeed, 1.5) + 0.5
    ref.current.setVolume(rate * 1.5)
    ref.current.setPlaybackRate(rate)
    if (!mutation.boost && ref.current.isPlaying) ref.current.stop()
  })

  useEffect(() => {
    if (ref.current && sound) {
      const isBoosting = boost && mutation.boost > 0
      if (isBoosting && !ref.current.isPlaying) ref.current.play()
      if (!isBoosting && ref.current.isPlaying) ref.current.stop()
    }
    return () => { if (ref.current?.isPlaying) ref.current.stop() }
  }, [boost, sound])

  return <PositionalAudio ref={ref} url="/sounds/boost.mp3" distance={5} />
}
