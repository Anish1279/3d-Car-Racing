import { useStore, readableTime } from '../store'

export const Finished = (): JSX.Element => {
  const reset = useStore((s) => s.actions.reset)
  const lapTimes = useStore((s) => s.lapTimes)
  const bestLapTime = useStore((s) => s.bestLapTime)
  const playerName = useStore((s) => s.playerName)

  const totalTime = lapTimes.reduce((sum, t) => sum + t, 0)

  return (
    <div className="finished-overlay">
      <div className="finished-card">
        <div className="finished-header">
          <h1>🏁 RACE COMPLETE</h1>
          <p className="finished-player">{playerName}</p>
        </div>

        <div className="finished-stats">
          <div className="stat-row total">
            <span className="stat-label">TOTAL TIME</span>
            <span className="stat-value">{readableTime(totalTime)}s</span>
          </div>
          <div className="stat-row best">
            <span className="stat-label">BEST LAP</span>
            <span className="stat-value">{readableTime(bestLapTime)}s</span>
          </div>
        </div>

        <div className="finished-laps">
          <h3>LAP TIMES</h3>
          {lapTimes.map((time, i) => (
            <div key={i} className={`lap-row ${time === bestLapTime ? 'best-lap' : ''}`}>
              <span>LAP {i + 1}</span>
              <span>{readableTime(time)}s</span>
              {time === bestLapTime && <span className="best-badge">BEST</span>}
            </div>
          ))}
        </div>

        <button className="restart-btn" onClick={reset}>
          🔄 RACE AGAIN
        </button>
      </div>
    </div>
  )
}
