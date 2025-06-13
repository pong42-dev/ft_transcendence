import { Router } from '../utils/Router';

export class Navigation {
  private element: HTMLElement;
  private router: Router;
  private currentPath: string = '/';

  constructor(router: Router) {
    this.router = router;
    this.element = this.createElement();
    this.updateCurrentPath();
  }

  private createElement(): HTMLElement {
    const nav = document.createElement('nav');
    nav.className = 'hidden'; // Initially hidden, can be shown if needed
    return nav;
  }

  public updateCurrentPath(): void {
    this.currentPath = this.router.getCurrentPath();
    this.render();
  }

  private render(): void {
    // This could be expanded to show breadcrumbs or navigation state
    // For now, it's mainly for internal route tracking
    this.element.innerHTML = `
      <div class="text-xs text-gray-500 px-2">
        Current: ${this.currentPath} (Hash: ${window.location.hash || '#/'})
      </div>
    `;
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public getCurrentRoute(): string {
    return this.currentPath;
  }

  // Navigation state helpers
  public isOnRoute(route: string): boolean {
    return this.currentPath === route;
  }

  public isOnProfileRoute(): boolean {
    return this.currentPath.startsWith('/profile');
  }

  public isOnGameRoute(): boolean {
    return this.currentPath.startsWith('/game');
  }

  public isOnFriendsRoute(): boolean {
    return this.currentPath === '/friends';
  }

  public isOnHome(): boolean {
    return this.currentPath === '/';
  }

  // Get route parameters
  public getRouteParams(): { [key: string]: string } {
    const path = this.currentPath;
    
    // Extract username from profile route
    if (path.startsWith('/profile/')) {
      const username = path.split('/profile/')[1];
      return { username };
    }
    
    // Extract game mode from game route
    if (path.startsWith('/game/')) {
      const mode = path.split('/game/')[1];
      return { mode };
    }
    
    return {};
  }

  // Helper method to get current hash
  public getCurrentHash(): string {
    return window.location.hash;
  }
} 