import { useEffect, useRef } from 'react'
import { PositionalAudio } from '@react-three/drei'
import type { PositionalAudio as PositionalAudioImpl } from 'three'
import { useStore } from '@/game/state/store'

export const HonkAudio = () => {
  const ref = useRef<PositionalAudioImpl>(null)
  const honk = useStore((s) => s.controls.honk)
  const sound = useStore((s) => s.sound)

  useEffect(() => {
    const audio = ref.current

    if (audio && sound) {
      if (honk && !audio.isPlaying) audio.play()
      if (!honk && audio.isPlaying) audio.stop()
    }

    return () => {
      if (audio?.isPlaying) audio.stop()
    }
  }, [honk, sound])

  return <PositionalAudio ref={ref} url="/sounds/honk.mp3" distance={10} />
}
