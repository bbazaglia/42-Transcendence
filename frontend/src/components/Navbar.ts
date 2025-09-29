import { authService } from '../services/AuthService'

export class Navbar {
  private authModal: any

  constructor(authModal: any) {
    this.authModal = authModal
  }

  render(): string {
    const isAuthenticated = authService.isAuthenticated()
    
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
              <!-- Always show Sign In button -->
              <button id="login-btn" class="px-4 py-2 bg-black/60 text-white font-medium rounded-lg border border-white/20 hover:bg-white/10 hover:border-white/40 transition-all duration-300 text-sm transform hover:scale-105">
                Sign In
              </button>
              
              ${isAuthenticated ? `
                <!-- Authenticated User -->
                <div class="flex items-center space-x-3">
                  <button id="desktop-profile-btn" class="px-3 py-1 bg-cyan-600/20 text-white border border-cyan-500/30 text-sm rounded hover:bg-cyan-600/30 transition-colors">
                    Profile
                  </button>
                  <button id="logout-btn" class="px-3 py-1 bg-red-600/20 text-white border border-red-500/30 text-sm rounded hover:bg-red-600/30 transition-colors">
                    Logout
                  </button>
                </div>
              ` : ''}
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
            </div>
            
            <!-- Mobile Auth Status -->
            <div class="border-t border-white/20 pt-4">
              <!-- Always show Sign In button -->
              <button id="mobile-login-btn" class="w-full px-4 py-2 bg-black/60 text-white font-medium rounded-lg border border-white/20 hover:bg-white/10 hover:border-white/40 transition-all duration-300 text-sm transform hover:scale-105 mb-3">
                Sign In
              </button>
              
              ${isAuthenticated ? `
                <!-- Mobile Authenticated User -->
                <div class="space-y-3">
                  <button id="mobile-nav-profile-btn" class="w-full px-4 py-2 bg-cyan-600/20 text-white border border-cyan-500/30 text-sm rounded-lg hover:bg-cyan-600/30 transition-colors">
                    Profile
                  </button>
                  <button id="mobile-logout-btn" class="w-full px-4 py-2 bg-red-600/20 text-white border border-red-500/30 text-sm rounded-lg hover:bg-red-600/30 transition-colors">
                    Logout
                  </button>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `
  }

  setupEventListeners(onNavigate: (path: string) => void, onLogout: () => void): void {
    // Desktop Auth button listeners
    document.getElementById('login-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.authModal.show('login')
    })

    document.getElementById('mobile-login-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.authModal.show('login')
    })

    // Logout button listeners
    document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
      e.preventDefault()
      await onLogout()
    })

    document.getElementById('mobile-logout-btn')?.addEventListener('click', async (e) => {
      e.preventDefault()
      this.closeMobileMenu()
      await onLogout()
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
          onNavigate(href)
        }
      })
    })

    // Profile button listeners
    document.getElementById('desktop-profile-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      if (authService.isAuthenticated()) {
        onNavigate('/profile')
      } else {
        this.authModal.show('login')
      }
    })

    document.getElementById('mobile-nav-profile-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.closeMobileMenu()
      if (authService.isAuthenticated()) {
        onNavigate('/profile')
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
}
