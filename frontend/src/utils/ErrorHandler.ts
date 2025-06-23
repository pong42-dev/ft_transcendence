// Enhanced error handler for API and application errors

import { ApiError } from '../services/api/BaseApiService';

export enum ErrorLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  additionalData?: Record<string, any>;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: Array<{ error: Error; context: string; level: ErrorLevel; timestamp: number }> = [];
  private maxQueueSize = 100;

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
      this.handleError(
        event.error || new Error(`Script error: ${event.filename}:${event.lineno}`),
        'Global JavaScript Error',
        ErrorLevel.ERROR
      );
    });

    // Handle promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        'Unhandled Promise Rejection',
        ErrorLevel.ERROR
      );
      event.preventDefault();
    });
  }

  handleError(error: Error, context: string = 'Error', level: ErrorLevel = ErrorLevel.ERROR, errorContext?: ErrorContext): void {
    // Add to error queue for debugging
    this.addToErrorQueue(error, context, level);
    
    // Enhanced logging with context
    const logData = {
      message: error.message,
      stack: error.stack,
      context,
      level,
      errorContext,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    // Use appropriate console method based on error level
    switch (level) {
      case ErrorLevel.INFO:
        console.info(`[${level.toUpperCase()}][${context}]`, logData);
        break;
      case ErrorLevel.WARNING:
        console.warn(`[${level.toUpperCase()}][${context}]`, logData);
        break;
      case ErrorLevel.ERROR:
      case ErrorLevel.CRITICAL:
      default:
        console.error(`[${level.toUpperCase()}][${context}]`, logData);
        break;
    }
    
    // Handle API errors specially
    if (error instanceof ApiError) {
      this.handleApiError(error, context);
    } else {
      // Only show user notifications for errors and critical issues, not info/warnings
      if (level === ErrorLevel.ERROR || level === ErrorLevel.CRITICAL) {
        this.showNotification(this.getUserMessage(error), this.mapErrorLevelToNotificationType(level));
      }
    }
  }

  private handleApiError(apiError: ApiError, context: string): void {
    const { status, data } = apiError;
    
    // Log API error with context for debugging
    console.error(`[API ERROR][${context}]`, {
      status,
      message: data?.message || apiError.message,
      timestamp: new Date().toISOString()
    });
    
    // Don't show notifications for certain status codes
    const silentStatuses = [401, 403]; // These are handled by interceptors
    
    if (!silentStatuses.includes(status)) {
      const message = data?.message || this.getUserMessage(apiError);
      this.showNotification(message, this.mapErrorLevelToNotificationType(this.getErrorLevelFromStatus(status)));
    }
  }

  private getErrorLevelFromStatus(status: number): ErrorLevel {
    if (status >= 500) return ErrorLevel.CRITICAL;
    if (status >= 400) return ErrorLevel.ERROR;
    return ErrorLevel.WARNING;
  }

  private addToErrorQueue(error: Error, context: string, level: ErrorLevel): void {
    this.errorQueue.push({
      error,
      context,
      level,
      timestamp: Date.now()
    });

    // Keep queue size manageable
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }
  }

  private mapErrorLevelToNotificationType(level: ErrorLevel): 'error' | 'success' {
    switch (level) {
      case ErrorLevel.INFO:
      case ErrorLevel.WARNING:
        return 'success';
      case ErrorLevel.ERROR:
      case ErrorLevel.CRITICAL:
      default:
        return 'error';
    }
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