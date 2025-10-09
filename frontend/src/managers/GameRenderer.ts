import { GAME_CONFIG, DEFAULT_THEME, POWER_UP_TYPES } from "./GameConfig.js";

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Ball {
  x: number;
  y: number;
  radius: number;
}

interface PowerUp {
  x: number;
  y: number;
  type: string;
  id: string;
}

interface Theme {
  backgroundColor: string;
  paddleColor: string;
  ballColor: string;
  lineColor: string;
  countdownColor: string;
  pauseColor: string;
}

export class GameRenderer {
  constructor(
    private ctx: CanvasRenderingContext2D,
    private canvas: HTMLCanvasElement
  ) {}

  render(
    paddles: { left: Paddle; right: Paddle },
    balls: Ball[],
    powerUps: PowerUp[],
    scores: { player1: number; player2: number },
    theme: Theme = DEFAULT_THEME,
    overlay?: { type: "countdown" | "pause"; data: any }
  ): void {
    this.renderBackground(theme);
    this.renderCenterLine(theme);
    this.renderPaddles(paddles, theme);
    this.renderBalls(balls, theme);
    this.renderPowerUps(powerUps);
    this.renderScore(scores, theme);

    if (overlay) {
      this.renderOverlay(overlay.type, overlay.data);
    }
  }

  private renderBackground(theme: Theme): void {
    this.ctx.fillStyle = theme.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private renderCenterLine(theme: Theme): void {
    this.ctx.strokeStyle = theme.lineColor;
    this.ctx.setLineDash([5, 15]);
    this.ctx.beginPath();
    this.ctx.moveTo(GAME_CONFIG.CANVAS.CENTER_X, 0);
    this.ctx.lineTo(GAME_CONFIG.CANVAS.CENTER_X, GAME_CONFIG.CANVAS.HEIGHT);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private renderPaddles(
    paddles: { left: Paddle; right: Paddle },
    theme: Theme
  ): void {
    this.ctx.fillStyle = theme.paddleColor;

    // Left paddle
    this.ctx.fillRect(
      paddles.left.x,
      paddles.left.y,
      paddles.left.width,
      paddles.left.height
    );

    // Right paddle
    this.ctx.fillRect(
      paddles.right.x,
      paddles.right.y,
      paddles.right.width,
      paddles.right.height
    );
  }

  private renderBalls(balls: Ball[], theme: Theme): void {
    this.ctx.fillStyle = theme.ballColor;

    balls.forEach((ball) => {
      this.ctx.beginPath();
      this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.closePath();
    });
  }

  private renderPowerUps(powerUps: PowerUp[]): void {
    powerUps.forEach((powerUp) => {
      // Draw power-up circle
      this.ctx.beginPath();
      this.ctx.arc(
        powerUp.x,
        powerUp.y,
        GAME_CONFIG.POWER_UP.RADIUS,
        0,
        Math.PI * 2
      );
      this.ctx.fillStyle = this.getPowerUpColor(powerUp.type);
      this.ctx.fill();
      this.ctx.closePath();

      // Draw power-up icon
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "16px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        this.getPowerUpIcon(powerUp.type),
        powerUp.x,
        powerUp.y + 5
      );
    });
  }

  private renderScore(
    scores: { player1: number; player2: number },
    theme: Theme
  ): void {
    this.ctx.fillStyle = theme.lineColor;
    this.ctx.font = "32px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(scores.player1.toString(), 200, 50);
    this.ctx.fillText(scores.player2.toString(), 600, 50);
  }

  private renderOverlay(type: "countdown" | "pause", data: any): void {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (type === "countdown") {
      this.renderCountdownOverlay(data);
    } else if (type === "pause") {
      this.renderPauseOverlay();
    }
  }

  private renderCountdownOverlay(data: { value: number }): void {

    this.ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    this.ctx.shadowBlur = 10;
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 2;

    this.ctx.fillStyle = "#00ffff";
    this.ctx.font = "bold 96px Arial";
    this.ctx.textAlign = "center";

    const countdownText = data.value.toString();
    this.ctx.fillText(
      countdownText,
      this.canvas.width / 2,
      this.canvas.height / 2 - 20
    );

    this.ctx.shadowColor = "transparent";
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;

    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 24px Arial";
    this.ctx.fillText(
      "Press SPACE to start now",
      this.canvas.width / 2,
      this.canvas.height / 2 + 60
    );
  }

  private renderPauseOverlay(): void {
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    this.ctx.shadowBlur = 10;
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 2;

    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 64px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "PAUSED",
      this.canvas.width / 2,
      this.canvas.height / 2 - 20
    );

    this.ctx.shadowColor = "transparent";
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;

    // Instructions
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 20px Arial";
    this.ctx.fillText(
      "Press SPACE to resume",
      this.canvas.width / 2,
      this.canvas.height / 2 + 40
    );
  }

  private getPowerUpColor(type: string): string {
    switch (type) {
      case POWER_UP_TYPES.SPEED_BOOST.type:
        return POWER_UP_TYPES.SPEED_BOOST.color;
      case POWER_UP_TYPES.PADDLE_GROW.type:
        return POWER_UP_TYPES.PADDLE_GROW.color;
      case POWER_UP_TYPES.SLOW_MOTION.type:
        return POWER_UP_TYPES.SLOW_MOTION.color;
      case POWER_UP_TYPES.MULTI_BALL.type:
        return POWER_UP_TYPES.MULTI_BALL.color;
      default:
        return "#ffffff";
    }
  }

  private getPowerUpIcon(type: string): string {
    switch (type) {
      case POWER_UP_TYPES.SPEED_BOOST.type:
        return POWER_UP_TYPES.SPEED_BOOST.icon;
      case POWER_UP_TYPES.PADDLE_GROW.type:
        return POWER_UP_TYPES.PADDLE_GROW.icon;
      case POWER_UP_TYPES.SLOW_MOTION.type:
        return POWER_UP_TYPES.SLOW_MOTION.icon;
      case POWER_UP_TYPES.MULTI_BALL.type:
        return POWER_UP_TYPES.MULTI_BALL.icon;
      default:
        return "?";
    }
  }
}
