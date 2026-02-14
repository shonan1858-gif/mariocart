import { kartParams } from '../data/kart_params';
import type { InputState } from '../io/input';

export type DriftStage = 0 | 1 | 2 | 3;

export type KartState = {
  x: number;
  y: number;
  heading: number;
  speed: number;
  driftStage: DriftStage;
  driftCharge: number;
  turboTimer: number;
  turboStage: DriftStage;
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
    turboStage: 0
  };

  update(input: InputState, dt: number): void {
    const s = this.state;
    const steerInput = (input.left ? -1 : 0) + (input.right ? 1 : 0);

    if (input.accel) {
      s.speed += kartParams.acceleration * dt;
    }

    if (input.brake) {
      if (s.speed > 0) {
        s.speed -= kartParams.braking * dt;
      } else {
        s.speed -= kartParams.acceleration * dt;
      }
    }

    if (!input.accel && !input.brake) {
      const drag = kartParams.coastingDrag * dt;
      if (Math.abs(s.speed) <= drag) {
        s.speed = 0;
      } else {
        s.speed -= Math.sign(s.speed) * drag;
      }
    }

    s.speed -= s.speed * kartParams.rollingFriction * dt;
    s.speed = Math.max(kartParams.reverseMaxSpeed, Math.min(kartParams.maxSpeed, s.speed));

    const speedRatio = Math.min(1, Math.abs(s.speed) / kartParams.maxSpeed);
    const steerPower =
      kartParams.steerAtMinSpeedFactor + (1 - kartParams.steerAtMinSpeedFactor) * speedRatio;
    const steerMult = input.drift ? kartParams.driftSteerMultiplier : 1;

    s.heading += steerInput * kartParams.steerRate * steerPower * steerMult * dt;

    this.updateDriftAndTurbo(input, steerInput, dt);

    let moveSpeed = s.speed;
    if (input.drift) {
      moveSpeed *= kartParams.driftGripFactor;
    }

    s.x += Math.cos(s.heading) * moveSpeed * 18 * dt;
    s.y += Math.sin(s.heading) * moveSpeed * 18 * dt;
  }

  private updateDriftAndTurbo(input: InputState, steerInput: number, dt: number): void {
    const s = this.state;

    if (s.turboTimer > 0) {
      s.turboTimer = Math.max(0, s.turboTimer - dt);
      s.speed += kartParams.turboAccelByStage[s.turboStage] * dt;
    } else {
      s.turboStage = 0;
    }

    const hasSteer = steerInput !== 0;
    const canCharge = input.drift && hasSteer && Math.abs(s.speed) > kartParams.minTurboSpeed;

    if (canCharge) {
      const currentStage = this.chargeToStage(s.driftCharge);
      const chargeRate = kartParams.driftChargeRates[currentStage];
      s.driftCharge += chargeRate * dt;
      s.driftStage = this.chargeToStage(s.driftCharge);
      return;
    }

    if (!input.drift && s.driftStage > 0) {
      s.turboStage = s.driftStage;
      s.turboTimer = kartParams.turboDurationByStage[s.driftStage];
    }

    if (!input.drift) {
      s.driftCharge = 0;
      s.driftStage = 0;
    }
  }

  private chargeToStage(charge: number): DriftStage {
    const t = kartParams.driftThresholds;
    if (charge >= t[3]) return 3;
    if (charge >= t[2]) return 2;
    if (charge >= t[1]) return 1;
    return 0;
  }
}
