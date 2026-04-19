import { useEffect } from 'react'
import { actionInputMap, isControl, useStore } from '@/game/state/store'
import type { BindableAction } from '@/game/state/store'

export function Keyboard() {
  const actions = useStore((s) => s.actions)

  useEffect(() => {
    // Build reverse lookup: key → action
    const keyMap: Record<string, BindableAction> = {}
    for (const [action, keys] of Object.entries(actionInputMap)) {
      for (const key of keys) {
        keyMap[key] = action as BindableAction
      }
    }

    const downHandler = ({ key, target }: KeyboardEvent) => {
      if ((target as HTMLElement).nodeName === 'INPUT') return
      const k = key.toLowerCase()
      const action = keyMap[k]
      if (!action) return

      if (isControl(action)) {
        actions.setControl(action, true)
      }
    }

    const upHandler = ({ key, target }: KeyboardEvent) => {
      if ((target as HTMLElement).nodeName === 'INPUT') return
      const k = key.toLowerCase()
      const action = keyMap[k]
      if (!action) return

      if (isControl(action)) {
        actions.setControl(action, false)
      } else {
        // Toggle actions on key up
        switch (action) {
          case 'camera': actions.cycleCamera(); break
          case 'reset': actions.reset(); break
          case 'help': actions.toggleHelp(); break
          case 'map': actions.toggleMap(); break
          case 'sound': actions.toggleSound(); break
          case 'pause': actions.togglePause(); break
        }
      }
    }

    window.addEventListener('keydown', downHandler, { passive: true })
    window.addEventListener('keyup', upHandler, { passive: true })

    return () => {
      window.removeEventListener('keydown', downHandler)
      window.removeEventListener('keyup', upHandler)
    }
  }, [actions])

  return null
}
