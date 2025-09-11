/**
 * Notification service
 * Manages success, error and information messages
 */

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number; // in ms, 0 = permanent
}

class NotificationService {
  private notifications: Notification[] = [];
  private container: HTMLElement | null = null;

  constructor() {
    this.createContainer();
  }

  /**
   * Creates the notification container
   */
  private createContainer(): void {
    const containerHTML = `
      <div id="notification-container" class="fixed top-4 right-4 z-50 space-y-2">
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', containerHTML);
    this.container = document.getElementById('notification-container');
  }

  /**
   * Adds a new notification
   */
  show(type: NotificationType, title: string, message: string, duration: number = 5000): string {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const notification: Notification = {
      id,
      type,
      title,
      message,
      duration: duration > 0 ? duration : undefined
    };

    this.notifications.push(notification);
    this.renderNotification(notification);

    // Auto-remove if it has duration
    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }

    return id;
  }

  /**
   * Removes a notification
   */
  remove(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      this.notifications = this.notifications.filter(n => n.id !== id);
      const element = document.getElementById(id);
      if (element) {
        element.classList.add('notification-exit');
        setTimeout(() => {
          element.remove();
        }, 300);
      }
    }
  }

  /**
   * Removes all notifications
   */
  clear(): void {
    this.notifications.forEach(notification => {
      this.remove(notification.id);
    });
  }

  /**
   * Renders a notification
   */
  private renderNotification(notification: Notification): void {
    if (!this.container) return;

    // const typeStyles = {
    //   success: 'bg-green-500/20 border-green-500/30 text-green-400',
    //   error: 'bg-red-500/20 border-red-500/30 text-red-400',
    //   warning: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
    //   info: 'bg-blue-500/20 border-blue-500/30 text-blue-400'
    // };

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const notificationHTML = `
      <div id="${notification.id}" class="notification-enter bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20 shadow-2xl max-w-sm transform transition-all duration-300">
        <div class="flex items-start space-x-3">
          <div class="flex-shrink-0 text-xl">${icons[notification.type]}</div>
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-semibold text-white mb-1">${notification.title}</h4>
            <p class="text-sm text-gray-300">${notification.message}</p>
          </div>
          <button onclick="notificationService.remove('${notification.id}')" 
                  class="flex-shrink-0 text-white/60 hover:text-white transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    `;

    this.container.insertAdjacentHTML('beforeend', notificationHTML);

    // Add entrance animation
    const element = document.getElementById(notification.id);
    if (element) {
      setTimeout(() => {
        element.classList.add('translate-x-0', 'opacity-100');
      }, 10);
    }
  }

  // Convenience methods
  success(title: string, message: string, duration?: number): string {
    return this.show('success', title, message, duration);
  }

  error(title: string, message: string, duration?: number): string {
    return this.show('error', title, message, duration);
  }

  warning(title: string, message: string, duration?: number): string {
    return this.show('warning', title, message, duration);
  }

  info(title: string, message: string, duration?: number): string {
    return this.show('info', title, message, duration);
  }
}

// Export a singleton instance
export const notificationService = new NotificationService();

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  .notification-enter {
    transform: translateX(100%);
    opacity: 0;
  }
  
  .notification-enter.translate-x-0 {
    transform: translateX(0);
    opacity: 1;
  }
  
  .notification-exit {
    transform: translateX(100%);
    opacity: 0;
  }
`;
document.head.appendChild(style);

// Expose to window for global access
(window as any).notificationService = notificationService;
