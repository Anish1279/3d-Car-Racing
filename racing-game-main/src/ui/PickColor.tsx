import { HexColorPicker } from 'react-colorful'
import { useStore } from '../store'

export function PickColor(): JSX.Element {
  const color = useStore((s) => s.color)
  const pickcolor = useStore((s) => s.pickcolor)
  const set = useStore((s) => s.set)

  if (!pickcolor) return <></>

  return (
    <div className="pickcolor-popup">
      <button className="help-close" onClick={() => set({ pickcolor: false })}>✕</button>
      <h3>CAR COLOR</h3>
      <HexColorPicker color={color} onChange={(c) => set({ color: c })} />
    </div>
  )
}
