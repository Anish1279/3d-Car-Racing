import { useStore } from '@/game/state/store'
import { Clock, Countdown, Finished, Help, PickColor, Speed } from '@/game/ui/components'

export function GameHud(): JSX.Element {
  const raceState = useStore((state) => state.raceState)

  return (
    <>
      <Clock />
      <Speed />
      <Help />
      <Countdown />
      {(raceState === 'finished' || raceState === 'gameover') && <Finished />}
      <PickColor />
    </>
  )
}
