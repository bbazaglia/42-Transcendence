import { Router } from './Router'
import { TournamentManager } from './TournamentManager'
import { GameManager } from './GameManager'
import { GameCustomization } from './GameCustomization'

export class App {
  private router: Router
  private tournamentManager: TournamentManager
  private gameManager: GameManager
  private customization: GameCustomization
  private rootElement: HTMLElement

  constructor() {
    this.router = new Router()
    this.tournamentManager = new TournamentManager()
    this.gameManager = new GameManager()
    this.customization = GameCustomization.getInstance()
    this.rootElement = document.getElementById('root')!
  }

  init(): void {
    this.setupRouting()
    this.render()
    this.setupCustomizationHandlers()
    
    // Listen for tournament updates
    window.addEventListener('tournament-updated', () => {
      console.log('Tournament updated, re-rendering...')
      this.render()
    })

      // Expose debug methods to window for testing
      ; (window as any).debugTournament = {
        setMatchResult: (matchIndex: number, winner: string) => {
          this.tournamentManager.debugSetMatchResult(matchIndex, winner)
          this.render() // Refresh the display
        },
        getCurrentTournament: () => this.tournamentManager.getCurrentTournament(),
        resetTournament: () => {
          this.tournamentManager.resetTournament()
          this.render() // Refresh the display
        },
        clearStorage: () => {
          localStorage.removeItem('currentTournament')
          console.log('localStorage cleared')
        },
        testFirstMatch: () => {
          const tournament = this.tournamentManager.getCurrentTournament()
          if (tournament && tournament.matches[0]) {
            const match = tournament.matches[0]
            if (match.player1 && match.player2) {
              console.log('Testing first match result...')
              this.tournamentManager.debugSetMatchResult(0, match.player1)
              window.location.reload()
            }
          }
        }
      }
  }

  private setupRouting(): void {
    this.router.addRoute('/', () => this.showHomePage())
    this.router.addRoute('/tournament', () => this.showTournamentPage())
    this.router.addRoute('/game', () => this.showGamePage(false)) // Tournament game
    this.router.addRoute('/quick-game', () => this.showGamePage(true)) // Quick game
    this.router.addRoute('/register', () => this.showRegistrationPage())

    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
      this.render()
    })
  }

  private render(): void {
    const currentPath = window.location.pathname
    this.router.navigate(currentPath)
  }

  private showHomePage(): void {
    this.rootElement.innerHTML = `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        
        <!-- Main content -->
        <div class="relative z-10 flex items-center justify-center min-h-screen px-4">
          <div class="text-center max-w-4xl">

            
            <!-- Title -->
            <h1 class="text-7xl font-black mb-4 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mt-16 pt-4 pb-2 leading-tight press-start-font">
              Pong Tournament
            </h1>
            
            <!-- Subtitle -->
            <p class="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
              Experience the ultimate competitive Pong experience with tournament brackets, 
              real-time gameplay, epic battles for glory, and customizable game options.
            </p>
            
            <!-- Action buttons -->
            <div class="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <button id="tournament-btn" 
                      class="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold text-xl rounded-xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
                <span class="relative z-10 orbitron-font">🏆 Start Tournament</span>
                <div class="absolute inset-0 bg-gradient-to-r from-purple-700 to-cyan-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              
              <button id="quick-game-btn" 
                      class="group relative px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-500 text-white font-bold text-xl rounded-xl shadow-2xl hover:shadow-teal-500/25 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
                <span class="relative z-10 orbitron-font">⚡ Quick Game</span>
                <div class="absolute inset-0 bg-gradient-to-r from-teal-700 to-cyan-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              
              <button onclick="openCustomizationMenu()" 
                      class="group relative px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-500 text-white font-bold text-xl rounded-xl shadow-2xl hover:shadow-pink-500/25 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
                <span class="relative z-10 orbitron-font">⚙️ Customize Game</span>
                <div class="absolute inset-0 bg-gradient-to-r from-pink-700 to-purple-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
            
            <!-- Features preview -->
            <div class="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div class="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300">
                <h3 class="text-lg font-semibold text-white mb-2 orbitron-font">Local Multiplayer</h3>
                <p class="text-gray-400 text-sm">Play against friends on the same device with smooth 60fps gameplay</p>
              </div>
              
              <div class="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300">
                <h3 class="text-lg font-semibold text-white mb-2 orbitron-font">Tournament Brackets</h3>
                <p class="text-gray-400 text-sm">Organize epic tournaments with up to 16 players</p>
              </div>
              
              <div class="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300">
                <h3 class="text-lg font-semibold text-white mb-2 orbitron-font">Game Customization</h3>
                <p class="text-gray-400 text-sm">Customize themes, power-ups, difficulty, and game settings</p>
              </div>
              
              <div class="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300">
                <h3 class="text-lg font-semibold text-white mb-2 orbitron-font">Power-ups & Effects</h3>
                <p class="text-gray-400 text-sm">Experience exciting power-ups that enhance gameplay</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
    document.getElementById('quick-game-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      window.history.pushState({}, '', '/quick-game')
      this.render()
    })

    document.getElementById('tournament-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      window.history.pushState({}, '', '/tournament')
      this.render()
    })
  }

  private showTournamentPage(): void {
    const tournament = this.tournamentManager.getCurrentTournament()
    if (!tournament) {
      this.showRegistrationPage()
      return
    }

    this.rootElement.innerHTML = `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        
        <!-- Main content -->
        <div class="relative z-10 p-8">
          <div class="max-w-6xl mx-auto">
            <!-- Header -->
            <div class="text-center mb-12">
              <h1 class="text-5xl font-black mb-4 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent orbitron-font">
                Tournament Bracket
              </h1>
              <p class="text-gray-300 text-lg">Follow the action and see who advances to the next round</p>
            </div>
            
            ${this.renderTournamentBracket(tournament)}
            ${this.renderNextMatch(tournament)}
            
            <!-- Action Buttons -->
            <div class="text-center mt-8 space-x-4">
              <button id="back-home-btn" 
                      class="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium rounded-lg shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 text-sm">
                ← Back to Home
              </button>
              <button id="reset-tournament-btn" 
                      class="px-4 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-medium rounded-lg shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-105 text-sm">
                Reset Tournament
              </button>
            </div>
          </div>
        </div>
      </div>
    `
    document.getElementById('back-home-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      window.history.pushState({}, '', '/')
      this.render()
    })
    document.getElementById('reset-tournament-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.tournamentManager.resetTournament()
      window.history.pushState({}, '', '/register')
      this.render()
    })
    this.afterRenderTournamentPage()
  }

  private showGamePage(isQuickGame: boolean): void {
    this.rootElement.innerHTML = `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        
        <!-- Main content -->
        <div class="relative z-10 flex items-center justify-center min-h-screen px-4">
          <div class="text-center">
            <h2 class="text-4xl font-black mb-6 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent press-start-font">
              ${isQuickGame ? 'Quick Game' : 'Tournament Match'}
            </h2>
            <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl relative">
              <canvas id="gameCanvas" width="800" height="400" class="border-2 border-white/30 rounded-lg shadow-2xl"></canvas>
              
              <!-- Game Over Buttons (for quick games only) -->
              ${isQuickGame ? `
                <div id="game-over-buttons" class="absolute inset-0 flex items-center justify-center hidden">
                  <div class="bg-black/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center">
                    <h3 class="text-3xl font-bold text-white mb-2">Game Over</h3>
                    <p class="text-xl text-yellow-400 mb-6" id="winner-text">Player Wins!</p>
                    <div class="space-y-4">
                      <button id="play-again-btn" 
                              class="px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-500 text-white font-bold rounded-lg shadow-lg hover:shadow-teal-500/25 transition-all duration-300 transform hover:scale-105 mr-4">
                        Play Again
                      </button>
                      <button id="back-main-btn" 
                              class="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold rounded-lg shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105">
                        Back to Main
                      </button>
                    </div>
                  </div>
                </div>
              ` : ''}
            </div>
            <div class="mt-6 text-white space-y-2">
              <p class="text-lg font-semibold">Controls</p>
              <p class="text-gray-300">Player 1: <span class="text-cyan-400 font-mono">W</span> / <span class="text-cyan-400 font-mono">S</span> keys</p>
              <p class="text-gray-300">Player 2: <span class="text-purple-400 font-mono">↑</span> / <span class="text-purple-400 font-mono">↓</span> arrow keys</p>
              <p class="text-gray-300">Pause: <span class="text-yellow-400 font-mono">SPACE</span> key</p>
            </div>
            
            <!-- Back to Home Button -->
            <div class="mt-6">
              <button id="back-home-btn" 
                      class="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium rounded-lg shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 text-sm">
                ← Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
      ${this.customization.renderSettingsButton()}
      ${this.customization.renderActivePowerUps()}
    `
    
    if (isQuickGame) {
      // Quick game - start without tournament manager
      console.log('Starting quick game without tournament')
      this.gameManager.startGame(undefined, undefined, this.customization)
      
      // Set up game over button handlers for quick games
      this.setupQuickGameButtons()
    } else {
      // Tournament game - get the next match from tournament manager
      console.log('=== GETTING NEXT MATCH ===')
      console.log('Tournament manager instance:', this.tournamentManager)
      console.log('Current tournament:', this.tournamentManager.getCurrentTournament())

      const nextMatch = this.tournamentManager.getNextMatch()
      console.log('Next match found:', nextMatch)

      if (nextMatch) {
        console.log('Starting game with tournament manager and match:', {
          player1: nextMatch.player1,
          player2: nextMatch.player2
        })
        this.gameManager.startGame(this.tournamentManager, {
          player1: nextMatch.player1!,
          player2: nextMatch.player2!
        }, this.customization)
      } else {
        console.log('No next match found, starting game without tournament')
        this.gameManager.startGame(undefined, undefined, this.customization)
      }
    }

    // Add event listener for the Back to Home button in game page
    document.getElementById('back-home-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.gameManager.stopGame()
      window.history.pushState({}, '', '/')
      this.render()
    })
  }

  private showRegistrationPage(): void {
    this.rootElement.innerHTML = `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        
        <!-- Main content -->
        <div class="relative z-10 flex items-center justify-center min-h-screen px-4">
          <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20 shadow-2xl">
            <!-- Header -->
            <div class="text-center mb-8">
              <div class="w-16 h-16 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span class="text-2xl">🏆</span>
              </div>
              <h2 class="text-3xl font-black mb-2 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                Tournament Registration
              </h2>
              <p class="text-gray-300 text-sm">Set up your tournament bracket</p>
            </div>
            
            <form id="registrationForm" class="space-y-6">
              <div>
                <label class="block text-white font-semibold mb-3">Number of Players:</label>
                <select id="playerCount" class="w-full p-4 rounded-xl bg-white/10 text-white border border-white/20 focus:border-cyan-400 focus:outline-none transition-colors">
                  <option value="4">4 Players</option>
                  <option value="8">8 Players</option>
                  <option value="16">16 Players</option>
                </select>
              </div>
              <div id="playerInputs" class="space-y-3">
                ${this.generatePlayerInputs(4)}
              </div>
              <button type="submit" 
                      class="w-full py-4 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105">
                Start Tournament
              </button>
            </form>
          </div>
        </div>
      </div>
    `
    this.setupRegistrationForm()
  }

  private generatePlayerInputs(count: number): string {
    let inputs = ''
    for (let i = 0; i < count; i++) {
      inputs += `
        <div>
          <input type="text" 
                 placeholder="Player ${i + 1} Alias" 
                 class="w-full p-4 rounded-xl bg-white/10 text-white border border-white/20 placeholder-white/50 focus:border-cyan-400 focus:outline-none transition-colors"
                 required>
        </div>
      `
    }
    return inputs
  }

  private setupRegistrationForm(): void {
    const form = document.getElementById('registrationForm') as HTMLFormElement
    const playerCountSelect = document.getElementById('playerCount') as HTMLSelectElement
    const playerInputs = document.getElementById('playerInputs')!

    playerCountSelect.addEventListener('change', () => {
      const count = parseInt(playerCountSelect.value)
      playerInputs.innerHTML = this.generatePlayerInputs(count)
    })

    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const aliases: string[] = []
      const inputs = form.querySelectorAll('input[type="text"]')
      inputs.forEach((input) => {
        const inputElement = input as HTMLInputElement
        if (inputElement.value.trim()) {
          aliases.push(inputElement.value.trim())
        }
      })

      if (aliases.length >= 2) {
        this.tournamentManager.startTournament(aliases)
        window.history.pushState({}, '', '/tournament')
        this.render()
      }
    })
  }

  private setupCustomizationHandlers(): void {
    // Expose customization functions to window
    ;(window as any).openCustomizationMenu = () => {
      this.rootElement.insertAdjacentHTML('beforeend', this.customization.renderCustomizationMenu())
      this.setupCustomizationFormHandlers()
    }

    ;(window as any).closeCustomizationMenu = () => {
      this.closeCustomizationMenu()
    }

    ;(window as any).saveCustomizationSettings = () => {
      const ballSpeed = parseInt((document.getElementById('ballSpeed') as HTMLInputElement)?.value || '4')
      const paddleSpeed = parseInt((document.getElementById('paddleSpeed') as HTMLInputElement)?.value || '5')
      const winningScore = parseInt((document.getElementById('winningScore') as HTMLInputElement)?.value || '5')
      const powerUpsEnabled = (document.getElementById('powerUpsEnabled') as HTMLInputElement)?.checked
      const mapTheme = (document.querySelector('input[name="mapTheme"]:checked') as HTMLInputElement)?.value

      this.customization.updateSettings({
        ballSpeed,
        paddleSpeed,
        winningScore,
        powerUpsEnabled: powerUpsEnabled || false,
        mapTheme: mapTheme || 'classic'
      })

      this.closeCustomizationMenu()
    }

    ;(window as any).resetToDefaults = () => {
      this.customization.updateSettings({
        ballSpeed: 4,
        paddleSpeed: 5,
        winningScore: 5,
        powerUpsEnabled: false,
        mapTheme: 'classic'
      })
      this.closeCustomizationMenu()
      this.render()
    }
  }

  private closeCustomizationMenu(): void {
    const menu = document.querySelector('.fixed.inset-0.bg-black\\/80')
    if (menu) {
      menu.remove()
    }
  }

  private setupCustomizationFormHandlers(): void {
    // Update range input values in real-time
    const ballSpeedInput = document.getElementById('ballSpeed') as HTMLInputElement
    const paddleSpeedInput = document.getElementById('paddleSpeed') as HTMLInputElement
    const winningScoreInput = document.getElementById('winningScore') as HTMLInputElement

    ballSpeedInput?.addEventListener('input', () => {
      const valueElement = document.getElementById('ballSpeedValue')
      if (valueElement) {
        valueElement.textContent = ballSpeedInput.value
      }
    })

    paddleSpeedInput?.addEventListener('input', () => {
      const valueElement = document.getElementById('paddleSpeedValue')
      if (valueElement) {
        valueElement.textContent = paddleSpeedInput.value
      }
    })

    winningScoreInput?.addEventListener('input', () => {
      const valueElement = document.getElementById('winningScoreValue')
      if (valueElement) {
        valueElement.textContent = winningScoreInput.value
      }
    })

    // Add real-time theme selection feedback
    const themeInputs = document.querySelectorAll('input[name="mapTheme"]')
    themeInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement
        const themeId = target.value
        
        // Remove selected styling from all theme options
        document.querySelectorAll('input[name="mapTheme"]').forEach(radio => {
          const radioTarget = radio as HTMLInputElement
          const label = document.querySelector(`label[for="theme_${radioTarget.value}"]`)
          const themeDiv = label?.querySelector('div')
          if (themeDiv) {
            themeDiv.className = 'p-4 rounded-lg border-2 transition-all duration-300 border-white/20 bg-white/5 hover:bg-white/10'
          }
        })
        
        // Add selected styling to the chosen theme
        const selectedLabel = document.querySelector(`label[for="theme_${themeId}"]`)
        const selectedThemeDiv = selectedLabel?.querySelector('div')
        if (selectedThemeDiv) {
          selectedThemeDiv.className = 'p-4 rounded-lg border-2 transition-all duration-300 border-cyan-400 bg-cyan-400/20'
        }
      })
    })

    // Add real-time power-ups toggle feedback
    const powerUpsCheckbox = document.getElementById('powerUpsEnabled') as HTMLInputElement
    powerUpsCheckbox?.addEventListener('change', () => {
      const powerUpsSection = document.getElementById('powerUpsPreview')
      if (powerUpsSection) {
        if (powerUpsCheckbox.checked) {
          powerUpsSection.style.display = 'block'
          powerUpsSection.style.opacity = '1'
        } else {
          powerUpsSection.style.opacity = '0'
          setTimeout(() => {
            powerUpsSection.style.display = 'none'
          }, 300)
        }
      }
    })
  }

  private renderTournamentBracket(tournament: any): string {
    // This is a simplified bracket display
    return `
      <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 mb-8 border border-white/20 shadow-2xl">
        <h3 class="text-2xl font-bold mb-6 text-white flex items-center">
          <span class="orbitron-font">Tournament Bracket</span>
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          ${tournament.matches.map((match: any, index: number) => `
            <div class="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div class="text-sm text-cyan-400 font-semibold mb-2">Match ${index + 1}</div>
              <div class="text-white font-medium mb-2">${match.player1 || 'undefined'} vs ${match.player2 || 'undefined'}</div>
              ${match.winner ? `<div class="text-emerald-400 text-sm font-semibold">👑 Winner: ${match.winner}</div>` : '<div class="text-gray-400 text-sm">⏳ Pending</div>'}
            </div>
          `).join('')}
        </div>
      </div>
    `
  }

  private renderNextMatch(tournament: any): string {
    // Check if tournament is actually complete by looking at the final match
    const finalMatch = tournament.matches[tournament.matches.length - 1]
    if (finalMatch.winner) {
      return `
        <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 text-center border border-white/20 shadow-2xl">
          <div class="w-20 h-20 bg-gradient-to-br from-emerald-400 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span class="text-3xl">👑</span>
          </div>
          <h3 class="text-3xl font-black mb-4 bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
            Tournament Complete!
          </h3>
          <p class="text-white text-xl mb-6 font-semibold">Winner: <span class="text-emerald-400">${finalMatch.winner}</span></p>
          <button id="new-tournament-btn" 
                  class="px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105">
            🏆 New Tournament
          </button>
        </div>
      `
    }

    // Find the next match that has both players assigned and no winner
    const nextMatch = tournament.matches.find((match: any) => !match.winner && match.player1 && match.player2)

    if (!nextMatch) {
      // If no match is ready, show a waiting message
      return `
        <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 text-center border border-white/20 shadow-2xl">
          <div class="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span class="text-3xl">⏳</span>
          </div>
          <h3 class="text-2xl font-bold mb-4 text-white">Waiting for Matches</h3>
          <p class="text-gray-300 text-lg mb-6">Complete the current round to advance to the next matches</p>
          <div class="text-sm text-gray-400">
            <p>Current matches in progress:</p>
            ${tournament.matches.filter((m: any) => m.player1 && m.player2 && !m.winner).map((m: any) =>
        `<p class="mt-1">• ${m.player1} vs ${m.player2}</p>`
      ).join('')}
          </div>
        </div>
      `
    }

    return `
      <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 text-center border border-white/20 shadow-2xl">
        <div class="w-20 h-20 bg-gradient-to-br from-purple-400 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <span class="text-3xl">⚡</span>
        </div>
        <h3 class="text-2xl font-bold mb-4 text-white">Next Match</h3>
        <div class="text-3xl font-bold text-white mb-6 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          ${nextMatch.player1} vs ${nextMatch.player2}
        </div>
        <button id="start-match-btn" 
                class="px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-500 text-white font-bold rounded-xl shadow-lg hover:shadow-teal-500/25 transition-all duration-300 transform hover:scale-105">
          <span class="orbitron-font">Start Match</span>
        </button>
      </div>
    `
  }

  // After rendering tournament page, attach event listener for new-tournament-btn and start-match-btn
  private afterRenderTournamentPage(): void {
    document.getElementById('new-tournament-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.tournamentManager.resetTournament()
      window.history.pushState({}, '', '/tournament')
      this.render()
    })
    document.getElementById('start-match-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      window.history.pushState({}, '', '/game')
      this.render()
    })
  }

  // Set up game over button handlers for quick games
  private setupQuickGameButtons(): void {
    document.getElementById('play-again-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.gameManager.playAgain()
    })

    document.getElementById('back-main-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.gameManager.backToMain()
    })
  }
}
