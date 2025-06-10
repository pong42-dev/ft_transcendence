import { Notification } from '../models/Types';

export class NotificationCenter {
  private notifications: Notification[] = [];
  private container: HTMLElement;
  private button: HTMLElement;
  private unreadCount: number = 0;
  private disabled: boolean = false;
  private onNotificationAction: (notification: Notification) => void;

  constructor(onNotificationAction: (notification: Notification) => void) {
    this.container = document.createElement('div');
    this.button = document.createElement('div');
    this.onNotificationAction = onNotificationAction;
    this.setupContainer();
    this.setupButton();
  }

  private setupContainer() {
    this.container.className = 'absolute right-2 bottom-full mb-2 w-72 bg-terminal-black border border-terminal-gray rounded-lg shadow-lg overflow-hidden hidden animate-slide-in';
    
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target as Node) && 
          !this.button.contains(e.target as Node)) {
        this.container.classList.add('hidden');
      }
    });
  }

  private setupButton() {
    this.button.className = 'relative cursor-pointer p-1';
    this.button.innerHTML = `
      <div class="text-terminal-green hover:text-terminal-darkGreen transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zm.995-14.901a1 1 0 1 0-1.99 0A5.002 5.002 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901z"/>
        </svg>
      </div>
    `;

    this.button.addEventListener('click', (e) => {
      if (!this.disabled) {
        e.stopPropagation();
        this.toggleNotifications();
      }
    });
  }

  public renderButton(disabled: boolean = false): HTMLElement {
    this.disabled = disabled;
    const buttonWrapper = document.createElement('div');
    buttonWrapper.className = 'relative';
    
    if (disabled) {
      this.button.className = 'relative cursor-not-allowed p-1';
      this.button.querySelector('div')?.classList.add('opacity-50');
    } else {
      this.button.className = 'relative cursor-pointer p-1';
      this.button.querySelector('div')?.classList.remove('opacity-50');
    }
    
    buttonWrapper.appendChild(this.button);
    buttonWrapper.appendChild(this.container);
    return buttonWrapper;
  }

  public addNotification(notification: Notification): void {
    this.notifications.unshift(notification);
    this.unreadCount++;
    this.updateUnreadBadge();
    this.renderNotifications();
  }

  private getNotificationIcon(type: string): string {
    switch (type) {
      case 'friend_request':
        return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm.5-5v1h1a.5.5 0 0 1 0 1h-1v1a.5.5 0 0 1-1 0v-1h-1a.5.5 0 0 1 0-1h1v-1a.5.5 0 0 1 1 0Zm-2-6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>';
      case 'game_invite':
        return '<svg xmlns="http://www.w3.org/2000/svg"width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M11.5 6.027a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zm-1.5 1.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1zm2.5-.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zm-1.5 1.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1zm-6.5-3h1v1h1v1h-1v1h-1v-1h-1v-1h1v-1z"/></svg>';
      case 'chat':
        return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7c0 1.76.743 3.37 1.97 4.6-.097 1.016-.417 2.13-.771 2.966-.079.186.074.394.273.362 2.256-.37 3.597-.938 4.18-1.234A9.06 9.06 0 0 0 8 15z"/></svg>';
      default:
        return '';
    }
  }

  private updateUnreadBadge(): void {
    const existingBadge = this.button.querySelector('.unread-badge');
    if (existingBadge) {
      existingBadge.remove();
    }

    if (this.unreadCount > 0 && !this.disabled) {
      const badge = document.createElement('div');
      badge.className = 'unread-badge absolute -top-1 -right-1 bg-terminal-red text-white text-xs rounded-full w-4 h-4 flex items-center justify-center';
      badge.textContent = this.unreadCount.toString();
      this.button.appendChild(badge);
    }
  }

  private toggleNotifications(): void {
    if (this.disabled) return;
    
    const isHidden = this.container.classList.contains('hidden');
    
    if (isHidden) {
      this.container.classList.remove('hidden');
      this.renderNotifications();
    } else {
      this.container.classList.add('hidden');
    }
  }

  private renderNotifications(): void {
    if (this.disabled) return;
    
    this.container.innerHTML = '';

    if (this.notifications.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'p-3 text-center text-terminal-green text-sm';
      emptyState.textContent = 'No new notifications';
      this.container.appendChild(emptyState);
      return;
    }

    const notificationList = document.createElement('div');
    notificationList.className = 'max-h-[120px] overflow-y-auto scrollbar-hide';

    this.notifications.forEach(notification => {
      const notificationElement = document.createElement('div');
      notificationElement.className = 'p-3 hover:bg-terminal-gray hover:bg-opacity-10 transition-colors border-b border-terminal-gray last:border-b-0';
      
      const header = document.createElement('div');
      header.className = 'flex items-center gap-2 mb-1';
      
      const icon = document.createElement('div');
      icon.className = 'text-terminal-green flex-shrink-0';
      icon.innerHTML = this.getNotificationIcon(notification.type);
      
      const title = document.createElement('div');
      title.className = 'text-sm font-bold text-terminal-green flex-grow';
      title.textContent = notification.title;
      
      const time = document.createElement('div');
      time.className = 'text-sm text-terminal-gray opacity-60';
      time.textContent = 'now';
      
      header.appendChild(icon);
      header.appendChild(title);
      header.appendChild(time);
      
      const message = document.createElement('div');
      message.className = 'text-sm text-terminal-green mb-2 pl-6';
      message.textContent = notification.message;
      
      const actions = document.createElement('div');
      actions.className = 'flex justify-end gap-2 pl-6';

      if (notification.type === 'chat') {
        const openChatButton = document.createElement('button');
        openChatButton.className = 'px-2 py-1 text-sm bg-terminal-green text-terminal-black rounded hover:bg-terminal-darkGreen transition-colors w-full';
        openChatButton.textContent = 'Open Chat';
        openChatButton.onclick = () => {
          this.onNotificationAction(notification);
          this.notifications = this.notifications.filter(n => n.id !== notification.id);
          this.unreadCount = Math.max(0, this.unreadCount - 1);
          this.updateUnreadBadge();
          this.renderNotifications();
        };
        actions.appendChild(openChatButton);
      } else {
        const acceptButton = document.createElement('button');
        acceptButton.className = 'px-2 py-1 text-sm bg-terminal-green text-terminal-black rounded hover:bg-terminal-darkGreen transition-colors';
        acceptButton.textContent = 'Accept';
        acceptButton.onclick = () => {
          this.onNotificationAction(notification);
          this.notifications = this.notifications.filter(n => n.id !== notification.id);
          this.unreadCount = Math.max(0, this.unreadCount - 1);
          this.updateUnreadBadge();
          this.renderNotifications();
        };
        
        const declineButton = document.createElement('button');
        declineButton.className = 'px-2 py-1 text-sm bg-terminal-red text-white rounded hover:bg-opacity-80 transition-colors';
        declineButton.textContent = 'Decline';
        declineButton.onclick = () => {
          this.notifications = this.notifications.filter(n => n.id !== notification.id);
          this.unreadCount = Math.max(0, this.unreadCount - 1);
          this.updateUnreadBadge();
          this.renderNotifications();
        };
        
        actions.appendChild(acceptButton);
        actions.appendChild(declineButton);
      }
      
      notificationElement.appendChild(header);
      notificationElement.appendChild(message);
      notificationElement.appendChild(actions);
      
      notificationList.appendChild(notificationElement);
    });

    this.container.appendChild(notificationList);
  }
}