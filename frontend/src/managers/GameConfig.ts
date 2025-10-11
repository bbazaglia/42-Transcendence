export const GAME_CONFIG = {
  CANVAS: {
    WIDTH: 800,
    HEIGHT: 400,
    CENTER_X: 400,
    CENTER_Y: 200,
  },
  PADDLE: {
    WIDTH: 10,
    HEIGHT: 50,
    SPEED: 5,
    INITIAL_Y: 175,
    LEFT_X: 10,
    RIGHT_X: 780,
  },
  BALL: {
    RADIUS: 5,
    INITIAL_SPEED: 4,
    INITIAL_X: 400,
    INITIAL_Y: 200,
  },
  POWER_UP: {
    RADIUS: 15,
    MAX_COUNT: 2,
    SPAWN_CHANCE: 0.01,
    SPAWN_AREA: {
      X_MIN: 200,
      X_MAX: 600,
      Y_MIN: 100,
      Y_MAX: 300,
    },
  },
  SCORING: {
    DEFAULT_WINNING_SCORE: 5,
  },
  COUNTDOWN: {
    INITIAL_VALUE: 3,
    INTERVAL_MS: 1000,
  },
  SETTINGS_CHECK: {
    CHANCE_PER_FRAME: 0.01, // 1% chance per frame
  },
  ANGLES: {
    MAX_BOUNCE_ANGLE: Math.PI / 3, // 30 degrees
  },
} as const;

export const DEFAULT_THEME = {
  backgroundColor: "#000000",
  paddleColor: "#ffffff",
  ballColor: "#ffffff",
  lineColor: "#ffffff",
  countdownColor: "#00ffff",
  pauseColor: "#ffffff",
} as const;

export const POWER_UP_TYPES = {
  SPEED_BOOST: {
    type: "speed_boost",
    color: "#FFD700",
    icon: "🚀",
  },
  PADDLE_GROW: {
    type: "paddle_grow",
    color: "#00FF00",
    icon: "📏",
  },
  SLOW_MOTION: {
    type: "slow_motion",
    color: "#87CEEB",
    icon: "🐌",
  },
  MULTI_BALL: {
    type: "multi_ball",
    color: "#FF69B4",
    icon: "⚽",
  },
} as const;

export enum GameState {
  COUNTDOWN = "countdown",
  RUNNING = "running",
  PAUSED = "paused",
  GAME_OVER = "game_over",
}

export const KEY_MAPPINGS = {
  PLAYER1_UP: ["w", "W"],
  PLAYER1_DOWN: ["s", "S"],
  PLAYER2_UP: ["ArrowUp"],
  PLAYER2_DOWN: ["ArrowDown"],
  PAUSE: [" "],
} as const;
