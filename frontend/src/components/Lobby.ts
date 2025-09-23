import { authService } from '../services/AuthService'
import { friendsService } from '../services/FriendsService'
import { lobbyService } from '../services/LobbyService'

export class Lobby {
  private authModal: any

  constructor(authModal: any) {
    this.authModal = authModal
  }

  render(): string {
    const isAuthenticated = authService.isAuthenticated()
    
    if (isAuthenticated) {
      return this.renderAuthenticatedLobby()
    } else {
      return this.renderGuestLobby()
    }
  }

  private renderAuthenticatedLobby(): string {
    return `
      <!-- Lobby Dropdown -->
      <div class="fixed bottom-4 right-4 z-50">
        <!-- Lobby Toggle Button -->
        <button id="lobby-toggle" 
                class="w-14 h-14 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-full shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-110 flex items-center justify-center group">
          <svg class="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
        </button>

        <!-- Lobby Panel -->
        <div id="lobby-panel" class="hidden absolute bottom-16 right-0 w-80 bg-black/90 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl">
          <!-- Header -->
          <div class="p-4 border-b border-white/10">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-white">Lobby</h3>
              <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span class="text-xs text-gray-400" id="online-count">0 online</span>
              </div>
            </div>
          </div>

          <!-- Content -->
          <div class="p-4">
            <!-- Host Status -->
            <div id="lobby-host-status" class="mb-4 hidden">
              <div class="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                <div class="flex items-center space-x-2">
                  <span class="text-green-400 text-lg">👑</span>
                  <span class="text-green-400 font-medium text-sm">You are the Host</span>
                </div>
              </div>
            </div>

            <!-- Joined Status -->
            <div id="lobby-joined-status" class="mb-4 hidden">
              <div class="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                <div class="flex items-center space-x-2">
                  <span class="text-blue-400 text-lg">✅</span>
                  <span class="text-blue-400 font-medium text-sm">You joined the lobby</span>
                </div>
              </div>
            </div>

            <!-- Online Users -->
            <div class="mb-4">
              <h4 class="text-sm font-medium text-gray-300 mb-2">Online Users</h4>
              <div id="online-users-list" class="space-y-2 max-h-40 overflow-y-auto">
                <!-- Users will be loaded here -->
              </div>
            </div>

            <!-- Lobby Actions -->
            <div class="space-y-2">
              <button id="leave-lobby-btn" 
                      class="w-full px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors text-sm hidden">
                Leave Lobby
              </button>
              <button id="lobby-login-btn" 
                      class="w-full px-4 py-2 bg-cyan-600 text-white font-medium rounded-lg hover:bg-cyan-700 transition-colors text-sm">
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    `
  }

  private renderGuestLobby(): string {
    return `
      <!-- Guest Lobby Dropdown -->
      <div class="fixed bottom-4 right-4 z-50">
        <!-- Lobby Toggle Button -->
        <button id="lobby-toggle" 
                class="w-14 h-14 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full shadow-2xl hover:shadow-gray-500/25 transition-all duration-300 transform hover:scale-110 flex items-center justify-center group">
          <svg class="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
        </button>

        <!-- Lobby Panel -->
        <div id="lobby-panel" class="hidden absolute bottom-16 right-0 w-80 bg-black/90 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl">
          <!-- Header -->
          <div class="p-4 border-b border-white/10">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-white">Lobby</h3>
              <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-gray-500 rounded-full"></div>
                <span class="text-xs text-gray-400">Login Required</span>
              </div>
            </div>
          </div>

          <!-- Content -->
          <div class="p-4">
            <!-- Login Required Message -->
            <div class="mb-4">
              <div class="bg-gray-500/20 border border-gray-500/30 rounded-lg p-4 text-center">
                <div class="text-gray-300 text-sm mb-3">
                  <span class="text-2xl mb-2 block">🔒</span>
                  <p>Sign in to join the lobby and play with other users!</p>
                </div>
              </div>
            </div>

            <!-- Login Button -->
            <div class="space-y-2">
              <button id="lobby-login-btn" 
                      class="w-full px-4 py-3 bg-cyan-600 text-white font-medium rounded-lg hover:bg-cyan-700 transition-colors text-sm">
                Sign In to Join Lobby
              </button>
            </div>
          </div>
        </div>
      </div>
    `
  }

  setupEventListeners(): void {
    // Toggle lobby panel
    document.getElementById('lobby-toggle')?.addEventListener('click', () => {
      const panel = document.getElementById('lobby-panel')
      if (panel) {
        panel.classList.toggle('hidden')
      }
    })

    // Leave lobby
    document.getElementById('leave-lobby-btn')?.addEventListener('click', async () => {
      try {
        const result = await lobbyService.leaveLobby()
        if (result.success) {
          console.log('Successfully left lobby')
          this.updateLobbyJoinStatus(false)
          this.updateLobbyStatus(false)
        } else {
          console.error('Failed to leave lobby:', result.error)
          alert('Failed to leave lobby. Please try again.')
        }
      } catch (error) {
        console.error('Error leaving lobby:', error)
        alert('Error leaving lobby. Please try again.')
      }
    })

    // Lobby login button
    document.getElementById('lobby-login-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.authModal.show('login')
    })
  }

  async loadData(): Promise<void> {
    if (!authService.isAuthenticated()) return

    try {
      // Load friends (online users)
      await friendsService.getFriends()
      const friends = friendsService.getLocalFriends()
      
      // Update online users list
      this.updateOnlineUsersList(friends)
      
      // Auto-join lobby when user logs in
      await this.autoJoinLobby()
      
    } catch (error) {
      console.error('Error loading lobby data:', error)
    }
  }

  private async autoJoinLobby(): Promise<void> {
    try {
      // Check if this is the first user (no lobby exists yet)
      const createResult = await lobbyService.createLobby()
      if (createResult.success) {
        console.log('Created lobby and became host')
        this.updateLobbyStatus(true)
        this.updateLobbyJoinStatus(true)
      } else {
        // If create fails with 409, lobby already exists
        if (createResult.error && createResult.error.includes('already in session')) {
          console.log('Lobby already exists - user joins as participant')
          this.updateLobbyJoinStatus(true)
          this.updateLobbyStatus(false) // Not the host
        } else {
          console.log('Failed to create or join lobby:', createResult.error)
          this.updateLobbyJoinStatus(false)
        }
      }
    } catch (error) {
      console.error('Error auto-joining lobby:', error)
      this.updateLobbyJoinStatus(false)
    }
  }

  private updateOnlineUsersList(friends: any[]): void {
    const usersList = document.getElementById('online-users-list')
    const onlineCount = document.getElementById('online-count')
    
    if (!usersList || !onlineCount) return

    // Clear existing users
    usersList.innerHTML = ''

    // Add current user
    const currentUser = authService.getCurrentUser()
    if (currentUser) {
      const userElement = document.createElement('div')
      userElement.className = 'flex items-center space-x-3 p-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg cursor-pointer hover:bg-cyan-500/30 transition-colors'
      userElement.innerHTML = `
        <div class="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full flex items-center justify-center">
          <span class="text-xs font-bold text-white">${currentUser.displayName.charAt(0).toUpperCase()}</span>
        </div>
        <div class="flex-1">
          <div class="text-white text-sm font-medium hover:text-cyan-400 transition-colors" id="current-user-name">${currentUser.displayName} (You)</div>
          <div class="text-cyan-400 text-xs">🟢 Online</div>
        </div>
      `
      usersList.appendChild(userElement)
    }

    // Add friends
    friends.forEach(friend => {
      const userElement = document.createElement('div')
      userElement.className = 'flex items-center space-x-3 p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors'
      userElement.innerHTML = `
        <div class="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full flex items-center justify-center">
          <span class="text-xs font-bold text-white">${friend.displayName.charAt(0).toUpperCase()}</span>
        </div>
        <div class="flex-1">
          <div class="text-white text-sm font-medium">${friend.displayName}</div>
          <div class="text-gray-400 text-xs">${friend.isOnline ? '🟢 Online' : '🔴 Offline'}</div>
        </div>
        ${friend.isOnline ? '<button class="text-cyan-400 hover:text-cyan-300 text-xs">Invite</button>' : ''}
      `
      usersList.appendChild(userElement)
    })

    // Update online count
    const onlineUsers = friends.filter(friend => friend.isOnline).length + (currentUser ? 1 : 0)
    onlineCount.textContent = `${onlineUsers} online`
  }

  private updateLobbyStatus(isHost: boolean): void {
    const hostStatus = document.getElementById('lobby-host-status')
    if (hostStatus) {
      if (isHost) {
        hostStatus.classList.remove('hidden')
      } else {
        hostStatus.classList.add('hidden')
      }
    }
  }

  private updateLobbyJoinStatus(isJoined: boolean): void {
    const joinedStatus = document.getElementById('lobby-joined-status')
    const leaveBtn = document.getElementById('leave-lobby-btn')
    
    if (joinedStatus) {
      if (isJoined) {
        joinedStatus.classList.remove('hidden')
      } else {
        joinedStatus.classList.add('hidden')
      }
    }
    
    if (leaveBtn) {
      if (isJoined) {
        leaveBtn.classList.remove('hidden')
      } else {
        leaveBtn.classList.add('hidden')
      }
    }
  }
}
