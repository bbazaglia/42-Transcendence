import { KEY_MAPPINGS } from "./GameConfig.js";

export class InputManager {
  private keys: { [key: string]: boolean } = {};
  private keyDownCallbacks: Array<(key: string) => void> = [];
  private keyUpCallbacks: Array<(key: string) => void> = [];
  private keyDownHandler!: (e: KeyboardEvent) => void;
  private keyUpHandler!: (e: KeyboardEvent) => void;

  constructor() {
    this.setupKeyboardControls();
  }

  private setupKeyboardControls(): void {
    this.keyDownHandler = (e: KeyboardEvent) => {
      if (!e.repeat) {
        this.keys[e.key] = true;
        this.notifyKeyDown(e.key);
      }
    };

    this.keyUpHandler = (e: KeyboardEvent) => {
      this.keys[e.key] = false;
      this.notifyKeyUp(e.key);
    };

    document.addEventListener("keydown", this.keyDownHandler);
    document.addEventListener("keyup", this.keyUpHandler);
  }

  isKeyPressed(key: string): boolean {
    return this.keys[key] || false;
  }

  isAnyKeyPressed(keys: readonly string[]): boolean {
    return keys.some((key) => this.isKeyPressed(key));
  }

  isPlayer1UpPressed(): boolean {
    return this.isAnyKeyPressed(KEY_MAPPINGS.PLAYER1_UP);
  }

  isPlayer1DownPressed(): boolean {
    return this.isAnyKeyPressed(KEY_MAPPINGS.PLAYER1_DOWN);
  }

  isPlayer2UpPressed(): boolean {
    return this.isAnyKeyPressed(KEY_MAPPINGS.PLAYER2_UP);
  }

  isPlayer2DownPressed(): boolean {
    return this.isAnyKeyPressed(KEY_MAPPINGS.PLAYER2_DOWN);
  }

  isPauseKeyPressed(): boolean {
    return this.isAnyKeyPressed(KEY_MAPPINGS.PAUSE);
  }

  getPressedKeys(): string[] {
    return Object.keys(this.keys).filter((key) => this.keys[key]);
  }

  getKeysObject(): { [key: string]: boolean } {
    return this.keys;
  }

  clearKeys(): void {
    this.keys = {};
  }

  onKeyDown(callback: (key: string) => void): void {
    this.keyDownCallbacks.push(callback);
  }

  onKeyUp(callback: (key: string) => void): void {
    this.keyUpCallbacks.push(callback);
  }

  removeKeyDownCallback(callback: (key: string) => void): void {
    const index = this.keyDownCallbacks.indexOf(callback);
    if (index > -1) {
      this.keyDownCallbacks.splice(index, 1);
    }
  }

  removeKeyUpCallback(callback: (key: string) => void): void {
    const index = this.keyUpCallbacks.indexOf(callback);
    if (index > -1) {
      this.keyUpCallbacks.splice(index, 1);
    }
  }

  private notifyKeyDown(key: string): void {
    this.keyDownCallbacks.forEach((callback) => {
      try {
        callback(key);
      } catch (error) {
        console.error("Error in key down callback:", error);
      }
    });
  }

  private notifyKeyUp(key: string): void {
    this.keyUpCallbacks.forEach((callback) => {
      try {
        callback(key);
      } catch (error) {
        console.error("Error in key up callback:", error);
      }
    });
  }

  preventDefaultForKeys(keys: readonly string[]): void {
    document.addEventListener("keydown", (e) => {
      if (keys.includes(e.key)) {
        e.preventDefault();
      }
    });
  }

  /**
   * Gets the movement direction for Player 1
   * Returns: -1 (up), 0 (no movement), 1 (down)
   */
  getPlayer1Movement(): number {
    if (this.isPlayer1UpPressed()) return -1;
    if (this.isPlayer1DownPressed()) return 1;
    return 0;
  }

  /**
   * Gets the movement direction for Player 2
   * Returns: -1 (up), 0 (no movement), 1 (down)
   */
  getPlayer2Movement(): number {
    if (this.isPlayer2UpPressed()) return -1;
    if (this.isPlayer2DownPressed()) return 1;
    return 0;
  }

  destroy(): void {
    // Remove event listeners from the DOM
    if (this.keyDownHandler) {
      document.removeEventListener("keydown", this.keyDownHandler);
    }
    if (this.keyUpHandler) {
      document.removeEventListener("keyup", this.keyUpHandler);
    }
    
    // Clear callback arrays
    this.keyDownCallbacks = [];
    this.keyUpCallbacks = [];
    
    // Clear key states
    this.clearKeys();
  }
}
