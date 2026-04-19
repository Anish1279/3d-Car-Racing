import { useEffect, useRef } from 'react'
import { PositionalAudio } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { PositionalAudio as PositionalAudioImpl } from 'three'
import { mutation, useStore } from '@/game/state/store'

export const BrakeAudio = () => {
  const ref = useRef<PositionalAudioImpl>(null)
  const brake = useStore((s) => s.controls.brake)
  const sound = useStore((s) => s.sound)

  useFrame(() => {
    if (mutation.speed <= 10 && ref.current?.isPlaying) ref.current.stop()
  })

  useEffect(() => {
    const audio = ref.current

    if (audio && sound) {
      const isBraking = brake && mutation.speed > 10
      if (isBraking && !audio.isPlaying) audio.play()
      if (!isBraking && audio.isPlaying) audio.stop()
    }

    return () => {
      if (audio?.isPlaying) audio.stop()
    }
  }, [brake, sound])

  return <PositionalAudio ref={ref} url="/sounds/tire-brake.mp3" distance={10} />
}
