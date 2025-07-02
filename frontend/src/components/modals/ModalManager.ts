/**
 * ModalManager - 모달의 중앙 집중식 관리
 * 
 * 이 클래스는 싱글톤 패턴을 사용하여 모든 모달을 하나의 컨테이너에서 관리합니다.
 * 상속 기반의 BaseModal 시스템을 대체하여 더 유연한 모달 시스템을 제공합니다.
 */

export interface ModalConfig {
  /** 모달을 닫을 수 있는지 여부 */
  closable?: boolean;
  /** 외부 클릭으로 닫을 수 있는지 여부 */
  closeOnOutsideClick?: boolean;
  /** 모달 크기 클래스 */
  sizeClass?: string;
  /** z-index 값 */
  zIndex?: number;
  /** 애니메이션 사용 여부 */
  animated?: boolean;
}

export interface ModalContent {
  /** 모달 제목 (선택사항) */
  title?: string;
  /** 렌더링 함수 또는 HTML 문자열 */
  content: (() => HTMLElement) | string;
  /** 모달이 표시될 때 호출되는 콜백 */
  onShow?: () => void;
  /** 모달이 닫힐 때 호출되는 콜백 */
  onClose?: () => void;
  /** 설정 옵션 */
  config?: ModalConfig;
}

export class ModalManager {
  private static instance: ModalManager | null = null;
  private modalContainer: HTMLElement | null = null;
  private modalBackdrop: HTMLElement | null = null;
  private modalContent: HTMLElement | null = null;
  private currentContent: ModalContent | null = null;
  private isVisible: boolean = false;

  // 기본 설정
  private defaultConfig: Required<ModalConfig> = {
    closable: true,
    closeOnOutsideClick: true,
    sizeClass: 'max-w-[450px] w-[95%]',
    zIndex: 1000,
    animated: true
  };

  private constructor() {
    this.createModalStructure();
    this.setupEventListeners();
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): ModalManager {
    if (!ModalManager.instance) {
      ModalManager.instance = new ModalManager();
    }
    return ModalManager.instance;
  }

  /**
   * 모달 DOM 구조 생성
   */
  private createModalStructure(): void {
    // 백드롭 (배경)
    this.modalBackdrop = document.createElement('div');
    this.modalBackdrop.className = 'modal-backdrop fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center transition-opacity duration-200 opacity-0';
    this.modalBackdrop.style.zIndex = this.defaultConfig.zIndex.toString();

    // 모달 컨테이너
    this.modalContainer = document.createElement('div');
    this.modalContainer.className = 'modal-container bg-terminal-black border border-terminal-gray p-8 rounded-lg overflow-hidden flex flex-col transform transition-all duration-200 scale-95 opacity-0';

    // 모달 콘텐츠
    this.modalContent = document.createElement('div');
    this.modalContent.className = 'modal-content';

    this.modalContainer.appendChild(this.modalContent);
    this.modalBackdrop.appendChild(this.modalContainer);
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    if (!this.modalBackdrop) return;

    // 외부 클릭으로 모달 닫기
    this.modalBackdrop.addEventListener('click', (e) => {
      if (e.target === this.modalBackdrop && this.canCloseOnOutsideClick()) {
        this.hide();
      }
    });

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible && this.canClose()) {
        this.hide();
      }
    });
  }

  /**
   * 모달 표시
   */
  public show(modalContent: ModalContent): void {
    if (!this.modalBackdrop || !this.modalContainer || !this.modalContent) {
      console.error('[ModalManager] Modal elements not initialized');
      return;
    }

    this.currentContent = modalContent;
    const config = { ...this.defaultConfig, ...modalContent.config };

    // 모달 설정 적용
    this.applyConfig(config);

    // 콘텐츠 렌더링
    this.renderContent(modalContent);

    // DOM에 추가
    document.body.appendChild(this.modalBackdrop);
    this.isVisible = true;

    // 애니메이션 적용
    if (config.animated) {
      requestAnimationFrame(() => {
        this.modalBackdrop!.classList.remove('opacity-0');
        this.modalContainer!.classList.remove('scale-95', 'opacity-0');
      });
    } else {
      this.modalBackdrop.classList.remove('opacity-0');
      this.modalContainer.classList.remove('scale-95', 'opacity-0');
    }

    // onShow 콜백 실행
    if (modalContent.onShow) {
      modalContent.onShow();
    }
  }

  /**
   * 모달 숨기기
   */
  public hide(): void {
    if (!this.isVisible || !this.modalBackdrop || !this.modalContainer) {
      return;
    }

    const config = { ...this.defaultConfig, ...this.currentContent?.config };

    // onClose 콜백 실행
    if (this.currentContent?.onClose) {
      this.currentContent.onClose();
    }

    // 애니메이션 적용
    if (config.animated) {
      this.modalBackdrop.classList.add('opacity-0');
      this.modalContainer.classList.add('scale-95', 'opacity-0');

      setTimeout(() => {
        this.removeFromDOM();
      }, 200);
    } else {
      this.removeFromDOM();
    }
  }

  /**
   * DOM에서 모달 제거
   */
  private removeFromDOM(): void {
    if (this.modalBackdrop && this.modalBackdrop.parentNode) {
      this.modalBackdrop.parentNode.removeChild(this.modalBackdrop);
    }
    this.isVisible = false;
    this.currentContent = null;
  }

  /**
   * 모달 설정 적용
   */
  private applyConfig(config: Required<ModalConfig>): void {
    if (!this.modalContainer || !this.modalBackdrop) return;

    // 크기 클래스 적용
    this.modalContainer.className = this.modalContainer.className.replace(/max-w-\[[^\]]+\]|\w-\[[^\]]+\]/g, '');
    this.modalContainer.classList.add(...config.sizeClass.split(' '));

    // z-index 설정
    this.modalBackdrop.style.zIndex = config.zIndex.toString();
  }

  /**
   * 콘텐츠 렌더링
   */
  private renderContent(modalContent: ModalContent): void {
    if (!this.modalContent) return;

    // 기존 콘텐츠 정리
    this.modalContent.innerHTML = '';

    // 제목 추가 (있는 경우)
    if (modalContent.title) {
      const titleElement = document.createElement('div');
      titleElement.className = 'modal-title flex items-center justify-between mb-6';
      
      const titleText = document.createElement('h2');
      titleText.className = 'text-2xl font-bold text-terminal-green';
      titleText.textContent = modalContent.title;
      
      titleElement.appendChild(titleText);

      // 닫기 버튼 추가 (closable인 경우)
      const config = { ...this.defaultConfig, ...modalContent.config };
      if (config.closable) {
        const closeButton = document.createElement('button');
        closeButton.className = 'text-terminal-gray hover:text-terminal-green transition-all';
        closeButton.innerHTML = '✕';
        closeButton.addEventListener('click', () => this.hide());
        titleElement.appendChild(closeButton);
      }

      this.modalContent.appendChild(titleElement);
    }

    // 메인 콘텐츠 추가
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'modal-body';

    if (typeof modalContent.content === 'function') {
      const contentElement = modalContent.content();
      contentWrapper.appendChild(contentElement);
    } else {
      contentWrapper.innerHTML = modalContent.content;
    }

    this.modalContent.appendChild(contentWrapper);
  }

  /**
   * 현재 모달이 표시되어 있는지 확인
   */
  public isOpen(): boolean {
    return this.isVisible;
  }

  /**
   * 현재 모달을 닫을 수 있는지 확인
   */
  private canClose(): boolean {
    const config = { ...this.defaultConfig, ...this.currentContent?.config };
    return config.closable;
  }

  /**
   * 외부 클릭으로 모달을 닫을 수 있는지 확인
   */
  private canCloseOnOutsideClick(): boolean {
    const config = { ...this.defaultConfig, ...this.currentContent?.config };
    return config.closeOnOutsideClick && config.closable;
  }

  /**
   * 현재 모달 콘텐츠의 특정 요소에 포커스
   */
  public focusElement(selector: string): void {
    if (!this.modalContent) return;

    const element = this.modalContent.querySelector(selector) as HTMLElement;
    if (element && typeof element.focus === 'function') {
      setTimeout(() => element.focus(), 100);
    }
  }

  /**
   * 모달 업데이트 (콘텐츠만 변경)
   */
  public updateContent(newContent: Partial<ModalContent>): void {
    if (!this.isVisible || !this.currentContent) return;

    // 현재 콘텐츠와 새 콘텐츠 병합
    this.currentContent = { ...this.currentContent, ...newContent };

    // 콘텐츠 다시 렌더링
    this.renderContent(this.currentContent);
  }
}
