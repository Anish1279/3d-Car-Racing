import { HideMouse, Keyboard } from '@/features/controls'
import { RaceScene } from '@/game/scene/RaceScene'
import { GameHud } from '@/game/ui/GameHud'
import { Intro } from '@/game/ui/components'

export function App(): JSX.Element {
  return (
    <Intro>
      <RaceScene />
      <GameHud />
      <HideMouse />
      <Keyboard />
    </Intro>
  )
}
