import { kartParams } from '../data/kart_params';
import type { InputState } from '../io/input';

export type DriftStage = 0 | 1 | 2 | 3;
export type DriftSide = -1 | 0 | 1;
export type SurfaceType = 'road' | 'offroad';

export type KartState = {
  x: number;
  y: number;
  heading: number;
  speed: number;
  driftStage: DriftStage;
  driftCharge: number;
  turboTimer: number;
  turboStage: DriftStage;
  driftActive: boolean;
  driftSide: DriftSide;
};

export class KartSim {
  state: KartState = {
    x: 480,
    y: 450,
    heading: -Math.PI / 2,
    speed: 0,
    driftStage: 0,
    driftCharge: 0,
    turboTimer: 0,
    turboStage: 0,
    driftActive: false,
    driftSide: 0
  };

  update(input: InputState, dt: number, surface: SurfaceType): void {
    const s = this.state;
    const steerInput = (input.left ? -1 : 0) + (input.right ? 1 : 0);

    const offroad = surface === 'offroad';
    const accelMult = offroad ? kartParams.offroadAccelMultiplier : 1;
    const dragMult = offroad ? kartParams.offroadDragMultiplier : 1;
    const speedCap = kartParams.maxSpeed * (offroad ? kartParams.offroadMaxSpeedMultiplier : 1);

    if (input.accel) {
      s.speed += kartParams.acceleration * accelMult * dt;
    }

    if (input.brake) {
      s.speed -= kartParams.braking * dt;
      if (s.speed < 0) s.speed = 0;
    }

    if (!input.accel && !input.brake) {
      const drag = kartParams.coastingDrag * dragMult * dt;
      if (Math.abs(s.speed) <= drag) {
        s.speed = 0;
      } else {
        s.speed -= Math.sign(s.speed) * drag;
      }
    }

    s.speed -= s.speed * kartParams.rollingFriction * dragMult * dt;

    this.updateDriftAndTurbo(input, steerInput, dt);

    if (s.turboTimer > 0) {
      s.speed += kartParams.turboPowerPerStage[s.turboStage] * dt;
      s.turboTimer = Math.max(0, s.turboTimer - dt);
      if (s.turboTimer === 0) {
        s.turboStage = 0;
      }
    }

    s.speed = Math.max(kartParams.reverseMaxSpeed, Math.min(speedCap, s.speed));

    const speedRatio = Math.min(1, Math.abs(s.speed) / Math.max(0.001, kartParams.maxSpeed));
    const steerPower =
      kartParams.steerAtMinSpeedFactor + (1 - kartParams.steerAtMinSpeedFactor) * speedRatio;

    const driftSteer = s.driftActive ? s.driftSide : steerInput;
    const steerMult = s.driftActive ? kartParams.driftSteerMultiplier : 1;
    s.heading += driftSteer * kartParams.steerRate * steerPower * steerMult * dt;

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
    }
  }

  private updateDriftAndTurbo(input: InputState, steerInput: number, dt: number): void {
    const s = this.state;

    const canStartDrift =
      !s.driftActive &&
      input.drift &&
      steerInput !== 0 &&
      Math.abs(s.speed) >= kartParams.minDriftSpeed;

    if (canStartDrift) {
      s.driftActive = true;
      s.driftSide = steerInput > 0 ? 1 : -1;
      s.driftCharge = 0;
      s.driftStage = 0;
    }

    if (s.driftActive) {
      if (!input.drift) {
        if (s.driftStage > 0) {
          s.turboStage = s.driftStage;
          s.turboTimer = kartParams.turboDurationPerStage[s.driftStage];
        }
        s.driftActive = false;
        s.driftSide = 0;
        s.driftCharge = 0;
        s.driftStage = 0;
        return;
      }

      const sideMatch = steerInput === 0 || Math.sign(steerInput) === s.driftSide;
      const sideBoost = sideMatch ? 1.15 : 0.85;
      const speedFactor = Math.min(1.5, Math.abs(s.speed) / kartParams.maxSpeed + 0.4);
      s.driftCharge += kartParams.driftChargeRate * sideBoost * speedFactor * dt;
      s.driftStage = this.chargeToStage(s.driftCharge);
    }
  }

  private chargeToStage(charge: number): DriftStage {
    const t = kartParams.driftStageThresholds;
    if (charge >= t[3]) return 3;
    if (charge >= t[2]) return 2;
    if (charge >= t[1]) return 1;
    return 0;
  }
}
