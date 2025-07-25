interface Paddle {
  x: number
  y: number
  width: number
  height: number
  speed: number
  dy: number
}

interface Ball {
  x: number
  y: number
  radius: number
  dx: number
  dy: number
  speed: number
}

export class GameManager {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private animationId: number | null = null
  private gameRunning: boolean = false

  // Game objects
  private leftPaddle: Paddle
  private rightPaddle: Paddle
  private ball: Ball
  private additionalBalls: Ball[] = []
  private powerUps: Array<{ x: number; y: number; type: string; id: string }> = []
  private score1: number = 0
  private score2: number = 0
  private winningScore: number = 5

  // Keys state
  private keys: { [key: string]: boolean } = {}

  // Tournament integration
  private currentMatch: { player1: string; player2: string } | null = null
  private tournamentManager: any = null

  // Customization integration
  private customization: any = null

  constructor() {
    this.leftPaddle = {
      x: 50,
      y: 175,
      width: 10,
      height: 50,
      speed: 5,
      dy: 0
    }

    this.rightPaddle = {
      x: 740,
      y: 175,
      width: 10,
      height: 50,
      speed: 5,
      dy: 0
    }

    this.ball = {
      x: 400,
      y: 200,
      radius: 5,
      dx: 4,
      dy: 4,
      speed: 4
    }

    this.setupKeyboardControls()
  }

  startGame(tournamentManager?: any, currentMatch?: { player1: string; player2: string }, customization?: any): void {
    console.log('=== STARTING GAME ===')
    console.log('Tournament manager passed:', !!tournamentManager)
    console.log('Current match passed:', currentMatch)
    console.log('Customization passed:', !!customization)
    
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement
    if (!this.canvas) return

    this.ctx = this.canvas.getContext('2d')
    if (!this.ctx) return

    this.tournamentManager = tournamentManager
    this.currentMatch = currentMatch || null
    this.customization = customization
    
    console.log('Game initialized with:')
    console.log('- Tournament manager:', !!this.tournamentManager)
    console.log('- Current match:', this.currentMatch)
    console.log('- Customization:', !!this.customization)

    this.resetGame()
    this.applyCustomizationSettings()
    this.gameRunning = true
    this.gameLoop()
  }

  private setupKeyboardControls(): void {
    document.addEventListener('keydown', (e) => {
      this.keys[e.key] = true
    })

    document.addEventListener('keyup', (e) => {
      this.keys[e.key] = false
    })
  }

  private resetGame(): void {
    // Reset scores
    this.score1 = 0
    this.score2 = 0
    
    // Reset ball position and speed
    this.ball.x = 400
    this.ball.y = 200
    const ballSpeed = this.customization?.getSettings().ballSpeed || 4
    this.ball.dx = Math.random() > 0.5 ? ballSpeed : -ballSpeed
    this.ball.dy = Math.random() > 0.5 ? ballSpeed : -ballSpeed

    // Reset paddle positions
    this.leftPaddle.y = 175
    this.rightPaddle.y = 175
    
    // Reset additional game elements
    this.additionalBalls = []
    this.powerUps = []
  }

  private applyCustomizationSettings(): void {
    if (!this.customization) return
    
    console.log('⚙️ Applying customization settings...')
    console.log('Current winning score before:', this.winningScore)
    
    this.customization.applySettingsToGame(this)
    
    console.log('Current winning score after:', this.winningScore)
    console.log('Settings from customization:', this.customization.getSettings())
  }

  private checkForSettingsUpdates(): void {
    if (!this.customization) return
    
    // Check if settings have changed (only check occasionally to avoid performance issues)
    if (Math.random() < 0.01) { // 1% chance per frame = ~once per 1.67 seconds
      const currentSettings = this.customization.getSettings()
      
      // Check if winning score changed
      if (currentSettings.winningScore !== this.winningScore) {
        console.log(`🎯 Winning score updated during game: ${this.winningScore} → ${currentSettings.winningScore}`)
        this.winningScore = currentSettings.winningScore
      }
      
      // Check if ball speed changed
      if (currentSettings.ballSpeed !== this.ball.speed) {
        console.log(`⚡ Ball speed updated during game: ${this.ball.speed} → ${currentSettings.ballSpeed}`)
        this.applyBallSpeedUpdate(currentSettings.ballSpeed)
      }
      
      // Check if paddle speed changed
      if (currentSettings.paddleSpeed !== this.leftPaddle.speed) {
        console.log(`🏓 Paddle speed updated during game: ${this.leftPaddle.speed} → ${currentSettings.paddleSpeed}`)
        this.leftPaddle.speed = currentSettings.paddleSpeed
        this.rightPaddle.speed = currentSettings.paddleSpeed
      }
    }
  }

  private applyBallSpeedUpdate(newSpeed: number): void {
    // Update ball speed while preserving direction
    const currentSpeed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy)
    if (currentSpeed > 0) {
      const directionX = this.ball.dx / currentSpeed
      const directionY = this.ball.dy / currentSpeed
      this.ball.dx = directionX * newSpeed
      this.ball.dy = directionY * newSpeed
    }
    this.ball.speed = newSpeed
  }

  private gameLoop(): void {
    if (!this.gameRunning) return

    this.update()
    this.render()

    this.animationId = requestAnimationFrame(() => this.gameLoop())
  }

  private update(): void {
    this.updatePaddles()
    this.updateBall()
    this.updateAdditionalBalls()
    this.updatePowerUps()
    this.checkCollisions()
    this.checkScoring()
    this.spawnPowerUps()
    this.checkForSettingsUpdates()
  }

  private updatePaddles(): void {
    // Player 1 controls (W/S keys)
    if (this.keys['w'] || this.keys['W']) {
      this.leftPaddle.dy = -this.leftPaddle.speed
    } else if (this.keys['s'] || this.keys['S']) {
      this.leftPaddle.dy = this.leftPaddle.speed
    } else {
      this.leftPaddle.dy = 0
    }

    // Player 2 controls (Arrow keys)
    if (this.keys['ArrowUp']) {
      this.rightPaddle.dy = -this.rightPaddle.speed
    } else if (this.keys['ArrowDown']) {
      this.rightPaddle.dy = this.rightPaddle.speed
    } else {
      this.rightPaddle.dy = 0
    }

    // Update paddle positions
    this.leftPaddle.y += this.leftPaddle.dy
    this.rightPaddle.y += this.rightPaddle.dy

    // Keep paddles within canvas bounds
    this.leftPaddle.y = Math.max(0, Math.min(350, this.leftPaddle.y))
    this.rightPaddle.y = Math.max(0, Math.min(350, this.rightPaddle.y))
  }

  private updateBall(): void {
    this.ball.x += this.ball.dx
    this.ball.y += this.ball.dy

    // Ball collision with top and bottom walls
    if (this.ball.y <= 0 || this.ball.y >= 400) {
      this.ball.dy = -this.ball.dy
    }
  }

  private updateAdditionalBalls(): void {
    this.additionalBalls.forEach(ball => {
      ball.x += ball.dx
      ball.y += ball.dy

      // Ball collision with top and bottom walls
      if (ball.y <= 0 || ball.y >= 400) {
        ball.dy = -ball.dy
      }
    })
  }

  private updatePowerUps(): void {
    // Power-ups can have animations or effects here
  }

  private spawnPowerUps(): void {
    if (!this.customization || !this.customization.getSettings().powerUpsEnabled) return
    
    // Spawn power-ups randomly (1% chance per frame at 60fps = ~1 power-up per 1.67 seconds)
    if (Math.random() < 0.01 && this.powerUps.length < 2) {
      const powerUpTypes = ['speed_boost', 'paddle_grow', 'slow_motion', 'multi_ball']
      const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]
      
      this.powerUps.push({
        x: Math.random() * 700 + 50,
        y: Math.random() * 300 + 50,
        type: randomType,
        id: `powerup_${Date.now()}_${Math.random()}`
      })
    }
  }

  private checkCollisions(): void {
    // Main ball collision with paddles
    this.checkBallPaddleCollision(this.ball, this.leftPaddle, this.rightPaddle)
    
    // Additional balls collision with paddles
    this.additionalBalls.forEach(ball => {
      this.checkBallPaddleCollision(ball, this.leftPaddle, this.rightPaddle)
    })
    
    // Power-up collision with paddles
    this.checkPowerUpCollisions()
  }

  private checkBallPaddleCollision(ball: Ball, leftPaddle: Paddle, rightPaddle: Paddle): void {
    // Ball collision with left paddle
    if (ball.x <= leftPaddle.x + leftPaddle.width &&
        ball.y >= leftPaddle.y &&
        ball.y <= leftPaddle.y + leftPaddle.height &&
        ball.dx < 0) {
      ball.dx = -ball.dx
      this.adjustBallAngle(ball, leftPaddle)
    }

    // Ball collision with right paddle
    if (ball.x + ball.radius >= rightPaddle.x &&
        ball.y >= rightPaddle.y &&
        ball.y <= rightPaddle.y + rightPaddle.height &&
        ball.dx > 0) {
      ball.dx = -ball.dx
      this.adjustBallAngle(ball, rightPaddle)
    }
  }

  private checkPowerUpCollisions(): void {
    if (!this.customization) return
    
    this.powerUps = this.powerUps.filter(powerUp => {
      // Check collision with left paddle
      if (powerUp.x >= this.leftPaddle.x && 
          powerUp.x <= this.leftPaddle.x + this.leftPaddle.width &&
          powerUp.y >= this.leftPaddle.y &&
          powerUp.y <= this.leftPaddle.y + this.leftPaddle.height) {
        this.customization.activatePowerUp(powerUp.type, this)
        return false // Remove power-up
      }
      
      // Check collision with right paddle
      if (powerUp.x >= this.rightPaddle.x && 
          powerUp.x <= this.rightPaddle.x + this.rightPaddle.width &&
          powerUp.y >= this.rightPaddle.y &&
          powerUp.y <= this.rightPaddle.y + this.rightPaddle.height) {
        this.customization.activatePowerUp(powerUp.type, this)
        return false // Remove power-up
      }
      
      return true // Keep power-up
    })
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
    const hitPoint = (ball.y - paddle.y) / paddle.height
    const angle = (hitPoint - 0.5) * Math.PI / 3 // -30 to 30 degrees
    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy)
    
    ball.dx = Math.cos(angle) * speed * (paddle === this.leftPaddle ? 1 : -1)
    ball.dy = Math.sin(angle) * speed
  }

  private checkScoring(): void {
    // Main ball scoring
    if (this.ball.x <= 0) {
      this.score2++
      console.log(`🎯 Player 2 scores! Score: ${this.score1}-${this.score2} (Target: ${this.winningScore})`)
      this.resetBall()
    } else if (this.ball.x >= 800) {
      this.score1++
      console.log(`🎯 Player 1 scores! Score: ${this.score1}-${this.score2} (Target: ${this.winningScore})`)
      this.resetBall()
    }

    // Additional balls scoring
    this.additionalBalls = this.additionalBalls.filter(ball => {
      if (ball.x <= 0) {
        this.score2++
        console.log(`🎯 Player 2 scores (additional ball)! Score: ${this.score1}-${this.score2} (Target: ${this.winningScore})`)
        return false
      } else if (ball.x >= 800) {
        this.score1++
        console.log(`🎯 Player 1 scores (additional ball)! Score: ${this.score1}-${this.score2} (Target: ${this.winningScore})`)
        return false
      }
      return true
    })

    // Check for game end
    if (this.score1 >= this.winningScore || this.score2 >= this.winningScore) {
      console.log(`🏆 Game Over! Final Score: ${this.score1}-${this.score2} (Target: ${this.winningScore})`)
      this.endGame()
    }
  }

  private resetBall(): void {
    this.ball.x = 400
    this.ball.y = 200
    const ballSpeed = this.customization?.getSettings().ballSpeed || 4
    this.ball.dx = Math.random() > 0.5 ? ballSpeed : -ballSpeed
    this.ball.dy = Math.random() > 0.5 ? ballSpeed : -ballSpeed
  }

  private endGame(): void {
    this.gameRunning = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }

    const winner = this.score1 > this.score2 ? 'Player 1' : 'Player 2'
    
    // Record the match result if this is a tournament match
    console.log('=== GAME ENDED ===')
    console.log('Tournament manager exists:', !!this.tournamentManager)
    console.log('Current match exists:', !!this.currentMatch)
    console.log('Current match:', this.currentMatch)
    
    if (this.tournamentManager && this.currentMatch) {
      const winnerName = winner === 'Player 1' ? this.currentMatch.player1 : this.currentMatch.player2
      console.log('Game ended, recording result:', {
        player1: this.currentMatch.player1,
        player2: this.currentMatch.player2,
        winner: winnerName,
        gameWinner: winner
      })
      this.tournamentManager.recordMatchResult(
        this.currentMatch.player1,
        this.currentMatch.player2,
        winnerName
      )
    } else {
      console.log('❌ Cannot record match result - missing tournament manager or current match')
    }

    setTimeout(() => {
      alert(`Game Over! ${winner} wins!`)
      // Use router navigation instead of full page reload
      window.history.pushState({}, '', '/tournament')
      // Trigger a custom event to notify the app to re-render
      window.dispatchEvent(new CustomEvent('tournament-updated'))
    }, 100)
  }

  private render(): void {
    if (!this.ctx || !this.canvas) return

    const ctx = this.ctx
    const canvas = this.canvas

    const theme = this.customization?.getCurrentTheme() || {
      backgroundColor: '#000000',
      paddleColor: '#ffffff',
      ballColor: '#ffffff',
      lineColor: '#ffffff'
    }

    // Clear canvas
    ctx.fillStyle = theme.backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw center line
    ctx.strokeStyle = theme.lineColor
    ctx.setLineDash([5, 15])
    ctx.beginPath()
    ctx.moveTo(400, 0)
    ctx.lineTo(400, 400)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw paddles
    ctx.fillStyle = theme.paddleColor
    ctx.fillRect(
      this.leftPaddle.x,
      this.leftPaddle.y,
      this.leftPaddle.width,
      this.leftPaddle.height
    )
    ctx.fillRect(
      this.rightPaddle.x,
      this.rightPaddle.y,
      this.rightPaddle.width,
      this.rightPaddle.height
    )

    // Draw main ball
    ctx.beginPath()
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2)
    ctx.fillStyle = theme.ballColor
    ctx.fill()
    ctx.closePath()

    // Draw additional balls
    this.additionalBalls.forEach(ball => {
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
      ctx.fillStyle = theme.ballColor
      ctx.fill()
      ctx.closePath()
    })

    // Draw power-ups
    this.powerUps.forEach(powerUp => {
      ctx.beginPath()
      ctx.arc(powerUp.x, powerUp.y, 8, 0, Math.PI * 2)
      ctx.fillStyle = this.getPowerUpColor(powerUp.type)
      ctx.fill()
      ctx.closePath()
      
      // Draw power-up icon
      ctx.fillStyle = '#ffffff'
      ctx.font = '12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(this.getPowerUpIcon(powerUp.type), powerUp.x, powerUp.y + 4)
    })

    // Draw score
    ctx.fillStyle = theme.lineColor
    ctx.font = '32px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(this.score1.toString(), 200, 50)
    ctx.fillText(this.score2.toString(), 600, 50)
  }

  private getPowerUpColor(type: string): string {
    switch (type) {
      case 'speed_boost': return '#FFD700'
      case 'paddle_grow': return '#00FF00'
      case 'slow_motion': return '#87CEEB'
      case 'multi_ball': return '#FF69B4'
      default: return '#ffffff'
    }
  }

  private getPowerUpIcon(type: string): string {
    switch (type) {
      case 'speed_boost': return '⚡'
      case 'paddle_grow': return '📏'
      case 'slow_motion': return '🐌'
      case 'multi_ball': return '⚽'
      default: return '?'
    }
  }

  stopGame(): void {
    this.gameRunning = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
  }
} 