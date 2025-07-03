/**
 * DOM 업데이트 헬퍼 함수들
 * 
 * 컴포넌트에서 전체 innerHTML을 교체하는 대신 특정 DOM 요소만 업데이트하는
 * 효율적인 함수들을 제공합니다.
 */

export interface DOMUpdateOptions {
  /** 애니메이션 적용 여부 */
  animate?: boolean;
  /** 애니메이션 지속 시간 (ms) */
  duration?: number;
  /** 업데이트 후 콜백 */
  onComplete?: () => void;
}

/**
 * DOM 업데이트 헬퍼 클래스
 */
export class DOMUpdater {
  
  /**
   * 텍스트 내용 업데이트
   */
  static updateText(element: HTMLElement | string, text: string, options?: DOMUpdateOptions): void {
    const target = this.getElement(element);
    if (!target) return;

    const opts = { animate: false, duration: 200, ...options };

    if (opts.animate && target.textContent !== text) {
      target.style.transition = `opacity ${opts.duration}ms ease-in-out`;
      target.style.opacity = '0';
      
      setTimeout(() => {
        target.textContent = text;
        target.style.opacity = '1';
        
        setTimeout(() => {
          target.style.transition = '';
          opts.onComplete?.();
        }, opts.duration);
      }, opts.duration / 2);
    } else {
      target.textContent = text;
      opts.onComplete?.();
    }
  }

  /**
   * HTML 내용 업데이트
   */
  static updateHTML(element: HTMLElement | string, html: string, options?: DOMUpdateOptions): void {
    const target = this.getElement(element);
    if (!target) return;

    const opts = { animate: false, duration: 200, ...options };

    if (opts.animate && target.innerHTML !== html) {
      target.style.transition = `opacity ${opts.duration}ms ease-in-out`;
      target.style.opacity = '0';
      
      setTimeout(() => {
        target.innerHTML = html;
        target.style.opacity = '1';
        
        setTimeout(() => {
          target.style.transition = '';
          opts.onComplete?.();
        }, opts.duration);
      }, opts.duration / 2);
    } else {
      target.innerHTML = html;
      opts.onComplete?.();
    }
  }

  /**
   * 속성 업데이트
   */
  static updateAttribute(element: HTMLElement | string, attribute: string, value: string): void {
    const target = this.getElement(element);
    if (!target) return;
    
    target.setAttribute(attribute, value);
  }

  /**
   * 클래스 추가/제거
   */
  static updateClass(element: HTMLElement | string, className: string, add: boolean): void {
    const target = this.getElement(element);
    if (!target) return;

    if (add) {
      target.classList.add(className);
    } else {
      target.classList.remove(className);
    }
  }

  /**
   * 여러 클래스 토글
   */
  static toggleClasses(element: HTMLElement | string, classNames: string[], condition: boolean): void {
    const target = this.getElement(element);
    if (!target) return;

    classNames.forEach(className => {
      target.classList.toggle(className, condition);
    });
  }

  /**
   * 스타일 업데이트
   */
  static updateStyle(element: HTMLElement | string, styles: Partial<CSSStyleDeclaration>): void {
    const target = this.getElement(element);
    if (!target) return;

    Object.assign(target.style, styles);
  }

  /**
   * 입력 필드 값 업데이트
   */
  static updateInputValue(element: HTMLInputElement | string, value: string): void {
    const target = this.getElement(element) as HTMLInputElement;
    if (!target || target.tagName !== 'INPUT') return;

    target.value = value;
  }

  /**
   * 에러 메시지 표시/숨기기
   */
  static showError(element: HTMLElement | string, message: string, options?: DOMUpdateOptions): void {
    const target = this.getElement(element);
    if (!target) return;

    this.updateText(target, message);
    this.updateClass(target, 'hidden', false);
    
    const opts = { animate: true, duration: 200, ...options };
    if (opts.animate) {
      target.style.opacity = '0';
      target.style.transition = `opacity ${opts.duration}ms ease-in-out`;
      requestAnimationFrame(() => {
        target.style.opacity = '1';
      });
    }
  }

  /**
   * 에러 메시지 숨기기
   */
  static hideError(element: HTMLElement | string, options?: DOMUpdateOptions): void {
    const target = this.getElement(element);
    if (!target) return;

    const opts = { animate: true, duration: 200, ...options };
    
    if (opts.animate) {
      target.style.transition = `opacity ${opts.duration}ms ease-in-out`;
      target.style.opacity = '0';
      
      setTimeout(() => {
        this.updateClass(target, 'hidden', true);
        this.updateText(target, '');
        target.style.transition = '';
        opts.onComplete?.();
      }, opts.duration);
    } else {
      this.updateClass(target, 'hidden', true);
      this.updateText(target, '');
      opts.onComplete?.();
    }
  }

  /**
   * 로딩 상태 토글
   */
  static toggleLoading(element: HTMLElement | string, isLoading: boolean, loadingText?: string): void {
    const target = this.getElement(element);
    if (!target) return;

    if (isLoading) {
      target.setAttribute('data-original-text', target.textContent || '');
      target.setAttribute('disabled', 'true');
      this.updateText(target, loadingText || 'Loading...');
      this.updateClass(target, 'opacity-50', true);
      this.updateClass(target, 'cursor-not-allowed', true);
    } else {
      const originalText = target.getAttribute('data-original-text') || '';
      target.removeAttribute('disabled');
      target.removeAttribute('data-original-text');
      this.updateText(target, originalText);
      this.updateClass(target, 'opacity-50', false);
      this.updateClass(target, 'cursor-not-allowed', false);
    }
  }

  /**
   * 요소 표시/숨기기 (애니메이션 지원)
   */
  static toggleVisibility(element: HTMLElement | string, visible: boolean, options?: DOMUpdateOptions): void {
    const target = this.getElement(element);
    if (!target) return;

    const opts = { animate: true, duration: 200, ...options };

    if (opts.animate) {
      if (visible) {
        this.updateClass(target, 'hidden', false);
        target.style.opacity = '0';
        target.style.transition = `opacity ${opts.duration}ms ease-in-out`;
        requestAnimationFrame(() => {
          target.style.opacity = '1';
        });
        
        setTimeout(() => {
          target.style.transition = '';
          opts.onComplete?.();
        }, opts.duration);
      } else {
        target.style.transition = `opacity ${opts.duration}ms ease-in-out`;
        target.style.opacity = '0';
        
        setTimeout(() => {
          this.updateClass(target, 'hidden', true);
          target.style.transition = '';
          opts.onComplete?.();
        }, opts.duration);
      }
    } else {
      this.updateClass(target, 'hidden', !visible);
      opts.onComplete?.();
    }
  }

  /**
   * 요소 확인/생성 헬퍼
   */
  private static getElement(element: HTMLElement | string): HTMLElement | null {
    if (typeof element === 'string') {
      return document.querySelector(element) as HTMLElement;
    }
    return element;
  }

  /**
   * 폼 검증 결과 업데이트
   */
  static updateValidationResult(fieldId: string, result: { isValid: boolean; message?: string }): void {
    const field = this.getElement(`#${fieldId}`) as HTMLInputElement;
    const errorElement = this.getElement(`#${fieldId}-error`);
    
    if (!field) return;

    if (result.isValid) {
      // 성공 상태
      this.updateClass(field, 'border-terminal-green', true);
      this.updateClass(field, 'border-terminal-red', false);
      
      if (errorElement) {
        this.hideError(errorElement);
      }
    } else {
      // 에러 상태
      this.updateClass(field, 'border-terminal-red', true);
      this.updateClass(field, 'border-terminal-green', false);
      
      if (errorElement && result.message) {
        this.showError(errorElement, result.message);
      }
    }
  }

  /**
   * 리스트 아이템 추가 (애니메이션 지원)
   */
  static addListItem(container: HTMLElement | string, itemHTML: string, options?: DOMUpdateOptions): void {
    const target = this.getElement(container);
    if (!target) return;

    const opts = { animate: true, duration: 300, ...options };
    
    // 새 아이템 생성
    const item = document.createElement('div');
    item.innerHTML = itemHTML;
    
    if (opts.animate) {
      item.style.opacity = '0';
      item.style.transform = 'translateY(-10px)';
      item.style.transition = `all ${opts.duration}ms ease-out`;
    }
    
    target.appendChild(item.firstElementChild || item);
    
    if (opts.animate) {
      requestAnimationFrame(() => {
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
      });
      
      setTimeout(() => {
        item.style.transition = '';
        opts.onComplete?.();
      }, opts.duration);
    } else {
      opts.onComplete?.();
    }
  }

  /**
   * 카운터 애니메이션
   */
  static animateCounter(element: HTMLElement | string, from: number, to: number, duration: number = 1000): void {
    const target = this.getElement(element);
    if (!target) return;

    const startTime = performance.now();
    const diff = to - from;

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(from + (diff * easeOut));
      
      this.updateText(target, currentValue.toString());
      
      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    };

    requestAnimationFrame(updateCounter);
  }
}
