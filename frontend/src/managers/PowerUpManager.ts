import { GAME_CONFIG, POWER_UP_TYPES } from "./GameConfig.js";

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

export class PowerUpManager {
  private powerUps: PowerUp[] = [];
  private powerUpTypes: string[] = Object.values(POWER_UP_TYPES).map(
    (p) => p.type
  );
  private isEnabled: boolean = true;

  update(balls: Ball[], gameManager: any): void {
    this.updatePowerUpSettings(gameManager.customization);

    if (this.isEnabled) {
      this.spawnPowerUps();
      this.checkCollisions(balls, gameManager);
    } else {
      this.clearAllPowerUps();
    }
  }

  getPowerUps(): PowerUp[] {
    return [...this.powerUps];
  }

  getPowerUpCount(): number {
    return this.powerUps.length;
  }

  private spawnPowerUps(): void {
    if (
      Math.random() < GAME_CONFIG.POWER_UP.SPAWN_CHANCE &&
      this.powerUps.length < GAME_CONFIG.POWER_UP.MAX_COUNT
    ) {
      const randomType =
        this.powerUpTypes[Math.floor(Math.random() * this.powerUpTypes.length)];

      const newPowerUp: PowerUp = {
        x:
          Math.random() *
            (GAME_CONFIG.POWER_UP.SPAWN_AREA.X_MAX -
              GAME_CONFIG.POWER_UP.SPAWN_AREA.X_MIN) +
          GAME_CONFIG.POWER_UP.SPAWN_AREA.X_MIN,
        y:
          Math.random() *
            (GAME_CONFIG.POWER_UP.SPAWN_AREA.Y_MAX -
              GAME_CONFIG.POWER_UP.SPAWN_AREA.Y_MIN) +
          GAME_CONFIG.POWER_UP.SPAWN_AREA.Y_MIN,
        type: randomType,
        id: `powerup_${Date.now()}_${Math.random()}`,
      };

      this.powerUps.push(newPowerUp);
    }
  }

  private checkCollisions(balls: Ball[], gameManager: any): void {
    this.powerUps = this.powerUps.filter((powerUp) => {
      for (const ball of balls) {
        if (this.checkPowerUpBallCollision(powerUp, ball)) {
          this.activatePowerUp(powerUp.type, gameManager);
          return false; // Remove power-up
        }
      }
      return true; // Keep power-up
    });
  }

  private checkPowerUpBallCollision(powerUp: PowerUp, ball: Ball): boolean {
    const distance = Math.sqrt(
      Math.pow(powerUp.x - ball.x, 2) + Math.pow(powerUp.y - ball.y, 2)
    );
    return distance <= ball.radius + GAME_CONFIG.POWER_UP.RADIUS;
  }

  private activatePowerUp(type: string, gameManager: any): void {
    console.log(`🎯 PowerUpManager: Activating power-up type: ${type}`);
    if (gameManager && gameManager.customization && gameManager.customization.activatePowerUp) {
      gameManager.customization.activatePowerUp(type, gameManager);
    }
  }

  private updatePowerUpSettings(customization: any): void {
    if (customization && customization.getSettings) {
      const settings = customization.getSettings();
      this.isEnabled = settings.powerUpsEnabled || false;
    }
  }

  private clearAllPowerUps(): void {
    if (this.powerUps.length > 0) {
      console.log(
        `Power-ups disabled - removing ${this.powerUps.length} existing power-ups`
      );
      this.powerUps = [];
    }
  }

  removePowerUp(id: string): void {
    this.powerUps = this.powerUps.filter((powerUp) => powerUp.id !== id);
  }

  removePowerUpsByType(type: string): void {
    this.powerUps = this.powerUps.filter((powerUp) => powerUp.type !== type);
  }

  addPowerUp(x: number, y: number, type: string): void {
    if (!this.powerUpTypes.includes(type)) {
      console.warn(`Unknown power-up type: ${type}`);
      return;
    }

    const newPowerUp: PowerUp = {
      x,
      y,
      type,
      id: `powerup_${Date.now()}_${Math.random()}`,
    };

    this.powerUps.push(newPowerUp);
  }

  getPowerUpsByType(type: string): PowerUp[] {
    return this.powerUps.filter((powerUp) => powerUp.type === type);
  }

  isPowerUpsEnabled(): boolean {
    return this.isEnabled;
  }

  setPowerUpsEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.clearAllPowerUps();
    }
  }

  reset(): void {
    this.powerUps = [];
    this.isEnabled = true;
  }

  getAvailablePowerUpTypes(): string[] {
    return [...this.powerUpTypes];
  }

  isValidPowerUpType(type: string): boolean {
    return this.powerUpTypes.includes(type);
  }
}
