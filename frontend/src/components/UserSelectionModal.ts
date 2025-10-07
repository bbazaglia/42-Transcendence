import { sessionService } from '../services/SessionService.js'

export interface UserSelectionOptions {
  gameType: 'quick-game' | 'ai-game' | 'tournament'
  minPlayers: number
  maxPlayers: number
  allowAI?: boolean
}

export interface SelectedUsers {
  players: any[]
  gameType: string
}

export class UserSelectionModal {
  private onSelectionComplete?: (selection: SelectedUsers) => void
  private onCancel?: () => void
  private selectedPlayers: Set<number> = new Set()
  private gameType: string = ''
  private minPlayers: number = 1
  private maxPlayers: number = 2

  constructor() {
    this.selectedPlayers = new Set()
  }

  /**
   * Shows the user selection modal
   */
  show(options: UserSelectionOptions, onComplete: (selection: SelectedUsers) => void, onCancel?: () => void): void {
    this.gameType = options.gameType
    this.minPlayers = options.minPlayers
    this.maxPlayers = options.maxPlayers
    this.onSelectionComplete = onComplete
    this.onCancel = onCancel
    this.selectedPlayers.clear()

    this.render()
    this.setupEventListeners()
  }

  /**
   * Hides the modal
   */
  hide(): void {
    const modal = document.getElementById('user-selection-modal')
    if (modal) {
      modal.remove()
    }
  }

  /**
   * Renders the modal HTML
   */
  private render(): void {
    const participants = sessionService.getParticipants()
    console.log('UserSelectionModal: Loading participants:', participants)
    const gameTypeLabels = {
      'quick-game': 'Quick Game',
      'ai-game': 'AI Game',
      'tournament': 'Tournament'
    }

    const modalHTML = `
      <div id="user-selection-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-black/90 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          <!-- Header -->
          <div class="p-6 border-b border-white/10">
            <div class="flex items-center justify-between">
              <h2 class="text-2xl font-bold text-white orbitron-font">Select Players</h2>
              <button id="close-modal" class="text-gray-400 hover:text-white transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <p class="text-gray-300 mt-2">Choose players for ${gameTypeLabels[this.gameType as keyof typeof gameTypeLabels]}</p>
            <div class="mt-3 text-sm text-cyan-400">
              Select ${this.minPlayers === this.maxPlayers ? this.minPlayers : `${this.minPlayers}-${this.maxPlayers}`} player${this.maxPlayers > 1 ? 's' : ''}
              ${this.gameType === 'tournament' ? '<br><span class="text-yellow-400">⚠️ Tournaments require exactly 4, 8, or 16 players</span>' : ''}
            </div>
          </div>

          <!-- Content -->
          <div class="p-6 overflow-y-auto max-h-96">
            ${participants.length === 0 ? `
              <div class="text-center py-8">
                <div class="text-4xl mb-4">👥</div>
                <p class="text-gray-400 text-lg">No players available</p>
                <p class="text-gray-500 text-sm mt-2">Players need to be logged in to appear here</p>
              </div>
            ` : `
              <div class="grid grid-cols-1 gap-3">
                ${participants.map(participant => `
                  <div class="user-card bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all duration-300 cursor-pointer" 
                       data-user-id="${participant.id}">
                    <div class="flex items-center space-x-3">
                      <div class="relative">
                        <img src="${participant.avatarUrl || '/avatars/default-avatar.png'}" 
                             alt="${participant.displayName}" 
                             class="w-12 h-12 rounded-full object-cover">
                        <div class="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black"></div>
                      </div>
                      <div class="flex-1">
                        <h3 class="text-white font-medium">${participant.displayName}</h3>
                        <p class="text-gray-400 text-sm">${participant.wins}W - ${participant.losses}L</p>
                      </div>
                      <div class="selection-indicator w-6 h-6 rounded-full border-2 border-white/30 flex items-center justify-center">
                        <svg class="w-4 h-4 text-white hidden" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Footer -->
          <div class="p-6 border-t border-white/10 bg-black/20">
            <div class="flex items-center justify-between">
              <div class="text-sm text-gray-400">
                <span id="selection-count">0</span> of ${this.maxPlayers} selected
              </div>
              <div class="flex space-x-3">
                <button id="cancel-btn" 
                        class="px-4 py-2 text-gray-400 hover:text-white transition-colors">
                  Cancel
                </button>
                <button id="confirm-btn" 
                        class="px-6 py-2 bg-cyan-600/20 text-white border border-cyan-500/30 font-bold rounded-xl hover:bg-cyan-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled>
                  Start Game
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `

    document.body.insertAdjacentHTML('beforeend', modalHTML)
  }

  /**
   * Sets up event listeners for the modal
   */
  private setupEventListeners(): void {
    // Close modal
    document.getElementById('close-modal')?.addEventListener('click', () => {
      this.handleCancel()
    })

    document.getElementById('cancel-btn')?.addEventListener('click', () => {
      this.handleCancel()
    })

    // Confirm button
    document.getElementById('confirm-btn')?.addEventListener('click', () => {
      this.handleConfirm()
    })

    // User selection
    document.querySelectorAll('.user-card').forEach(card => {
      card.addEventListener('click', () => {
        this.handleUserSelection(card)
      })
    })

    // Close on backdrop click
    document.getElementById('user-selection-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.handleCancel()
      }
    })

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.handleCancel()
      }
    })
  }

  /**
   * Handles user selection/deselection
   */
  private handleUserSelection(card: Element): void {
    const userId = parseInt(card.getAttribute('data-user-id') || '0')
    const indicator = card.querySelector('.selection-indicator')
    const checkmark = card.querySelector('svg')
    
    if (this.selectedPlayers.has(userId)) {
      // Deselect
      this.selectedPlayers.delete(userId)
      card.classList.remove('ring-2', 'ring-cyan-400', 'bg-cyan-500/10')
      indicator?.classList.remove('bg-cyan-500', 'border-cyan-500')
      checkmark?.classList.add('hidden')
    } else {
      // Check if we can select more players
      if (this.selectedPlayers.size >= this.maxPlayers) {
        return // Can't select more
      }
      
      // Select
      this.selectedPlayers.add(userId)
      card.classList.add('ring-2', 'ring-cyan-400', 'bg-cyan-500/10')
      indicator?.classList.add('bg-cyan-500', 'border-cyan-500')
      checkmark?.classList.remove('hidden')
    }

    this.updateSelectionUI()
  }

  /**
   * Updates the selection UI
   */
  private updateSelectionUI(): void {
    const countElement = document.getElementById('selection-count')
    const confirmBtn = document.getElementById('confirm-btn') as HTMLButtonElement
    
    if (countElement) {
      countElement.textContent = this.selectedPlayers.size.toString()
    }
    
    if (confirmBtn) {
      const canConfirm = this.selectedPlayers.size >= this.minPlayers && this.selectedPlayers.size <= this.maxPlayers
      confirmBtn.disabled = !canConfirm
    }
  }

  /**
   * Handles confirmation
   */
  private handleConfirm(): void {
    if (this.selectedPlayers.size < this.minPlayers || this.selectedPlayers.size > this.maxPlayers) {
      console.log('Invalid selection size:', this.selectedPlayers.size, 'Required:', this.minPlayers, '-', this.maxPlayers)
      return
    }

    // For tournaments, ensure power of 2 players (4, 8, or 16)
    if (this.gameType === 'tournament') {
      const playerCount = this.selectedPlayers.size
      if (playerCount !== 4 && playerCount !== 8 && playerCount !== 16) {
        alert('Tournaments require exactly 4, 8, or 16 players. Please adjust your selection.')
        return
      }
    }

    const participants = sessionService.getParticipants()
    const selectedUsers = participants.filter(p => this.selectedPlayers.has(p.id))
    console.log('UserSelectionModal: Confirming selection:', {
      selectedPlayerIds: Array.from(this.selectedPlayers),
      selectedUsers: selectedUsers,
      gameType: this.gameType
    })

    if (this.onSelectionComplete) {
      this.onSelectionComplete({
        players: selectedUsers,
        gameType: this.gameType
      })
    }

    this.hide()
  }

  /**
   * Handles cancellation
   */
  private handleCancel(): void {
    if (this.onCancel) {
      this.onCancel()
    }
    this.hide()
  }
}

// Export singleton instance
export const userSelectionModal = new UserSelectionModal()
export default userSelectionModal
