interface RouteParams {
  [key: string]: string;
}

interface Route {
  pattern: string;
  handler: (params?: RouteParams) => void;
  regex: RegExp;
  paramNames: string[];
}

export class Router {
  private routes: Route[] = [];
  private currentPath: string = '';

  constructor() {
    // Listen for hash changes instead of popstate
    window.addEventListener('hashchange', () => {
      this.handleRouteChange();
    });
    
    // Handle initial load
    this.handleRouteChange();
  }

  register(pattern: string, handler: (params?: RouteParams) => void): void {
    const paramNames: string[] = [];
    const regex = new RegExp(
      '^' + pattern.replace(/:\w+/g, (match) => {
        paramNames.push(match.substring(1));
        return '([^/]+)';
      }) + '$'
    );

    this.routes.push({
      pattern,
      handler,
      regex,
      paramNames
    });
  }

  navigate(path: string): void {
    // Use hash instead of pushState
    const hashPath = '#' + path;
    if (window.location.hash !== hashPath) {
      window.location.hash = hashPath;
    } else {
      // If hash is already set, manually trigger route change
      this.currentPath = path;
      this.handleRouteChange();
    }
  }

  private handleRouteChange(): void {
    // Get path from hash, default to '/' if no hash
    const hash = window.location.hash;
    const path = hash.startsWith('#') ? hash.substring(1) : '/';
    
    // If path is empty, default to '/'
    const normalizedPath = path || '/';
    this.currentPath = normalizedPath;
    
    for (const route of this.routes) {
      const match = normalizedPath.match(route.regex);
      if (match) {
        const params: RouteParams = {};
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });
        
        route.handler(params);
        return;
      }
    }
    
    // Default route if no match
    const defaultRoute = this.routes.find(r => r.pattern === '/');
    if (defaultRoute) {
      defaultRoute.handler();
    }
  }

  getCurrentPath(): string {
    return this.currentPath || '/';
  }
} 