import { Router } from './utils/Router'
import { TournamentManager } from './managers/TournamentManager'
import { GameManager } from './managers/GameManager'
import { GameCustomization } from './managers/GameCustomization'
import { AuthModal } from './components/AuthModal'
import { Navbar } from './components/Navbar'
import { Lobby } from './components/Lobby'
import { PageService } from './services/PageService'
import { sessionService } from './services/SessionService'
import { tournamentService } from './services/TournamentService'

export class App {
  private router: Router
  private tournamentManager: TournamentManager
  private gameManager: GameManager
  private customization: GameCustomization
  private authModal: AuthModal
  private navbar: Navbar
  private lobby: Lobby
  private pageService: PageService
  private rootElement: HTMLElement

  constructor() {
    this.router = new Router()
    this.tournamentManager = new TournamentManager()
    this.gameManager = new GameManager()
    this.customization = GameCustomization.getInstance()
    this.authModal = new AuthModal()
    this.navbar = new Navbar(this.authModal)
    this.lobby = new Lobby(this.authModal)
    this.pageService = new PageService(this.authModal)
    this.rootElement = document.getElementById('root')!
  }

  init(): void {
    this.setupRouting()
    this.setupCustomizationHandlers()
    this.setupAuthListeners()
    this.initializeAuth()
    this.renderNavbar()
    this.lobby.init()
    this.render()

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
    this.router.addRoute('/game', () => this.showGamePage(false, false))
    this.router.addRoute('/quick-game', () => this.showGamePage(true, false))
    this.router.addRoute('/play-ai', () => this.showGamePage(true, true))
    this.router.addRoute('/register', () => this.showRegistrationPage())
    this.router.addRoute('/profile', () => this.showProfilePage())
    
    // Dynamic route for specific user profiles
    this.router.addDynamicRoute(/^\/profile\/(?<userId>\d+)$/, (params) => {
      this.showProfilePage(parseInt(params.userId))
    })

    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
      this.render()
    })
  }

  private render(): void {
    const currentPath = window.location.pathname

    // Then navigate to the specific page
    this.router.navigate(currentPath)
  }

  private renderNavbar(): void {
    // Check if navbar already exists
    const existingNavbar = document.getElementById('navbar')
    if (existingNavbar) {
      return // Already rendered, don't re-render
    }

    // Create navbar
    const navbar = document.createElement('div')
    navbar.id = 'navbar'
    navbar.innerHTML = this.navbar.render()

    // Insert before root element
    // This ensures navbar is always above the main content
    this.rootElement.parentElement?.insertBefore(navbar, this.rootElement)

    // Setup event listeners once
    this.setupNavbarListeners()
  }

  private setupNavbarListeners(): void {
    // Setup navbar event listeners
    this.navbar.setupEventListeners(
      (path: string) => {
        window.history.pushState({}, '', path)
        this.render()
      }
    )
  }

  private showHomePage(): void {
    this.rootElement.innerHTML = this.pageService.renderHomePage()

    // Setup event listeners
    this.pageService.setupHomePageListeners((path: string) => {
      window.history.pushState({}, '', path)
      this.render()
    })
  }

  private async showTournamentPage(): Promise<void> {
    // Check if user is authenticated
    if (!sessionService.isAuthenticated()) {
      this.rootElement.innerHTML = `
        <div class="min-h-screen mesh-gradient relative overflow-hidden">
          <div class="relative z-10 flex items-center justify-center min-h-screen px-4 pt-20">
            <div class="text-center">
              <h1 class="text-4xl font-bold text-white mb-4">Login Required</h1>
              <p class="text-gray-300 mb-6">You need to be logged in to view tournaments</p>
              <button id="go-home-btn"
                      class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                Go Home
              </button>
            </div>
          </div>
        </div>
      `

      // Add event listener
      document.getElementById('go-home-btn')?.addEventListener('click', () => {
        window.history.pushState({}, '', '/')
        this.render()
      })
      return
    }

    // Load tournaments from backend
    await this.loadTournaments()

    const tournament = this.tournamentManager.getCurrentTournament()
    if (!tournament) {
      this.showRegistrationPage()
      return
    }

    this.rootElement.innerHTML = `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        
        <!-- Main content -->
        <div class="relative z-10 p-8 pt-24">
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
            
          </div>
        </div>
      </div>
    `
    this.afterRenderTournamentPage()
  }

  private showGamePage(isQuickGame: boolean, isAIGame: boolean = false): void {

    // Check if user is authenticated
    if (!sessionService.isAuthenticated()) {
      this.rootElement.innerHTML = `
        <div class="min-h-screen mesh-gradient relative overflow-hidden">
          <div class="relative z-10 flex items-center justify-center min-h-screen px-4 pt-20">
            <div class="text-center">
              <h1 class="text-4xl font-bold text-white mb-4">Login Required</h1>
              <p class="text-gray-300 mb-6">You need to be logged in to play games</p>
              <button if="go-home-btn"
                      class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                Go Home
              </button>
            </div>
          </div>
        </div>
      `
      // Add event listener
      document.getElementById('go-home-btn')?.addEventListener('click', () => {
        window.history.pushState({}, '', '/')
        this.render()
      })

      return
    }


    this.rootElement.innerHTML = `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        
        <!-- Main content -->
        <div class="relative z-10 flex items-center justify-center min-h-screen px-4 pt-20">
          <div class="text-center">
            <h2 class="text-5xl font-black mb-6 text-cyan-400 orbitron-font">
              ${isAIGame ? 'Player vs AI' : (isQuickGame ? 'Quick Game' : 'Tournament Match')}
            </h2>
            <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl relative">
              <canvas id="gameCanvas" width="800" height="400" class="border-2 border-white/30 rounded-lg shadow-2xl"></canvas>
              
              <!-- Game Over Buttons (for quick games only) -->
              ${isQuickGame ? `
                <div id="game-over-buttons" class="absolute inset-0 flex items-center justify-center hidden">
                  <div class="bg-black/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center">
                    <h3 class="text-3xl font-bold text-cyan-400 mb-2 orbitron-font">Game Over</h3>
                    <p class="text-xl text-yellow-400 mb-6" id="winner-text">Player Wins!</p>
                    <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
                      <button id="play-again-btn" 
                              class="px-6 py-3 bg-cyan-600/20 text-white border border-cyan-500/30 font-bold rounded-xl hover:bg-cyan-600/30 transition-colors">
                        Play Again
                      </button>
                      <button id="back-main-btn" 
                              class="px-6 py-3 bg-cyan-600/20 text-white border border-cyan-500/30 font-bold rounded-xl hover:bg-cyan-600/30 transition-colors">
                        Back to Home
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
          </div>
        </div>
      </div>
      ${this.customization.renderSettingsButton()}
      ${this.customization.renderActivePowerUps()}
    `

    if (isQuickGame) {
      // Quick game - start without tournament manager
      console.log(`Starting quick game. Is AI game: ${isAIGame}`)
      this.gameManager.startGame(undefined, undefined, this.customization, isAIGame)

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
        // Tournament games are never AI games for now
        this.gameManager.startGame(this.tournamentManager, {
          player1: nextMatch.player1!,
          player2: nextMatch.player2!
        }, this.customization, false)
      } else {
        console.log('No next match found, starting game without tournament')
        this.gameManager.startGame(undefined, undefined, this.customization, false)
      }
    }

    // Auth bar listeners are set up in the main render() method
  }

  private showRegistrationPage(): void {
    this.rootElement.innerHTML = `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        
        <!-- Main content -->
        <div class="relative z-10 p-8 pt-24">
          <div class="max-w-7xl mx-auto">
            <!-- Header -->
            <div class="text-center mb-12">
              <h1 class="text-5xl font-black mb-6 leading-tight text-cyan-400 orbitron-font">
              Tournament Registration
              </h1>
              <p class="text-gray-300 text-lg">Set up your tournament bracket</p>
            </div>
            
            <!-- Registration Form Card -->
            <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl max-w-2xl mx-auto">
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
                        class="w-full px-6 py-3 bg-cyan-600/20 text-white border border-cyan-500/30 font-bold rounded-xl hover:bg-cyan-600/30 transition-colors">
                  Start Tournament
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    `
    this.setupRegistrationForm()
  }

  private async showProfilePage(userId?: number): Promise<void> {
    this.rootElement.innerHTML = await this.pageService.renderProfilePage((path: string) => {
      window.history.pushState({}, '', path)
      this.render()
    }, userId)
  }


  private async loadTournaments(): Promise<void> {
    try {
      // Load tournaments from backend
      await tournamentService.getTournaments()
      console.log('Tournaments loaded from backend')
    } catch (error) {
      console.error('Error loading tournaments:', error)
    }
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
    ; (window as any).openCustomizationMenu = () => {
      this.rootElement.insertAdjacentHTML('beforeend', this.customization.renderCustomizationMenu())
      this.setupCustomizationFormHandlers()
    }

      ; (window as any).closeCustomizationMenu = () => {
        this.closeCustomizationMenu()
      }

      ; (window as any).saveCustomizationSettings = () => {
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

      ; (window as any).resetToDefaults = () => {
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
        <h3 class="text-2xl font-bold mb-6 text-cyan-400 flex items-center">
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
          <h3 class="text-2xl font-bold mb-4 text-cyan-400 orbitron-font">Waiting for Matches</h3>
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
        <h3 class="text-2xl font-bold mb-4 text-cyan-400 orbitron-font">Next Match</h3>
        <div class="text-3xl font-bold text-white mb-6 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          ${nextMatch.player1} vs ${nextMatch.player2}
        </div>
        <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button id="start-match-btn" 
                  class="px-6 py-3 bg-cyan-600/20 text-white border border-cyan-500/30 font-bold rounded-xl hover:bg-cyan-600/30 transition-colors">
            Start Match
          </button>
          <button id="reset-tournament-btn-next" 
                  class="px-6 py-3 bg-red-600/20 text-white border border-red-500/30 font-bold rounded-xl hover:bg-red-600/30 transition-colors">
            Reset Tournament
          </button>
        </div>
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
    document.getElementById('reset-tournament-btn-next')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.tournamentManager.resetTournament()
      window.history.pushState({}, '', '/register')
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

  // Auth-related methods
  private async initializeAuth(): Promise<void> {

    // Only verify session with server if user appears to be authenticated
    if (sessionService.isAuthenticated()) {
      // Verify the session is still valid with the server in background
      sessionService.checkSessionStatus().catch(error => {
        console.error('Auth verification failed:', error)
      })
    }
  }

  private setupAuthListeners(): void {
    // Listen for auth state changes
    sessionService.subscribe(() => {
      // Re-render the entire app to update lobby and other components
      this.render()
    })
  }
}
