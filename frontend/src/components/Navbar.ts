import { userService } from '../services/UserService.js'
import { sessionService } from '../services/SessionService.js'

export class Navbar {
  private authModal: any
  private onSearchResults?: (users: any[]) => void
  private searchTimeout?: NodeJS.Timeout

  constructor(authModal: any, onSearchResults?: (users: any[]) => void) {
    this.authModal = authModal
    this.onSearchResults = onSearchResults
  }

  render(): string {
    
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
              <a href="/lobby" class="nav-link text-white hover:text-cyan-400 transition-colors font-medium">Lobby</a>
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
              <!-- Always show Sign In button, which now acts as "Add Player" -->
              <button id="login-btn" class="px-4 py-2 bg-black/60 text-white font-medium rounded-lg border border-white/20 hover:bg-white/10 hover:border-white/40 transition-all duration-300 text-sm transform hover:scale-105">
                Add Player
              </button>
              
              <!-- Search Bar (only visible when authenticated) -->
              <div id="search-container" class="hidden">
                <div class="relative">
                  <input 
                    type="text" 
                    id="player-search" 
                    placeholder="Search players..." 
                    class="px-3 py-1.5 bg-black/40 text-white placeholder-gray-400 rounded-lg border border-white/20 focus:border-cyan-400 focus:outline-none transition-colors text-sm w-40"
                  />
                  <div id="search-results" class="absolute top-full left-0 right-0 mt-1 bg-black/80 backdrop-blur-md border border-white/20 rounded-lg shadow-lg hidden z-50 max-h-60 overflow-y-auto"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Mobile Menu -->
        <div id="mobile-menu" class="md:hidden hidden bg-black/40 backdrop-blur-md border-t border-white/10">
          <div class="px-4 py-4 space-y-4">
            <a href="/" class="block text-white hover:text-cyan-400 transition-colors font-medium py-2">Home</a>
            <a href="/tournament" class="block text-white hover:text-cyan-400 transition-colors font-medium py-2">Tournament</a>
            <a href="/quick-game" class="block text-white hover:text-cyan-400 transition-colors font-medium py-2">Quick Game</a>
            <a href="/lobby" class="block text-white hover:text-cyan-400 transition-colors font-medium py-2">Lobby</a>
            
            <!-- Mobile Search Bar (only visible when authenticated) -->
            <div id="mobile-search-container" class="hidden">
              <div class="relative">
                <input 
                  type="text" 
                  id="mobile-player-search" 
                  placeholder="Search players..." 
                  class="w-full px-3 py-2 bg-black/40 text-white placeholder-gray-400 rounded-lg border border-white/20 focus:border-cyan-400 focus:outline-none transition-colors text-sm"
                />
                <div id="mobile-search-results" class="absolute top-full left-0 right-0 mt-1 bg-black/80 backdrop-blur-md border border-white/20 rounded-lg shadow-lg hidden z-50 max-h-60 overflow-y-auto"></div>
              </div>
            </div>
            
            <!-- Mobile Auth Status -->
            <div class="border-t border-white/20 pt-4">
              <!-- Always show Sign In button -->
              <button id="mobile-login-btn" class="w-full px-4 py-2 bg-black/60 text-white font-medium rounded-lg border border-white/20 hover:bg-white/10 hover:border-white/40 transition-all duration-300 text-sm transform hover:scale-105 mb-3">
                Add Player
              </button>
            </div>
          </div>
        </div>
      </div>
    `
  }

  setupEventListeners(onNavigate: (path: string) => void): void {
    // Desktop Auth button listeners
    document.getElementById('login-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.authModal.show('login')
    })

    document.getElementById('mobile-login-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.authModal.show('login')
    })

    // Mobile menu toggle
    document.getElementById('mobile-menu-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.toggleMobileMenu()
    })

    // Search functionality
    this.setupSearchListeners()

    // Navigation link listeners
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault()
        const href = (link as HTMLAnchorElement).getAttribute('href')
        if (href) {
          onNavigate(href)
        }
      })
    })

    // Mobile navigation link listeners
    document.querySelectorAll('#mobile-menu a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault()
        const href = (link as HTMLAnchorElement).getAttribute('href')
        if (href) {
          this.closeMobileMenu()
          onNavigate(href)
        }
      })
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

  /**
   * Sets up search event listeners for both desktop and mobile search inputs
   */
  private setupSearchListeners(): void {
    const desktopSearch = document.getElementById('player-search') as HTMLInputElement
    const mobileSearch = document.getElementById('mobile-player-search') as HTMLInputElement

    if (desktopSearch) {
      desktopSearch.addEventListener('input', (e) => {
        this.handleSearch((e.target as HTMLInputElement).value, 'desktop')
      })
    }

    if (mobileSearch) {
      mobileSearch.addEventListener('input', (e) => {
        this.handleSearch((e.target as HTMLInputElement).value, 'mobile')
      })
    }

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
      const searchContainer = document.getElementById('search-container')
      const mobileSearchContainer = document.getElementById('mobile-search-container')
      
      if (!searchContainer?.contains(e.target as Node) && !mobileSearchContainer?.contains(e.target as Node)) {
        this.hideSearchResults('desktop')
        this.hideSearchResults('mobile')
      }
    })
  }

  /**
   * Handles search input with debouncing
   */
  private handleSearch(query: string, type: 'desktop' | 'mobile'): void {
    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout)
    }

    // Hide results if query is empty
    if (!query.trim()) {
      this.hideSearchResults(type)
      return
    }

    // Only search if user is authenticated
    if (!sessionService.isAuthenticated()) {
      return
    }

    // Debounce search requests
    this.searchTimeout = setTimeout(async () => {
      await this.performSearch(query, type)
    }, 300)
  }

  /**
   * Performs the actual search and displays results
   */
  private async performSearch(query: string, type: 'desktop' | 'mobile'): Promise<void> {
    try {
      const result = await userService.searchUsers(query)
      
      if (result.error) {
        console.error('Search error:', result.error)
        this.showSearchError(type)
        return
      }

      if (result.users && result.users.length > 0) {
        this.showSearchResults(result.users, type)
      } else {
        this.showNoResults(type)
      }
    } catch (error) {
      console.error('Search failed:', error)
      this.showSearchError(type)
    }
  }

  /**
   * Displays search results in the dropdown
   */
  private showSearchResults(users: any[], type: 'desktop' | 'mobile'): void {
    const resultsContainer = document.getElementById(`${type === 'desktop' ? '' : 'mobile-'}search-results`)
    if (!resultsContainer) return

    const resultsHTML = users.map(user => `
      <div class="px-3 py-2 hover:bg-white/10 cursor-pointer border-b border-white/10 last:border-b-0" 
           onclick="this.handleUserClick(${user.id})">
        <div class="flex items-center space-x-3">
          <img src="${user.avatarUrl || '/avatars/default-avatar.png'}" 
               alt="${user.displayName}" 
               class="w-8 h-8 rounded-full object-cover">
          <div>
            <div class="text-white font-medium text-sm">${user.displayName}</div>
            <div class="text-gray-400 text-xs">${user.email}</div>
          </div>
        </div>
      </div>
    `).join('')

    resultsContainer.innerHTML = resultsHTML
    resultsContainer.classList.remove('hidden')

    // Add click handlers for each result
    resultsContainer.querySelectorAll('[onclick]').forEach(element => {
      const onclick = element.getAttribute('onclick')
      if (onclick) {
        element.removeAttribute('onclick')
        element.addEventListener('click', () => {
          const userId = parseInt(onclick.match(/\d+/)?.[0] || '0')
          this.handleUserClick(userId)
        })
      }
    })
  }

  /**
   * Shows "no results" message
   */
  private showNoResults(type: 'desktop' | 'mobile'): void {
    const resultsContainer = document.getElementById(`${type === 'desktop' ? '' : 'mobile-'}search-results`)
    if (!resultsContainer) return

    resultsContainer.innerHTML = `
      <div class="px-3 py-4 text-center text-gray-400 text-sm">
        No players found
      </div>
    `
    resultsContainer.classList.remove('hidden')
  }

  /**
   * Shows search error message
   */
  private showSearchError(type: 'desktop' | 'mobile'): void {
    const resultsContainer = document.getElementById(`${type === 'desktop' ? '' : 'mobile-'}search-results`)
    if (!resultsContainer) return

    resultsContainer.innerHTML = `
      <div class="px-3 py-4 text-center text-red-400 text-sm">
        Search failed. Please try again.
      </div>
    `
    resultsContainer.classList.remove('hidden')
  }

  /**
   * Hides search results dropdown
   */
  private hideSearchResults(type: 'desktop' | 'mobile'): void {
    const resultsContainer = document.getElementById(`${type === 'desktop' ? '' : 'mobile-'}search-results`)
    if (resultsContainer) {
      resultsContainer.classList.add('hidden')
    }
  }

  /**
   * Handles user click from search results
   */
  private handleUserClick(userId: number): void {
    // Clear search inputs
    const desktopSearch = document.getElementById('player-search') as HTMLInputElement
    const mobileSearch = document.getElementById('mobile-player-search') as HTMLInputElement
    
    if (desktopSearch) desktopSearch.value = ''
    if (mobileSearch) mobileSearch.value = ''

    // Hide results
    this.hideSearchResults('desktop')
    this.hideSearchResults('mobile')

    // Close mobile menu if open
    this.closeMobileMenu()

    // Notify parent component about the selected user
    if (this.onSearchResults) {
      this.onSearchResults([{ id: userId }])
    }
  }

  /**
   * Updates search bar visibility based on authentication status
   */
  updateSearchVisibility(): void {
    const searchContainer = document.getElementById('search-container')
    const mobileSearchContainer = document.getElementById('mobile-search-container')
    
    if (sessionService.isAuthenticated()) {
      searchContainer?.classList.remove('hidden')
      mobileSearchContainer?.classList.remove('hidden')
    } else {
      searchContainer?.classList.add('hidden')
      mobileSearchContainer?.classList.add('hidden')
    }
  }
}
