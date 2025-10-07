import { sessionService } from '../services/SessionService'
import { matchService } from '../services/MatchService'
import { friendsService } from '../services/FriendsService'
import { apiService } from '../services/ApiService'
import { userService } from '../services/UserService'
import { InsightsModal } from '../components/InsightsModal'
import { userSelectionModal } from '../components/UserSelectionModal'
import { TotpSetupModal } from '../components/TotpSetupModal.ts';

//TODO: remove all currentUser related code as it is obsolete
export class ProfilePage {
  private authModal: any
  private eventListenersSetup = false

  constructor(authModal: any) {
    this.authModal = authModal
  }

  async render(userId?: number): Promise<string> {
    // If no userId provided, use current user
    if (!userId) {
      // Check if user is authenticated
      if (!sessionService.isAuthenticated()) {
        return this.renderLoginRequired()
      }

      const participants = sessionService.getParticipants()
      const currentUser = participants.find(p => p.id) // Get first authenticated user
      if (!currentUser) return ''

      userId = currentUser.id
    }

    // Show loading state
    this.renderLoadingState()

    // Load profile data
    const profileData = await this.loadProfileData(userId)
    if (!profileData) {
      return this.renderError()
    }

    // Load sent requests
    const sentRequests = await friendsService.getSentRequests(userId)

    return this.renderProfilePage(profileData.user, profileData.matches, profileData.friends, profileData.pendingRequests, sentRequests, userId)
  }

  private renderLoginRequired(): string {
    return `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        
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
  }

  private renderLoadingState(): string {
    return `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        
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
  }

  private async loadProfileData(userId: number): Promise<any> {
    try {
      // Get user data
      const userResponse = await userService.getUserProfile(userId)
      if (userResponse.error || !userResponse.user) {
        console.warn('Failed to load user profile:', userResponse.error)
        return null
      }

      const user = userResponse.user
      const participants = sessionService.getParticipants()
      const isOwnProfile = participants.some(p => p.id === userId)

      // Load profile data in parallel
      const [matches, friends, pendingRequests] = await Promise.all([
        matchService.getUserMatchHistory(userId),
        isOwnProfile ? friendsService.getFriends(userId) : Promise.resolve([]),
        isOwnProfile ? friendsService.getPendingRequests(userId) : Promise.resolve([])
      ])

      return {
        user,
        matches,
        friends,
        pendingRequests
      }
    } catch (error) {
      console.error('Error loading profile data:', error)
      return null
    }
  }

  private renderProfilePage(user: any, matches: any[], friends: any[], pendingRequests: any[], sentRequests: any[], userId: number): string {
    const winRate = user.wins + user.losses > 0 ? ((user.wins / (user.wins + user.losses)) * 100).toFixed(1) : '0.0'
    const participants = sessionService.getParticipants()
    const isOwnProfile = participants.some(p => p.id === userId)

    return `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        
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
                    <p class="text-gray-400 text-sm mb-6">Player ID: ${user.id}</p>
                    
                    <!-- Edit Profile Button (only for own profile) -->
                    ${isOwnProfile ? `
                      <button id="edit-profile-btn" 
                              class="w-full px-4 py-2 bg-cyan-600/20 text-white border border-cyan-500/30 rounded-lg hover:bg-cyan-600/30 transition-colors text-sm font-medium">
                        Edit Profile
                      </button>

                      <!-- 2FA Management Button -->
                      <button id="manage-2fa-btn" 
                              class="mt-2 w-full px-4 py-2 bg-purple-600/20 text-white border border-purple-500/30 rounded-lg hover:bg-purple-600/30 transition-colors text-sm font-medium">
                        Manage 2FA
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>
              
              <!-- Stats Card -->
              <div class="lg:col-span-2">
                <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
                  <div class="flex items-center justify-between mb-6">
                    <h3 class="text-2xl font-bold text-cyan-400 orbitron-font">Statistics</h3>
                    ${isOwnProfile ? `
                      <button id="view-insights-btn" 
                              class="px-4 py-2 bg-gradient-to-r from-cyan-600/20 to-purple-600/20 text-white border border-cyan-500/30 rounded-lg hover:from-cyan-600/30 hover:to-purple-600/30 transition-all duration-300 text-sm font-medium flex items-center space-x-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                        </svg>
                        <span>View Insights</span>
                      </button>
                    ` : ''}
                  </div>
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
                ${isOwnProfile ? `
                  <button id="friends-tab" 
                          class="flex-1 px-6 py-4 text-white font-medium border-b-2 border-cyan-400 bg-cyan-400/10">
                    Friends (${friends.length})
                  </button>
                ` : ''}
                <button id="matches-tab" 
                        class="${isOwnProfile ? 'flex-1' : 'w-full'} px-6 py-4 ${isOwnProfile ? 'text-gray-400 font-medium border-b-2 border-transparent hover:text-white hover:border-white/20 transition-colors' : 'text-white font-medium border-b-2 border-cyan-400 bg-cyan-400/10'}">
                  Match History (${matches.length})
                </button>
              </div>
              
              <!-- Tab Content -->
              <div class="p-12">
                ${isOwnProfile ? `
                  <!-- Friends Tab Content -->
                  <div id="friends-content">
                    ${this.renderFriendsContent(friends, pendingRequests, sentRequests)}
                  </div>
                ` : ''}
                
                <!-- Matches Tab Content -->
                <div id="matches-content" class="${isOwnProfile ? 'hidden' : ''}">
                  ${this.renderMatchesContent(matches)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  private renderFriendsContent(friends: any[], pendingRequests: any[], sentRequests: any[] = []): string {
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
                      <img src="${request.user.avatarUrl || '/avatars/default-avatar.png'}" 
                           alt="Avatar" 
                           class="w-10 h-10 rounded-full object-cover"
                           onerror="this.src='/avatars/default-avatar.png'">
                    </div>
                    <div>
                      <div class="text-white font-medium">${request.user.displayName}</div>
                      <div class="text-gray-400 text-sm">ID: ${request.user.id}</div>
                    </div>
                  </div>
                  <div class="flex space-x-2">
                    <button class="accept-request-btn px-3 py-1 bg-cyan-600/20 text-white border border-cyan-500/30 text-sm rounded hover:bg-cyan-600/30 transition-colors" 
                            data-sender-id="${request.user.id}"
                            data-friendship-id="${request.friendshipId}">
                      Accept
                    </button>
                    <button class="reject-request-btn px-3 py-1 bg-red-600/20 text-white border border-red-500/30 text-sm rounded hover:bg-red-600/30 transition-colors" 
                            data-sender-id="${request.user.id}"
                            data-friendship-id="${request.friendshipId}">
                      Reject
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Sent Requests -->
        ${sentRequests.length > 0 ? `
          <div>
            <h4 class="text-lg font-semibold text-white mb-4">Pending Friend Sent Requests</h4>
            <div class="space-y-3">
              ${sentRequests.map(request => `
                <div class="flex items-center justify-between bg-white/5 rounded-lg p-4">
                  <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full flex items-center justify-center">
                      <img src="${request.user.avatarUrl || '/avatars/default-avatar.png'}" 
                           alt="Avatar" 
                           class="w-10 h-10 rounded-full object-cover"
                           onerror="this.src='/avatars/default-avatar.png'">
                    </div>
                    <div>
                      <div class="text-white font-medium">${request.user.displayName}</div>
                      <div class="text-gray-400 text-sm">ID: ${request.user.id}</div>
                    </div>
                  </div>
                  <div class="flex space-x-2">
                    <button class="cancel-request-btn px-3 py-1 bg-orange-600/20 text-white border border-orange-500/30 text-sm rounded hover:bg-orange-600/30 transition-colors" 
                            data-receiver-id="${request.user.id}"
                            data-friendship-id="${request.friendshipId}">
                      Cancel
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
                        <img src="${friend.user.avatarUrl || '/avatars/default-avatar.png'}" 
                             alt="Avatar" 
                             class="w-10 h-10 rounded-full object-cover"
                             onerror="this.src='/avatars/default-avatar.png'">
                      </div>
                      <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${friend.user.isOnline ? 'bg-emerald-400' : 'bg-gray-400'} border-2 border-white"></div>
                    </div>
                    <div>
                      <div class="text-white font-medium">${friend.user.displayName}</div>
                      <div class="text-gray-400 text-sm">${friend.user.wins}W - ${friend.user.losses}L</div>
                    </div>
                  </div>
                  <button class="remove-friend-btn px-3 py-1 bg-red-600/20 text-white border border-red-500/30 text-sm rounded hover:bg-red-600/30 transition-colors" 
                          data-friend-id="${friend.user.id}"
                          data-friendship-id="${friend.friendshipId}">
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
                  ${match.playerOne?.displayName || `Player ${match.playerOneId}`} vs ${match.playerTwo?.displayName || `Player ${match.playerTwoId}`}
                </div>
              </div>
              <div class="flex items-center space-x-4">
                <div class="text-white font-bold text-lg">
                  ${match.playerOneScore} - ${match.playerTwoScore}
                </div>
                <div class="text-emerald-400 text-sm font-semibold">
                  Winner: ${match.winner?.displayName || `Player ${match.winnerId}`}
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

  private renderError(): string {
    return `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        
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
  }

  setupEventListeners(onNavigate: (path: string) => void): void {
    // Login button for non-authenticated users
    document.getElementById('login-btn-profile')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.authModal.show('login')
    })

    // Retry button for error state
    document.getElementById('retry-profile-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      onNavigate('/profile')
    })

    // Tab switching (only if friends tab exists)
    document.getElementById('friends-tab')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.switchProfileTab('friends')
    })

    document.getElementById('matches-tab')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.switchProfileTab('matches')
    })

    // Friend management (only for own profile)
    const participants = sessionService.getParticipants()
    const isOwnProfile = window.location.pathname === '/profile' || participants.some(p => window.location.pathname === `/profile/${p.id}`)
    if (isOwnProfile) {
      this.setupFriendEventListeners(onNavigate)
      this.setupAddFriendButtons()
    }

    // Edit profile (only for own profile)
    document.getElementById('edit-profile-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.showEditProfileModal()
    })

    // Manage 2FA
    document.getElementById('manage-2fa-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showTotpSetupModal();
    });

    // View insights button (only for own profile)
    document.getElementById('view-insights-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.showInsightsModal()
    })

    // Play first game button
    document.getElementById('play-first-game-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.showUserSelection('quick-game', onNavigate)
    })
  }

  /**
   * Shows user selection modal for different game types
   */
  private showUserSelection(gameType: 'quick-game' | 'ai-game' | 'tournament', onNavigate: (path: string) => void): void {
    const options = {
      'quick-game': { gameType: 'quick-game' as const, minPlayers: 2, maxPlayers: 2 },
      'ai-game': { gameType: 'ai-game' as const, minPlayers: 1, maxPlayers: 1, allowAI: true },
      'tournament': { gameType: 'tournament' as const, minPlayers: 4, maxPlayers: 16 }
    }

    // Map game types to correct routes
    const routeMap = {
      'quick-game': '/quick-game',
      'ai-game': '/play-ai',
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
      () => {
        // User cancelled selection
        console.log('User selection cancelled')
      }
    )
  }

  /**
   * Stores selected players in session storage for the game to use
   */
  private storeSelectedPlayers(selection: any): void {
    sessionStorage.setItem('selectedPlayers', JSON.stringify(selection))
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

  private setupFriendEventListeners(onNavigate: (path: string) => void): void {
    // Prevent duplicate event listeners
    if (this.eventListenersSetup) {
      return
    }
    this.eventListenersSetup = true

    // Accept friend request
    document.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('accept-request-btn')) {
        const friendshipId = parseInt(target.getAttribute('data-friendship-id') || '0')
        if (friendshipId) {
          // Get the current user (the one accepting the request)
          const participants = sessionService.getParticipants()
          const currentUser = participants.find(p => window.location.pathname === `/profile/${p.id}` || window.location.pathname === '/profile')
          const acceptorId = currentUser?.id
          
          if (acceptorId) {
            const result = await friendsService.acceptFriendRequest(friendshipId, acceptorId)
            if (result.success) {
              alert('Friend request accepted!')
              // Force a page reload to show updated friends list
              window.location.reload()
            } else {
              alert(`Failed to accept friend request: ${result.error}`)
            }
          } else {
            alert('Error: Could not identify current user for accepting request')
          }
        }
      }
    })

    // Reject friend request
    document.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('reject-request-btn')) {
        const friendshipId = parseInt(target.getAttribute('data-friendship-id') || '0')
        if (friendshipId) {
          // Get the current user (the one rejecting the request)
          const participants = sessionService.getParticipants()
          const currentUser = participants.find(p => window.location.pathname === `/profile/${p.id}` || window.location.pathname === '/profile')
          const rejectorId = currentUser?.id
          
          if (rejectorId) {
            const result = await friendsService.rejectFriendRequest(friendshipId, rejectorId)
            if (result.success) {
              alert('Friend request rejected!')
              window.location.reload() // Refresh the page to show updated pending requests
            } else {
              alert(`Failed to reject friend request: ${result.error}`)
            }
          } else {
            alert('Error: Could not identify current user for rejecting request')
          }
        }
      }
    })

    // Cancel friend request
    document.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('cancel-request-btn')) {
        const friendshipId = parseInt(target.getAttribute('data-friendship-id') || '0')
        if (friendshipId) {
          // Get the current user (the one canceling the request)
          const participants = sessionService.getParticipants()
          const currentUser = participants.find(p => window.location.pathname === `/profile/${p.id}` || window.location.pathname === '/profile')
          const senderId = currentUser?.id
          
          if (senderId) {
            const result = await friendsService.cancelFriendRequest(friendshipId, senderId)
            if (result.success) {
              alert('Friend request canceled!')
              window.location.reload() // Refresh the page to show updated sent requests
            } else {
              alert(`Failed to cancel friend request: ${result.error}`)
            }
          } else {
            alert('Error: Could not identify current user for canceling request')
          }
        }
      }
    })

    // Remove friend
    document.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('remove-friend-btn')) {
        const friendshipId = parseInt(target.getAttribute('data-friendship-id') || '0')
        if (friendshipId) {
          // Get the current user (the one removing the friend)
          const participants = sessionService.getParticipants()
          const currentUser = participants.find(p => window.location.pathname === `/profile/${p.id}` || window.location.pathname === '/profile')
          const removerId = currentUser?.id
          
          if (removerId) {
            const result = await friendsService.removeFriend(friendshipId, removerId)
            if (result.success) {
              alert('Friend removed successfully!')
              window.location.reload() // Refresh the page
            } else {
              alert(`Failed to remove friend: ${result.error}`)
            }
          } else {
            alert('Error: Could not identify current user for removing friend')
          }
        }
      }
    })

  }

  private setupAddFriendButtons(): void {
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
    const participants = sessionService.getParticipants()
    const currentUser = participants.find(p => window.location.pathname === `/profile/${p.id}` || window.location.pathname === '/profile')
    if (!currentUser || !currentUser.id) return

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
                       value="${currentUser.avatarUrl && currentUser.avatarUrl !== '/avatars/default-avatar.png' ? currentUser.avatarUrl : ''}"
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
    const participants = sessionService.getParticipants()
    const currentUser = participants.find(p => window.location.pathname === `/profile/${p.id}` || window.location.pathname === '/profile')
    if (!currentUser || !currentUser.id) return

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

      // Update local user data - refresh session to get updated user data
      await sessionService.checkSessionStatus()
      this.closeEditProfileModal()
      // Refresh the page
      window.location.reload()

    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  private closeEditProfileModal(): void {
    document.getElementById('edit-profile-modal')?.remove()
  }

  private async showInsightsModal(): Promise<void> {
    const participants = sessionService.getParticipants()
    const currentUser = participants.find(p => window.location.pathname === `/profile/${p.id}` || window.location.pathname === '/profile')
    console.log('Current user:', currentUser)
    
    if (!currentUser || !currentUser.id) {
      console.error('No current user found - user not authenticated')
      alert('Please log in to view your analytics')
      return
    }

    console.log('Opening insights modal for user:', currentUser.id)
    const insightsModal = new InsightsModal(currentUser.id)
    await insightsModal.show()
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
              
              <div id="friend-search-results" class="space-y-2 max-h-40 overflow-y-auto">
                <!-- Search results will appear here -->
              </div>
              
              <div class="flex justify-center">
                <button type="button" id="cancel-add-friend" 
                        class="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-500 text-white font-bold rounded-xl shadow-lg hover:from-gray-700 hover:to-gray-600 transition-all duration-300">
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
      console.log('Input event triggered, query:', query, 'length:', query.length)
      if (query.length > 2) {
        console.log('Query length > 2, calling searchUsers')
        await this.searchUsers(query)
      } else {
        console.log('Query length <= 2, clearing results')
        const searchResultsElement = document.getElementById('friend-search-results')
        if (searchResultsElement) {
          searchResultsElement.innerHTML = ''
          searchResultsElement.classList.add('hidden')
        }
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
      console.log('Searching for users with query:', query)
      const response = await apiService.searchUsers(query)
      console.log('Search response:', response)
      const results = response.data?.users || []
      console.log('Search results:', results)
      
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
              <div class="text-gray-400 text-sm">ID: ${user.id}</div>
            </div>
          </div>
          <button class="send-friend-request-btn px-3 py-1 bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm rounded hover:from-purple-700 hover:to-cyan-700 transition-all duration-300" 
                  data-user-id="${user.id}">
            Add
          </button>
        </div>
      `).join('')

      const searchResultsElement = document.getElementById('friend-search-results')
      console.log('Search results element:', searchResultsElement)
      console.log('Results HTML:', resultsHTML)
      
      if (searchResultsElement) {
        // Remove hidden class if it exists
        searchResultsElement.classList.remove('hidden')
        searchResultsElement.innerHTML = resultsHTML
        
        // Debug visibility
        console.log('Element classes after removal:', searchResultsElement.className)
        console.log('Element style display:', searchResultsElement.style.display)
        console.log('Element computed style display:', window.getComputedStyle(searchResultsElement).display)
        console.log('Element computed style visibility:', window.getComputedStyle(searchResultsElement).visibility)
        console.log('Element computed style opacity:', window.getComputedStyle(searchResultsElement).opacity)
        console.log('Element offsetHeight:', searchResultsElement.offsetHeight)
        console.log('Element offsetWidth:', searchResultsElement.offsetWidth)
        console.log('Results inserted into DOM')
      } else {
        console.error('Search results element not found!')
      }

      // Add event listeners for send friend request buttons
      document.querySelectorAll('.send-friend-request-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const userId = parseInt((e.target as HTMLElement).getAttribute('data-user-id') || '0')
          if (userId) {
            // Get the current user (the one viewing the profile and sending the request)
            const participants = sessionService.getParticipants()
            const currentUser = participants.find(p => window.location.pathname === `/profile/${p.id}` || window.location.pathname === '/profile')
            const senderId = currentUser?.id
            
            if (senderId) {
              const result = await friendsService.sendFriendRequest(userId, senderId)
              if (result.success) {
                this.closeAddFriendModal()
                alert('Friend request sent successfully!')
                setTimeout(() => {
                  window.location.reload()
                }, 1000)
              } else {
                // Handle the case where friendship already exists
                if (result.error && result.error.includes('already exists')) {
                  alert('You already have a pending friend request with this user!')
                } else {
                  alert(`Failed to send friend request: ${result.error}`)
                }
                this.closeAddFriendModal()
              }
            } else {
              alert('Error: Could not identify current user')
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

  private showTotpSetupModal(): void {
    const modalContainer = document.createElement('div');
    document.body.appendChild(modalContainer);

    const closeModal = () => {
        modalContainer.remove();
        // Optionally, refresh the profile page to show the new 2FA status
        window.location.reload();
    };

    const totpModal = new TotpSetupModal(closeModal);
    modalContainer.innerHTML = totpModal.render();
    totpModal.setupEventListeners(modalContainer.firstElementChild as HTMLElement);
  }
}
