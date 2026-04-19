import { createRef } from 'react'
import { create } from 'zustand'
import type { RefObject } from 'react'
import type { Group } from 'three'
import {
  COUNTDOWN_DURATION,
  SPAWN_POSITION,
  SPAWN_ROTATION,
  TOTAL_LAPS,
  VEHICLE_CONFIG,
} from '@/game/config/constants'

// ─── CAMERA MODES ──────────────────────────────────────────────
export const cameras = ['DEFAULT', 'FIRST_PERSON', 'BIRD_EYE'] as const
export type Camera = (typeof cameras)[number]

// ─── RACE STATE ────────────────────────────────────────────────
export type RaceState = 'menu' | 'countdown' | 'racing' | 'finished' | 'gameover'

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

export const defaultControls: Controls = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  brake: false,
  boost: false,
  honk: false,
}

const cloneTuple = (tuple: readonly [number, number, number]): [number, number, number] => [
  tuple[0],
  tuple[1],
  tuple[2],
]

const createWheelMutationState = () => ([
  { compression: 0, isGrounded: false, spinAngle: 0 },
  { compression: 0, isGrounded: false, spinAngle: 0 },
  { compression: 0, isGrounded: false, spinAngle: 0 },
  { compression: 0, isGrounded: false, spinAngle: 0 },
])

export const resetVehicleMutation = () => {
  mutation.boost = VEHICLE_CONFIG.maxBoost
  mutation.speed = 0
  mutation.velocity = [0, 0, 0]
  mutation.steerAngle = 0
  mutation.gear = 1
  mutation.rpmTarget = 0
  mutation.sliding = false
  mutation.boostCooldown = 0
  mutation.wheelStates.forEach((wheelState) => {
    wheelState.compression = 0
    wheelState.isGrounded = false
    wheelState.spinAngle = 0
  })
}

const getSpawnState = () => ({
  respawnPosition: cloneTuple(SPAWN_POSITION),
  respawnRotation: cloneTuple(SPAWN_ROTATION),
})

const createVehicleRefs = () => ({
  chassisBody: createRef<Group>(),
  wheels: [createRef<Group>(), createRef<Group>(), createRef<Group>(), createRef<Group>()] as [
    RefObject<Group>,
    RefObject<Group>,
    RefObject<Group>,
    RefObject<Group>,
  ],
  level: createRef<Group>(),
})

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
  wheelStates: createWheelMutationState(),
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
  penaltyTimeMs: number
  pauseStartedAt: number
  recoveryCount: number
  finishReason: string
  finalTimeMs: number
  finalScore: number

  // Respawn
  respawnNonce: number
  respawnPosition: [number, number, number]
  respawnRotation: [number, number, number]

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
    gameOver: (reason?: string) => void
    returnToMenu: () => void
    queueRespawn: (
      position: [number, number, number],
      rotation: [number, number, number],
      penaltyMs?: number
    ) => void
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

export const canResetRace = (state: Pick<IState, 'ready' | 'raceState'>): boolean =>
  state.ready && state.raceState !== 'menu'

export const getElapsedRaceTime = (
  state: Pick<IState, 'raceStartTime' | 'penaltyTimeMs' | 'paused' | 'pauseStartedAt'>,
  now = Date.now(),
): number => {
  if (!state.raceStartTime) return 0
  const effectiveNow = state.paused && state.pauseStartedAt ? state.pauseStartedAt : now
  return Math.max(0, effectiveNow - state.raceStartTime + state.penaltyTimeMs)
}

export const computeFinalScore = (state: Pick<IState, 'lapTimes' | 'hasPassedCheckpoint' | 'recoveryCount'>, finalTimeMs: number, didFinish: boolean) => {
  // Base score — everyone gets something for participating
  const baseScore = 1000
  // Survival time bonus — reward for staying alive
  const survivalBonus = Math.floor(finalTimeMs / 1000) * 25
  // Lap completion bonuses
  const lapScore = state.lapTimes.length * 1500
  // Checkpoint bonus
  const checkpointBonus = state.hasPassedCheckpoint ? 600 : 0
  // Finish bonus
  const finishBonus = didFinish ? 3000 : 0
  // Penalties
  const recoveryPenalty = state.recoveryCount * 350
  const crashPenalty = didFinish ? 0 : 500

  return Math.max(100, baseScore + survivalBonus + lapScore + checkpointBonus + finishBonus - recoveryPenalty - crashPenalty)
}

export const createBaseState = (): Omit<IState, 'actions' | 'set' | 'get'> => ({
  playerName: '',
  hasEnteredName: false,
  raceState: 'menu',
  currentLap: 0,
  totalLaps: TOTAL_LAPS,
  lapTimes: [],
  raceStartTime: 0,
  lastLapTime: 0,
  bestLapTime: 0,
  checkpointTime: 0,
  bestCheckpointTime: 0,
  countdownValue: COUNTDOWN_DURATION,
  hasPassedCheckpoint: false,
  penaltyTimeMs: 0,
  pauseStartedAt: 0,
  recoveryCount: 0,
  finishReason: '',
  finalTimeMs: 0,
  finalScore: 0,
  respawnNonce: 0,
  ...getSpawnState(),
  controls: { ...defaultControls },
  camera: 'DEFAULT',
  color: '#f0c050',
  ...createVehicleRefs(),
  ready: false,
  help: false,
  map: true,
  sound: true,
  debug: false,
  editor: false,
  paused: false,
  pickcolor: false,
  dpr: 1.5,
  shadows: true,
})

export const useStore = create<IState>((set, get) => ({
  ...createBaseState(),

  // Actions
  actions: {
    setControl: (control, value) =>
      set((s) => {
        if (s.raceState === 'finished' || s.raceState === 'gameover' || s.raceState === 'menu') return {}
        return { controls: { ...s.controls, [control]: value } }
      }),

    cycleCamera: () =>
      set((s) => ({
        camera: cameras[(cameras.indexOf(s.camera) + 1) % cameras.length],
      })),

    reset: () => {
      const state = get()
      if (!canResetRace(state)) return
      get().actions.startCountdown()
    },

    startCountdown: () => {
      resetVehicleMutation()
      set((s) => ({
        raceState: 'countdown',
        currentLap: 0,
        lapTimes: [],
        raceStartTime: 0,
        lastLapTime: 0,
        bestLapTime: 0,
        checkpointTime: 0,
        bestCheckpointTime: 0,
        countdownValue: COUNTDOWN_DURATION,
        hasPassedCheckpoint: false,
        penaltyTimeMs: 0,
        pauseStartedAt: 0,
        recoveryCount: 0,
        finishReason: '',
        finalTimeMs: 0,
        finalScore: 0,
        controls: { ...defaultControls },
        paused: false,
        respawnNonce: s.respawnNonce + 1,
        ...getSpawnState(),
      }))
    },

    startRace: () => {
      resetVehicleMutation()
      set({
        raceState: 'racing',
        raceStartTime: Date.now(),
        currentLap: 1,
        lastLapTime: 0,
        checkpointTime: 0,
        hasPassedCheckpoint: false,
        pauseStartedAt: 0,
        controls: { ...defaultControls },
        paused: false,
      })
    },

    completeLap: () => {
      const state = get()
      if (state.raceState !== 'racing' || !state.hasPassedCheckpoint) return

      const now = Date.now()
      const elapsed = getElapsedRaceTime(state, now)
      const lapTime = state.lastLapTime ? elapsed - state.lastLapTime : elapsed
      const newLapTimes = [...state.lapTimes, lapTime]
      const newLap = state.currentLap + 1
      const bestLap = state.bestLapTime ? Math.min(state.bestLapTime, lapTime) : lapTime

      if (newLap > state.totalLaps) {
        const finalTimeMs = elapsed
        set({
          raceState: 'finished',
          currentLap: state.totalLaps,
          lapTimes: newLapTimes,
          lastLapTime: elapsed,
          bestLapTime: bestLap,
          hasPassedCheckpoint: false,
          controls: { ...defaultControls },
          paused: false,
          pauseStartedAt: 0,
          finishReason: 'Race complete',
          finalTimeMs,
          finalScore: computeFinalScore(
            { lapTimes: newLapTimes, hasPassedCheckpoint: false, recoveryCount: state.recoveryCount },
            finalTimeMs,
            true,
          ),
        })
      } else {
        set({
          currentLap: newLap,
          lapTimes: newLapTimes,
          lastLapTime: elapsed,
          bestLapTime: bestLap,
          hasPassedCheckpoint: false,
        })
      }
    },

    hitCheckpoint: () => {
      const state = get()
      if (state.raceState !== 'racing' || state.hasPassedCheckpoint) return

      const checkpointTime = getElapsedRaceTime(state)
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
      const finalTimeMs = getElapsedRaceTime(state)
      set({
        raceState: 'finished',
        controls: { ...defaultControls },
        paused: false,
        pauseStartedAt: 0,
        finishReason: 'Race complete',
        finalTimeMs,
        finalScore: computeFinalScore(state, finalTimeMs, true),
      })
    },

    gameOver: (reason = 'Crash detected') => {
      const state = get()
      if (state.raceState !== 'racing' && state.raceState !== 'countdown') return

      const finalTimeMs = getElapsedRaceTime(state)
      set({
        raceState: 'gameover',
        controls: { ...defaultControls },
        paused: false,
        pauseStartedAt: 0,
        finishReason: reason,
        finalTimeMs,
        finalScore: computeFinalScore(state, finalTimeMs, false),
      })
    },

    returnToMenu: () => {
      resetVehicleMutation()
      set({
        raceState: 'menu',
        currentLap: 0,
        lapTimes: [],
        raceStartTime: 0,
        lastLapTime: 0,
        bestLapTime: 0,
        checkpointTime: 0,
        bestCheckpointTime: 0,
        countdownValue: COUNTDOWN_DURATION,
        hasPassedCheckpoint: false,
        penaltyTimeMs: 0,
        pauseStartedAt: 0,
        recoveryCount: 0,
        finishReason: '',
        finalTimeMs: 0,
        finalScore: 0,
        controls: { ...defaultControls },
        paused: false,
        ...getSpawnState(),
      })
    },

    queueRespawn: (position, rotation, penaltyMs = 0) => {
      const state = get()
      if (state.raceState !== 'racing' && state.raceState !== 'countdown') return

      set((s) => ({
        respawnNonce: s.respawnNonce + 1,
        respawnPosition: [position[0], position[1], position[2]],
        respawnRotation: [rotation[0], rotation[1], rotation[2]],
        controls: { ...defaultControls },
        paused: false,
        pauseStartedAt: 0,
        penaltyTimeMs: s.penaltyTimeMs + (s.raceState === 'racing' ? penaltyMs : 0),
        recoveryCount: s.recoveryCount + (s.raceState === 'racing' ? 1 : 0),
      }))
    },

    setPlayerName: (name: string) => {
      set({ playerName: name, hasEnteredName: true })
    },

    togglePause: () =>
      set((s) => {
        if (s.raceState === 'racing' && !s.paused) {
          return {
            paused: true,
            pauseStartedAt: Date.now(),
            controls: { ...defaultControls },
          }
        }

        if (s.raceState === 'racing' && s.paused) {
          const pausedDuration = s.pauseStartedAt ? Date.now() - s.pauseStartedAt : 0

          return {
            paused: false,
            pauseStartedAt: 0,
            raceStartTime: s.raceStartTime ? s.raceStartTime + pausedDuration : s.raceStartTime,
            controls: { ...defaultControls },
          }
        }

        if (s.paused) {
          return {
            paused: false,
            pauseStartedAt: 0,
            controls: { ...defaultControls },
          }
        }

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
