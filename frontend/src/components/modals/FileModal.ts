/**
 * FileModal - ModalManager를 사용하는 파일 선택 모달
 */

import { ModalManager, ModalContent } from './ModalManager.js';
import { DOMUpdater } from './DOMUpdater.js';

export class FileModal {
  private onFileSelect: (file: File) => void;
  private selectedFile: File | null = null;
  private accept: string;
  private maxSize: number;
  private modalTitle: string;
  private modalManager: ModalManager;

  constructor(
    title: string = 'Select File',
    accept: string = 'image/*',
    maxSize: number = 5 * 1024 * 1024, // 5MB
    onFileSelect: (file: File) => void
  ) {
    this.modalTitle = title;
    this.accept = accept;
    this.maxSize = maxSize;
    this.onFileSelect = onFileSelect;
    this.modalManager = ModalManager.getInstance();
  }

  /**
   * 모달 표시
   */
  public show(): void {
    const modalContent: ModalContent = {
      title: this.modalTitle,
      content: () => this.createContent(),
      onShow: () => this.onShow(),
      onClose: () => this.onClose(),
      config: {
        closable: true,
        closeOnOutsideClick: true,
        sizeClass: 'w-96 max-w-[95%]',
        animated: true
      }
    };

    this.modalManager.show(modalContent);
  }

  /**
   * 모달 숨기기
   */
  public hide(): void {
    this.modalManager.hide();
  }

  /**
   * 모달 콘텐츠 생성
   */
  private createContent(): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="space-y-4">
        <!-- File Drop Zone -->
        <div 
          id="file-drop-zone"
          class="border-2 border-dashed border-terminal-gray hover:border-terminal-green transition-colors rounded-lg p-8 text-center cursor-pointer"
        >
          <div class="flex flex-col items-center space-y-3">
            <svg class="w-12 h-12 text-terminal-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <div>
              <p class="text-terminal-green font-medium">Click to select or drag & drop</p>
              <p class="text-sm text-terminal-gray mt-1">
                Max size: ${this.formatFileSize(this.maxSize)} • ${this.accept}
              </p>
            </div>
          </div>
          <input type="file" id="file-input" accept="${this.accept}" class="hidden" />
        </div>

        <!-- File Preview -->
        <div id="file-preview" class="hidden">
          <div class="bg-terminal-black rounded-lg p-4 border border-terminal-gray">
            <div class="flex items-center space-x-3">
              <div id="preview-image" class="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center bg-terminal-gray bg-opacity-20">
                <!-- Image preview will be inserted here -->
              </div>
              <div class="flex-1 min-w-0">
                <p id="file-name" class="text-sm font-medium text-terminal-green truncate"></p>
                <p id="file-size" class="text-xs text-terminal-gray"></p>
              </div>
              <button 
                id="remove-file"
                class="text-terminal-red hover:bg-terminal-red hover:bg-opacity-10 p-1 rounded transition-colors"
                title="Remove file"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div id="error-message" class="text-terminal-red text-sm text-center hidden"></div>

        <!-- Action Buttons -->
        <div class="flex space-x-3">
          <button 
            id="cancel-btn"
            class="flex-1 px-4 py-2 text-sm border border-terminal-gray text-terminal-gray rounded hover:bg-terminal-gray hover:bg-opacity-10 transition-colors"
          >
            Cancel
          </button>
          <button 
            id="upload-btn"
            class="flex-1 px-4 py-2 text-sm bg-terminal-green text-terminal-black rounded hover:bg-opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled
          >
            Select
          </button>
        </div>
      </div>
    `;

    this.setupEventListeners(container);
    return container;
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(container: HTMLElement): void {
    // File drop zone click
    const dropZone = container.querySelector('#file-drop-zone') as HTMLElement;
    dropZone?.addEventListener('click', () => this.openFileDialog());

    // File input change
    const fileInput = container.querySelector('#file-input') as HTMLInputElement;
    fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));

    // Remove file button
    const removeBtn = container.querySelector('#remove-file') as HTMLButtonElement;
    removeBtn?.addEventListener('click', () => this.removeFile());

    // Cancel button
    const cancelBtn = container.querySelector('#cancel-btn') as HTMLButtonElement;
    cancelBtn?.addEventListener('click', () => this.hide());

    // Upload button
    const uploadBtn = container.querySelector('#upload-btn') as HTMLButtonElement;
    uploadBtn?.addEventListener('click', () => this.handleUpload());

    // Drag and drop support
    if (dropZone) {
      dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
      dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
      dropZone.addEventListener('drop', this.handleDrop.bind(this));
    }
  }

  /**
   * 모달이 표시될 때 호출
   */
  private onShow(): void {
    // Focus or other initialization if needed
  }

  /**
   * 모달이 닫힐 때 호출
   */
  private onClose(): void {
    this.selectedFile = null;
  }

  private openFileDialog(): void {
    const fileInput = document.querySelector('#file-input') as HTMLInputElement;
    fileInput?.click();
  }

  private handleFileSelect(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      this.validateAndSetFile(file);
    }
  }

  private handleDragOver(event: DragEvent): void {
    event.preventDefault();
    const dropZone = event.currentTarget as HTMLElement;
    dropZone.classList.add('border-terminal-green', 'bg-terminal-green', 'bg-opacity-5');
  }

  private handleDragLeave(event: DragEvent): void {
    event.preventDefault();
    const dropZone = event.currentTarget as HTMLElement;
    dropZone.classList.remove('border-terminal-green', 'bg-terminal-green', 'bg-opacity-5');
  }

  private handleDrop(event: DragEvent): void {
    event.preventDefault();
    const dropZone = event.currentTarget as HTMLElement;
    dropZone.classList.remove('border-terminal-green', 'bg-terminal-green', 'bg-opacity-5');
    
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.validateAndSetFile(file);
    }
  }

  private validateAndSetFile(file: File): void {
    // 크기 검증
    if (file.size > this.maxSize) {
      DOMUpdater.showError('#error-message', `File size must be less than ${this.formatFileSize(this.maxSize)}`);
      return;
    }

    // 타입 검증 (간단한 MIME 타입 체크)
    if (this.accept !== '*/*' && !file.type.match(this.accept.replace('*', '.*'))) {
      DOMUpdater.showError('#error-message', `File type not supported. Please select: ${this.accept}`);
      return;
    }

    this.selectedFile = file;
    this.showFilePreview(file);
    DOMUpdater.hideError('#error-message');
    
    const uploadBtn = document.querySelector('#upload-btn') as HTMLButtonElement;
    if (uploadBtn) {
      uploadBtn.disabled = false;
    }
  }

  private showFilePreview(file: File): void {
    const preview = document.querySelector('#file-preview') as HTMLElement;
    const previewImage = document.querySelector('#preview-image') as HTMLElement;
    const fileName = document.querySelector('#file-name') as HTMLElement;
    const fileSize = document.querySelector('#file-size') as HTMLElement;

    if (preview && previewImage && fileName && fileSize) {
      // 이미지 미리보기
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          previewImage.innerHTML = `<img src="${e.target?.result}" class="w-full h-full object-cover rounded-lg" />`;
        };
        reader.readAsDataURL(file);
      } else {
        previewImage.innerHTML = `
          <svg class="w-8 h-8 text-terminal-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        `;
      }

      DOMUpdater.updateText('#file-name', file.name);
      DOMUpdater.updateText('#file-size', this.formatFileSize(file.size));
      
      preview.classList.remove('hidden');
    }
  }

  private removeFile(): void {
    this.selectedFile = null;
    
    const preview = document.querySelector('#file-preview') as HTMLElement;
    const uploadBtn = document.querySelector('#upload-btn') as HTMLButtonElement;
    const fileInput = document.querySelector('#file-input') as HTMLInputElement;
    
    if (preview) preview.classList.add('hidden');
    if (uploadBtn) uploadBtn.disabled = true;
    if (fileInput) fileInput.value = '';
    
    DOMUpdater.hideError('#error-message');
  }

  private handleUpload(): void {
    if (this.selectedFile) {
      this.onFileSelect(this.selectedFile);
      this.hide();
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
