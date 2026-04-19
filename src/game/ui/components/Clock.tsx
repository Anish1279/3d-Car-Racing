import { useEffect, useRef } from 'react'
import { addEffect } from '@react-three/fiber'
import { getElapsedRaceTime, readableTime, useStore } from '@/game/state/store'

export function Clock() {
  const ref = useRef<HTMLSpanElement>(null)
  const lapRef = useRef<HTMLSpanElement>(null)
  const raceState = useStore((s) => s.raceState)
  const currentLap = useStore((s) => s.currentLap)
  const totalLaps = useStore((s) => s.totalLaps)

  useEffect(() => {
    return addEffect(() => {
      if (!ref.current) return
      const state = useStore.getState()
      if (state.raceState === 'racing' && state.raceStartTime) {
        const elapsed = getElapsedRaceTime(state)
        ref.current.innerText = readableTime(elapsed)
      } else if (state.raceState === 'finished' || state.raceState === 'gameover') {
        // Keep final time
        ref.current.innerText = readableTime(state.finalTimeMs)
      } else {
        ref.current.innerText = '0.00'
      }

      if (lapRef.current) {
        lapRef.current.innerText = `LAP ${state.currentLap}/${state.totalLaps}`
      }
    })
  }, [])

  if (raceState === 'menu') return null

  return (
    <div className="hud-clock">
      <span className="clock-time" ref={ref}>0.00</span>
      <span className="clock-lap" ref={lapRef}>LAP {currentLap}/{totalLaps}</span>
    </div>
  )
}
