import { useEffect, useState } from 'react'
import { COUNTDOWN_DURATION } from '@/game/config/constants'
import { useStore } from '@/game/state/store'

export function Countdown(): JSX.Element | null {
  const raceState = useStore((s) => s.raceState)
  const set = useStore((s) => s.set)
  const startRace = useStore((s) => s.actions.startRace)
  const [display, setDisplay] = useState<string>('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (raceState !== 'countdown') {
      setVisible(false)
      return
    }

    setVisible(true)
    let count = COUNTDOWN_DURATION
    const timers: number[] = []

    const tick = () => {
      if (count > 0) {
        setDisplay(String(count))
        set({ countdownValue: count })
        count--
        timers.push(window.setTimeout(tick, 1000))
      } else {
        setDisplay('GO!')
        startRace()
        timers.push(window.setTimeout(() => setVisible(false), 800))
      }
    }

    // Small delay before countdown starts
    timers.push(window.setTimeout(tick, 500))

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [raceState, set, startRace])

  if (!visible) return null

  return (
    <div className="countdown-overlay">
      <div className={`countdown-number ${display === 'GO!' ? 'go' : ''}`} key={display}>
        {display}
      </div>
    </div>
  )
}
