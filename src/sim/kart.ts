import { kartParams } from '../data/kart_params';
import type { InputState } from '../io/input';

export type DriftStage = 0 | 1 | 2;
export type DriftSide = -1 | 0 | 1;
export type SurfaceType = 'road' | 'offroad';

export type KartState = {
  x: number;
  y: number;
  heading: number;
  speed: number;

  jumpHeight: number;
  jumpVel: number;
  airTime: number;
  isAirborne: boolean;
  grounded: boolean;
  roll: number;
  pitch: number;
  landingDriftWindow: number;

  driftStage: DriftStage;
  driftCharge: number;
  turboTimer: number;
  turboStage: DriftStage;
  driftActive: boolean;
  driftSide: DriftSide;

  wallBounceTimer: number;
  boostTextTimer: number;
};

export class KartSim {
  state: KartState = {
    x: 480,
    y: 450,
    heading: -Math.PI / 2,
    speed: 0,

    jumpHeight: 0,
    jumpVel: 0,
    airTime: 0,
    isAirborne: false,
    grounded: true,
    roll: 0,
    pitch: 0,
    landingDriftWindow: 0,

    driftStage: 0,
    driftCharge: 0,
    turboTimer: 0,
    turboStage: 0,
    driftActive: false,
    driftSide: 0,

    wallBounceTimer: 0,
    boostTextTimer: 0
  };

  update(input: InputState, dt: number, surface: SurfaceType): void {
    const s = this.state;
    const steerInput = (input.left ? -1 : 0) + (input.right ? 1 : 0);

    s.wallBounceTimer = Math.max(0, s.wallBounceTimer - dt);
    s.boostTextTimer = Math.max(0, s.boostTextTimer - dt);
    s.landingDriftWindow = Math.max(0, s.landingDriftWindow - dt);

    this.updateJump(input, steerInput, dt);

    const offroad = surface === 'offroad';
    const accelMult = offroad ? kartParams.offroadAccelMultiplier : 1;
    const dragMult = offroad ? kartParams.offroadDragMultiplier : 1;
    const speedCap = kartParams.maxSpeed * (offroad ? kartParams.offroadMaxSpeedMultiplier : 1);

    const airCtrl = s.isAirborne ? kartParams.airSteerMultiplier : 1;

    if (input.accel) {
      s.speed += kartParams.acceleration * accelMult * airCtrl * dt;
    }

    if (input.brake) {
      if (s.speed > 0) {
        s.speed -= kartParams.braking * dt;
      } else {
        s.speed -= kartParams.acceleration * 0.4 * dt;
      }
    }

    if (!input.accel && !input.brake) {
      const drag = kartParams.coastingDrag * dragMult * dt;
      if (Math.abs(s.speed) <= drag) {
        s.speed = 0;
      } else {
        s.speed -= Math.sign(s.speed) * drag;
      }
    }

    s.speed -= s.speed * kartParams.rollingFriction * dragMult * (s.isAirborne ? kartParams.airControlDrag : 1) * dt;

    this.updateDriftAndTurbo(input, steerInput, dt);

    if (s.turboTimer > 0) {
      s.speed += kartParams.turboPowerPerStage[s.turboStage] * dt;
      s.turboTimer = Math.max(0, s.turboTimer - dt);
      if (s.turboTimer === 0) {
        s.turboStage = 0;
      }
    }

    const maxCap = speedCap + (s.turboStage > 0 ? 2.5 : 0);
    s.speed = Math.max(kartParams.reverseMaxSpeed, Math.min(maxCap, s.speed));

    const speedRatio = Math.min(1, Math.abs(s.speed) / Math.max(0.001, kartParams.maxSpeed));
    const steerPower =
      kartParams.steerAtMinSpeedFactor + (1 - kartParams.steerAtMinSpeedFactor) * speedRatio;

    const driftSteer = s.driftActive ? s.driftSide : steerInput;
    const steerMult = s.driftActive ? kartParams.driftSteerMultiplier : 1;
    s.heading += driftSteer * kartParams.steerRate * steerPower * steerMult * airCtrl * dt;

    let moveSpeed = s.speed;
    if (s.driftActive) {
      moveSpeed *= kartParams.driftGripFactor;
    }

    s.x += Math.cos(s.heading) * moveSpeed * 18 * dt;
    s.y += Math.sin(s.heading) * moveSpeed * 18 * dt;

    if (!Number.isFinite(s.x) || !Number.isFinite(s.y) || !Number.isFinite(s.speed)) {
      s.x = 480;
      s.y = 450;
      s.speed = 0;
      s.heading = -Math.PI / 2;
      s.jumpHeight = 0;
      s.jumpVel = 0;
      s.isAirborne = false;
      s.grounded = true;
    }
  }

  private updateJump(input: InputState, steerInput: number, dt: number): void {
    const s = this.state;

    if (!s.isAirborne && input.jumpPressed) {
      s.isAirborne = true;
      s.grounded = false;
      s.jumpVel = kartParams.jumpVelocity;
      s.airTime = 0;
      s.roll = 0;
      s.pitch = 0;
    }

    if (!s.isAirborne) {
      s.grounded = true;
      s.roll *= 0.8;
      s.pitch *= 0.8;
      return;
    }

    s.airTime += dt;
    s.jumpVel += kartParams.jumpGravity * dt;
    s.jumpHeight += s.jumpVel * dt;

    s.roll += steerInput * 1.8 * dt;
    s.roll = Math.max(-0.75, Math.min(0.75, s.roll));
    s.pitch = Math.max(-0.25, Math.min(0.25, s.jumpVel * 0.03));

    const groundZ = 0;
    if (s.jumpHeight <= groundZ) {
      s.jumpHeight = groundZ;
      s.jumpVel = 0;
      s.isAirborne = false;
      s.grounded = true;

      const slipAngle = Math.abs(s.roll) * (180 / Math.PI);
      if (slipAngle > 20 && Math.abs(s.speed) >= kartParams.minDriftSpeed) {
        s.landingDriftWindow = kartParams.landingDriftWindow;
      }

      s.roll = 0;
      s.pitch = 0;
    }
  }

  private updateDriftAndTurbo(input: InputState, steerInput: number, dt: number): void {
    const s = this.state;

    const canNormalDrift =
      !s.isAirborne &&
      !s.driftActive &&
      input.brake &&
      steerInput !== 0 &&
      Math.abs(s.speed) >= kartParams.minDriftSpeed;

    if (canNormalDrift) {
      this.beginDrift(steerInput > 0 ? 1 : -1);
    }

    const canLandingDrift =
      !s.isAirborne &&
      !s.driftActive &&
      s.landingDriftWindow > 0 &&
      input.brake &&
      input.mouseShake &&
      Math.abs(s.speed) >= kartParams.minDriftSpeed;

    if (canLandingDrift) {
      const side = steerInput !== 0 ? (steerInput > 0 ? 1 : -1) : s.roll > 0 ? 1 : -1;
      this.beginDrift(side);
      s.driftCharge = 0.35;
      s.landingDriftWindow = 0;
    }

    if (!s.driftActive) return;

    const releaseDrift = input.brakeReleased || !input.brake;
    if (releaseDrift) {
      if (s.driftStage > 0) {
        s.turboStage = s.driftStage;
        s.turboTimer = kartParams.turboDurationPerStage[s.driftStage];
        s.boostTextTimer = 1;
      }
      s.driftActive = false;
      s.driftSide = 0;
      s.driftCharge = 0;
      s.driftStage = 0;
      return;
    }

    const sideMatch = steerInput === 0 || Math.sign(steerInput) === s.driftSide;
    const sideBoost = sideMatch ? 1.15 : 0.88;
    const speedFactor = Math.min(1.5, Math.abs(s.speed) / kartParams.maxSpeed + 0.4);
    s.driftCharge += kartParams.driftChargeRate * sideBoost * speedFactor * dt;
    s.driftStage = this.chargeToStage(s.driftCharge);
  }

  private beginDrift(side: DriftSide): void {
    const s = this.state;
    s.driftActive = true;
    s.driftSide = side;
    s.driftCharge = 0;
    s.driftStage = 0;
  }

  private chargeToStage(charge: number): DriftStage {
    const t = kartParams.driftStageThresholds;
    if (charge >= t[2]) return 2;
    if (charge >= t[1]) return 1;
    return 0;
  }
}
