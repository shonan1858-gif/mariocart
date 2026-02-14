export const kartParams = {
  maxSpeed: 16,
  reverseMaxSpeed: -6,
  acceleration: 22,
  braking: 32,
  coastingDrag: 14,
  rollingFriction: 1.5,
  steerRate: 2.4,
  steerAtMinSpeedFactor: 0.35,
  driftSteerMultiplier: 1.2,
  driftGripFactor: 0.86,
  minTurboSpeed: 6,
  turboDurationByStage: [0, 0.8, 1.3, 1.8],
  turboAccelByStage: [0, 20, 28, 36],
  driftChargeRates: [0, 0.8, 0.65, 0.45],
  driftThresholds: [0, 1.2, 2.8, 5.0],
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
