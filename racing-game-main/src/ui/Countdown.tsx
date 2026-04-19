import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { COUNTDOWN_DURATION } from '../physics/constants'

export function Countdown(): JSX.Element | null {
  const raceState = useStore((s) => s.raceState)
  const countdownValue = useStore((s) => s.countdownValue)
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

    const tick = () => {
      if (count > 0) {
        setDisplay(String(count))
        set({ countdownValue: count })
        count--
        setTimeout(tick, 1000)
      } else {
        setDisplay('GO!')
        startRace()
        setTimeout(() => setVisible(false), 800)
      }
    }

    // Small delay before countdown starts
    setTimeout(tick, 500)
  }, [raceState])

  if (!visible) return null

  return (
    <div className="countdown-overlay">
      <div className={`countdown-number ${display === 'GO!' ? 'go' : ''}`} key={display}>
        {display}
      </div>
    </div>
  )
}
