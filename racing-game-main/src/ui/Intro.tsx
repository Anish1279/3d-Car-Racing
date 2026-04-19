import { Suspense, useEffect, useState, useCallback } from 'react'
import { useProgress } from '@react-three/drei'
import type { ReactNode } from 'react'
import { useStore } from '../store'

export function Intro({ children }: { children: ReactNode }): JSX.Element {
  const [clicked, setClicked] = useState(false)
  const [loading, setLoading] = useState(true)
  const { progress } = useProgress()
  const set = useStore((s) => s.set)
  const hasEnteredName = useStore((s) => s.hasEnteredName)
  const setPlayerName = useStore((s) => s.actions.setPlayerName)
  const [nameInput, setNameInput] = useState('')

  useEffect(() => {
    if (clicked && !loading && hasEnteredName) set({ ready: true })
  }, [clicked, loading, hasEnteredName])

  useEffect(() => {
    if (progress === 100) setLoading(false)
  }, [progress])

  const handleStart = useCallback(() => {
    if (loading) return
    if (!hasEnteredName && nameInput.trim()) {
      setPlayerName(nameInput.trim())
    }
    if (hasEnteredName || nameInput.trim()) {
      setClicked(true)
    }
  }, [loading, hasEnteredName, nameInput])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleStart()
  }, [handleStart])

  return (
    <>
      <Suspense fallback={null}>{children}</Suspense>
      <div className={`intro-screen ${loading ? 'loading' : 'loaded'} ${clicked && hasEnteredName ? 'clicked' : ''}`}>
        <div className="intro-content">
          <div className="intro-logo">
            <h1 className="intro-title">DESERT<span>CIRCUIT</span></h1>
            <p className="intro-subtitle">3D Racing Experience</p>
          </div>

          {!hasEnteredName ? (
            <div className="intro-name-input">
              <label>DRIVER NAME</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your name..."
                maxLength={20}
                autoFocus
              />
            </div>
          ) : null}

          <button
            className={`intro-start-btn ${loading ? 'disabled' : ''}`}
            onClick={handleStart}
            disabled={loading || (!hasEnteredName && !nameInput.trim())}
          >
            {loading
              ? `LOADING ${progress.toFixed(0)}%`
              : `START RACE`}
          </button>

          <div className="intro-controls-hint">
            <div className="hint-row"><span className="hint-key">W/↑</span> Accelerate</div>
            <div className="hint-row"><span className="hint-key">S/↓</span> Reverse</div>
            <div className="hint-row"><span className="hint-key">A/D</span> Steer</div>
            <div className="hint-row"><span className="hint-key">SPACE</span> Drift/Brake</div>
            <div className="hint-row"><span className="hint-key">SHIFT</span> Boost</div>
            <div className="hint-row"><span className="hint-key">R</span> Reset</div>
          </div>
        </div>
      </div>
    </>
  )
}
