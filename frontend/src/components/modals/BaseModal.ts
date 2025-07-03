/**
 * 통합된 BaseModal - 기존 인터페이스 유지 + ModalManager 활용
 * 
 * 기존 BaseModal의 모든 메서드를 유지하면서 내부적으로 ModalManager를 활용하여
 * 더 효율적이고 유연한 모달 시스템을 제공합니다.
 */

import { ModalManager, ModalContent, ModalConfig } from '../../managers/ModalManager.js';
import { DOMUpdater } from '../../utils/DOMUpdater.js';
import { ErrorHandler } from '../../utils/ErrorHandler.js';
import { ValidationResult } from '../../utils/validators.js';
import { ApiError } from '../../services/ApiClient.js';
import i18n from '../../services/i18n';

export abstract class BaseModal {
  protected modalManager: ModalManager;
  protected errorHandler: ErrorHandler;
  protected isVisible: boolean = false;
  protected contentElement: HTMLElement | null = null;

  constructor() {
    this.modalManager = ModalManager.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
  }

  /**
   * 모달 표시 - 기존 인터페이스 유지
   */
  public show(): void {
    if (this.isVisible) return;

    const modalContent: ModalContent = {
      title: this.getTitle?.() || undefined,
      content: () => {
        this.contentElement = document.createElement('div');
        this.contentElement.className = 'modal-body';
        this.render();
        return this.contentElement;
      },
      onShow: () => this.onShow(),
      onClose: () => this.onClose(),
      config: this.getModalConfig()
    };

    this.modalManager.show(modalContent);
    this.isVisible = true;
  }

  /**
   * 모달 숨기기 - 기존 인터페이스 유지
   */
  public close(): void {
    if (!this.isVisible) return;

    this.modalManager.hide();
    this.isVisible = false;
  }

  /**
   * 모달이 현재 표시되어 있는지 확인
   */
  public isOpen(): boolean {
    return this.isVisible && this.modalManager.isOpen();
  }

  /**
   * 기존 BaseModal과 호환되는 메서드들
   */
  protected abstract render(): void;
  protected abstract onShow(): void;
  protected abstract onClose(): void;

  /**
   * 모달 제목 반환 (선택사항 - 하위 클래스에서 구현 가능)
   */
  protected getTitle?(): string;

  /**
   * 모달 설정 반환 (하위 클래스에서 오버라이드 가능)
   */
  protected getModalConfig(): ModalConfig {
    return {
      closeOnOutsideClick: this.canCloseOnOutsideClick(),
      sizeClass: this.getSizeClass(),
      animated: true,
      zIndex: 1000
    };
  }

  /**
   * 모달 크기 클래스 반환 (하위 클래스에서 오버라이드 가능)
   */
  protected getSizeClass(): string {
    return 'w-[450px] max-w-[95%]';
  }

  /**
   * 외부 클릭으로 닫을 수 있는지 여부 (하위 클래스에서 오버라이드 가능)
   */
  protected canCloseOnOutsideClick(): boolean {
    return true;
  }

  // ===========================================
  // 기존 BaseModal 메서드들 - 모두 유지
  // ===========================================

  // Field validation helpers
  protected showFieldError(field: string, message: string): void {
    const errorElement = this.contentElement?.querySelector(`#${field}-error`) as HTMLElement;
    const successElement = this.contentElement?.querySelector(`#${field}-success`) as HTMLElement;
    const inputElement = this.contentElement?.querySelector(`#${field}-input`) as HTMLInputElement;
    
    if (errorElement && inputElement) {
      errorElement.textContent = message;
      errorElement.classList.remove('hidden');
      successElement?.classList.add('hidden');
      inputElement.classList.add('border-terminal-red');
      inputElement.classList.remove('border-terminal-gray', 'border-terminal-green');
    }
  }

  protected showFieldSuccess(field: string, message: string): void {
    const errorElement = this.contentElement?.querySelector(`#${field}-error`) as HTMLElement;
    const successElement = this.contentElement?.querySelector(`#${field}-success`) as HTMLElement;
    const inputElement = this.contentElement?.querySelector(`#${field}-input`) as HTMLInputElement;
    
    if (successElement && inputElement) {
      successElement.textContent = message;
      successElement.classList.remove('hidden');
      errorElement?.classList.add('hidden');
      inputElement.classList.add('border-terminal-green');
      inputElement.classList.remove('border-terminal-gray', 'border-terminal-red');
    }
  }

  protected showFieldLoading(field: string, message: string): void {
    const errorElement = this.contentElement?.querySelector(`#${field}-error`) as HTMLElement;
    const successElement = this.contentElement?.querySelector(`#${field}-success`) as HTMLElement;
    const inputElement = this.contentElement?.querySelector(`#${field}-input`) as HTMLInputElement;
    
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
    const errorElement = this.contentElement?.querySelector(`#${field}-error`) as HTMLElement;
    const successElement = this.contentElement?.querySelector(`#${field}-success`) as HTMLElement;
    const inputElement = this.contentElement?.querySelector(`#${field}-input`) as HTMLInputElement;
    
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
    const errorElement = this.contentElement?.querySelector('#general-error') as HTMLElement;
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.remove('hidden');
    }
  }

  protected hideGeneralError(): void {
    const errorElement = this.contentElement?.querySelector('#general-error') as HTMLElement;
    if (errorElement) {
      errorElement.classList.add('hidden');
    }
  }

  // Validation helper
  protected handleValidationResult(field: string, validation: ValidationResult): boolean {
    if (!validation.isValid) {
      this.showFieldError(field, validation.error ?? i18n.t('common.invalid_input'));
      return false;
    }
    this.hideFieldError(field);
    return true;
  }

  // Error handling with ErrorHandler integration
  protected handleError(error: unknown, context: string, customMessage?: string): void {
    let message = customMessage || i18n.t('common.error_occurred_try_again');
    
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
    const button = this.contentElement?.querySelector(`#${buttonId}`) as HTMLButtonElement;
    
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
    const input = this.contentElement?.querySelector(`#${inputId}`) as HTMLInputElement;
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
      const input = this.contentElement?.querySelector(`#${inputId}`) as HTMLInputElement;
      input?.focus();
    }, delay);
  }

  // Enter key handler
  protected setupEnterKeyHandler(inputId: string, callback: () => void): void {
    const input = this.contentElement?.querySelector(`#${inputId}`) as HTMLInputElement;
    if (!input) return;

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        callback();
      }
    });
  }

  // ===========================================
  // DOMUpdater 기반 추가 유틸리티 메서드들
  // ===========================================

  /**
   * 에러 메시지 표시 (DOMUpdater 활용)
   */
  protected showError(selector: string, message: string): void {
    DOMUpdater.showError(selector, message, { animate: true });
  }

  /**
   * 에러 메시지 숨기기 (DOMUpdater 활용)
   */
  protected hideError(selector: string): void {
    DOMUpdater.hideError(selector);
  }

  /**
   * 로딩 상태 토글 (DOMUpdater 활용)
   */
  protected toggleLoading(selector: string, isLoading: boolean, loadingText?: string): void {
    DOMUpdater.toggleLoading(selector, isLoading, loadingText);
  }

  /**
   * 텍스트 업데이트 (DOMUpdater 활용)
   */
  protected updateText(selector: string, text: string, animate: boolean = false): void {
    DOMUpdater.updateText(selector, text, { animate });
  }

  /**
   * 클래스 토글 (DOMUpdater 활용)
   */
  protected toggleClass(selector: string, className: string, add: boolean): void {
    DOMUpdater.updateClass(selector, className, add);
  }

  /**
   * 폼 검증 결과 표시 (DOMUpdater 활용)
   */
  protected showValidationResult(fieldId: string, result: { isValid: boolean; message?: string }): void {
    DOMUpdater.updateValidationResult(fieldId, result);
  }

  /**
   * 필드 에러 클리어 (DOMUpdater 활용)
   */
  protected clearFieldError(fieldId: string): void {
    const field = this.contentElement?.querySelector(`#${fieldId}`) as HTMLElement;
    const errorElement = this.contentElement?.querySelector(`#${fieldId}-error`) as HTMLElement;
    
    if (field) {
      DOMUpdater.updateClass(field, 'border-terminal-red', false);
      DOMUpdater.updateClass(field, 'border-terminal-gray', true);
    }
    
    if (errorElement) {
      DOMUpdater.hideError(errorElement);
    }
  }
}
