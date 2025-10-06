import { sessionService } from '../services/SessionService'
import { matchService } from '../services/MatchService'
import { friendsService } from '../services/FriendsService'
import { apiService, User } from '../services/ApiService'
import { InsightsModal } from '../components/InsightsModal'

export class ProfilePage {
  private authModal: any
  private currentUserId: number

  constructor(authModal: any) {
    this.authModal = authModal
    this.currentUserId = 0
  }

  async render(userId: string | null): Promise<string> {
    if (!sessionService.isAuthenticated()) {
      return this.renderLoginRequired()
    }

    if (!userId || isNaN(parseInt(userId, 10))) {
      return this.renderError("Invalid User ID", "The profile you are trying to view does not exist.");
    }

    this.currentUserId = parseInt(userId, 10);

    // Immediately render a loading state while data is fetched.
    this.renderLoadingState();

    const profileData = await this.loadProfileData(this.currentUserId);
    if (!profileData) {
      return this.renderError("Profile Not Found", "Could not load data for the requested user.");
    }

    // Check if the user being viewed is part of the current session.
    const isParticipant = sessionService.getParticipantIds().includes(this.currentUserId);

    return this.renderProfilePage(profileData.user, profileData.matches, profileData.friends, profileData.pendingRequests, isParticipant);
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
      const [userResponse, matches, friends, pendingRequests] = await Promise.all([
        apiService.getUserProfile(userId),
        matchService.getUserMatchHistory(userId),
        friendsService.getFriends(userId),
        friendsService.getPendingRequests()
      ]);

      if (userResponse.error || !userResponse.data) {
        throw new Error('User not found');
      }

      return {
        user: userResponse.data,
        matches,
        friends,
        pendingRequests
      };
    } catch (error) {
      console.error('Error loading profile data:', error);
      return null;
    }
  }

  private renderProfilePage(user: User, matches: any[], friends: any[], pendingRequests: any[], isParticipant: boolean): string {
    const winRate = user.wins + user.losses > 0 ? ((user.wins / (user.wins + user.losses)) * 100).toFixed(1) : '0.0';

    return `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        <div class="relative z-10 p-8 pt-24">
          <div class="max-w-7xl mx-auto">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <!-- User Info Card -->
              <div class="lg:col-span-1">
                <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
                  <div class="text-center">
                    <img src="${user.avatarUrl || '/avatars/default-avatar.png'}" alt="Avatar" class="w-24 h-24 rounded-full object-cover mx-auto mb-4" onerror="this.src='/avatars/default-avatar.png'">
                    <h2 class="text-2xl font-bold text-white mb-2">${user.displayName}</h2>
                    
                    <!-- AUTHORIZATION: Only show the Edit button if the viewed user is in the current session -->
                    ${isParticipant ? `
                      <button id="edit-profile-btn" data-user-id="${user.id}"
                              class="w-full mt-4 px-4 py-2 bg-cyan-600/20 text-white border border-cyan-500/30 rounded-lg hover:bg-cyan-600/30 transition-colors text-sm font-medium">
                        Edit Profile
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
                    <!-- AUTHORIZATION: Only allow insights for a participant -->
                    ${isParticipant ? `
                      <button id="view-insights-btn" data-user-id="${user.id}"
                              class="px-4 py-2 bg-gradient-to-r from-cyan-600/20 to-purple-600/20 text-white border border-cyan-500/30 rounded-lg hover:from-cyan-600/30 hover:to-purple-600/30 transition-all duration-300 text-sm font-medium flex items-center space-x-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                        <span>View Insights</span>
                      </button>
                    ` : ''}
                  </div>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <!-- Stats -->
                    <div class="text-center"><div class="text-3xl font-bold text-emerald-400">${user.wins}</div><div class="text-gray-400 text-sm">Wins</div></div>
                    <div class="text-center"><div class="text-3xl font-bold text-red-400">${user.losses}</div><div class="text-gray-400 text-sm">Losses</div></div>
                    <div class="text-center"><div class="text-3xl font-bold text-cyan-400">${winRate}%</div><div class="text-gray-400 text-sm">Win Rate</div></div>
                    <div class="text-center"><div class="text-3xl font-bold text-purple-400">${matches.length}</div><div class="text-gray-400 text-sm">Matches</div></div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Friends and Match History Tabs -->
            <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
              <div class="border-b border-white/10 mb-6">
                <nav class="-mb-px flex space-x-6" aria-label="Tabs">
                  <button id="friends-tab" class="px-3 py-2 font-medium text-sm rounded-t-lg border-b-2 text-white border-cyan-400 bg-cyan-400/10">
                    Friends
                  </button>
                  <button id="matches-tab" class="px-3 py-2 font-medium text-sm rounded-t-lg border-b-2 text-gray-400 border-transparent hover:text-white hover:border-gray-300">
                    Match History
                  </button>
                </nav>
              </div>
              <div id="friends-content">
                ${this.renderFriendsContent(friends, pendingRequests)}
              </div>
              <div id="matches-content" class="hidden">
                ${this.renderMatchesContent(matches)}
              </div>
            </div>  
          </div>
        </div>
      </div>
    `;
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
                      <img src="${request.avatarUrl}" 
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

  private renderError(title: string, message: string): string {
    return `
      <div class="min-h-screen mesh-gradient relative overflow-hidden">
        <div class="relative z-10 flex items-center justify-center min-h-screen px-4 pt-20">
          <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20 shadow-2xl text-center">
            <h2 class="text-3xl font-black mb-4 bg-gradient-to-r from-red-400 to-pink-500 bg-clip-text text-transparent orbitron-font">${title}</h2>
            <p class="text-gray-300 mb-6">${message}</p>
          </div>
        </div>
      </div>
    `;
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
      if (this.currentUserId) {
        onNavigate(`/profile/${this.currentUserId}`);
      }
    })

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
    this.setupFriendEventListeners(onNavigate)

    // Edit profile
    document.getElementById('edit-profile-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      const userId = (e.currentTarget as HTMLElement).dataset.userId;
      const user = sessionService.getParticipantById(parseInt(userId!, 10));
      if (user) {
        this.showEditProfileModal(user);
      }
    });

    // View insights button
    document.getElementById('view-insights-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      const userId = (e.currentTarget as HTMLElement).dataset.userId;
      if (userId) {
        this.showInsightsModal(parseInt(userId, 10));
      }
    });

    // Play first game button
    document.getElementById('play-first-game-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      onNavigate('/quick-game')
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

  private setupFriendEventListeners(onNavigate: (path: string) => void): void {
    const refreshPage = () => {
      if (this.currentUserId) {
        onNavigate(`/profile/${this.currentUserId}`);
      }
    };

    // Accept friend request
    document.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('accept-request-btn')) {
        const senderId = parseInt(target.getAttribute('data-sender-id') || '0')
        if (senderId) {
          const result = await friendsService.acceptFriendRequest(senderId)
          if (result.success) {
            refreshPage();
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
          refreshPage();
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
            refreshPage();
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

  private showEditProfileModal(user: User): void {
    const modalHTML = `
      <div id="edit-profile-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20 shadow-2xl">
            <h3 class="text-2xl font-bold text-cyan-400 mb-6 text-center orbitron-font">Edit Profile</h3>
            
            <form id="edit-profile-form" class="space-y-4">
              <div>
                <label class="block text-white font-semibold mb-2">Display Name:</label>
                <input type="text" id="edit-display-name" 
                       value="${user.displayName}"
                       class="w-full p-3 rounded-xl bg-white/10 text-white border border-white/20 placeholder-white/50 focus:border-cyan-400 focus:outline-none transition-colors"
                       required>
              </div>
              
              <div>
                <label class="block text-white font-semibold mb-2">Avatar URL:</label>
                <input type="url" id="edit-avatar-url" 
                       value="${user.avatarUrl || ''}"
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
      e.preventDefault();
      await this.handleProfileUpdate(user.id);
    });

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

  private async handleProfileUpdate(userId: number): Promise<void> {
    const displayName = (document.getElementById('edit-display-name') as HTMLInputElement)?.value;
    const avatarUrl = (document.getElementById('edit-avatar-url') as HTMLInputElement)?.value;

    try {
      const response = await apiService.updateUserProfile(userId, {
        displayName,
        avatarUrl
      });

      if (response.error) {
        console.error('Failed to update profile:', response.error)
        return
      }

      this.closeEditProfileModal()

      // Refresh the page
      if (this.currentUserId) {
        window.location.hash = `#/profile/${this.currentUserId}`;
        window.location.reload();
      }

    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  private closeEditProfileModal(): void {
    document.getElementById('edit-profile-modal')?.remove()
  }

  private async showInsightsModal(userId: number): Promise<void> {
    const insightsModal = new InsightsModal(userId);
    await insightsModal.show();
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
      const results = response.data?.users || []

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
              if (this.currentUserId) {
                onNavigate(`/profile/${this.currentUserId}`);
              }
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
}
