export type InputState = {
  accel: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  brakeReleased: boolean;
  mouseShake: boolean;
};

type MouseEventSample = {
  time: number;
  dx: number;
};

export class InputController {
  private readonly pressed = new Set<string>();
  private jumpPressedFlag = false;
  private brakeReleasedFlag = false;
  private readonly mouseSamples: MouseEventSample[] = [];

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('blur', this.onBlur);
  }

  getState(): InputState {
    const jumpPressed = this.jumpPressedFlag;
    const brakeReleased = this.brakeReleasedFlag;
    this.jumpPressedFlag = false;
    this.brakeReleasedFlag = false;

    return {
      accel: this.pressed.has('KeyW'),
      brake: this.pressed.has('ShiftLeft') || this.pressed.has('ShiftRight') || this.pressed.has('KeyS'),
      left: this.pressed.has('KeyA'),
      right: this.pressed.has('KeyD'),
      jumpPressed,
      jumpHeld: this.pressed.has('Space'),
      brakeReleased,
      mouseShake: this.consumeMouseShake()
    };
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('blur', this.onBlur);
    this.pressed.clear();
    this.mouseSamples.length = 0;
  }

  private consumeMouseShake(): boolean {
    const now = performance.now();
    const windowMs = 250;

    while (this.mouseSamples.length > 0 && now - this.mouseSamples[0].time > windowMs) {
      this.mouseSamples.shift();
    }

    if (this.mouseSamples.length < 3) return false;

    let absSum = 0;
    let flips = 0;
    let prevSign = 0;

    for (const s of this.mouseSamples) {
      absSum += Math.abs(s.dx);
      const sign = Math.sign(s.dx);
      if (sign !== 0) {
        if (prevSign !== 0 && sign !== prevSign) flips += 1;
        prevSign = sign;
      }
    }

    const triggered = absSum > 210 && flips >= 1;
    if (triggered) {
      this.mouseSamples.length = 0;
    }

    return triggered;
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Space' && !this.pressed.has('Space')) {
      this.jumpPressedFlag = true;
    }

    this.pressed.add(event.code);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code);
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.code === 'KeyS') {
      this.brakeReleasedFlag = true;
    }
  };

  private onMouseMove = (event: MouseEvent): void => {
    this.mouseSamples.push({ time: performance.now(), dx: event.movementX });
    if (this.mouseSamples.length > 60) {
      this.mouseSamples.splice(0, this.mouseSamples.length - 60);
    }
  };

  private onBlur = (): void => {
    this.pressed.clear();
    this.mouseSamples.length = 0;
    this.jumpPressedFlag = false;
    this.brakeReleasedFlag = false;
  };
}
