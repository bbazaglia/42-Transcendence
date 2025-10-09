import { GameState } from "./GameConfig.js";

export class GameStateManager {
  private state: GameState = GameState.COUNTDOWN;
  private stateChangeCallbacks: Array<
    (newState: GameState, oldState: GameState) => void
  > = [];

  getState(): GameState {
    return this.state;
  }

  setState(newState: GameState): boolean {
    const oldState = this.state;

    if (this.canTransitionTo(newState)) {
      this.state = newState;
      this.notifyStateChange(newState, oldState);
      return true;
    }

    console.warn(`Invalid state transition from ${oldState} to ${newState}`);
    return false;
  }

  canTransitionTo(newState: GameState): boolean {
    const currentState = this.state;

    // Define valid state transitions
    const validTransitions: Record<GameState, GameState[]> = {
      [GameState.COUNTDOWN]: [GameState.RUNNING, GameState.GAME_OVER],
      [GameState.RUNNING]: [GameState.PAUSED, GameState.GAME_OVER],
      [GameState.PAUSED]: [GameState.RUNNING, GameState.GAME_OVER],
      [GameState.GAME_OVER]: [GameState.COUNTDOWN], // For restart
    };

    return validTransitions[currentState]?.includes(newState) ?? false;
  }

  isInState(state: GameState): boolean {
    return this.state === state;
  }

  isGameActive(): boolean {
    return this.state === GameState.RUNNING || this.state === GameState.PAUSED;
  }

  isGameRunning(): boolean {
    return this.state === GameState.RUNNING;
  }

  isGamePaused(): boolean {
    return this.state === GameState.PAUSED;
  }

  isGameOver(): boolean {
    return this.state === GameState.GAME_OVER;
  }

  isCountdownActive(): boolean {
    return this.state === GameState.COUNTDOWN;
  }

  reset(): void {
    this.setState(GameState.COUNTDOWN);
  }

  onStateChange(
    callback: (newState: GameState, oldState: GameState) => void
  ): void {
    this.stateChangeCallbacks.push(callback);
  }

  removeStateChangeCallback(
    callback: (newState: GameState, oldState: GameState) => void
  ): void {
    const index = this.stateChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.stateChangeCallbacks.splice(index, 1);
    }
  }

  private notifyStateChange(newState: GameState, oldState: GameState): void {
    this.stateChangeCallbacks.forEach((callback) => {
      try {
        callback(newState, oldState);
      } catch (error) {
        console.error("Error in state change callback:", error);
      }
    });
  }

  getStateDescription(): string {
    switch (this.state) {
      case GameState.COUNTDOWN:
        return "Countdown";
      case GameState.RUNNING:
        return "Running";
      case GameState.PAUSED:
        return "Paused";
      case GameState.GAME_OVER:
        return "Game Over";
      default:
        return "Unknown";
    }
  }
}
