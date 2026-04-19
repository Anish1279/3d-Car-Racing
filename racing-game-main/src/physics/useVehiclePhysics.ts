import { useRef, useCallback } from 'react'
import { Vector3, Quaternion, MathUtils } from 'three'
import { interactionGroups, useRapier, useBeforePhysicsStep } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { mutation, getState } from '../store'
import { COLLISION_GROUP_CHASSIS, COLLISION_GROUP_ENVIRONMENT, VEHICLE_CONFIG } from './constants'

const { lerp, clamp } = MathUtils
const RAYCAST_FILTER_GROUPS = interactionGroups(COLLISION_GROUP_CHASSIS, [COLLISION_GROUP_ENVIRONMENT])

// Pre-allocated vectors
const _chassisPos = new Vector3()
const _chassisUp = new Vector3()
const _chassisFwd = new Vector3()
const _chassisRight = new Vector3()
const _wheelWorldPos = new Vector3()
const _velAtWheel = new Vector3()
const _angVelVec = new Vector3()
const _relPos = new Vector3()
const _crossResult = new Vector3()
const _groundFwd = new Vector3()
const _groundRight = new Vector3()
const _tempV = new Vector3()
const _chassisQuat = new Quaternion()
const _steerQuat = new Quaternion()
const _normal = new Vector3()
const _suspForce = new Vector3()
const _driveForce = new Vector3()
const _latForce = new Vector3()
const _brakeForce = new Vector3()
const _totalForce = new Vector3()

function getInputFromControls() {
  const { controls } = getState()
  const raceState = getState().raceState
  const blocked = raceState === 'countdown'

  return {
    throttle: (!blocked && controls.forward) ? 1 : 0,
    reverse: (!blocked && controls.backward) ? 1 : 0,
    steerInput: blocked ? 0 : (controls.left ? 1 : 0) - (controls.right ? 1 : 0),
    brake: (!blocked && controls.brake) ? 1 : 0,
    handbrake: !blocked && controls.brake,
    boost: !blocked && controls.boost,
  }
}

export function useVehiclePhysics(chassisRef: React.RefObject<RapierRigidBody>) {
  const { world, rapier } = useRapier()
  const currentSteer = useRef(0)
  const lastBoostTime = useRef(0)
  const smoothSpeed = useRef(0)

  const updateVehicle = useCallback((delta: number) => {
    const rb = chassisRef.current
    if (!rb) return

    const cfg = VEHICLE_CONFIG
    const input = getInputFromControls()
    const dt = Math.min(delta, 1 / 30)

    // ── Get chassis world state ──
    const pos = rb.translation()
    const rot = rb.rotation()
    _chassisPos.set(pos.x, pos.y, pos.z)
    _chassisQuat.set(rot.x, rot.y, rot.z, rot.w)

    _chassisFwd.set(0, 0, -1).applyQuaternion(_chassisQuat)
    _chassisRight.set(1, 0, 0).applyQuaternion(_chassisQuat)
    _chassisUp.set(0, 1, 0).applyQuaternion(_chassisQuat)

    const linVel = rb.linvel()
    const angVel = rb.angvel()
    const velocity = _tempV.set(linVel.x, linVel.y, linVel.z)
    const forwardSpeed = velocity.dot(_chassisFwd)
    const speed = Math.abs(forwardSpeed)

    _angVelVec.set(angVel.x, angVel.y, angVel.z)

    // ── Steering ──
    const speedRatio = Math.min(speed / cfg.maxSpeed, 1)
    const steerReduction = 1 - Math.pow(speedRatio, 0.5) * cfg.speedSteerReduction
    const targetSteer = input.steerInput * cfg.maxSteerAngle * steerReduction
    const steerRate = Math.abs(input.steerInput) > 0.01 ? cfg.steerSpeed : cfg.steerReturnSpeed
    currentSteer.current = lerp(currentSteer.current, targetSteer, 1 - Math.exp(-steerRate * dt))
    mutation.steerAngle = currentSteer.current

    // ── Boost management ──
    const isBoosting = input.boost && mutation.boost > 0
    if (isBoosting) {
      mutation.boost = Math.max(0, mutation.boost - cfg.boostDrainRate * dt)
      lastBoostTime.current = 0
    } else {
      lastBoostTime.current += dt
      if (lastBoostTime.current > cfg.boostRechargeDelay) {
        mutation.boost = Math.min(cfg.maxBoost, mutation.boost + cfg.boostRechargeRate * dt)
      }
    }

    // ── Pre-calculate mass multipliers for arcade tuning ──
    const mass = cfg.chassisMass
    const weight = mass * 9.81

    // ── Ground detection via raycasts ──
    let numGrounded = 0
    let totalLateralSlip = 0

    for (let i = 0; i < 4; i++) {
      const wCfg = cfg.wheels[i]
      _wheelWorldPos.set(wCfg.position[0], wCfg.position[1], wCfg.position[2])
        .applyQuaternion(_chassisQuat).add(_chassisPos)

      const rayDown = { x: -_chassisUp.x, y: -_chassisUp.y, z: -_chassisUp.z }
      const maxRayDist = cfg.suspensionRestLength + cfg.wheelRadius

      const ray = new rapier.Ray(
        { x: _wheelWorldPos.x, y: _wheelWorldPos.y, z: _wheelWorldPos.z },
        rayDown
      )

      const hit = world.castRayAndGetNormal(
        ray,
        maxRayDist,
        true,
        rapier.QueryFilterFlags.EXCLUDE_SENSORS,
        RAYCAST_FILTER_GROUPS,
        undefined,
        rb
      )

      if (hit && hit.timeOfImpact < maxRayDist) {
        numGrounded++
        const hitDist = hit.timeOfImpact
        const compression = clamp(maxRayDist - hitDist, 0, cfg.maxSuspensionTravel)

        mutation.wheelStates[i].compression = compression
        mutation.wheelStates[i].isGrounded = true

        // Hit normal
        const hn = hit.normal
        _normal.set(hn.x, hn.y, hn.z).normalize()
        if (_normal.lengthSq() < 0.01) _normal.set(0, 1, 0)

        // Velocity at wheel
        _relPos.subVectors(_wheelWorldPos, _chassisPos)
        _crossResult.crossVectors(_angVelVec, _relPos)
        _velAtWheel.addVectors(velocity, _crossResult)

        // Ground axes calculation
        _groundRight.crossVectors(_chassisFwd, _normal).normalize()
        // Safeguard against NaN if perfectly aligned
        if (_groundRight.lengthSq() < 0.01) _groundRight.copy(_chassisRight)
        
        _groundFwd.crossVectors(_normal, _groundRight).normalize()
        
        if (wCfg.isSteer) {
          _steerQuat.setFromAxisAngle(_normal, currentSteer.current)
          _groundRight.applyQuaternion(_steerQuat)
          _groundFwd.applyQuaternion(_steerQuat)
        }

        // --- CALC FORCES ---
        
        // 1. Suspension
        const suspVelocity = _velAtWheel.dot(_normal)
        // Scaled to car mass as per original tuning
        const k = weight * 1.5
        const c = weight * 0.15
        const suspF = (compression * k) - (suspVelocity * c)
        _suspForce.copy(_normal).multiplyScalar(Math.max(0, suspF))

        // 2. Lateral Friction
        const lateralVel = _velAtWheel.dot(_groundRight)
        
        let frictionMu: number = wCfg.isDrive ? cfg.frictionSlipRear : cfg.frictionSlipFront
        if (input.handbrake && wCfg.isDrive) frictionMu = cfg.handbrakeSlipRear
        
        // Compute total load force on this wheel
        const load = Math.max(0, suspF)
        const maxLateralForce = load * frictionMu
        
        const desiredLateralVelChange = -lateralVel
        // Apply strictness factor. 1.0 = instant stop (causes structural jitter), 0.5 = smooth sliding rubber
        const tireCompliance = 0.5
        const latF = desiredLateralVelChange * (mass / 4) / dt * tireCompliance
        const clampedLatF = clamp(latF, -maxLateralForce, maxLateralForce)
        
        _latForce.copy(_groundRight).multiplyScalar(clampedLatF)
        totalLateralSlip += Math.abs(lateralVel)

        // 3. Drive & Brake
        _driveForce.set(0, 0, 0)
        _brakeForce.set(0, 0, 0)

        const forwardVel = _velAtWheel.dot(_groundFwd)

        if (wCfg.isDrive) {
          const boostMult = isBoosting ? cfg.boostMultiplier : 1
          if (input.throttle > 0 && forwardSpeed >= -1) {
            _driveForce.copy(_groundFwd).multiplyScalar(input.throttle * cfg.maxEngineForce * boostMult)
          } else if (input.reverse > 0 && forwardSpeed <= 1) {
            _driveForce.copy(_groundFwd).multiplyScalar(-input.reverse * cfg.maxReverseForce)
          }
        }

        if (input.brake > 0) {
          const bForce = input.handbrake ? cfg.handbrakeForce : cfg.maxBrakeForce
          // Oppose forward velocity
          _brakeForce.copy(_groundFwd).multiplyScalar(-Math.sign(forwardVel) * input.brake * bForce * 0.25)
        }

        // ── Apply Impulses ──
        _totalForce.copy(_suspForce).add(_latForce).add(_driveForce).add(_brakeForce)
        
        // CRITICAL FIX: Applying impulse near the wheel hub rather than ground trace prevents 
        // the 0.5m lever arm from generating massive rollover torque that broke suspension stabilization.
        rb.applyImpulseAtPoint(
          { x: _totalForce.x * dt, y: _totalForce.y * dt, z: _totalForce.z * dt },
          _wheelWorldPos,
          true
        )

        // Update wheel visual spin
        mutation.wheelStates[i].spinAngle += forwardVel * dt / cfg.wheelRadius
      } else {
        mutation.wheelStates[i].isGrounded = false
        mutation.wheelStates[i].compression = 0
      }
    }

    // ── AERODYNAMIC DRAG & DOWNFORCE ──
    const speedSq = speed * speed
    const dragForce = speedSq * cfg.aeroDragCoefficient
    const downforceMagnitude = speedSq * cfg.downforceCoefficient
    
    // Apply aerodynamic drag as continuous integrated impulse
    rb.applyImpulse({ 
      x: -_chassisFwd.x * dragForce * dt, 
      y: -downforceMagnitude * dt, 
      z: -_chassisFwd.z * dragForce * dt 
    }, true)

    // ── UPDATE MUTATION ──
    const mph = speed * 2.237
    smoothSpeed.current = lerp(smoothSpeed.current, mph, 1 - Math.exp(-10 * dt))
    mutation.speed = smoothSpeed.current
    mutation.velocity = [linVel.x, linVel.y, linVel.z]
    mutation.sliding = numGrounded > 0 && (totalLateralSlip / Math.max(numGrounded, 1)) > 3

    const gears = 6
    const gearRatio = speed / (cfg.maxSpeed / gears)
    mutation.gear = Math.min(Math.floor(gearRatio) + 1, gears)
    mutation.rpmTarget = Math.max((gearRatio % 1 + Math.log1p(gearRatio)) / 4, 0)
  }, [chassisRef, world, rapier])

  useBeforePhysicsStep(() => {
    updateVehicle(1 / 60)
  })
}
