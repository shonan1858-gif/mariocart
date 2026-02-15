export const kartParams = {
  maxSpeed: 16,
  reverseMaxSpeed: -4,
  acceleration: 22,
  braking: 38,
  coastingDrag: 14,
  rollingFriction: 1.5,
  steerRate: 2.4,
  steerAtMinSpeedFactor: 0.35,

  jumpVelocity: 9,
  jumpGravity: -40,
  airSteerMultiplier: 0.45,
  airControlDrag: 1.15,

  minDriftSpeed: 5.5,
  driftSteerMultiplier: 1.25,
  driftGripFactor: 0.84,
  driftChargeRate: 1,
  driftStageThresholds: [0, 0.8, 1.6],
  turboPowerPerStage: [0, 20, 30],
  turboDurationPerStage: [0, 0.85, 1.35],
  landingDriftWindow: 0.6,

  wallRestitution: 0.3,
  wallFriction: 0.9,
  wallDamping: 0.9,

  offroadMaxSpeedMultiplier: 0.55,
  offroadAccelMultiplier: 0.45,
  offroadDragMultiplier: 2.2,

  kartLength: 30,
  kartWidth: 16
} as const;

export const trackParams = {
  centerX: 480,
  centerY: 300,
  outerRadiusX: 360,
  outerRadiusY: 220,
  innerRadiusX: 230,
  innerRadiusY: 120
} as const;
