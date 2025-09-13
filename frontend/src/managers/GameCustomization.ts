export interface GameSettings {
  ballSpeed: number
  paddleSpeed: number
  winningScore: number
  powerUpsEnabled: boolean
  mapTheme: string
}

export interface PowerUp {
  id: string
  name: string
  description: string
  effect: (game: any) => void
  duration: number
  icon: string
  color: string
}

export interface MapTheme {
  id: string
  name: string
  backgroundColor: string
  paddleColor: string
  ballColor: string
  lineColor: string
  backgroundPattern?: string
}

export class GameCustomization {
  private static instance: GameCustomization
  private settings: GameSettings
  private activePowerUps: Map<string, { powerUp: PowerUp; endTime: number }> = new Map()

  // Available power-ups
  private powerUps: PowerUp[] = [
    {
      id: 'speed_boost',
      name: 'Speed Boost',
      description: 'Increases ball speed for 10 seconds',
      effect: (game) => {
        // console.log(`⚡ Speed Boost effect triggered!`)
        // console.log(`⚡ Original ball speed: ${game.ball.speed}`)
        const originalSpeed = game.ball.speed
        game.ball.speed *= 1.5
        game.ball.dx *= 1.5
        game.ball.dy *= 1.5
        // console.log(`⚡ New ball speed: ${game.ball.speed}`)
        // console.log(`⚡ Ball velocity: dx=${game.ball.dx.toFixed(2)}, dy=${game.ball.dy.toFixed(2)}`)
        setTimeout(() => {
          // console.log(`⚡ Speed Boost expired, restoring original speed: ${originalSpeed}`)
          game.ball.speed = originalSpeed
          game.ball.dx = game.ball.dx > 0 ? originalSpeed : -originalSpeed
          game.ball.dy = game.ball.dy > 0 ? originalSpeed : -originalSpeed
        }, 10000)
      },
      duration: 10000,
      icon: '⚡',
      color: '#FFD700'
    },
    {
      id: 'paddle_grow',
      name: 'Paddle Grow',
      description: 'Increases paddle size for 8 seconds',
      effect: (game) => {
        // console.log(`📏 Paddle Grow effect triggered!`)
        // console.log(`📏 Original paddle height: ${game.leftPaddle.height}`)
        const originalHeight = game.leftPaddle.height
        game.leftPaddle.height *= 1.5
        game.rightPaddle.height *= 1.5
        // console.log(`📏 New paddle height: ${game.leftPaddle.height}`)
        setTimeout(() => {
          // console.log(`📏 Paddle Grow expired, restoring original height: ${originalHeight}`)
          game.leftPaddle.height = originalHeight
          game.rightPaddle.height = originalHeight
        }, 8000)
      },
      duration: 8000,
      icon: '📏',
      color: '#00FF00'
    },
    {
      id: 'slow_motion',
      name: 'Slow Motion',
      description: 'Slows down the ball for 6 seconds',
      effect: (game) => {
        // console.log(`🐌 Slow Motion effect triggered!`)
        // console.log(`🐌 Original ball speed: ${game.ball.speed}`)
        const originalSpeed = game.ball.speed
        game.ball.speed *= 0.5
        game.ball.dx *= 0.5
        game.ball.dy *= 0.5
        // console.log(`🐌 New ball speed: ${game.ball.speed}`)
        // console.log(`🐌 Ball velocity: dx=${game.ball.dx.toFixed(2)}, dy=${game.ball.dy.toFixed(2)}`)
        setTimeout(() => {
          // console.log(`🐌 Slow Motion expired, restoring original speed: ${originalSpeed}`)
          game.ball.speed = originalSpeed
          game.ball.dx = game.ball.dx > 0 ? originalSpeed : -originalSpeed
          game.ball.dy = game.ball.dy > 0 ? originalSpeed : -originalSpeed
        }, 6000)
      },
      duration: 6000,
      icon: '🐌',
      color: '#87CEEB'
    },
    {
      id: 'multi_ball',
      name: 'Multi Ball',
      description: 'Creates additional balls for 12 seconds',
      effect: (game) => {
        // console.log(`⚽ Multi Ball effect triggered!`)
        // console.log(`⚽ Current additional balls: ${game.additionalBalls ? game.additionalBalls.length : 0}`)
        if (!game.additionalBalls) game.additionalBalls = []
        const newBall = {
          x: game.ball.x,
          y: game.ball.y,
          radius: game.ball.radius,
          dx: -game.ball.dx,
          dy: game.ball.dy,
          speed: game.ball.speed
        }
        game.additionalBalls.push(newBall)
        // console.log(`⚽ New ball added! Total additional balls: ${game.additionalBalls.length}`)
        // console.log(`⚽ New ball position: (${newBall.x.toFixed(1)}, ${newBall.y.toFixed(1)})`)
        // console.log(`⚽ New ball velocity: dx=${newBall.dx.toFixed(2)}, dy=${newBall.dy.toFixed(2)}`)
        setTimeout(() => {
          // console.log(`⚽ Multi Ball expired, removing additional ball`)
          game.additionalBalls = game.additionalBalls.filter((b: any) => b !== newBall)
          // console.log(`⚽ Remaining additional balls: ${game.additionalBalls.length}`)
        }, 12000)
      },
      duration: 12000,
      icon: '⚽',
      color: '#FF69B4'
    }
  ]

  // Available map themes
  private mapThemes: MapTheme[] = [
    {
      id: 'classic',
      name: 'Classic',
      backgroundColor: '#000000',
      paddleColor: '#ffffff',
      ballColor: '#ffffff',
      lineColor: '#ffffff'
    },
    {
      id: 'neon',
      name: 'Neon',
      backgroundColor: '#0a0a0a',
      paddleColor: '#00ffff',
      ballColor: '#ff00ff',
      lineColor: '#ffff00'
    },
    {
      id: 'sunset',
      name: 'Sunset',
      backgroundColor: '#2c1810',
      paddleColor: '#ff6b35',
      ballColor: '#f7931e',
      lineColor: '#ffd23f'
    },
    {
      id: 'ocean',
      name: 'Ocean',
      backgroundColor: '#001f3f',
      paddleColor: '#7fdbff',
      ballColor: '#39cccc',
      lineColor: '#01ff70'
    },
    {
      id: 'forest',
      name: 'Forest',
      backgroundColor: '#0f5132',
      paddleColor: '#90ee90',
      ballColor: '#32cd32',
      lineColor: '#228b22'
    },
    {
      id: 'space',
      name: 'Space',
      backgroundColor: '#1a1a2e',
      paddleColor: '#e94560',
      ballColor: '#f9ca24',
      lineColor: '#6c5ce7'
    }
  ]

  private constructor() {
    this.settings = this.loadSettings()
  }

  static getInstance(): GameCustomization {
    if (!GameCustomization.instance) {
      GameCustomization.instance = new GameCustomization()
    }
    return GameCustomization.instance
  }

  private loadSettings(): GameSettings {
    const saved = localStorage.getItem('gameSettings')
    if (saved) {
      return { ...this.getDefaultSettings(), ...JSON.parse(saved) }
    }
    return this.getDefaultSettings()
  }

  private getDefaultSettings(): GameSettings {
    return {
      ballSpeed: 4,
      paddleSpeed: 5,
      winningScore: 5,
      powerUpsEnabled: false,
      mapTheme: 'classic'
    }
  }

  saveSettings(): void {
    localStorage.setItem('gameSettings', JSON.stringify(this.settings))
  }

  getSettings(): GameSettings {
    return { ...this.settings }
  }

  updateSettings(newSettings: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...newSettings }
    this.saveSettings()
  }

  getPowerUps(): PowerUp[] {
    return [...this.powerUps]
  }

  getMapThemes(): MapTheme[] {
    return [...this.mapThemes]
  }

  getCurrentTheme(): MapTheme {
    return this.mapThemes.find(theme => theme.id === this.settings.mapTheme) || this.mapThemes[0]
  }

  activatePowerUp(powerUpId: string, game: any): void {
    // console.log(`🎁 Attempting to activate power-up: ${powerUpId}`)
    // console.log(`🎁 Power-ups enabled: ${this.settings.powerUpsEnabled}`)
    
    const powerUp = this.powerUps.find(p => p.id === powerUpId)
    if (!powerUp) {
      // console.log(`🎁 Power-up not found: ${powerUpId}`)
      return
    }
    
    if (!this.settings.powerUpsEnabled) {
      // console.log(`🎁 Power-ups are disabled in settings`)
      return
    }

    // console.log(`🎁 Activating power-up: ${powerUp.name} (${powerUp.description})`)
    const endTime = Date.now() + powerUp.duration
    this.activePowerUps.set(powerUpId, { powerUp, endTime })
    powerUp.effect(game)
    // console.log(`🎁 Power-up activated! Duration: ${powerUp.duration}ms, End time: ${new Date(endTime).toLocaleTimeString()}`)
  }

  getActivePowerUps(): Array<{ powerUp: PowerUp; endTime: number }> {
    const now = Date.now()
    const active = Array.from(this.activePowerUps.values()).filter(p => p.endTime > now)
    
    // Clean up expired power-ups
    this.activePowerUps.forEach((value, key) => {
      if (value.endTime <= now) {
        this.activePowerUps.delete(key)
      }
    })
    
    return active
  }

  clearPowerUps(): void {
    this.activePowerUps.clear()
  }

  applySettingsToGame(game: any): void {
    // Apply ball speed - normalize the direction and apply new speed
    const currentSpeed = Math.sqrt(game.ball.dx * game.ball.dx + game.ball.dy * game.ball.dy)
    if (currentSpeed > 0) {
      const directionX = game.ball.dx / currentSpeed
      const directionY = game.ball.dy / currentSpeed
      game.ball.dx = directionX * this.settings.ballSpeed
      game.ball.dy = directionY * this.settings.ballSpeed
    }
    game.ball.speed = this.settings.ballSpeed

    // Apply paddle speed
    game.leftPaddle.speed = this.settings.paddleSpeed
    game.rightPaddle.speed = this.settings.paddleSpeed

    // Apply winning score
    game.winningScore = this.settings.winningScore

    // Debug logging
    // console.log('🎮 Game settings applied:', {
    //   ballSpeed: this.settings.ballSpeed,
    //   paddleSpeed: this.settings.paddleSpeed,
    //   winningScore: this.settings.winningScore,
    //   powerUpsEnabled: this.settings.powerUpsEnabled,
    //   mapTheme: this.settings.mapTheme
    // })
  }

  renderCustomizationMenu(): string {
    //const currentTheme = this.getCurrentTheme()
    
    return `
      <div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60]">
        <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-3xl font-black bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent orbitron-font">
              Game Customization
            </h2>
            <button onclick="closeCustomizationMenu()" class="text-white hover:text-cyan-400 text-2xl">
              ✕
            </button>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Game Settings -->
            <div class="space-y-6">
              <h3 class="text-xl font-bold text-white border-b border-white/20 pb-2 orbitron-font">Game Settings</h3>
              
              <div>
                <label class="block text-white font-semibold mb-2">Ball Speed: <span id="ballSpeedValue">${this.settings.ballSpeed}</span></label>
                <input type="range" id="ballSpeed" min="2" max="8" value="${this.settings.ballSpeed}" 
                       class="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer">
              </div>

              <div>
                <label class="block text-white font-semibold mb-2">Paddle Speed: <span id="paddleSpeedValue">${this.settings.paddleSpeed}</span></label>
                <input type="range" id="paddleSpeed" min="3" max="8" value="${this.settings.paddleSpeed}" 
                       class="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer">
              </div>

              <div>
                <label class="block text-white font-semibold mb-2">Winning Score: <span id="winningScoreValue">${this.settings.winningScore}</span></label>
                <input type="range" id="winningScore" min="3" max="10" value="${this.settings.winningScore}" 
                       class="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer">
              </div>

              <div class="flex items-center space-x-3">
                <input type="checkbox" id="powerUpsEnabled" ${this.settings.powerUpsEnabled ? 'checked' : ''} 
                       class="w-5 h-5 text-cyan-400 bg-white/10 border-white/20 rounded focus:ring-cyan-400">
                <label class="text-white font-semibold">Enable Power-ups</label>
              </div>
            </div>

            <!-- Map Themes -->
            <div class="space-y-6">
              <h3 class="text-xl font-bold text-white border-b border-white/20 pb-2 orbitron-font">Map Themes</h3>
              
              <div class="grid grid-cols-2 gap-4">
                ${this.mapThemes.map(theme => `
                  <div class="relative">
                    <input type="radio" id="theme_${theme.id}" name="mapTheme" value="${theme.id}" 
                           ${this.settings.mapTheme === theme.id ? 'checked' : ''} class="hidden">
                    <label for="theme_${theme.id}" class="block cursor-pointer">
                      <div class="p-4 rounded-lg border-2 transition-all duration-300 ${
                        this.settings.mapTheme === theme.id 
                          ? 'border-cyan-400 bg-cyan-400/20' 
                          : 'border-white/20 bg-white/5 hover:bg-white/10'
                      }">
                        <div class="flex items-center space-x-3">
                          <div class="w-8 h-8 rounded" style="background: ${theme.backgroundColor}"></div>
                          <div class="flex-1">
                            <div class="text-white font-semibold">${theme.name}</div>
                            <div class="text-gray-400 text-sm">Theme</div>
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Power-ups Preview -->
          <div id="powerUpsPreview" class="mt-8 transition-opacity duration-300" style="display: ${this.settings.powerUpsEnabled ? 'block' : 'none'}; opacity: ${this.settings.powerUpsEnabled ? '1' : '0'};">
            <h3 class="text-xl font-bold text-white border-b border-white/20 pb-2 mb-4 orbitron-font">Available Power-ups</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              ${this.powerUps.map(powerUp => `
                <div class="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                  <div class="text-2xl mb-2">${powerUp.icon}</div>
                  <div class="text-white font-semibold text-sm">${powerUp.name}</div>
                  <div class="text-gray-400 text-xs">${powerUp.description}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end space-x-4 mt-8 pt-6 border-t border-white/20">
            <button onclick="resetToDefaults()" 
                    class="px-3 py-1.5 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-600/30 transition-colors text-xs font-medium">
              Reset to Defaults
            </button>
            <button onclick="saveCustomizationSettings()" 
                    class="px-3 py-1.5 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-600/30 transition-colors text-xs font-medium">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    `
  }

  renderSettingsButton(): string {
    return `
      <button onclick="openCustomizationMenu()" 
              class="fixed top-20 right-4 z-50 p-2 text-white hover:text-cyan-400 transition-all duration-300 transform hover:scale-110 bg-black/20 backdrop-blur-sm rounded-lg border border-white/10">
        <span class="text-2xl">⚙️</span>
      </button>
    `
  }

  renderActivePowerUps(): string {
    const active = this.getActivePowerUps()
    if (active.length === 0) return ''

    return `
      <div class="fixed top-16 left-4 z-50 space-y-2">
        ${active.map(({ powerUp, endTime }) => {
          const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
          const progress = (remaining / (powerUp.duration / 1000)) * 100
          
          return `
            <div class="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 shadow-lg">
              <div class="flex items-center space-x-3">
                <span class="text-2xl">${powerUp.icon}</span>
                <div class="flex-1">
                  <div class="text-white font-semibold text-sm">${powerUp.name}</div>
                  <div class="text-gray-400 text-xs">${remaining}s remaining</div>
                  <div class="w-full bg-white/20 rounded-full h-1 mt-1">
                    <div class="bg-gradient-to-r from-cyan-400 to-purple-500 h-1 rounded-full transition-all duration-300" 
                         style="width: ${progress}%"></div>
                  </div>
                </div>
              </div>
            </div>
          `
        }).join('')}
      </div>
    `
  }
} 