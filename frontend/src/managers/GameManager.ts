import { matchService } from "../services/MatchService.js";
import { AIOpponent } from "./AIOpponent.js";
import { GAME_CONFIG, DEFAULT_THEME, GameState } from "./GameConfig.js";
import { GameRenderer } from "./GameRenderer.js";
import { GameStateManager } from "./GameStateManager.js";
import { CollisionDetector } from "./CollisionDetector.js";
import { PowerUpManager } from "./PowerUpManager.js";
import { InputManager } from "./InputManager.js";

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  dy: number;
}

interface Ball {
  x: number;
  y: number;
  radius: number;
  dx: number;
  dy: number;
  speed: number;
}

export class GameManager {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationId: number | null = null;
  private gameWinner: string | null = null;

  // Countdown state
  private countdownValue: number = GAME_CONFIG.COUNTDOWN.INITIAL_VALUE;
  private countdownInterval: number | null = null;

  // Power-up effect tracking
  private activePowerUpEffects: Map<string, number> = new Map();
  private baseValues: {
    ballSpeed: number;
    paddleHeight: number;
  } = {
    ballSpeed: GAME_CONFIG.BALL.INITIAL_SPEED,
    paddleHeight: GAME_CONFIG.PADDLE.HEIGHT,
  };

  // Game objects
  private leftPaddle: Paddle;
  private rightPaddle: Paddle;
  private ball: Ball;
  private additionalBalls: Ball[] = [];
  private score1: number = 0;
  private score2: number = 0;
  private winningScore: number = GAME_CONFIG.SCORING.DEFAULT_WINNING_SCORE;

  // Managers
  private gameRenderer: GameRenderer | null = null;
  private gameStateManager: GameStateManager;
  private powerUpManager: PowerUpManager;
  private inputManager: InputManager;

  // Tournament integration
  private currentMatch: { player1: string; player2: string } | null = null;
  private tournamentManager: any = null;

  // Customization integration
  private customization: any = null;

  // AI integration
  private aiOpponent: AIOpponent;
  private isAIGame: boolean = false;

  constructor() {
    // Initialize game objects with constants
    this.leftPaddle = {
      x: GAME_CONFIG.PADDLE.LEFT_X,
      y: GAME_CONFIG.PADDLE.INITIAL_Y,
      width: GAME_CONFIG.PADDLE.WIDTH,
      height: GAME_CONFIG.PADDLE.HEIGHT,
      speed: GAME_CONFIG.PADDLE.SPEED,
      dy: 0,
    };

    this.rightPaddle = {
      x: GAME_CONFIG.PADDLE.RIGHT_X,
      y: GAME_CONFIG.PADDLE.INITIAL_Y,
      width: GAME_CONFIG.PADDLE.WIDTH,
      height: GAME_CONFIG.PADDLE.HEIGHT,
      speed: GAME_CONFIG.PADDLE.SPEED,
      dy: 0,
    };

    this.ball = {
      x: GAME_CONFIG.BALL.INITIAL_X,
      y: GAME_CONFIG.BALL.INITIAL_Y,
      radius: GAME_CONFIG.BALL.RADIUS,
      dx: GAME_CONFIG.BALL.INITIAL_SPEED,
      dy: GAME_CONFIG.BALL.INITIAL_SPEED,
      speed: GAME_CONFIG.BALL.INITIAL_SPEED,
    };

    // Initialize managers
    this.gameStateManager = new GameStateManager();
    this.powerUpManager = new PowerUpManager();
    this.inputManager = new InputManager();
    this.aiOpponent = new AIOpponent();

    this.setupInputHandling();
  }

  startGame(
    tournamentManager?: any,
    currentMatch?: { player1: string; player2: string },
    customization?: any,
    isAIGame: boolean = false
  ): void {
    // Clean up any previous game state first
    if (this.animationId) {
      window.cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    // Clear all active power-up effects from previous game
    this.activePowerUpEffects.forEach((timeout) => clearTimeout(timeout));
    this.activePowerUpEffects.clear();

    this.canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    if (!this.canvas) {
      console.error("Canvas not found!");
      return;
    }

    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) {
      console.error("Canvas context not found!");
      return;
    }

    // Initialize renderer
    this.gameRenderer = new GameRenderer(this.ctx, this.canvas);

    this.tournamentManager = tournamentManager || null;
    this.currentMatch = currentMatch || null;
    this.customization = customization;
    this.isAIGame = isAIGame;

    this.applyCustomizationSettings();

    this.resetGame();

    // Start countdown instead of immediately starting the game
    this.startCountdown();
  }

  private startCountdown(): void {
    console.log("Starting countdown...");
    this.gameStateManager.setState(GameState.COUNTDOWN);
    this.countdownValue = GAME_CONFIG.COUNTDOWN.INITIAL_VALUE;

    // Start the countdown display loop
    this.gameLoop();

    // Set up countdown timer
    this.countdownInterval = window.setInterval(() => {
      this.countdownValue--;
      console.log("Countdown:", this.countdownValue);
      if (this.countdownValue <= 0) {
        this.endCountdown();
      }
    }, GAME_CONFIG.COUNTDOWN.INTERVAL_MS);
  }

  private endCountdown(): void {
    console.log("Ending countdown, starting game...");
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    // Now start the actual game
    this.gameStateManager.setState(GameState.RUNNING);
  }

  private setupInputHandling(): void {
    // Handle space key for countdown skip and pause
    this.inputManager.onKeyDown((key) => {
      if (key === " ") {
        // If countdown is active, skip countdown
        if (this.gameStateManager.isCountdownActive()) {
          this.endCountdown();
          return;
        }

        // Otherwise handle pause/unpause
        if (
          this.gameStateManager.isGameRunning() ||
          this.gameStateManager.isGamePaused()
        ) {
          this.togglePause();
        }
      }
    });

    // Note: preventDefault is now handled in the InputManager's main keydown handler
  }

  private togglePause(): void {
    if (this.gameStateManager.isGamePaused()) {
      this.gameStateManager.setState(GameState.RUNNING);
    } else if (this.gameStateManager.isGameRunning()) {
      this.gameStateManager.setState(GameState.PAUSED);
    }
  }

  public pauseGame(): void {
    if (this.gameStateManager.isGameRunning()) {
      this.gameStateManager.setState(GameState.PAUSED);
    }
  }

  public resumeGame(): void {
    if (this.gameStateManager.isGamePaused()) {
      this.gameStateManager.setState(GameState.RUNNING);
    }
  }

  public isGameActive(): boolean {
    return this.gameStateManager.isGameActive();
  }

  resetGame(): void {
    // Clear all active power-up effects first
    this.activePowerUpEffects.forEach((timeout) => clearTimeout(timeout));
    this.activePowerUpEffects.clear();

    // Reset scores
    this.score1 = 0;
    this.score2 = 0;

    // Reset game state
    this.gameStateManager.reset();
    this.gameWinner = null;

    // Reset ball position and speed
    this.resetBall();

    // Reset paddle positions
    this.resetPaddles();

    // Reset additional game elements
    this.additionalBalls = [];
    this.powerUpManager.reset();

    // Store the current base values after reset
    this.storeBaseValues();
  }

  private applyCustomizationSettings(): void {
    if (!this.customization) return;

    this.customization.applySettingsToGame(this);
  }

  private checkForSettingsUpdates(): void {
    if (!this.customization) return;

    // Check if settings have changed (only check occasionally to avoid performance issues)
    if (Math.random() < GAME_CONFIG.SETTINGS_CHECK.CHANCE_PER_FRAME) {
      const currentSettings = this.customization.getSettings();

      // Check if winning score changed
      if (currentSettings.winningScore !== this.winningScore) {
        this.winningScore = currentSettings.winningScore;
      }

      // Check if ball speed changed
      if (currentSettings.ballSpeed !== this.ball.speed) {
        this.applyBallSpeedUpdate(currentSettings.ballSpeed);
      }

      // Check if paddle speed changed
      if (currentSettings.paddleSpeed !== this.leftPaddle.speed) {
        this.leftPaddle.speed = currentSettings.paddleSpeed;
        this.rightPaddle.speed = currentSettings.paddleSpeed;
      }
    }
  }

  private gameLoop(): void {
    // Continue loop if countdown is active, game is running, or game is over
    if (
      !this.gameStateManager.isCountdownActive() &&
      !this.gameStateManager.isGameActive() &&
      !this.gameStateManager.isGameOver()
    )
      return;

    // Only update game state if game is running
    if (this.gameStateManager.isGameRunning()) {
      this.update();
    }

    // Always render (to show countdown, pause overlay, or game over overlay)
    this.render();

    this.animationId = window.requestAnimationFrame(() => this.gameLoop());
  }

  private update(): void {
    this.updatePaddles();
    this.updateBall();
    this.updateAdditionalBalls();
    this.powerUpManager.update(
      [this.ball, ...this.additionalBalls],
      this
    );
    this.checkCollisions();
    this.checkScoring();
    this.checkForSettingsUpdates();
  }

  private updatePaddles(): void {
    // Don't update paddles if game is paused
    if (this.gameStateManager.isGamePaused()) return;

    // Player 1 controls (W/S keys)
    const player1Movement = this.inputManager.getPlayer1Movement();
    this.leftPaddle.dy = player1Movement * this.leftPaddle.speed;

    // Player 2 controls or AI
    if (this.isAIGame) {
      // AI opponent updates the input manager's key state
      this.aiOpponent.update(
        this.ball,
        this.rightPaddle,
        this.inputManager.getKeysObject()
      );
    }

    const player2Movement = this.inputManager.getPlayer2Movement();
    this.rightPaddle.dy = player2Movement * this.rightPaddle.speed;

    // Update paddle positions
    this.leftPaddle.y += this.leftPaddle.dy;
    this.rightPaddle.y += this.rightPaddle.dy;

    // Keep paddles within canvas bounds
    CollisionDetector.constrainPaddleToBounds(this.leftPaddle);
    CollisionDetector.constrainPaddleToBounds(this.rightPaddle);
  }

  private updateBall(): void {
    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    // Ball collision with top and bottom walls
    if (CollisionDetector.checkBallWallCollision(this.ball)) {
      CollisionDetector.applyWallBounce(this.ball);
    }
  }

  private updateAdditionalBalls(): void {
    this.additionalBalls.forEach((ball) => {
      ball.x += ball.dx;
      ball.y += ball.dy;

      // Ball collision with top and bottom walls
      if (CollisionDetector.checkBallWallCollision(ball)) {
        CollisionDetector.applyWallBounce(ball);
      }
    });
  }

  private applyBallSpeedUpdate(newSpeed: number): void {
    // Update ball speed while preserving direction
    const currentSpeed = Math.sqrt(
      this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy
    );
    if (currentSpeed > 0) {
      const directionX = this.ball.dx / currentSpeed;
      const directionY = this.ball.dy / currentSpeed;
      this.ball.dx = directionX * newSpeed;
      this.ball.dy = directionY * newSpeed;
    }
    this.ball.speed = newSpeed;
  }

  private checkBallPaddleCollision(
    ball: Ball,
    leftPaddle: Paddle,
    rightPaddle: Paddle
  ): void {
    // Ball collision with left paddle
    if (CollisionDetector.checkBallLeftPaddleCollision(ball, leftPaddle)) {
      CollisionDetector.applyPaddleBounce(ball, leftPaddle, true);
    }

    // Ball collision with right paddle
    if (CollisionDetector.checkBallRightPaddleCollision(ball, rightPaddle)) {
      CollisionDetector.applyPaddleBounce(ball, rightPaddle, false);
    }
  }

private resetBall(): void {
  this.ball.x = GAME_CONFIG.BALL.INITIAL_X;
  this.ball.y = GAME_CONFIG.BALL.INITIAL_Y;

  const ballSpeed = this.customization?.getSettings().ballSpeed || GAME_CONFIG.BALL.INITIAL_SPEED;

  const minAngle = Math.PI / 6;
  const maxAngle = Math.PI / 3;
  const randomAngle = minAngle + Math.random() * (maxAngle - minAngle);

  const direction = Math.random() > 0.5 ? 1 : -1;

  this.ball.dx = Math.cos(randomAngle) * ballSpeed * direction;
  this.ball.dy = Math.sin(randomAngle) * ballSpeed * (Math.random() > 0.5 ? 1 : -1);
  this.ball.speed = ballSpeed;
}

  private checkCollisions(): void {
    // Main ball collision with paddles
    this.checkBallPaddleCollision(this.ball, this.leftPaddle, this.rightPaddle);

    // Additional balls collision with paddles
    this.additionalBalls.forEach((ball) => {
      this.checkBallPaddleCollision(ball, this.leftPaddle, this.rightPaddle);
    });
  }

  private checkScoring(): void {
    // Main ball scoring
    const sideWallCollision = CollisionDetector.checkBallSideWallCollision(
      this.ball
    );
    if (sideWallCollision === "left") {
      this.score2++;
      this.resetBall();
    } else if (sideWallCollision === "right") {
      this.score1++;
      this.resetBall();
    }

    // Additional balls scoring
    this.additionalBalls = this.additionalBalls.filter((ball) => {
      const ballSideWallCollision =
        CollisionDetector.checkBallSideWallCollision(ball);
      if (ballSideWallCollision === "left") {
        this.score2++;
        return false;
      } else if (ballSideWallCollision === "right") {
        this.score1++;
        return false;
      }
      return true;
    });

    // Check for game end
    if (this.score1 >= this.winningScore || this.score2 >= this.winningScore) {
      this.endGame();
    }
  }

  private resetPaddles(): void {
    this.leftPaddle.y = GAME_CONFIG.PADDLE.INITIAL_Y;
    this.rightPaddle.y = GAME_CONFIG.PADDLE.INITIAL_Y;
    
    // Reset paddle heights to default (important after power-ups like paddle grow)
    this.leftPaddle.height = GAME_CONFIG.PADDLE.HEIGHT;
    this.rightPaddle.height = GAME_CONFIG.PADDLE.HEIGHT;
  }

  private async endGame(): Promise<void> {
    this.gameStateManager.setState(GameState.GAME_OVER);
    if (this.animationId) {
      window.cancelAnimationFrame(this.animationId);
    }

    // Determine winner using actual player names if available
    let winner: string;
    if (this.currentMatch) {
      winner =
        this.score1 > this.score2
          ? this.currentMatch.player1
          : this.currentMatch.player2;
    } else {
      // Fallback to generic names if no match info
      winner = this.score1 > this.score2 ? "Player 1" : "Player 2";
    }
    this.gameWinner = winner;

    // Save match to backend
    await this.saveMatchToBackend(winner);

    // Record the match result if this is a tournament match
    if (this.tournamentManager && this.currentMatch) {
      console.log("Game ended, recording result:", {
        player1: this.currentMatch.player1,
        player2: this.currentMatch.player2,
        winner: winner,
      });
      this.tournamentManager.recordMatchResult(
        this.currentMatch.player1,
        this.currentMatch.player2,
        winner
      );

      // For tournament matches, show game over modal
      this.showTournamentGameOverModal(winner);
    } else {
      console.log("Quick game ended - showing game over screen");
      // For quick games, we'll show the game over overlay
      // The user can choose to play again or go back to main
      this.showGameOverButtons();
    }
  }

  private async saveMatchToBackend(winner: string): Promise<void> {
    try {
      const player1Name = this.currentMatch?.player1 || "Player 1";
      const player2Name = this.currentMatch?.player2 || "Player 2";

      const matchResult = matchService.createMatchResult(
        player1Name,
        player2Name,
        this.score1,
        this.score2,
        winner
      );

      if (matchResult) {
        const result = await matchService.createMatch(matchResult);
        if (result.success) {
          console.log("Match saved to backend successfully");
        } else {
          console.warn("Failed to save match to backend:", result.error);
        }
      } else {
        console.log("Skipping match save - user not authenticated");
      }
    } catch (error) {
      console.error("Error saving match to backend:", error);
    }
  }

  private render(): void {
    if (!this.gameRenderer) {
      console.error("🎨 Render: GameRenderer not available");
      return;
    }

    const theme = this.customization?.getCurrentTheme() || DEFAULT_THEME;
    const allBalls = [this.ball, ...this.additionalBalls];
    const powerUps = this.powerUpManager.getPowerUps();

    let overlay: { type: "countdown" | "pause"; data: any } | undefined;

    if (this.gameStateManager.isCountdownActive()) {
      console.log(
        "🎯 Rendering countdown overlay, value:",
        this.countdownValue,
        "state:",
        this.gameStateManager.getState()
      );
      overlay = { type: "countdown", data: { value: this.countdownValue } };
    } else if (this.gameStateManager.isGamePaused()) {
      overlay = { type: "pause", data: {} };
    }

    this.gameRenderer.render(
      { left: this.leftPaddle, right: this.rightPaddle },
      allBalls,
      powerUps,
      { player1: this.score1, player2: this.score2 },
      theme,
      overlay
    );
  }

  // Power-up effect management methods
  storeBaseValues(): void {
    this.baseValues.ballSpeed = this.ball.speed;
    this.baseValues.paddleHeight = this.leftPaddle.height;
  }

  getBaseValues() {
    return this.baseValues;
  }

  clearPowerUpEffect(powerUpId: string): void {
    const existingTimeout = this.activePowerUpEffects.get(powerUpId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.activePowerUpEffects.delete(powerUpId);
    }
  }

  setPowerUpEffect(powerUpId: string, timeout: number): void {
    this.clearPowerUpEffect(powerUpId);
    this.activePowerUpEffects.set(powerUpId, timeout);
  }

  stopGame(): void {
    this.gameStateManager.setState(GameState.GAME_OVER);
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    if (this.animationId) {
      window.cancelAnimationFrame(this.animationId);
    }
    // Clean up power-up effects
    this.activePowerUpEffects.forEach((timeout) => clearTimeout(timeout));
    this.activePowerUpEffects.clear();
    // Clean up input manager to prevent memory leaks
    this.inputManager.destroy();
  }

  playAgain(): void {
    this.stopGame();

    this.inputManager = new InputManager();
    this.setupInputHandling();

    this.resetGame();
    this.startCountdown();

    const gameOverButtons = document.getElementById("game-over-buttons");
    if (gameOverButtons) {
      gameOverButtons.classList.add("hidden");
    }
  }

  backToMain(): void {
    this.stopGame();
    window.history.pushState({}, "", "/");
    window.dispatchEvent(new CustomEvent("tournament-updated"));
  }

  showGameOverButtons(): void {
    const gameOverButtons = document.getElementById("game-over-buttons");
    if (gameOverButtons) {
      gameOverButtons.classList.remove("hidden");

      const winnerText = document.getElementById("winner-text");
      if (winnerText && this.gameWinner) {
        winnerText.textContent = `${this.gameWinner} Wins!`;
      }
    }
  }

  private showTournamentGameOverModal(winner: string): void {
    const modalHTML = `
      <div id="tournament-game-over-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-black/90 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl max-w-md w-full">
          <!-- Header -->
          <div class="p-6 text-center">
            <div class="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="text-2xl">🏆</span>
            </div>
            <h3 class="text-3xl font-bold text-cyan-400 mb-2 orbitron-font">Match Complete!</h3>
            <p class="text-xl text-yellow-400 mb-6">${winner} Wins!</p>

            <!-- Buttons -->
            <div class="flex justify-center">
              <button id="continue-tournament-btn"
                      class="px-6 py-3 bg-cyan-600/20 text-white border border-cyan-500/30 font-bold rounded-xl hover:bg-cyan-600/30 transition-colors">
                Continue Tournament
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const existingModal = document.getElementById("tournament-game-over-modal");
    if (existingModal) {
      existingModal.remove();
    }

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    document
      .getElementById("continue-tournament-btn")
      ?.addEventListener("click", () => {
        this.hideTournamentGameOverModal();
        window.history.pushState({}, "", "/tournament");
        window.dispatchEvent(new CustomEvent("tournament-updated"));
      });
  }

  private hideTournamentGameOverModal(): void {
    const modal = document.getElementById("tournament-game-over-modal");
    if (modal) {
      modal.remove();
    }
  }
}
