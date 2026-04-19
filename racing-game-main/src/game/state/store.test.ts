import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOTAL_LAPS } from '@/game/config/constants'
import {
  createBaseState,
  getElapsedRaceTime,
  readableTime,
  resetVehicleMutation,
  useStore,
} from '@/game/state/store'

describe('game store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    resetVehicleMutation()
    useStore.setState(createBaseState())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats elapsed race time consistently', () => {
    expect(getElapsedRaceTime({ raceStartTime: 0, penaltyTimeMs: 0 })).toBe(0)
    expect(getElapsedRaceTime({ raceStartTime: 1_000, penaltyTimeMs: 3_000 }, 9_500)).toBe(11_500)
    expect(readableTime(0)).toBe('0.00')
    expect(readableTime(62_340)).toBe('1:02.34')
  })

  it('requires a checkpoint before registering a completed lap', () => {
    const { actions } = useStore.getState()

    actions.startRace()
    vi.advanceTimersByTime(2_000)
    actions.completeLap()

    expect(useStore.getState().currentLap).toBe(1)
    expect(useStore.getState().lapTimes).toEqual([])

    actions.hitCheckpoint()
    vi.advanceTimersByTime(4_000)
    actions.completeLap()

    const state = useStore.getState()
    expect(state.currentLap).toBe(2)
    expect(state.lapTimes).toHaveLength(1)
    expect(state.hasPassedCheckpoint).toBe(false)
  })

  it('transitions to a finished state after the final lap', () => {
    const { actions } = useStore.getState()

    actions.startRace()

    for (let lap = 0; lap < TOTAL_LAPS; lap++) {
      vi.advanceTimersByTime(5_000)
      actions.hitCheckpoint()
      vi.advanceTimersByTime(5_000)
      actions.completeLap()
    }

    const state = useStore.getState()
    expect(state.raceState).toBe('finished')
    expect(state.currentLap).toBe(TOTAL_LAPS)
    expect(state.lapTimes).toHaveLength(TOTAL_LAPS)
    expect(state.finalTimeMs).toBeGreaterThan(0)
    expect(state.finalScore).toBeGreaterThan(0)
  })
})
