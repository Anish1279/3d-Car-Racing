import { useStore } from '../store'

export function Help(): JSX.Element {
  const set = useStore((s) => s.set)
  const help = useStore((s) => s.help)
  const sound = useStore((s) => s.sound)

  return (
    <>
      {!sound && <div className="nosound-icon"></div>}
      <div className="hud-help">
        {!help && (
          <button className="help-toggle" onClick={() => set({ help: true })}>
            ?
          </button>
        )}
        {help && (
          <div className="help-popup">
            <button className="help-close" onClick={() => set({ help: false })}>✕</button>
            <h3>CONTROLS</h3>
            <div className="help-grid">
              <div><span className="hk">W / ↑</span> Accelerate</div>
              <div><span className="hk">S / ↓</span> Reverse</div>
              <div><span className="hk">A / ←</span> Steer Left</div>
              <div><span className="hk">D / →</span> Steer Right</div>
              <div><span className="hk">SPACE</span> Drift / Brake</div>
              <div><span className="hk">SHIFT</span> Boost</div>
              <div><span className="hk">C</span> Camera</div>
              <div><span className="hk">R</span> Reset</div>
              <div><span className="hk">M</span> Minimap</div>
              <div><span className="hk">U</span> Sound</div>
              <div><span className="hk">H</span> Honk</div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
