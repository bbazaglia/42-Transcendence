import { Router } from './utils/Router'
import { TournamentManager } from './managers/TournamentManager'
import { GameManager } from './managers/GameManager'
import { GameCustomization } from './managers/GameCustomization'
import { AuthModal } from './components/AuthModal'
import { authService } from './services/AuthService'
import { matchService } from './services/MatchService'
import { friendsService } from './services/FriendsService'
import { apiService } from './services/ApiService'

export class App {
  private router: Router
  private tournamentManager: TournamentManager
  private gameManager: GameManager
  private customization: GameCustomization
  private authModal: AuthModal
  private rootElement: HTMLElement

  constructor() {
    this.router = new Router()
    this.tournamentManager = new TournamentManager()
    this.gameManager = new GameManager()
    this.customization = GameCustomization.getInstance()
    this.authModal = new AuthModal()
    this.rootElement = document.getElementById('root')!
  }

  init(): void {
    this.setupRouting()
    this.setupCustomizationHandlers()
    this.setupAuthListeners()
    this.initializeAuth()
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

    // Expose auth debug methods
    ; (window as any).debugAuth = {
      checkState: () => authService.debugAuthState(),
      clearAuth: () => {
        localStorage.removeItem('authState')
        console.log('Auth state cleared from localStorage')
      },
      forceLogout: () => {
        authService.logout()
        this.updateAuthStatus()
      }
    }
  }

  private setupRouting(): void {
    this.router.addRoute('/', () => this.showHomePage())
    this.router.addRoute('/tournament', () => this.showTournamentPage())
    this.router.addRoute('/game', () => this.showGamePage(false)) // Tournament game
    this.router.addRoute('/quick-game', () => this.showGamePage(true)) // Quick game
    this.router.addRoute('/register', () => this.showRegistrationPage())
    this.router.addRoute('/profile', () => this.showProfilePage())

    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
      this.render()
    })
  }

  private render(): void {
    const currentPath = window.location.pathname
    this.router.navigate(currentPath)
    
    // Setup auth bar listeners after rendering
    this.setupAuthBarListeners()
  }

  private showHomePage(): void {
    this.rootElement.innerHTML = `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        ${this.renderAuthBar()}
        
        <!-- Main content -->
        <div class="relative z-10 flex items-center justify-center min-h-screen px-4 pt-20">
          <div class="text-center max-w-4xl">

            
            <!-- Title -->
            <h1 class="text-7xl font-black mb-4 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent pt-4 pb-2 leading-tight press-start-font">
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


    // Auth button listeners are set up in the main render() method
  }

  private showTournamentPage(): void {
    const tournament = this.tournamentManager.getCurrentTournament()
    if (!tournament) {
      this.showRegistrationPage()
      return
    }

    this.rootElement.innerHTML = `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        ${this.renderAuthBar()}
        
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

  private showGamePage(isQuickGame: boolean): void {
    this.rootElement.innerHTML = `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        ${this.renderAuthBar()}
        
        <!-- Main content -->
        <div class="relative z-10 flex items-center justify-center min-h-screen px-4 pt-20">
          <div class="text-center">
            <h2 class="text-5xl font-black mb-6 text-cyan-400 orbitron-font">
              ${isQuickGame ? 'Quick Game' : 'Tournament Match'}
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

    // Auth bar listeners are set up in the main render() method
  }

  private showRegistrationPage(): void {
    this.rootElement.innerHTML = `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        ${this.renderAuthBar()}
        
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

  private async showProfilePage(): Promise<void> {
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      this.rootElement.innerHTML = `
        <div class="min-h-screen mesh-gradient relative overflow-hidden">
          ${this.renderAuthBar()}
          
          <!-- Main content -->
          <div class="relative z-10 flex items-center justify-center min-h-screen px-4 pt-20">
            <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20 shadow-2xl text-center">
              <h2 class="text-3xl font-black mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent orbitron-font">
                Login Required
              </h2>
              <p class="text-gray-300 mb-6">You need to be logged in to view your profile.</p>
              <button id="login-btn-profile" 
                      class="group relative px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 hover:from-purple-500 hover:to-cyan-500 overflow-hidden">
                <span class="relative z-10">Sign In</span>
                <div class="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>
        </div>
      `
      
      // Add event listener for login button
      document.getElementById('login-btn-profile')?.addEventListener('click', (e) => {
        e.preventDefault()
        this.authModal.show('login')
      })
      return
    }

    const currentUser = authService.getCurrentUser()
    if (!currentUser) return

    // Show loading state
    this.rootElement.innerHTML = `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        ${this.renderAuthBar()}
        
        <!-- Main content -->
        <div class="relative z-10 p-8 pt-24">
          <div class="max-w-6xl mx-auto">
            <!-- Header -->
            <div class="text-center mb-12">
              <h1 class="text-5xl font-black mb-4 text-cyan-400 orbitron-font">
                Profile
              </h1>
              <p class="text-gray-300 text-lg">Manage your profile, friends, and view your statistics</p>
            </div>
            
            <!-- Loading -->
            <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 text-center border border-white/20 shadow-2xl">
              <div class="animate-spin w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p class="text-white text-lg">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    `

    // Load profile data
    await this.loadProfileData()
  }

  private async loadProfileData(): Promise<void> {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) return

    try {
      // Load all profile data in parallel
      const [matches, friends, pendingRequests] = await Promise.all([
        matchService.getUserMatchHistory(currentUser.id),
        friendsService.getFriends(),
        friendsService.getPendingRequests()
      ])

      this.renderProfilePage(currentUser, matches, friends, pendingRequests)
    } catch (error) {
      console.error('Error loading profile data:', error)
      this.renderProfileError()
    }
  }

  private renderProfilePage(user: any, matches: any[], friends: any[], pendingRequests: any[]): void {
    const winRate = user.wins + user.losses > 0 ? ((user.wins / (user.wins + user.losses)) * 100).toFixed(1) : '0.0'

    this.rootElement.innerHTML = `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        ${this.renderAuthBar()}
        
        <!-- Main content -->
        <div class="relative z-10 p-8 pt-24">
          <div class="max-w-7xl mx-auto">
            <!-- Header -->
            <div class="text-center mb-12">
              <h1 class="text-5xl font-black mb-4 text-cyan-400 orbitron-font">
                Profile
              </h1>
              <p class="text-gray-300 text-lg">Manage your profile, friends, and view your statistics</p>
            </div>
            
            <!-- Profile Overview -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <!-- User Info Card -->
              <div class="lg:col-span-1">
                <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
                  <div class="text-center">
                    <!-- Avatar -->
                    <div class="w-24 h-24 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <img src="${user.avatarUrl || '/avatars/default-avatar.png'}" 
                           alt="Avatar" 
                           class="w-24 h-24 rounded-full object-cover"
                           onerror="this.src='/avatars/default-avatar.png'">
                    </div>
                    
                    <!-- User Name -->
                    <h2 class="text-2xl font-bold text-white mb-2">${user.displayName}</h2>
                    <p class="text-gray-400 text-sm mb-6">${user.email}</p>
                    
                    <!-- Edit Profile Button -->
                    <button id="edit-profile-btn" 
                            class="w-full px-4 py-2 bg-cyan-600/20 text-white border border-cyan-500/30 rounded-lg hover:bg-cyan-600/30 transition-colors text-sm font-medium">
                      Edit Profile
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- Stats Card -->
              <div class="lg:col-span-2">
                <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
                  <h3 class="text-2xl font-bold text-cyan-400 mb-6 orbitron-font">Statistics</h3>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div class="text-center">
                      <div class="text-3xl font-bold text-emerald-400">${user.wins}</div>
                      <div class="text-gray-400 text-sm">Wins</div>
                    </div>
                    <div class="text-center">
                      <div class="text-3xl font-bold text-red-400">${user.losses}</div>
                      <div class="text-gray-400 text-sm">Losses</div>
                    </div>
                    <div class="text-center">
                      <div class="text-3xl font-bold text-cyan-400">${winRate}%</div>
                      <div class="text-gray-400 text-sm">Win Rate</div>
                    </div>
                    <div class="text-center">
                      <div class="text-3xl font-bold text-purple-400">${matches.length}</div>
                      <div class="text-gray-400 text-sm">Matches</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Friends and Match History Tabs -->
            <div class="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl">
              <!-- Tab Navigation -->
              <div class="flex border-b border-white/20">
                <button id="friends-tab" 
                        class="flex-1 px-6 py-4 text-white font-medium border-b-2 border-cyan-400 bg-cyan-400/10">
                  Friends (${friends.length})
                </button>
                <button id="matches-tab" 
                        class="flex-1 px-6 py-4 text-gray-400 font-medium border-b-2 border-transparent hover:text-white hover:border-white/20 transition-colors">
                  Match History (${matches.length})
                </button>
              </div>
              
              <!-- Tab Content -->
              <div class="p-12">
                <!-- Friends Tab Content -->
                <div id="friends-content">
                  ${this.renderFriendsContent(friends, pendingRequests)}
                </div>
                
                <!-- Matches Tab Content -->
                <div id="matches-content" class="hidden">
                  ${this.renderMatchesContent(matches)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `

    this.setupProfileEventListeners()
  }

  private renderFriendsContent(friends: any[], pendingRequests: any[]): string {
    return `
      <div class="space-y-6">
        <!-- Pending Requests -->
        ${pendingRequests.length > 0 ? `
          <div>
            <h4 class="text-lg font-semibold text-white mb-4">Pending Friend Requests</h4>
            <div class="space-y-3">
              ${pendingRequests.map(request => `
                <div class="flex items-center justify-between bg-white/5 rounded-lg p-4">
                  <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full flex items-center justify-center">
                      <img src="${request.avatarUrl || '/avatars/default-avatar.png'}" 
                           alt="Avatar" 
                           class="w-10 h-10 rounded-full object-cover"
                           onerror="this.src='/avatars/default-avatar.png'">
                    </div>
                    <div>
                      <div class="text-white font-medium">${request.displayName}</div>
                      <div class="text-gray-400 text-sm">${request.email}</div>
                    </div>
                  </div>
                  <div class="flex space-x-2">
                    <button class="accept-request-btn px-3 py-1 bg-cyan-600/20 text-white border border-cyan-500/30 text-sm rounded hover:bg-cyan-600/30 transition-colors" 
                            data-sender-id="${request.id}">
                      Accept
                    </button>
                    <button class="reject-request-btn px-3 py-1 bg-red-600/20 text-white border border-red-500/30 text-sm rounded hover:bg-red-600/30 transition-colors" 
                            data-sender-id="${request.id}">
                      Reject
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <!-- Friends List -->
        <div>
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-lg font-semibold text-white">Friends (${friends.length})</h4>
            <button id="add-friend-btn" 
                    class="px-4 py-2 bg-cyan-600/20 text-white border border-cyan-500/30 text-sm rounded-lg hover:bg-cyan-600/30 transition-colors">
              Add Friend
            </button>
          </div>
          
          ${friends.length > 0 ? `
            <div class="space-y-3">
              ${friends.map(friend => `
                <div class="flex items-center justify-between bg-white/5 rounded-lg p-4">
                  <div class="flex items-center space-x-3">
                    <div class="relative">
                      <div class="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full flex items-center justify-center">
                        <img src="${friend.avatarUrl || '/avatars/default-avatar.png'}" 
                             alt="Avatar" 
                             class="w-10 h-10 rounded-full object-cover"
                             onerror="this.src='/avatars/default-avatar.png'">
                      </div>
                      <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${friend.isOnline ? 'bg-emerald-400' : 'bg-gray-400'} border-2 border-white"></div>
                    </div>
                    <div>
                      <div class="text-white font-medium">${friend.displayName}</div>
                      <div class="text-gray-400 text-sm">${friend.wins}W - ${friend.losses}L</div>
                    </div>
                  </div>
                  <button class="remove-friend-btn px-3 py-1 bg-red-600/20 text-white border border-red-500/30 text-sm rounded hover:bg-red-600/30 transition-colors" 
                          data-friend-id="${friend.id}">
                    Remove
                  </button>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="text-center py-8">
              <h3 class="text-xl font-bold mb-2 text-white">No Friends Yet</h3>
              <p class="text-gray-300 mb-6">Add friends to start playing together!</p>
              <button id="add-friend-btn-empty" 
                      class="px-6 py-3 bg-cyan-600/20 text-white border border-cyan-500/30 font-bold rounded-xl hover:bg-cyan-600/30 transition-colors">
                Add Your First Friend
              </button>
            </div>
          `}
        </div>
      </div>
    `
  }

  private renderMatchesContent(matches: any[]): string {
    return matches.length > 0 ? `
      <div class="space-y-4">
        ${matches.map(match => `
          <div class="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <div class="text-sm text-cyan-400 font-semibold">
                  ${new Date(match.playedAt).toLocaleDateString()}
                </div>
                <div class="text-white font-medium">
                  Player ${match.playerOneId} vs Player ${match.playerTwoId}
                </div>
              </div>
              <div class="flex items-center space-x-4">
                <div class="text-white font-bold text-lg">
                  ${match.playerOneScore} - ${match.playerTwoScore}
                </div>
                <div class="text-emerald-400 text-sm font-semibold">
                  Winner: Player ${match.winnerId}
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="text-center py-8">
        <h3 class="text-xl font-bold mb-2 text-white">No Matches Yet</h3>
        <p class="text-gray-300 mb-6">Start playing to see your match history here!</p>
        <button id="play-first-game-btn" 
                class="px-6 py-3 bg-cyan-600/20 text-white border border-cyan-500/30 font-bold rounded-xl hover:bg-cyan-600/30 transition-colors">
          Play Your First Game
        </button>
      </div>
    `
  }

  private renderProfileError(): void {
    this.rootElement.innerHTML = `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        ${this.renderAuthBar()}
        
        <!-- Main content -->
        <div class="relative z-10 flex items-center justify-center min-h-screen px-4 pt-20">
          <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20 shadow-2xl text-center">
            <h2 class="text-3xl font-black mb-4 bg-gradient-to-r from-red-400 to-pink-500 bg-clip-text text-transparent orbitron-font">
              Error Loading Profile
            </h2>
            <p class="text-gray-300 mb-6">There was an error loading your profile data. Please try again.</p>
            <button id="retry-profile-btn" 
                    class="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105">
              Try Again
            </button>
          </div>
        </div>
      </div>
    `
    
    document.getElementById('retry-profile-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.showProfilePage()
    })
  }

  private setupProfileEventListeners(): void {
    // Tab switching
    document.getElementById('friends-tab')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.switchProfileTab('friends')
    })

    document.getElementById('matches-tab')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.switchProfileTab('matches')
    })

    // Friend management
    this.setupFriendEventListeners()

    // Edit profile
    document.getElementById('edit-profile-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.showEditProfileModal()
    })

    // Play first game button
    document.getElementById('play-first-game-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      window.history.pushState({}, '', '/quick-game')
      this.render()
    })
  }

  private switchProfileTab(tab: 'friends' | 'matches'): void {
    const friendsTab = document.getElementById('friends-tab')
    const matchesTab = document.getElementById('matches-tab')
    const friendsContent = document.getElementById('friends-content')
    const matchesContent = document.getElementById('matches-content')

    if (tab === 'friends') {
      friendsTab?.classList.add('text-white', 'border-cyan-400', 'bg-cyan-400/10')
      friendsTab?.classList.remove('text-gray-400', 'border-transparent')
      matchesTab?.classList.add('text-gray-400', 'border-transparent')
      matchesTab?.classList.remove('text-white', 'border-cyan-400', 'bg-cyan-400/10')
      friendsContent?.classList.remove('hidden')
      matchesContent?.classList.add('hidden')
    } else {
      matchesTab?.classList.add('text-white', 'border-cyan-400', 'bg-cyan-400/10')
      matchesTab?.classList.remove('text-gray-400', 'border-transparent')
      friendsTab?.classList.add('text-gray-400', 'border-transparent')
      friendsTab?.classList.remove('text-white', 'border-cyan-400', 'bg-cyan-400/10')
      matchesContent?.classList.remove('hidden')
      friendsContent?.classList.add('hidden')
    }
  }

  private setupFriendEventListeners(): void {
    // Accept friend request
    document.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('accept-request-btn')) {
        const senderId = parseInt(target.getAttribute('data-sender-id') || '0')
        if (senderId) {
          const result = await friendsService.acceptFriendRequest(senderId)
          if (result.success) {
            this.showProfilePage() // Refresh the page
          }
        }
      }
    })

    // Reject friend request
    document.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('reject-request-btn')) {
        const senderId = parseInt(target.getAttribute('data-sender-id') || '0')
        if (senderId) {
          // For now, we'll just refresh the page. In a real implementation, you'd have a reject endpoint
          this.showProfilePage()
        }
      }
    })

    // Remove friend
    document.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('remove-friend-btn')) {
        const friendId = parseInt(target.getAttribute('data-friend-id') || '0')
        if (friendId) {
          const result = await friendsService.removeFriend(friendId)
          if (result.success) {
            this.showProfilePage() // Refresh the page
          }
        }
      }
    })

    // Add friend buttons
    document.getElementById('add-friend-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.showAddFriendModal()
    })

    document.getElementById('add-friend-btn-empty')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.showAddFriendModal()
    })
  }

  private showEditProfileModal(): void {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) return

    const modalHTML = `
      <div id="edit-profile-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20 shadow-2xl">
            <h3 class="text-2xl font-bold text-cyan-400 mb-6 text-center orbitron-font">Edit Profile</h3>
            
            <form id="edit-profile-form" class="space-y-4">
              <div>
                <label class="block text-white font-semibold mb-2">Display Name:</label>
                <input type="text" id="edit-display-name" 
                       value="${currentUser.displayName}"
                       class="w-full p-3 rounded-xl bg-white/10 text-white border border-white/20 placeholder-white/50 focus:border-cyan-400 focus:outline-none transition-colors"
                       required>
              </div>
              
              <div>
                <label class="block text-white font-semibold mb-2">Avatar URL:</label>
                <input type="url" id="edit-avatar-url" 
                       value="${currentUser.avatarUrl || ''}"
                       placeholder="https://example.com/avatar.jpg"
                       class="w-full p-3 rounded-xl bg-white/10 text-white border border-white/20 placeholder-white/50 focus:border-cyan-400 focus:outline-none transition-colors">
              </div>
              
              <div class="flex space-x-3">
                <button type="submit" 
                        class="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all duration-300">
                  Save Changes
                </button>
                <button type="button" id="cancel-edit-profile" 
                        class="flex-1 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-500 text-white font-bold rounded-xl shadow-lg hover:from-gray-700 hover:to-gray-600 transition-all duration-300">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `

    document.body.insertAdjacentHTML('beforeend', modalHTML)

    // Event listeners
    document.getElementById('edit-profile-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      await this.handleProfileUpdate()
    })

    document.getElementById('cancel-edit-profile')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.closeEditProfileModal()
    })

    // Close on outside click
    document.getElementById('edit-profile-modal')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('edit-profile-modal')) {
        this.closeEditProfileModal()
      }
    })
  }

  private async handleProfileUpdate(): Promise<void> {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) return

    const displayName = (document.getElementById('edit-display-name') as HTMLInputElement)?.value
    const avatarUrl = (document.getElementById('edit-avatar-url') as HTMLInputElement)?.value

    try {
      const response = await apiService.updateUserProfile(currentUser.id, {
        displayName,
        avatarUrl: avatarUrl || undefined
      })

      if (response.error) {
        console.error('Failed to update profile:', response.error)
        return
      }

      // Update local user data
      authService.updateUserProfile(response.data!)
      this.closeEditProfileModal()
      this.showProfilePage() // Refresh the page

    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  private closeEditProfileModal(): void {
    document.getElementById('edit-profile-modal')?.remove()
  }

  private showAddFriendModal(): void {
    const modalHTML = `
      <div id="add-friend-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20 shadow-2xl">
            <h3 class="text-2xl font-bold text-cyan-400 mb-6 text-center orbitron-font">Add Friend</h3>
            
            <form id="add-friend-form" class="space-y-4">
              <div>
                <label class="block text-white font-semibold mb-2">Search by Display Name:</label>
                <input type="text" id="friend-search" 
                       placeholder="Enter friend's display name"
                       class="w-full p-3 rounded-xl bg-white/10 text-white border border-white/20 placeholder-white/50 focus:border-cyan-400 focus:outline-none transition-colors"
                       required>
              </div>
              
              <div id="search-results" class="space-y-2 max-h-40 overflow-y-auto">
                <!-- Search results will appear here -->
              </div>
              
              <div class="flex space-x-3">
                <button type="button" id="cancel-add-friend" 
                        class="flex-1 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-500 text-white font-bold rounded-xl shadow-lg hover:from-gray-700 hover:to-gray-600 transition-all duration-300">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `

    document.body.insertAdjacentHTML('beforeend', modalHTML)

    // Event listeners
    document.getElementById('friend-search')?.addEventListener('input', async (e) => {
      const query = (e.target as HTMLInputElement).value
      if (query.length > 2) {
        await this.searchUsers(query)
      } else {
        document.getElementById('search-results')!.innerHTML = ''
      }
    })

    document.getElementById('cancel-add-friend')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.closeAddFriendModal()
    })

    // Close on outside click
    document.getElementById('add-friend-modal')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('add-friend-modal')) {
        this.closeAddFriendModal()
      }
    })
  }

  private async searchUsers(query: string): Promise<void> {
    try {
      const response = await apiService.searchUsers(query)
      const results = response.data || []
      
      const resultsHTML = results.map((user: any) => `
        <div class="flex items-center justify-between bg-white/5 rounded-lg p-3">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full flex items-center justify-center">
              <img src="${user.avatarUrl || '/avatars/default-avatar.png'}" 
                   alt="Avatar" 
                   class="w-8 h-8 rounded-full object-cover"
                   onerror="this.src='/avatars/default-avatar.png'">
            </div>
            <div>
              <div class="text-white font-medium">${user.displayName}</div>
              <div class="text-gray-400 text-sm">${user.email}</div>
            </div>
          </div>
          <button class="send-friend-request-btn px-3 py-1 bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm rounded hover:from-purple-700 hover:to-cyan-700 transition-all duration-300" 
                  data-user-id="${user.id}">
            Add
          </button>
        </div>
      `).join('')

      document.getElementById('search-results')!.innerHTML = resultsHTML

      // Add event listeners for send friend request buttons
      document.querySelectorAll('.send-friend-request-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const userId = parseInt((e.target as HTMLElement).getAttribute('data-user-id') || '0')
          if (userId) {
            const result = await friendsService.sendFriendRequest(userId)
            if (result.success) {
              this.closeAddFriendModal()
              this.showProfilePage() // Refresh the page
            }
          }
        })
      })

    } catch (error) {
      console.error('Error searching users:', error)
    }
  }

  private closeAddFriendModal(): void {
    document.getElementById('add-friend-modal')?.remove()
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
    // Update UI with current auth status from localStorage
    this.updateAuthStatus()
    
    // Only verify session with server if user appears to be authenticated
    if (authService.isAuthenticated()) {
      // Verify the session is still valid with the server in background
      authService.checkAuthStatus().catch(error => {
        console.error('Auth verification failed:', error)
      })
    }
  }

  private setupAuthListeners(): void {
    // Listen for auth state changes
    authService.subscribe(() => {
      this.updateAuthStatus()
    })
  }

  private updateAuthStatus(): void {
    const userInfo = document.getElementById('user-info')
    const guestInfo = document.getElementById('guest-info')
    const userName = document.getElementById('user-name')
    const userInitial = document.getElementById('user-initial')
    const userWins = document.getElementById('user-wins')
    const userLosses = document.getElementById('user-losses')

    // Mobile elements
    const mobileUserInfo = document.getElementById('mobile-user-info')
    const mobileGuestInfo = document.getElementById('mobile-guest-info')
    const mobileUserName = document.getElementById('mobile-user-name')
    const mobileUserInitial = document.getElementById('mobile-user-initial')
    const mobileUserWins = document.getElementById('mobile-user-wins')
    const mobileUserLosses = document.getElementById('mobile-user-losses')

    if (authService.isAuthenticated()) {
      const user = authService.getCurrentUser()
      if (user) {
        // Desktop elements
        userName!.textContent = user.displayName
        userInitial!.textContent = user.displayName.charAt(0).toUpperCase()
        userWins!.textContent = `${user.wins}W`
        userLosses!.textContent = `${user.losses}L`
        userInfo?.classList.remove('hidden')
        guestInfo?.classList.add('hidden')

        // Mobile elements
        mobileUserName!.textContent = user.displayName
        mobileUserInitial!.textContent = user.displayName.charAt(0).toUpperCase()
        mobileUserWins!.textContent = `${user.wins}W`
        mobileUserLosses!.textContent = `${user.losses}L`
        mobileUserInfo?.classList.remove('hidden')
        mobileGuestInfo?.classList.add('hidden')
      }
    } else {
      // Desktop elements
      userInfo?.classList.add('hidden')
      guestInfo?.classList.remove('hidden')

      // Mobile elements
      mobileUserInfo?.classList.add('hidden')
      mobileGuestInfo?.classList.remove('hidden')
    }
  }

  private renderAuthBar(): string {
    return `
      <!-- Auth Bar -->
      <div class="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div class="max-w-7xl mx-auto px-4 py-3">
          <div class="flex items-center justify-between">
            <!-- Logo/Brand -->
            <div class="flex items-center space-x-3">
              <h1 class="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent orbitron-font">
                Pong Tournament
              </h1>
            </div>
            
            <!-- Desktop Navigation -->
            <div class="hidden md:flex items-center space-x-6">
              <a href="/" class="nav-link text-white hover:text-cyan-400 transition-colors font-medium">Home</a>
              <a href="/tournament" class="nav-link text-white hover:text-cyan-400 transition-colors font-medium">Tournament</a>
              <a href="/quick-game" class="nav-link text-white hover:text-cyan-400 transition-colors font-medium">Quick Game</a>
              <button id="desktop-profile-btn" class="nav-link text-white hover:text-cyan-400 transition-colors font-medium">Profile</button>
            </div>
            
            <!-- Mobile Menu Button -->
            <div class="md:hidden">
              <button id="mobile-menu-btn" class="text-white hover:text-cyan-400 transition-colors p-2">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </button>
            </div>
            
            <!-- Auth Status -->
            <div id="auth-status" class="hidden md:flex items-center space-x-4">
              <div id="user-info" class="hidden flex items-center space-x-3">
                <div class="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full flex items-center justify-center">
                  <span class="text-sm font-bold text-white" id="user-initial"></span>
                </div>
                <div class="flex flex-col">
                  <span class="text-white text-sm">Olá, <span id="user-name" class="text-cyan-400 font-semibold"></span>!</span>
                  <div class="flex items-center space-x-2 text-xs text-gray-300">
                    <span id="user-wins">0</span>
                    <span class="text-gray-500">|</span>
                    <span id="user-losses">0</span>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <button id="profile-btn" 
                          class="px-3 py-1.5 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-600/30 transition-colors text-xs font-medium"
                          title="View Profile">
                    👤 Profile
                  </button>
                  <button id="logout-btn" class="px-3 py-1.5 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-colors text-xs font-medium">
                    Sair
                  </button>
                </div>
              </div>
              <div id="guest-info" class="flex items-center space-x-2">
                <button id="login-btn" class="px-4 py-2 bg-black/60 text-white font-medium rounded-lg border border-white/20 hover:bg-white/10 hover:border-white/40 transition-all duration-300 text-sm transform hover:scale-105">
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Mobile Menu -->
        <div id="mobile-menu" class="md:hidden hidden bg-black/40 backdrop-blur-md border-t border-white/10">
          <div class="px-4 py-4 space-y-4">
            <!-- Mobile Navigation Links -->
            <div class="space-y-3">
              <a href="/" class="block text-white hover:text-cyan-400 transition-colors font-medium py-2">🏠 Home</a>
              <a href="/tournament" class="block text-white hover:text-cyan-400 transition-colors font-medium py-2">🏆 Tournament</a>
              <a href="/quick-game" class="block text-white hover:text-cyan-400 transition-colors font-medium py-2">⚡ Quick Game</a>
              <button id="mobile-nav-profile-btn" class="block text-white hover:text-cyan-400 transition-colors font-medium py-2 text-left">👤 Profile</button>
            </div>
            
            <!-- Mobile Auth Status -->
            <div class="border-t border-white/20 pt-4">
              <div id="mobile-user-info" class="hidden">
                <div class="flex items-center space-x-3 mb-4">
                  <div class="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full flex items-center justify-center">
                    <span class="text-sm font-bold text-white" id="mobile-user-initial"></span>
                  </div>
                  <div class="flex flex-col">
                    <span class="text-white text-sm">Olá, <span id="mobile-user-name" class="text-cyan-400 font-semibold"></span>!</span>
                    <div class="flex items-center space-x-2 text-xs text-gray-300">
                      <span id="mobile-user-wins">0</span>
                      <span class="text-gray-500">|</span>
                      <span id="mobile-user-losses">0</span>
                    </div>
                  </div>
                </div>
                <div class="space-y-2">
                  <button id="mobile-profile-btn" 
                          class="w-full px-4 py-2 bg-black/60 text-white border border-white/20 rounded-lg hover:bg-white/10 hover:border-white/40 transition-all duration-300 text-sm font-medium">
                    👤 View Profile
                  </button>
                  <button id="mobile-logout-btn" class="w-full px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-colors text-sm font-medium">
                    Sair
                  </button>
                </div>
              </div>
              <div id="mobile-guest-info" class="flex items-center space-x-2">
                <button id="mobile-login-btn" class="w-full px-4 py-2 bg-black/60 text-white font-medium rounded-lg border border-white/20 hover:bg-white/10 hover:border-white/40 transition-all duration-300 text-sm transform hover:scale-105">
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  private setupAuthBarListeners(): void {
    // Remove existing listeners to prevent duplicates
    this.removeAuthBarListeners()

    // Desktop Auth button listeners
    document.getElementById('login-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.authModal.show('login')
    })

    document.getElementById('profile-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      window.history.pushState({}, '', '/profile')
      this.render()
    })

    document.getElementById('logout-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      authService.logout()
      this.updateAuthStatus()
    })

    // Mobile Auth button listeners
    document.getElementById('mobile-login-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.authModal.show('login')
    })

    document.getElementById('mobile-profile-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      window.history.pushState({}, '', '/profile')
      this.render()
    })

    document.getElementById('mobile-logout-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      authService.logout()
      this.updateAuthStatus()
    })

    // Mobile menu toggle
    document.getElementById('mobile-menu-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.toggleMobileMenu()
    })

    // Navigation link listeners
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault()
        const href = (link as HTMLAnchorElement).getAttribute('href')
        if (href) {
          window.history.pushState({}, '', href)
          this.render()
        }
      })
    })

    // Desktop profile button listener
    document.getElementById('desktop-profile-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      if (authService.isAuthenticated()) {
        window.history.pushState({}, '', '/profile')
        this.render()
      } else {
        this.authModal.show('login')
      }
    })

    // Mobile navigation link listeners
    document.querySelectorAll('#mobile-menu a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault()
        const href = (link as HTMLAnchorElement).getAttribute('href')
        if (href) {
          this.closeMobileMenu()
          window.history.pushState({}, '', href)
          this.render()
        }
      })
    })

    // Mobile profile button listener
    document.getElementById('mobile-nav-profile-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.closeMobileMenu()
      if (authService.isAuthenticated()) {
        window.history.pushState({}, '', '/profile')
        this.render()
      } else {
        this.authModal.show('login')
      }
    })

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
      const mobileMenu = document.getElementById('mobile-menu')
      const mobileMenuBtn = document.getElementById('mobile-menu-btn')
      
      if (mobileMenu && !mobileMenu.contains(e.target as Node) && !mobileMenuBtn?.contains(e.target as Node)) {
        this.closeMobileMenu()
      }
    })
  }

  private removeAuthBarListeners(): void {
    // Remove all existing event listeners by cloning and replacing elements
    const elementsToClean = [
      'login-btn', 'profile-btn', 'logout-btn',
      'mobile-login-btn', 'mobile-profile-btn', 'mobile-logout-btn',
      'mobile-menu-btn', 'desktop-profile-btn', 'mobile-nav-profile-btn'
    ]

    elementsToClean.forEach(id => {
      const element = document.getElementById(id)
      if (element) {
        const newElement = element.cloneNode(true)
        element.parentNode?.replaceChild(newElement, element)
      }
    })

    // Remove navigation link listeners
    document.querySelectorAll('.nav-link').forEach(link => {
      const newLink = link.cloneNode(true)
      link.parentNode?.replaceChild(newLink, link)
    })

    // Remove mobile menu link listeners
    document.querySelectorAll('#mobile-menu a').forEach(link => {
      const newLink = link.cloneNode(true)
      link.parentNode?.replaceChild(newLink, link)
    })
  }

  private toggleMobileMenu(): void {
    const mobileMenu = document.getElementById('mobile-menu')
    if (mobileMenu) {
      mobileMenu.classList.toggle('hidden')
    }
  }

  private closeMobileMenu(): void {
    const mobileMenu = document.getElementById('mobile-menu')
    if (mobileMenu) {
      mobileMenu.classList.add('hidden')
    }
  }
}
