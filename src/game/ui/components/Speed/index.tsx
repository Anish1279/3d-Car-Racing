import { useEffect, useRef } from 'react'
import { addEffect } from '@react-three/fiber'
import { VEHICLE_CONFIG } from '@/game/config/constants'
import { mutation } from '@/game/state/store'

const maxSpeed = VEHICLE_CONFIG.maxSpeed * 2.237

export function Speed(): JSX.Element {
  const speedRef = useRef<HTMLSpanElement>(null)
  const gearRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const boostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return addEffect(() => {
      if (speedRef.current) {
        speedRef.current.innerText = `${Math.round(mutation.speed)}`
      }
      if (gearRef.current) {
        gearRef.current.innerText = `${mutation.gear}`
      }
      if (barRef.current) {
        const pct = Math.min(mutation.speed / maxSpeed, 1) * 100
        barRef.current.style.width = `${pct}%`
        barRef.current.style.backgroundColor = pct > 85 ? '#ff4444' : pct > 60 ? '#ffaa00' : '#00d4ff'
      }
      if (boostRef.current) {
        const boostPct = (mutation.boost / VEHICLE_CONFIG.maxBoost) * 100
        boostRef.current.style.width = `${boostPct}%`
        boostRef.current.style.backgroundColor = boostPct > 60 ? '#00ff88' : boostPct > 30 ? '#ffcc00' : '#ff4444'
      }
    })
  }, [])

  return (
    <div className="hud-speed">
      <div className="speed-display">
        <span className="speed-number" ref={speedRef}>0</span>
        <span className="speed-unit">MPH</span>
      </div>
      <div className="gear-display">
        <span className="gear-label">GEAR</span>
        <span className="gear-number" ref={gearRef}>1</span>
      </div>
      <div className="speed-bar-container">
        <div className="speed-bar" ref={barRef}></div>
      </div>
      <div className="boost-container">
        <span className="boost-label">N₂O</span>
        <div className="boost-bar-bg">
          <div className="boost-bar-fill" ref={boostRef}></div>
        </div>
      </div>
    </div>
  )
}
