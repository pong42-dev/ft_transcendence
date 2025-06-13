// Simple error handler for PONG-CLI game

export class ErrorHandler {
  private static instance: ErrorHandler;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  constructor() {
    this.setupGlobalHandlers();
  }

  private setupGlobalHandlers(): void {
    // Handle all errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error('Unknown error'), 'Global Error');
    });

    // Handle promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        'Promise Rejection'
      );
      event.preventDefault();
    });
  }

  handleError(error: Error, context: string = 'Error'): void {
    // Log for debugging
    console.error(`[${context}]`, error);
    
    // Show user notification
    this.showNotification(this.getUserMessage(error), 'error');
  }

  private getUserMessage(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
      return 'Connection error. Please check your internet connection.';
    }
    
    if (message.includes('unauthorized') || message.includes('401')) {
      return 'Your session has expired. Please log in again.';
    }
    
    if (message.includes('forbidden') || message.includes('403')) {
      return 'You don\'t have permission for this action.';
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return 'Resource not found.';
    }

    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    
    return 'Something went wrong. Please try again.';
  }

  showNotification(message: string, type: 'error' | 'success' = 'error'): void {
    // Remove existing notifications
    document.querySelectorAll('.game-notification').forEach(el => el.remove());

    const isError = type === 'error';
    const bgColor = isError ? 'bg-red-600' : 'bg-green-600';
    const icon = isError ? '⚠️' : '✅';

    const notification = document.createElement('div');
    notification.className = `game-notification fixed top-4 right-4 ${bgColor} text-white p-3 rounded shadow-lg z-50 max-w-sm`;
    notification.innerHTML = `
      <div class="flex items-center gap-2">
        <span>${icon}</span>
        <span class="text-sm">${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">×</button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  showSuccess(message: string): void {
    this.showNotification(message, 'success');
  }
}

// Simple async wrapper
export async function tryAsync<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    ErrorHandler.getInstance().handleError(
      error instanceof Error ? error : new Error(String(error)),
      'Async Operation'
    );
    return null;
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance(); 