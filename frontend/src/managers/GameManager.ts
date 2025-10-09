import { matchService } from "../services/MatchService.js";
import { AIOpponent } from "./AIOpponent.js";

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
  private gameRunning: boolean = false;
  private gamePaused: boolean = false;
  private gameOver: boolean = false;
  private gameWinner: string | null = null;

  // Countdown state
  private countdownActive: boolean = false;
  private countdownValue: number = 3;
  private countdownInterval: number | null = null;

  // Game objects
  private leftPaddle: Paddle;
  private rightPaddle: Paddle;
  private ball: Ball;
  private additionalBalls: Ball[] = [];
  private powerUps: Array<{ x: number; y: number; type: string; id: string }> =
    [];
  private score1: number = 0;
  private score2: number = 0;
  private winningScore: number = 5;

  // Keys state
  private keys: { [key: string]: boolean } = {};

  // Tournament integration
  private currentMatch: { player1: string; player2: string } | null = null;
  private tournamentManager: any = null;

  // Customization integration
  private customization: any = null;

  // AI integration
  private aiOpponent: AIOpponent;
  private isAIGame: boolean = false;

  constructor() {
    this.leftPaddle = {
      x: 10,
      y: 175,
      width: 10,
      height: 50,
      speed: 5,
      dy: 0,
    };

    this.rightPaddle = {
      x: 780,
      y: 175,
      width: 10,
      height: 50,
      speed: 5,
      dy: 0,
    };

    this.ball = {
      x: 400,
      y: 200,
      radius: 5,
      dx: 4,
      dy: 4,
      speed: 4,
    };

    this.aiOpponent = new AIOpponent();

    this.setupKeyboardControls();
  }

  startGame(
    tournamentManager?: any,
    currentMatch?: { player1: string; player2: string },
    customization?: any,
    isAIGame: boolean = false
  ): void {
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

    this.tournamentManager = tournamentManager || null;
    this.currentMatch = currentMatch || null;
    this.customization = customization;
    this.isAIGame = isAIGame; // Defines if the game is against AI

    this.applyCustomizationSettings();

    // If it's an AI game, slightly reduce the AI paddle speed for fairness
    if (this.isAIGame) {
      this.rightPaddle.speed *= 0.9;
    }

    this.resetGame();

    // Start countdown instead of immediately starting the game
    this.startCountdown();
  }

  private startCountdown(): void {
    console.log("Starting countdown...");
    this.countdownActive = true;
    this.countdownValue = 3;

    // Start the countdown display loop
    this.gameLoop();

    // Set up countdown timer
    this.countdownInterval = window.setInterval(() => {
      this.countdownValue--;
      console.log("Countdown:", this.countdownValue);
      if (this.countdownValue <= 0) {
        this.endCountdown();
      }
    }, 1000);
  }

  private endCountdown(): void {
    console.log("Ending countdown, starting game...");
    this.countdownActive = false;
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    // Now start the actual game
    this.gameRunning = true;
  }

  private setupKeyboardControls(): void {
    document.addEventListener("keydown", (e) => {
      // Handle space key
      if (e.key === " " && !e.repeat) {
        e.preventDefault(); // Prevent page scrolling

        // If countdown is active, skip countdown
        if (this.countdownActive) {
          this.endCountdown();
          return;
        }

        // Otherwise handle pause/unpause
        if (this.gameRunning && !this.gameOver) {
          this.gamePaused = !this.gamePaused;
        }
        return;
      }

      this.keys[e.key] = true;
    });

    document.addEventListener("keyup", (e) => {
      this.keys[e.key] = false;
    });
  }

  resetGame(): void {
    // Reset scores
    this.score1 = 0;
    this.score2 = 0;

    // Reset pause state
    this.gamePaused = false;

    // Reset game over state
    this.gameOver = false;
    this.gameWinner = null;

    // Reset ball position and speed
    this.resetBall();

    // Reset paddle positions
    this.resetPaddles();

    // Reset additional game elements
    this.additionalBalls = [];
    this.powerUps = [];
  }

  private applyCustomizationSettings(): void {
    if (!this.customization) return;

    this.customization.applySettingsToGame(this);
  }

  private checkForSettingsUpdates(): void {
    if (!this.customization) return;

    // Check if settings have changed (only check occasionally to avoid performance issues)
    if (Math.random() < 0.01) {
      // 1% chance per frame = ~once per 1.67 seconds
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
    if (!this.countdownActive && !this.gameRunning && !this.gameOver) return;

    // Only update game state if not in countdown, not paused, and not game over
    if (!this.countdownActive && !this.gamePaused && !this.gameOver) {
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
    this.updatePowerUps();
    this.checkCollisions();
    this.checkScoring();
    this.spawnPowerUps();
    this.checkForSettingsUpdates();
  }

  private updatePaddles(): void {
    // Don't update paddles if game is paused
    if (this.gamePaused) return;

    // Player 1 controls (W/S keys) - Permanece o mesmo
    if (this.keys["w"] || this.keys["W"]) {
      this.leftPaddle.dy = -this.leftPaddle.speed;
    } else if (this.keys["s"] || this.keys["S"]) {
      this.leftPaddle.dy = this.leftPaddle.speed;
    } else {
      this.leftPaddle.dy = 0;
    }

    // Lógica de controle do Jogador 2 ou da IA
    if (this.isAIGame) {
      // Se for um jogo de IA, a IA decide qual "tecla" apertar
      this.aiOpponent.update(this.ball, this.rightPaddle, this.keys);
    }
    // Se for um jogador humano, os event listeners do navegador já cuidaram de atualizar o objeto `keys`.

    // A lógica de movimento da raquete direita agora funciona para ambos (IA e Humano)
    if (this.keys["ArrowUp"]) {
      this.rightPaddle.dy = -this.rightPaddle.speed;
    } else if (this.keys["ArrowDown"]) {
      this.rightPaddle.dy = this.rightPaddle.speed;
    } else {
      this.rightPaddle.dy = 0;
    }

    // Update paddle positions
    this.leftPaddle.y += this.leftPaddle.dy;
    this.rightPaddle.y += this.rightPaddle.dy;

    // Keep paddles within canvas bounds
    this.leftPaddle.y = Math.max(
      0,
      Math.min(400 - this.leftPaddle.height, this.leftPaddle.y)
    );
    this.rightPaddle.y = Math.max(
      0,
      Math.min(400 - this.rightPaddle.height, this.rightPaddle.y)
    );
  }

  private updateBall(): void {
    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    // Ball collision with top and bottom walls
    if (this.ball.y <= 0 || this.ball.y >= 400) {
      this.ball.dy = -this.ball.dy;
    }
  }

  private updateAdditionalBalls(): void {
    this.additionalBalls.forEach((ball) => {
      ball.x += ball.dx;
      ball.y += ball.dy;

      // Ball collision with top and bottom walls
      if (ball.y <= 0 || ball.y >= 400) {
        ball.dy = -ball.dy;
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
    if (
      ball.x <= leftPaddle.x + leftPaddle.width + 5 &&
      ball.y >= leftPaddle.y &&
      ball.y <= leftPaddle.y + leftPaddle.height &&
      ball.dx < 0
    ) {
      ball.dx = -ball.dx;
      this.adjustBallAngle(ball, leftPaddle);
    }

    // Ball collision with right paddle
    if (
      ball.x + ball.radius >= rightPaddle.x &&
      ball.y >= rightPaddle.y &&
      ball.y <= rightPaddle.y + rightPaddle.height &&
      ball.dx > 0
    ) {
      ball.dx = -ball.dx;
      this.adjustBallAngle(ball, rightPaddle);
    }
  }

  /**
   * Calculates and applies a new bounce angle to the ball after it collides with a paddle.
   * Without this function, the ball would always bounce at a predictable, mirrored angle,
   * removing the player's ability to aim their shots.
   *
   * The logic works by:
   * 1. Determining the exact point of impact on the paddle's vertical surface.
   * 2. Mapping this impact point to a new angle (from -30 to +30 degrees).
   * A hit in the center results in a straight bounce, while hits near the edges result in sharper angles.
   * 3. Recalculating the ball's horizontal (dx) and vertical (dy) velocity components
   * based on this new angle, while preserving the ball's original speed.
   *
   * @param {Ball} ball The ball object that has collided with the paddle.
   * @param {Paddle} paddle The paddle object that the ball has just collided with.
   */
  private adjustBallAngle(ball: Ball, paddle: Paddle): void {
    const hitPoint = (ball.y - paddle.y) / paddle.height;
    const angle = ((hitPoint - 0.5) * Math.PI) / 3; // -30 to 30 degrees
    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);

    ball.dx = Math.cos(angle) * speed * (paddle === this.leftPaddle ? 1 : -1);
    ball.dy = Math.sin(angle) * speed;
  }

  private resetBall(): void {
    this.ball.x = 400;
    this.ball.y = 200;
    const ballSpeed = this.customization?.getSettings().ballSpeed || 4;
    this.ball.dx = Math.random() > 0.5 ? ballSpeed : -ballSpeed;
    this.ball.dy = Math.random() > 0.5 ? ballSpeed : -ballSpeed;
  }

  private updatePowerUps(): void {
    // Check if power-ups should be disabled and remove existing ones
    if (
      this.customization &&
      !this.customization.getSettings().powerUpsEnabled
    ) {
      if (this.powerUps.length > 0) {
        console.log(
          `🚫 Power-ups disabled - removing ${this.powerUps.length} existing power-ups`
        );
        this.powerUps = [];
      }
    }
  }

  private spawnPowerUps(): void {
    if (
      !this.customization ||
      !this.customization.getSettings().powerUpsEnabled
    )
      return;

    // Spawn power-ups randomly (1% chance per frame at 60fps = ~1 power-up per 1.67 seconds)
    if (Math.random() < 0.01 && this.powerUps.length < 2) {
      const powerUpTypes = [
        "speed_boost",
        "paddle_grow",
        "slow_motion",
        "multi_ball",
      ];
      const randomType =
        powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];

      // Spawn power-ups in the center area where the ball is more likely to be
      const newPowerUp = {
        x: Math.random() * 400 + 200, // Center area: 200-600
        y: Math.random() * 200 + 100, // Center area: 100-300
        type: randomType,
        id: `powerup_${Date.now()}_${Math.random()}`,
      };

      this.powerUps.push(newPowerUp);
    }
  }

  private checkCollisions(): void {
    // Main ball collision with paddles
    this.checkBallPaddleCollision(this.ball, this.leftPaddle, this.rightPaddle);

    // Additional balls collision with paddles
    this.additionalBalls.forEach((ball) => {
      this.checkBallPaddleCollision(ball, this.leftPaddle, this.rightPaddle);
    });

    // Power-up collision with paddles
    this.checkPowerUpCollisions();
  }

  private checkPowerUpCollisions(): void {
    if (
      !this.customization ||
      !this.customization.getSettings().powerUpsEnabled
    )
      return;

    this.powerUps = this.powerUps.filter((powerUp) => {
      // Check collision with main ball
      const distanceToMainBall = Math.sqrt(
        Math.pow(powerUp.x - this.ball.x, 2) +
          Math.pow(powerUp.y - this.ball.y, 2)
      );
      if (distanceToMainBall <= this.ball.radius + 15) {
        // 15 is power-up radius
        this.customization.activatePowerUp(powerUp.type, this);
        return false; // Remove power-up
      }

      // Check collision with additional balls
      for (const ball of this.additionalBalls) {
        const distanceToBall = Math.sqrt(
          Math.pow(powerUp.x - ball.x, 2) + Math.pow(powerUp.y - ball.y, 2)
        );
        if (distanceToBall <= ball.radius + 15) {
          this.customization.activatePowerUp(powerUp.type, this);
          return false; // Remove power-up
        }
      }

      return true; // Keep power-up
    });
  }

  private checkScoring(): void {
    // Main ball scoring
    if (this.ball.x <= 0) {
      this.score2++;
      this.resetBall();
    } else if (this.ball.x >= 800) {
      this.score1++;
      this.resetBall();
    }

    // Additional balls scoring
    this.additionalBalls = this.additionalBalls.filter((ball) => {
      if (ball.x <= 0) {
        this.score2++;
        return false;
      } else if (ball.x >= 800) {
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
    this.leftPaddle.y = 175;
    this.rightPaddle.y = 175;
  }

  private async endGame(): Promise<void> {
    this.gameRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
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
    this.gameOver = true;

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

  /**
   * Saves the match result to the backend
   */
  private async saveMatchToBackend(winner: string): Promise<void> {
    try {
      // Get actual player names from current match
      const player1Name = this.currentMatch?.player1 || "Player 1";
      const player2Name = this.currentMatch?.player2 || "Player 2";

      // Create match result data
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
    if (!this.ctx || !this.canvas) {
      console.error("🎨 Render: Canvas or context not available");
      return;
    }

    const ctx = this.ctx;
    const canvas = this.canvas;

    const theme = this.customization?.getCurrentTheme() || {
      backgroundColor: "#000000",
      paddleColor: "#ffffff",
      ballColor: "#ffffff",
      lineColor: "#ffffff",
    };

    // Clear canvas
    ctx.fillStyle = theme.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw center line
    ctx.strokeStyle = theme.lineColor;
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.moveTo(400, 0);
    ctx.lineTo(400, 400);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw paddles
    ctx.fillStyle = theme.paddleColor;
    ctx.fillRect(
      this.leftPaddle.x,
      this.leftPaddle.y,
      this.leftPaddle.width,
      this.leftPaddle.height
    );
    ctx.fillRect(
      this.rightPaddle.x,
      this.rightPaddle.y,
      this.rightPaddle.width,
      this.rightPaddle.height
    );

    // Draw main ball
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = theme.ballColor;
    ctx.fill();
    ctx.closePath();

    // Draw additional balls
    this.additionalBalls.forEach((ball) => {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = theme.ballColor;
      ctx.fill();
      ctx.closePath();
    });

    // Draw power-ups
    this.powerUps.forEach((powerUp) => {
      ctx.beginPath();
      ctx.arc(powerUp.x, powerUp.y, 15, 0, Math.PI * 2);
      ctx.fillStyle = this.getPowerUpColor(powerUp.type);
      ctx.fill();
      ctx.closePath();

      // Draw power-up icon
      ctx.fillStyle = "#ffffff";
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.fillText(this.getPowerUpIcon(powerUp.type), powerUp.x, powerUp.y + 5);
    });

    // Draw score
    ctx.fillStyle = theme.lineColor;
    ctx.font = "32px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.score1.toString(), 200, 50);
    ctx.fillText(this.score2.toString(), 600, 50);

    // Draw countdown overlay if countdown is active
    if (this.countdownActive) {
      console.log(
        "🎯 Rendering countdown overlay, value:",
        this.countdownValue
      );
      // Semi-transparent overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Countdown text
      ctx.fillStyle = "#00ffff";
      ctx.font = "bold 72px Arial"; // Use Arial instead of Orbitron for better compatibility
      ctx.textAlign = "center";
      ctx.fillText(
        this.countdownValue.toString(),
        canvas.width / 2,
        canvas.height / 2 - 20
      );

      // Instructions
      ctx.fillStyle = "#ffffff";
      ctx.font = "18px Arial";
      ctx.fillText(
        "Press SPACE to start now",
        canvas.width / 2,
        canvas.height / 2 + 40
      );
    }
    // Draw pause overlay if game is paused
    else if (this.gamePaused) {
      // Semi-transparent overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Pause text
      ctx.fillStyle = "#ffffff";
      ctx.font = "48px Arial";
      ctx.textAlign = "center";
      ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2 - 20);

      // Instructions
      ctx.font = "16px Arial";
      ctx.fillText(
        "Press SPACE to resume",
        canvas.width / 2,
        canvas.height / 2 + 20
      );
    }
  }

  private getPowerUpColor(type: string): string {
    switch (type) {
      case "speed_boost":
        return "#FFD700";
      case "paddle_grow":
        return "#00FF00";
      case "slow_motion":
        return "#87CEEB";
      case "multi_ball":
        return "#FF69B4";
      default:
        return "#ffffff";
    }
  }

  private getPowerUpIcon(type: string): string {
    switch (type) {
      case "speed_boost":
        return "🚀";
      case "paddle_grow":
        return "📏";
      case "slow_motion":
        return "🐌";
      case "multi_ball":
        return "⚽";
      default:
        return "?";
    }
  }

  stopGame(): void {
    this.gameRunning = false;
    this.countdownActive = false;
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    if (this.animationId) {
      window.cancelAnimationFrame(this.animationId);
    }
  }

  // Methods for quick game game over screen
  playAgain(): void {
    this.resetGame();
    this.startCountdown();

    // Hide the game over buttons
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

  // Show game over buttons for quick games
  showGameOverButtons(): void {
    const gameOverButtons = document.getElementById("game-over-buttons");
    if (gameOverButtons) {
      gameOverButtons.classList.remove("hidden");

      // Update the winner text in the HTML
      const winnerText = document.getElementById("winner-text");
      if (winnerText && this.gameWinner) {
        winnerText.textContent = `${this.gameWinner} Wins!`;
      }
    }
  }

  /**
   * Shows game over modal for tournament games
   */
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

    // Remove any existing modal
    const existingModal = document.getElementById("tournament-game-over-modal");
    if (existingModal) {
      existingModal.remove();
    }

    // Add the modal to the page
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Set up event listener
    document
      .getElementById("continue-tournament-btn")
      ?.addEventListener("click", () => {
        this.hideTournamentGameOverModal();
        // Navigate to tournament page
        window.history.pushState({}, "", "/tournament");
        window.dispatchEvent(new CustomEvent("tournament-updated"));
      });
  }

  /**
   * Hides the tournament game over modal
   */
  private hideTournamentGameOverModal(): void {
    const modal = document.getElementById("tournament-game-over-modal");
    if (modal) {
      modal.remove();
    }
  }
}
