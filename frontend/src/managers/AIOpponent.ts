export class AIOpponent {
  private aiTargetY: number;
  private aiLastUpdateTime: number;

  constructor() {
    this.aiTargetY = 200; // Center of 400px height canvas
    this.aiLastUpdateTime = 0;
  }

  /**
   * Updates AI behavior each frame
   */
  public update(
    ball: any,
    aiPaddle: any,
    keys: { [key: string]: boolean }
  ): void {
    const now = Date.now();

    // Recalculate trajectory once per second
    if (now - this.aiLastUpdateTime > 1000) {
      this.predictBallTrajectory(ball, aiPaddle);
      this.aiLastUpdateTime = now;
    }

    const paddleCenter = aiPaddle.y + aiPaddle.height / 2;

    // Clear keys before deciding next action
    keys["ArrowUp"] = false;
    keys["ArrowDown"] = false;

    // Move paddle towards target with dead zone to prevent shaking
    // Without dead zone: paddle would constantly switch between up/down when target is close
    // With dead zone: paddle only moves if target is >10% of paddle height away
    if (this.aiTargetY < paddleCenter - aiPaddle.height * 0.1) {
      keys["ArrowUp"] = true;
    } else if (this.aiTargetY > paddleCenter + aiPaddle.height * 0.1) {
      keys["ArrowDown"] = true;
    }
  }

  /**
   * Predicts ball trajectory to determine intercept position
   */
  private predictBallTrajectory(ball: any, aiPaddle: any): void {
    if (ball.dx < 0) {
      // Slowly return to center when ball is moving away
      const centerY = 200;
      this.aiTargetY = this.aiTargetY + (centerY - this.aiTargetY) * 0.02;
      return;
    }

    let futureX = ball.x;
    let futureY = ball.y;
    let futureDX = ball.dx;
    let futureDY = ball.dy;

    // Simulate ball movement frame by frame until it reaches AI paddle
    while (futureX < 780) {
      // 780 is right paddle X position
      futureX += futureDX;
      futureY += futureDY;

      // Check collision with top and bottom walls
      if (futureY <= 0 || futureY >= 400) {
        futureDY = -futureDY;
      }
    }

    this.aiTargetY = futureY;

    // Add human-like inaccuracy to make AI beatable
    const maxInaccuracy = aiPaddle.height * 0.25;
    const inaccuracy = (Math.random() - 0.5) * 2 * maxInaccuracy;
    this.aiTargetY += inaccuracy;
  }
}
