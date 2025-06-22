import { errorHandler, ErrorHandler } from '../utils/ErrorHandler.js';
import { ValidationResult } from '../utils/validators.js';
import { ApiError } from '../services/ApiClient.js';

export abstract class BaseModal {
  protected modalElement: HTMLElement;
  protected contentElement: HTMLElement;
  protected errorHandler: ErrorHandler;

  constructor() {
    this.modalElement = document.createElement('div');
    this.contentElement = document.createElement('div');
    this.errorHandler = errorHandler;
    this.setupModal();
  }

  public show(): void {
    this.render();
    document.body.appendChild(this.modalElement);
    this.onShow();
  }

  public close(): void {
    this.modalElement.remove();
    this.onClose();
  }

  protected setupModal(): void {
    this.modalElement.className =
      'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    this.contentElement.className =
      'bg-terminal-black border border-terminal-gray p-8 rounded-lg max-w-[95%] overflow-hidden flex flex-col';
    this.modalElement.appendChild(this.contentElement);

    // Close on outside click (can be overridden)
    this.modalElement.addEventListener('click', (e) => {
      if (e.target === this.modalElement && this.canCloseOnOutsideClick()) {
        this.close();
      }
    });
  }

  protected canCloseOnOutsideClick(): boolean {
    return true;
  }

  protected abstract render(): void;
  protected abstract onShow(): void;
  protected abstract onClose(): void;

  // Field validation helpers
  protected showFieldError(field: string, message: string): void {
    const errorElement = this.contentElement.querySelector(`#${field}-error`) as HTMLElement;
    const successElement = this.contentElement.querySelector(`#${field}-success`) as HTMLElement;
    const inputElement = this.contentElement.querySelector(`#${field}-input`) as HTMLInputElement;
    
    if (errorElement && inputElement) {
      errorElement.textContent = message;
      errorElement.classList.remove('hidden');
      successElement?.classList.add('hidden');
      inputElement.classList.add('border-terminal-red');
      inputElement.classList.remove('border-terminal-gray', 'border-terminal-green');
    }
  }

  protected showFieldSuccess(field: string, message: string): void {
    const errorElement = this.contentElement.querySelector(`#${field}-error`) as HTMLElement;
    const successElement = this.contentElement.querySelector(`#${field}-success`) as HTMLElement;
    const inputElement = this.contentElement.querySelector(`#${field}-input`) as HTMLInputElement;
    
    if (successElement && inputElement) {
      successElement.textContent = message;
      successElement.classList.remove('hidden');
      errorElement?.classList.add('hidden');
      inputElement.classList.add('border-terminal-green');
      inputElement.classList.remove('border-terminal-gray', 'border-terminal-red');
    }
  }

  protected showFieldLoading(field: string, message: string): void {
    const errorElement = this.contentElement.querySelector(`#${field}-error`) as HTMLElement;
    const successElement = this.contentElement.querySelector(`#${field}-success`) as HTMLElement;
    const inputElement = this.contentElement.querySelector(`#${field}-input`) as HTMLInputElement;
    
    if (errorElement && inputElement) {
      errorElement.textContent = message;
      errorElement.classList.remove('hidden', 'text-terminal-red');
      errorElement.classList.add('text-terminal-gray');
      successElement?.classList.add('hidden');
      inputElement.classList.remove('border-terminal-red', 'border-terminal-green');
      inputElement.classList.add('border-terminal-gray');
    }
  }

  protected hideFieldError(field: string): void {
    const errorElement = this.contentElement.querySelector(`#${field}-error`) as HTMLElement;
    const successElement = this.contentElement.querySelector(`#${field}-success`) as HTMLElement;
    const inputElement = this.contentElement.querySelector(`#${field}-input`) as HTMLInputElement;
    
    if (errorElement && inputElement) {
      errorElement.classList.add('hidden');
      errorElement.classList.add('text-terminal-red');
      errorElement.classList.remove('text-terminal-gray');
      successElement?.classList.add('hidden');
      inputElement.classList.remove('border-terminal-red', 'border-terminal-green');
      inputElement.classList.add('border-terminal-gray');
    }
  }

  // General error handling
  protected showGeneralError(message: string): void {
    const errorElement = this.contentElement.querySelector('#general-error') as HTMLElement;
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.remove('hidden');
    }
  }

  protected hideGeneralError(): void {
    const errorElement = this.contentElement.querySelector('#general-error') as HTMLElement;
    if (errorElement) {
      errorElement.classList.add('hidden');
    }
  }

  // Validation helper
  protected handleValidationResult(field: string, validation: ValidationResult): boolean {
    if (!validation.isValid) {
      this.showFieldError(field, validation.error ?? 'Invalid input');
      return false;
    }
    this.hideFieldError(field);
    return true;
  }

  // Error handling with ErrorHandler integration
  protected handleError(error: unknown, context: string, customMessage?: string): void {
    let message = customMessage || 'An error occurred. Please try again.';
    
    if (error instanceof ApiError) {
      message = error.data?.message || message;
      this.errorHandler.handleError(error, context);
    } else if (error instanceof Error) {
      this.errorHandler.handleError(error, context);
    } else {
      this.errorHandler.handleError(new Error(String(error)), context);
    }
    
    this.showGeneralError(message);
  }

  // Loading state management
  protected setButtonLoading(buttonId: string, loading: boolean, loadingText?: string): void {
    const button = this.contentElement.querySelector(`#${buttonId}`) as HTMLButtonElement;
    
    if (!button) return;
    
    if (loading) {
      button.disabled = true;
      if (loadingText) {
        button.setAttribute('data-original-text', button.textContent || '');
        button.textContent = loadingText;
      }
      button.classList.add('opacity-50');
    } else {
      button.disabled = false;
      const originalText = button.getAttribute('data-original-text');
      if (originalText) {
        button.textContent = originalText;
        button.removeAttribute('data-original-text');
      }
      button.classList.remove('opacity-50');
    }
  }

  // Input formatting helpers
  protected setupNumericInput(inputId: string, maxLength?: number): void {
    const input = this.contentElement.querySelector(`#${inputId}`) as HTMLInputElement;
    if (!input) return;

    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      target.value = target.value.replace(/\D/g, '');
      if (maxLength && target.value.length > maxLength) {
        target.value = target.value.slice(0, maxLength);
      }
    });
  }

  // Focus management
  protected focusInput(inputId: string, delay: number = 100): void {
    setTimeout(() => {
      const input = this.contentElement.querySelector(`#${inputId}`) as HTMLInputElement;
      input?.focus();
    }, delay);
  }

  // Enter key handler
  protected setupEnterKeyHandler(inputId: string, callback: () => void): void {
    const input = this.contentElement.querySelector(`#${inputId}`) as HTMLInputElement;
    if (!input) return;

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        callback();
      }
    });
  }
}