import { fetchUserProfile } from "../services/Users";

export interface PublicUser {
  id: number;
  displayName: string;
  avatarUrl: string;
  wins: number;
  losses: number;
  createdAt: string;
}

/*
    Usage example (e.g. main.ts):

    const container = document.getElementById('profile-root');
    if (container) {
        const userId = 123; // get from route, data-attr, etc.
        const comp = new UserProfileComponent(container, userId);
        void comp.load();
    }
*/

export class UserProfileComponent {
  private container: HTMLElement;
  private userId: number;
  private root: HTMLElement;

  constructor(container: HTMLElement, userId: number) {
    this.container = container;
    this.userId = userId;
    this.root = document.createElement("div");
    this.root.className = "user-profile";
    this.container.appendChild(this.root);
  }

  async load(): Promise<void> {
    this.renderLoading();
    try {
      const user = await fetchUserProfile(this.userId);
      this.renderUser(user);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.renderError(message);
    } finally {
      // any cleanup that must run regardless of success/failure can go here
    }
  }

  private clear() {
    this.root.innerHTML = "";
  }

  private renderLoading() {
    this.clear();
    const el = document.createElement("div");
    el.className = "loading";
    el.textContent = "Loading profile...";
    this.root.appendChild(el);
  }

  private renderError(message: string) {
    this.clear();
    const el = document.createElement("div");
    el.className = "error";
    el.textContent = `Error: ${message}`;

    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "Retry";
    retry.addEventListener("click", () => void this.load());

    this.root.appendChild(el);
    this.root.appendChild(retry);
  }

  private renderUser(user: PublicUser) {
    this.clear();

    const header = document.createElement("div");
    header.className = "user-header";

    const avatar = document.createElement("img");
    avatar.className = "user-avatar";
    avatar.alt = `${user.displayName} avatar`;
    avatar.src = user.avatarUrl || "/avatars/default-avatar.png";
    avatar.onerror = () => {
      avatar.src = "/avatars/default-avatar.png";
    };
    avatar.width = 64;
    avatar.height = 64;

    const name = document.createElement("h2");
    name.textContent = user.displayName;

    header.appendChild(avatar);
    header.appendChild(name);

    const stats = document.createElement("div");
    stats.className = "user-stats";
    stats.innerHTML = `
            <div>Wins: ${user.wins ?? 0}</div>
            <div>Losses: ${user.losses ?? 0}</div>
        `;

    this.root.appendChild(header);
    this.root.appendChild(stats);
  }
}
