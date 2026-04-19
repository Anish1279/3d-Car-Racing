import { useRef } from 'react'
import { Vector3, Quaternion, MathUtils } from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import type { RapierRigidBody } from '@react-three/rapier'
import { mutation, useStore } from '../store'
import { VEHICLE_CONFIG, VEHICLE_LOCAL_FORWARD } from '../physics/constants'

const { lerp } = MathUtils

// Pre-allocated
const _desiredPos = new Vector3()
const _lookTarget = new Vector3()
const _chassisPos = new Vector3()
const _chassisFwd = new Vector3()
const _horizontalFwd = new Vector3()
const _quat = new Quaternion()
const _worldUp = new Vector3(0, 1, 0)

// Camera config
const CAM_CONFIG = {
  DEFAULT: {
    distance: 7,
    height: 3,
    lookAheadDistance: 8,
    lookAheadHeight: 1.2,
    positionDamping: 4,
    lookDamping: 8,
    speedDistanceAdd: 4, // extra distance at max speed
    speedHeightAdd: 0.8,
    fovMin: 60,
    fovMax: 80,
    tiltAmount: 0.02,
    swayAmount: 0.001,
    swaySpeed: 2,
  },
  FIRST_PERSON: {
    offsetLocal: [0.3, 0.55, 0.1],
    lookDistance: 10,
    fov: 85,
  },
  BIRD_EYE: {
    height: 80,
    fov: 35,
  },
}

interface CamerasProps {
  chassisRef: React.RefObject<RapierRigidBody>
}

export function Cameras({ chassisRef }: CamerasProps) {
  const camera = useThree((s) => s.camera)
  const cameraMode = useStore((s) => s.camera)
  const editor = useStore((s) => s.editor)
  const chassisBody = useStore((s) => s.chassisBody)
  const respawnNonce = useStore((s) => s.respawnNonce)

  const smoothPosition = useRef(new Vector3(0, 5, 15))
  const smoothLookAt = useRef(new Vector3())
  const smoothFov = useRef(65)
  const appliedRespawnNonce = useRef(-1)

  useFrame((state, delta) => {
    if (editor || !chassisRef.current) return

    const rb = chassisRef.current
    const dt = Math.min(delta, 1 / 30)
    const speed = mutation.speed
    const maxSpeed = VEHICLE_CONFIG.maxSpeed * 2.237

    // Get chassis transform (preferably visual, interpolated transform)
    if (chassisBody.current) {
      chassisBody.current.getWorldPosition(_chassisPos)
      chassisBody.current.getWorldQuaternion(_quat)
    } else {
      const pos = rb.translation()
      const rot = rb.rotation()
      _chassisPos.set(pos.x, pos.y, pos.z)
      _quat.set(rot.x, rot.y, rot.z, rot.w)
    }

    _chassisFwd.set(...VEHICLE_LOCAL_FORWARD).applyQuaternion(_quat)
    _horizontalFwd.copy(_chassisFwd).setY(0)
    if (_horizontalFwd.lengthSq() < 1e-4) {
      _horizontalFwd.set(...VEHICLE_LOCAL_FORWARD)
    } else {
      _horizontalFwd.normalize()
    }

    const speedRatio = Math.min(speed / maxSpeed, 1)

    if (appliedRespawnNonce.current !== respawnNonce) {
      appliedRespawnNonce.current = respawnNonce
      smoothPosition.current.copy(_chassisPos)
      smoothLookAt.current.copy(_chassisPos)
    }

    if (cameraMode === 'DEFAULT') {
      const cfg = CAM_CONFIG.DEFAULT

      // Dynamic distance and height based on speed
      const dynDistance = cfg.distance + speedRatio * cfg.speedDistanceAdd
      const dynHeight = cfg.height + speedRatio * cfg.speedHeightAdd

      _desiredPos.copy(_horizontalFwd).multiplyScalar(-dynDistance).add(_chassisPos)
      _desiredPos.y += dynHeight

      const posDamp = 1 - Math.exp(-cfg.positionDamping * dt)
      smoothPosition.current.lerp(_desiredPos, posDamp)

      _lookTarget.copy(_horizontalFwd).multiplyScalar(cfg.lookAheadDistance).add(_chassisPos)
      _lookTarget.y += cfg.lookAheadHeight

      const lookDamp = 1 - Math.exp(-cfg.lookDamping * dt)
      smoothLookAt.current.lerp(_lookTarget, lookDamp)

      camera.position.copy(smoothPosition.current)
      camera.up.copy(_worldUp)
      camera.lookAt(smoothLookAt.current)

      const targetFov = cfg.fovMin + speedRatio * (cfg.fovMax - cfg.fovMin)
      smoothFov.current = lerp(smoothFov.current, targetFov, 1 - Math.exp(-3 * dt))
      if ('fov' in camera) {
        ;(camera as any).fov = smoothFov.current
        ;(camera as any).updateProjectionMatrix()
      }

      const steerTilt = -mutation.steerAngle * speedRatio * cfg.tiltAmount * 15
      const sway = Math.sin(state.clock.elapsedTime * cfg.swaySpeed * 3) * speedRatio * cfg.swayAmount
      camera.rotateZ(steerTilt + sway)

    } else if (cameraMode === 'FIRST_PERSON') {
      const cfg = CAM_CONFIG.FIRST_PERSON
      const [ox, oy, oz] = cfg.offsetLocal

      // Position inside cockpit
      _desiredPos.set(ox, oy, oz).applyQuaternion(_quat).add(_chassisPos)
      const posDamp = 1 - Math.exp(-15 * dt)
      smoothPosition.current.lerp(_desiredPos, posDamp)

      // Look forward
      _lookTarget.copy(_chassisFwd).multiplyScalar(cfg.lookDistance).add(_chassisPos)
      _lookTarget.y += 0.5
      smoothLookAt.current.lerp(_lookTarget, 1 - Math.exp(-12 * dt))

      camera.position.copy(smoothPosition.current)
      camera.up.copy(_worldUp)
      camera.lookAt(smoothLookAt.current)

      if ('fov' in camera) {
        ;(camera as any).fov = lerp((camera as any).fov, cfg.fov, 1 - Math.exp(-3 * dt))
        ;(camera as any).updateProjectionMatrix()
      }

    } else if (cameraMode === 'BIRD_EYE') {
      const cfg = CAM_CONFIG.BIRD_EYE

      _desiredPos.set(_chassisPos.x, _chassisPos.y + cfg.height, _chassisPos.z)
      smoothPosition.current.lerp(_desiredPos, 1 - Math.exp(-3 * dt))

      camera.position.copy(smoothPosition.current)
      camera.up.copy(_worldUp)
      camera.lookAt(_chassisPos)

      if ('fov' in camera) {
        ;(camera as any).fov = lerp((camera as any).fov, cfg.fov, 1 - Math.exp(-3 * dt))
        ;(camera as any).updateProjectionMatrix()
      }
    }
  })

  return null
}
