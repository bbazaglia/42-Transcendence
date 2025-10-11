import { ProfilePage } from '../pages/ProfilePage'
import { userSelectionModal } from '../components/UserSelectionModal.js'

export class PageService {
  private profilePage: ProfilePage
  private gameManager?: any

  constructor(authModal: any, gameManager?: any) {
    this.profilePage = new ProfilePage(authModal, gameManager)
    this.gameManager = gameManager
  }

  async renderProfilePage(onNavigate: (path: string) => void, userId?: number): Promise<string> {
    const html = await this.profilePage.render(userId)
    
    // Setup event listeners after rendering - use requestAnimationFrame for better browser compatibility
    requestAnimationFrame(() => {
      this.profilePage.setupEventListeners(onNavigate)
    })
    
    return html
  }

  // Placeholder methods for other pages (to be implemented)
  renderHomePage(): string {
    return `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        <!-- Main content -->
        <div class="relative z-10 flex items-center justify-center min-h-screen px-4 pt-20">
          <div class="text-center max-w-4xl">

            
            <!-- Title -->
            <h1 class="text-7xl font-black mb-4 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent pt-4 pb-2 leading-tight press-start-font">
              Pong Tournament
            </h1>
            
            <!-- Subtitle -->
            <p class="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
              Experience the ultimate competitive Pong with tournament brackets,<br>
              real-time gameplay, epic battles for glory and customizable options.
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

              <button id="ai-game-btn" 
                      class="group relative px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-500 text-white font-bold text-xl rounded-xl shadow-2xl hover:shadow-pink-500/25 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
                <span class="relative z-10 orbitron-font">🤖 Play vs AI</span>
                <div class="absolute inset-0 bg-gradient-to-r from-pink-700 to-purple-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>

              <button id="customize-game-btn" 
                      class="group relative px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-500 text-white font-bold text-xl rounded-xl shadow-2xl hover:shadow-indigo-500/25 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
                <span class="relative z-10 orbitron-font">⚙️ Customize Game</span>
                <div class="absolute inset-0 bg-gradient-to-r from-indigo-700 to-purple-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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
                <h3 class="text-lg font-semibold text-white mb-2 orbitron-font">AI Practice Mode</h3>
                <p class="text-gray-400 text-sm">Practice your skills against a skilled AI opponent</p>
              </div>
              
              <div class="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300">
                <h3 class="text-lg font-semibold text-white mb-2 orbitron-font">Game Customization</h3>
                <p class="text-gray-400 text-sm">Customize themes, power-ups, difficulty, and game settings</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  renderTournamentPage(): string {
    return `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        <div class="relative z-10 flex items-center justify-center min-h-screen px-4 pt-20">
          <div class="text-center">
            <h1 class="text-4xl font-bold text-white mb-4">Tournament Page</h1>
            <p class="text-gray-300 mb-6">Tournament functionality will be implemented here</p>
          </div>
        </div>
      </div>
    `
  }

  renderGamePage(): string {
    return `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        <div class="relative z-10 flex items-center justify-center min-h-screen px-4 pt-20">
          <div class="text-center">
            <h1 class="text-4xl font-bold text-white mb-4">Game Page</h1>
            <p class="text-gray-300 mb-6">Game functionality will be implemented here</p>
          </div>
        </div>
      </div>
    `
  }

  renderRegistrationPage(): string {
    return `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        <div class="relative z-10 flex items-center justify-center min-h-screen px-4 pt-20">
          <div class="text-center">
            <h1 class="text-4xl font-bold text-white mb-4">Registration Page</h1>
            <p class="text-gray-300 mb-6">Registration functionality will be implemented here</p>
          </div>
        </div>
      </div>
    `
  }

  setupHomePageListeners(onNavigate: (path: string) => void): void {
    document.getElementById('quick-game-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.showUserSelection('quick-game', onNavigate)
    })

    document.getElementById('ai-game-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.showUserSelection('ai-game', onNavigate)
    })

    document.getElementById('tournament-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      // Check if there's already a tournament in progress
      const existingTournament = localStorage.getItem('currentTournament')
      if (existingTournament) {
        // Navigate directly to tournament page if one exists
        onNavigate('/tournament')
      } else {
        // Show user selection modal if no tournament exists
        this.showUserSelection('tournament', onNavigate)
      }
    })

    document.getElementById('customize-game-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      onNavigate('/customize')
    })
  }

  /**
   * Shows user selection modal for different game types
   */
  showUserSelection(gameType: 'quick-game' | 'ai-game' | 'tournament', onNavigate: (path: string) => void, onCancel?: () => void): void {
    const options = {
      'quick-game': { gameType: 'quick-game' as const, minPlayers: 2, maxPlayers: 2 },
      'ai-game': { gameType: 'ai-game' as const, minPlayers: 1, maxPlayers: 1, allowAI: true },
      'tournament': { gameType: 'tournament' as const, minPlayers: 4, maxPlayers: 16 }
    }

    // Map game types to correct routes
    const routeMap = {
      'quick-game': '/quick-game',
      'ai-game': '/play-ai',  // Fix: use correct route
      'tournament': '/tournament'
    }

    userSelectionModal.show(
      options[gameType],
      (selection) => {
        // Store selected players for the game
        this.storeSelectedPlayers(selection)
        // Navigate to the appropriate page using correct route
        onNavigate(routeMap[gameType])
      },
      onCancel || (() => {
        // Default cancel behavior - just log
        console.log('User selection cancelled')
      }),
      this.gameManager // Pass the game manager to pause/resume the game
    )
  }

  /**
   * Stores selected players in session storage for the game to use
   */
  private storeSelectedPlayers(selection: any): void {
    sessionStorage.setItem('selectedPlayers', JSON.stringify(selection))
  }
}
