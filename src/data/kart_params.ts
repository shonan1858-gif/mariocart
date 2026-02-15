export const kartParams = {
  maxSpeed: 16,
  reverseMaxSpeed: 0,
  acceleration: 22,
  braking: 38,
  coastingDrag: 14,
  rollingFriction: 1.5,
  steerRate: 2.4,
  steerAtMinSpeedFactor: 0.35,

  minDriftSpeed: 5.5,
  driftSteerMultiplier: 1.25,
  driftGripFactor: 0.84,
  driftChargeRate: 1,
  driftStageThresholds: [0, 1.15, 2.6, 4.8],
  turboPowerPerStage: [0, 18, 26, 34],
  turboDurationPerStage: [0, 0.7, 1.15, 1.6],

  wallRestitution: 0.2,
  wallFriction: 0.82,
  wallDamping: 0.88,

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
