import { readableTime, useStore } from '../store'

export const Finished = (): JSX.Element => {
  const reset = useStore((s) => s.actions.reset)
  const returnToMenu = useStore((s) => s.actions.returnToMenu)
  const lapTimes = useStore((s) => s.lapTimes)
  const bestLapTime = useStore((s) => s.bestLapTime)
  const playerName = useStore((s) => s.playerName)
  const raceState = useStore((s) => s.raceState)
  const finishReason = useStore((s) => s.finishReason)
  const finalTimeMs = useStore((s) => s.finalTimeMs)
  const finalScore = useStore((s) => s.finalScore)

  const isGameOver = raceState === 'gameover'
  const heading = isGameOver ? 'GAME OVER' : 'RACE COMPLETE'
  const totalTime = finalTimeMs || lapTimes.reduce((sum, t) => sum + t, 0)

  return (
    <div className="finished-overlay">
      <div className="finished-card">
        <div className="finished-header">
          <h1>{heading}</h1>
          <p className="finished-player">{playerName}</p>
          <p className="finished-reason">{finishReason}</p>
        </div>

        <div className="finished-stats">
          <div className="stat-row total">
            <span className="stat-label">FINAL TIME</span>
            <span className="stat-value">{readableTime(totalTime)}s</span>
          </div>
          <div className="stat-row score">
            <span className="stat-label">FINAL SCORE</span>
            <span className="stat-value">{finalScore}</span>
          </div>
          <div className="stat-row best">
            <span className="stat-label">BEST LAP</span>
            <span className="stat-value">{readableTime(bestLapTime)}s</span>
          </div>
        </div>

        <div className="finished-laps">
          <h3>COMPLETED LAPS</h3>
          {lapTimes.length > 0 ? (
            lapTimes.map((time, i) => (
              <div key={i} className={`lap-row ${time === bestLapTime ? 'best-lap' : ''}`}>
                <span>LAP {i + 1}</span>
                <span>{readableTime(time)}s</span>
                {time === bestLapTime && <span className="best-badge">BEST</span>}
              </div>
            ))
          ) : (
            <div className="lap-row">
              <span>NO COMPLETED LAPS</span>
              <span>--</span>
            </div>
          )}
        </div>

        <div className="finished-actions">
          <button className="restart-btn" onClick={reset}>
            RETRY
          </button>
          <button className="menu-btn" onClick={returnToMenu}>
            BACK TO MAIN MENU
          </button>
        </div>
      </div>
    </div>
  )
}
