import { sessionService } from "../services/SessionService";

export class Lobby {
  private authModal: any;
  private lobbyContainer: HTMLElement | null = null;

  constructor(authModal: any) {
    this.authModal = authModal;
  }

  public init(): void {
    // Create a container for the lobby to be re-rendered into
    this.lobbyContainer = document.createElement("div");
    this.lobbyContainer.id = "lobby-container";
    document.body.appendChild(this.lobbyContainer);

    // Initial render
    this.render();

    // Subscribe to session changes to automatically update the UI
    sessionService.subscribe(() => this.render());
  }

  public destroy(): void {
    if (this.lobbyContainer) {
      this.lobbyContainer.remove();
      this.lobbyContainer = null;
    }
  }

  private render(): void {
    const isAuthenticated = sessionService.isAuthenticated();
    const html = isAuthenticated
      ? this.renderAuthenticatedLobby()
      : this.renderGuestLobby();

    if (this.lobbyContainer) {
      this.lobbyContainer.innerHTML = html;
      this.setupEventListeners(); // Re-attach listeners after every render

      if (isAuthenticated) {
        this.renderParticipantsList();
      }
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
                <span class="text-xs text-gray-400" id="participant-count">0 online</span>
              </div>
            </div>
          </div>

          <!-- Content -->
          <div class="p-4">
            <!-- Participants List -->
            <div class="mb-4">
              <h4 class="text-sm font-medium text-gray-300 mb-2">Players in Session</h4>
              <div id="participants-list" class="space-y-2 max-h-40 overflow-y-auto">
                <!-- Participants will be rendered here by the render method -->
              </div>
            </div>

            <!-- Add Player Button -->
            <div class="space-y-2">
              <button id="lobby-add-player-btn" 
                      class="w-full px-4 py-2 bg-cyan-600 text-white font-medium rounded-lg hover:bg-cyan-700 transition-colors text-sm">
                Add / Switch Player
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
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
    `;
  }

  private renderParticipantsList(): void {
    const participants = sessionService.getParticipants();
    const listElement = document.getElementById("participants-list");
    const countElement = document.getElementById("participant-count");

    if (!listElement || !countElement) return;

    countElement.textContent = `${participants.length} player${
      participants.length !== 1 ? "s" : ""
    }`;

    if (participants.length === 0) {
      listElement.innerHTML =
        '<div class="px-2 py-2 text-sm text-gray-400">No players in session.</div>';
      return;
    }

    listElement.innerHTML = participants
      .map(
        (user) => `
      <div class="flex items-center justify-between p-2 bg-white/5 rounded-lg">
        <div class="flex items-center overflow-hidden">
          <img src="${
            user.avatarUrl || "/avatars/default-avatar.png"
          }" alt="Avatar of ${
          user.displayName
        }" class="w-6 h-6 rounded-full mr-2 flex-shrink-0" onerror="this.src='/avatars/default-avatar.png'">
          <span class="text-white text-sm font-medium truncate">${
            user.displayName
          }</span>
        </div>
        <div class="flex items-center flex-shrink-0 ml-2">
          <button data-user-id="${
            user.id
          }" class="view-profile-btn text-cyan-400 hover:text-cyan-300 text-xs font-semibold mr-2">
            Profile
          </button>
          <button data-user-id="${
            user.id
          }" class="logout-user-btn text-red-400 hover:text-red-300 text-xs font-semibold">
            Logout
          </button>
        </div>
      </div>
    `
      )
      .join("");
  }

  private setupEventListeners(): void {
    if (!this.lobbyContainer) return;

    // Find elements *within* the lobby container
    const toggleBtn = this.lobbyContainer.querySelector("#lobby-toggle");
    const loginBtn = this.lobbyContainer.querySelector("#lobby-login-btn");
    const addPlayerBtn = this.lobbyContainer.querySelector(
      "#lobby-add-player-btn"
    );
    const participantsList =
      this.lobbyContainer.querySelector("#participants-list");

    // Toggle lobby panel
    toggleBtn?.addEventListener("click", () => {
      this.lobbyContainer
        ?.querySelector("#lobby-panel")
        ?.classList.toggle("hidden");
    });

    // Button to open the login modal (for guests)
    loginBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      this.authModal.show("login");
    });

    // Button to open the login modal (for adding a new player)
    addPlayerBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      this.authModal.show("login");
    });

    // Delegated event listener for profile and logout buttons
    participantsList?.addEventListener("click", async (e) => {
      const target = e.target as HTMLElement;

      // Handle profile button click
      const profileButton = target.closest(".view-profile-btn");
      if (profileButton) {
        const userId = parseInt(
          profileButton.getAttribute("data-user-id") || "0",
          10
        );
        if (userId) {
          // Navigate to user profile page
          window.history.pushState({}, "", `/profile/${userId}`);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
        return;
      }

      // Handle logout button click
      const logoutButton = target.closest(".logout-user-btn");
      if (logoutButton) {
        const userId = parseInt(
          logoutButton.getAttribute("data-user-id") || "0",
          10
        );
        if (userId) {
          await sessionService.logout(userId);
          // The view will automatically update via the sessionService subscription
        }
      }
    });
  }
}
