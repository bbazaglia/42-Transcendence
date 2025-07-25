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
  private score1: number = 0
  private score2: number = 0
  private winningScore: number = 5

  // Keys state
  private keys: { [key: string]: boolean } = {}

  // Tournament integration
  private currentMatch: { player1: string; player2: string } | null = null
  private tournamentManager: any = null

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

  startGame(tournamentManager?: any, currentMatch?: { player1: string; player2: string }): void {
    console.log('=== STARTING GAME ===')
    console.log('Tournament manager passed:', !!tournamentManager)
    console.log('Current match passed:', currentMatch)

    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement
    if (!this.canvas) return

    this.ctx = this.canvas.getContext('2d')
    if (!this.ctx) return

    this.tournamentManager = tournamentManager || null
    this.currentMatch = currentMatch || null

    console.log('Game initialized with:')
    console.log('- Tournament manager:', !!this.tournamentManager)
    console.log('- Current match:', this.currentMatch)

    this.resetGame()
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
    this.ball.x = 400
    this.ball.y = 200
    this.ball.dx = Math.random() > 0.5 ? 4 : -4
    this.ball.dy = Math.random() > 0.5 ? 4 : -4

    this.leftPaddle.y = 175
    this.rightPaddle.y = 175

    this.score1 = 0
    this.score2 = 0
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
    this.checkCollisions()
    this.checkScoring()
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

  private checkCollisions(): void {
    // Ball collision with left paddle
    if (this.ball.x <= this.leftPaddle.x + this.leftPaddle.width &&
      this.ball.y >= this.leftPaddle.y &&
      this.ball.y <= this.leftPaddle.y + this.leftPaddle.height &&
      this.ball.dx < 0) {
      this.ball.dx = -this.ball.dx
      this.adjustBallAngle(this.leftPaddle)
    }

    // Ball collision with right paddle
    if (this.ball.x + this.ball.radius >= this.rightPaddle.x &&
      this.ball.y >= this.rightPaddle.y &&
      this.ball.y <= this.rightPaddle.y + this.rightPaddle.height &&
      this.ball.dx > 0) {
      this.ball.dx = -this.ball.dx
      this.adjustBallAngle(this.rightPaddle)
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
  * @param {Paddle} paddle The paddle object that the ball has just collided with.
  */
  private adjustBallAngle(paddle: Paddle): void {
    const hitPoint = (this.ball.y - paddle.y) / paddle.height
    const angle = (hitPoint - 0.5) * Math.PI / 3 // -30 to 30 degrees
    const speed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy)

    this.ball.dx = Math.cos(angle) * speed * (paddle === this.leftPaddle ? 1 : -1)
    this.ball.dy = Math.sin(angle) * speed
  }

  private checkScoring(): void {
    // Ball goes past left paddle (Player 2 scores)
    if (this.ball.x <= 0) {
      this.score2++
      this.resetBall()
    }
    // Ball goes past right paddle (Player 1 scores)
    else if (this.ball.x >= 800) {
      this.score1++
      this.resetBall()
    }

    // Check for game end
    if (this.score1 >= this.winningScore || this.score2 >= this.winningScore) {
      this.endGame()
    }
  }

  private resetBall(): void {
    this.ball.x = 400
    this.ball.y = 200
    this.ball.dx = Math.random() > 0.5 ? 4 : -4
    this.ball.dy = Math.random() > 0.5 ? 4 : -4
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
      if (this.tournamentManager && this.currentMatch) {
        window.history.pushState({}, '', '/tournament')
      } else {
        window.history.pushState({}, '', '/')
      }
      window.dispatchEvent(new CustomEvent('tournament-updated'))
    }, 100)
  }

  private render(): void {
    if (!this.ctx || !this.canvas) return

    // Clear canvas
    this.ctx.fillStyle = '#000000'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw center line
    this.ctx.strokeStyle = '#ffffff'
    this.ctx.setLineDash([5, 15])
    this.ctx.beginPath()
    this.ctx.moveTo(400, 0)
    this.ctx.lineTo(400, 400)
    this.ctx.stroke()
    this.ctx.setLineDash([])

    // Draw paddles
    this.ctx.fillStyle = '#ffffff'
    this.ctx.fillRect(
      this.leftPaddle.x,
      this.leftPaddle.y,
      this.leftPaddle.width,
      this.leftPaddle.height
    )
    this.ctx.fillRect(
      this.rightPaddle.x,
      this.rightPaddle.y,
      this.rightPaddle.width,
      this.rightPaddle.height
    )

    // Draw ball
    this.ctx.beginPath()
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2)
    this.ctx.fillStyle = '#ffffff'
    this.ctx.fill()
    this.ctx.closePath()

    // Draw score
    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = '32px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(this.score1.toString(), 200, 50)
    this.ctx.fillText(this.score2.toString(), 600, 50)
  }

  stopGame(): void {
    this.gameRunning = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
  }
}
