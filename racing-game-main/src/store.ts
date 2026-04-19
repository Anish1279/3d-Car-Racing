import { createRef } from 'react'
import { create } from 'zustand'
import type { RefObject } from 'react'
import type { Group } from 'three'
import { VEHICLE_CONFIG, SPAWN_POSITION, SPAWN_ROTATION, TOTAL_LAPS } from './physics/constants'

// ─── CAMERA MODES ──────────────────────────────────────────────
export const cameras = ['DEFAULT', 'FIRST_PERSON', 'BIRD_EYE'] as const
export type Camera = (typeof cameras)[number]

// ─── RACE STATE ────────────────────────────────────────────────
export type RaceState = 'menu' | 'countdown' | 'racing' | 'finished' | 'paused'

// ─── CONTROLS ──────────────────────────────────────────────────
export interface Controls {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  brake: boolean
  boost: boolean
  honk: boolean
}

const defaultControls: Controls = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  brake: false,
  boost: false,
  honk: false,
}

// ─── MUTATION (frame-loop mutable state, never in React) ──────
export interface Mutation {
  speed: number
  velocity: [number, number, number]
  boost: number
  sliding: boolean
  rpmTarget: number
  gear: number
  steerAngle: number
  wheelStates: Array<{ compression: number; isGrounded: boolean; spinAngle: number }>
  boostCooldown: number
}

export const mutation: Mutation = {
  speed: 0,
  velocity: [0, 0, 0],
  boost: VEHICLE_CONFIG.maxBoost,
  sliding: false,
  rpmTarget: 0,
  gear: 1,
  steerAngle: 0,
  wheelStates: [
    { compression: 0, isGrounded: false, spinAngle: 0 },
    { compression: 0, isGrounded: false, spinAngle: 0 },
    { compression: 0, isGrounded: false, spinAngle: 0 },
    { compression: 0, isGrounded: false, spinAngle: 0 },
  ],
  boostCooldown: 0,
}

// ─── KEY BINDINGS ──────────────────────────────────────────────
export type BindableAction = keyof Controls | 'camera' | 'reset' | 'help' | 'map' | 'sound' | 'pause'

export const actionInputMap: Record<BindableAction, string[]> = {
  forward: ['arrowup', 'w', 'z'],
  backward: ['arrowdown', 's'],
  left: ['arrowleft', 'a', 'q'],
  right: ['arrowright', 'd', 'e'],
  brake: [' '],
  boost: ['shift'],
  honk: ['h'],
  camera: ['c'],
  reset: ['r'],
  help: ['i'],
  map: ['m'],
  sound: ['u'],
  pause: ['escape'],
}

export const isControl = (v: string): v is keyof Controls =>
  Object.hasOwnProperty.call(defaultControls, v)

// ─── STORE INTERFACE ───────────────────────────────────────────
export interface IState {
  // Player
  playerName: string
  hasEnteredName: boolean

  // Race
  raceState: RaceState
  currentLap: number
  totalLaps: number
  lapTimes: number[]
  raceStartTime: number
  lastLapTime: number
  bestLapTime: number
  checkpointTime: number
  bestCheckpointTime: number
  countdownValue: number
  hasPassedCheckpoint: boolean

  // Vehicle
  controls: Controls
  camera: Camera
  color: string
  chassisBody: RefObject<Group>
  wheels: [RefObject<Group>, RefObject<Group>, RefObject<Group>, RefObject<Group>]
  level: RefObject<Group>

  // UI
  ready: boolean
  help: boolean
  map: boolean
  sound: boolean
  debug: boolean
  editor: boolean
  paused: boolean
  pickcolor: boolean

  // DPR
  dpr: number
  shadows: boolean

  // Actions
  actions: {
    setControl: (control: keyof Controls, value: boolean) => void
    cycleCamera: () => void
    reset: () => void
    startCountdown: () => void
    startRace: () => void
    completeLap: () => void
    hitCheckpoint: () => void
    finishRace: () => void
    setPlayerName: (name: string) => void
    togglePause: () => void
    toggleHelp: () => void
    toggleMap: () => void
    toggleSound: () => void
    toggleDebug: () => void
    toggleEditor: () => void
    togglePickcolor: () => void
  }

  set: (partial: Partial<IState> | ((state: IState) => Partial<IState>)) => void
  get: () => IState
}

export const useStore = create<IState>((set, get) => ({
  // Player
  playerName: '',
  hasEnteredName: false,

  // Race
  raceState: 'menu',
  currentLap: 0,
  totalLaps: TOTAL_LAPS,
  lapTimes: [],
  raceStartTime: 0,
  lastLapTime: 0,
  bestLapTime: 0,
  checkpointTime: 0,
  bestCheckpointTime: 0,
  countdownValue: 3,
  hasPassedCheckpoint: false,

  // Vehicle
  controls: { ...defaultControls },
  camera: 'DEFAULT',
  color: '#f0c050',
  chassisBody: createRef<Group>(),
  wheels: [createRef<Group>(), createRef<Group>(), createRef<Group>(), createRef<Group>()],
  level: createRef<Group>(),

  // UI
  ready: false,
  help: false,
  map: true,
  sound: true,
  debug: false,
  editor: false,
  paused: false,
  pickcolor: false,

  // DPR
  dpr: 1.5,
  shadows: true,

  // Actions
  actions: {
    setControl: (control, value) =>
      set((s) => ({ controls: { ...s.controls, [control]: value } })),

    cycleCamera: () =>
      set((s) => ({
        camera: cameras[(cameras.indexOf(s.camera) + 1) % cameras.length],
      })),

    reset: () => {
      mutation.boost = VEHICLE_CONFIG.maxBoost
      mutation.speed = 0
      mutation.velocity = [0, 0, 0]
      mutation.steerAngle = 0
      mutation.gear = 1
      set({
        raceState: 'menu',
        currentLap: 0,
        lapTimes: [],
        raceStartTime: 0,
        lastLapTime: 0,
        checkpointTime: 0,
        hasPassedCheckpoint: false,
        controls: { ...defaultControls },
        countdownValue: 3,
      })
    },

    startCountdown: () => {
      set({ raceState: 'countdown', countdownValue: 3, currentLap: 0, lapTimes: [] })
    },

    startRace: () => {
      set({
        raceState: 'racing',
        raceStartTime: Date.now(),
        currentLap: 1,
        hasPassedCheckpoint: false,
      })
    },

    completeLap: () => {
      const state = get()
      if (state.raceState !== 'racing' || !state.hasPassedCheckpoint) return

      const now = Date.now()
      const lapTime = state.lastLapTime
        ? now - state.lastLapTime
        : now - state.raceStartTime

      const newLapTimes = [...state.lapTimes, lapTime]
      const newLap = state.currentLap + 1
      const bestLap = state.bestLapTime
        ? Math.min(state.bestLapTime, lapTime)
        : lapTime

      if (newLap > state.totalLaps) {
        set({
          raceState: 'finished',
          lapTimes: newLapTimes,
          bestLapTime: bestLap,
        })
      } else {
        set({
          currentLap: newLap,
          lapTimes: newLapTimes,
          lastLapTime: now,
          bestLapTime: bestLap,
          hasPassedCheckpoint: false,
        })
      }
    },

    hitCheckpoint: () => {
      const state = get()
      if (state.raceState !== 'racing' || state.hasPassedCheckpoint) return

      const checkpointTime = Date.now() - state.raceStartTime
      const bestCp = state.bestCheckpointTime
        ? Math.min(state.bestCheckpointTime, checkpointTime)
        : checkpointTime

      set({
        hasPassedCheckpoint: true,
        checkpointTime,
        bestCheckpointTime: bestCp,
      })
    },

    finishRace: () => {
      const state = get()
      if (state.raceState !== 'racing') return
      set({ raceState: 'finished' })
    },

    setPlayerName: (name: string) => {
      set({ playerName: name, hasEnteredName: true })
    },

    togglePause: () =>
      set((s) => {
        if (s.raceState === 'racing') return { paused: !s.paused }
        if (s.paused) return { paused: false }
        return {}
      }),

    toggleHelp: () => set((s) => ({ help: !s.help })),
    toggleMap: () => set((s) => ({ map: !s.map })),
    toggleSound: () => set((s) => ({ sound: !s.sound })),
    toggleDebug: () => set((s) => ({ debug: !s.debug })),
    toggleEditor: () => set((s) => ({ editor: !s.editor })),
    togglePickcolor: () => set((s) => ({ pickcolor: !s.pickcolor })),
  },

  set,
  get,
}))

// ─── EXPORTS ───────────────────────────────────────────────────
export const getState = useStore.getState
export const setState = useStore.setState

// ─── HELPERS ───────────────────────────────────────────────────
export const readableTime = (ms: number): string => {
  if (ms <= 0) return '0.00'
  const seconds = ms / 1000
  const mins = Math.floor(seconds / 60)
  const secs = (seconds % 60).toFixed(2)
  return mins > 0 ? `${mins}:${secs.padStart(5, '0')}` : secs
}
