import { GAME_CONFIG } from "./GameConfig.js";

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
  dx: number;
  dy: number;
}

interface PowerUp {
  x: number;
  y: number;
  type: string;
  id: string;
}

export class CollisionDetector {
  static checkBallWallCollision(ball: Ball): boolean {
    return (
      ball.y <= ball.radius || ball.y >= GAME_CONFIG.CANVAS.HEIGHT - ball.radius
    );
  }

  static checkBallSideWallCollision(ball: Ball): "left" | "right" | null {
    if (ball.x <= 10) {
      return "left";
    } else if (ball.x >= GAME_CONFIG.CANVAS.WIDTH - 10) {
      return "right";
    }
    return null;
  }

  static checkBallPaddleCollision(ball: Ball, paddle: Paddle): boolean {
    return (
      ball.x <= paddle.x + paddle.width + ball.radius &&
      ball.x + ball.radius >= paddle.x &&
      ball.y <= paddle.y + paddle.height &&
      ball.y + ball.radius >= paddle.y
    );
  }

  static checkBallLeftPaddleCollision(ball: Ball, leftPaddle: Paddle): boolean {
    return (
      ball.x <= leftPaddle.x + leftPaddle.width + ball.radius &&
      ball.y >= leftPaddle.y &&
      ball.y <= leftPaddle.y + leftPaddle.height &&
      ball.dx < 0 // Ball moving left
    );
  }

  static checkBallRightPaddleCollision(
    ball: Ball,
    rightPaddle: Paddle
  ): boolean {
    return (
      ball.x + ball.radius >= rightPaddle.x &&
      ball.y >= rightPaddle.y &&
      ball.y <= rightPaddle.y + rightPaddle.height &&
      ball.dx > 0 // Ball moving right
    );
  }

  static checkPowerUpBallCollision(powerUp: PowerUp, ball: Ball): boolean {
    const distance = Math.sqrt(
      Math.pow(powerUp.x - ball.x, 2) + Math.pow(powerUp.y - ball.y, 2)
    );
    return distance <= ball.radius + GAME_CONFIG.POWER_UP.RADIUS;
  }

  static isPaddleInBounds(paddle: Paddle): boolean {
    return (
      paddle.y >= 0 && paddle.y <= GAME_CONFIG.CANVAS.HEIGHT - paddle.height
    );
  }

  static constrainPaddleToBounds(paddle: Paddle): void {
    paddle.y = Math.max(
      0,
      Math.min(GAME_CONFIG.CANVAS.HEIGHT - paddle.height, paddle.y)
    );
  }

  static calculatePaddleHitPoint(ball: Ball, paddle: Paddle): number {
    return (ball.y - paddle.y) / paddle.height;
  }

  static calculateBounceAngle(hitPoint: number): number {
    // Map hit point (0-1) to angle (-30 to +30 degrees)
    return (hitPoint - 0.5) * GAME_CONFIG.ANGLES.MAX_BOUNCE_ANGLE;
  }

  static applyPaddleBounce(
    ball: Ball,
    paddle: Paddle,
    isLeftPaddle: boolean
  ): void {
    const hitPoint = this.calculatePaddleHitPoint(ball, paddle);
    const angle = this.calculateBounceAngle(hitPoint);
    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);

    ball.dx = Math.cos(angle) * speed * (isLeftPaddle ? 1 : -1);
    ball.dy = Math.sin(angle) * speed;
  }

  static applyWallBounce(ball: Ball): void {
    ball.dy = -ball.dy;
  }

  static isPointInRect(
    pointX: number,
    pointY: number,
    rectX: number,
    rectY: number,
    rectWidth: number,
    rectHeight: number
  ): boolean {
    return (
      pointX >= rectX &&
      pointX <= rectX + rectWidth &&
      pointY >= rectY &&
      pointY <= rectY + rectHeight
    );
  }

  static calculateDistance(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  static checkCircleCollision(
    x1: number,
    y1: number,
    radius1: number,
    x2: number,
    y2: number,
    radius2: number
  ): boolean {
    const distance = this.calculateDistance(x1, y1, x2, y2);
    return distance <= radius1 + radius2;
  }
}
