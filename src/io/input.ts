export type InputState = {
  accel: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  drift: boolean;
};

export class InputController {
  private readonly pressed = new Set<string>();

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  getState(): InputState {
    return {
      accel: this.pressed.has('KeyW'),
      brake: this.pressed.has('ShiftLeft') || this.pressed.has('ShiftRight'),
      left: this.pressed.has('KeyA'),
      right: this.pressed.has('KeyD'),
      drift: this.pressed.has('Space')
    };
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.pressed.clear();
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    this.pressed.add(event.code);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code);
  };

  private onBlur = (): void => {
    this.pressed.clear();
  };
}
