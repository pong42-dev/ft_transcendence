export class FileModal {
  private modalElement: HTMLElement;
  private onFileSelect: (file: File) => void;

  // Elements will be assigned in setupModal
  private fileInput!: HTMLInputElement;
  private previewContainer!: HTMLElement;
  private customInput!: HTMLElement;
  private uploadButton!: HTMLButtonElement;

  constructor(onFileSelect: (file: File) => void) {
    this.onFileSelect = onFileSelect;
    this.modalElement = document.createElement('div');
    this.setupModal();
  }

  private setupModal(): void {
    this.modalElement.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    this.modalElement.innerHTML = this.getModalTemplate();
    
    this.queryElements();
    this.attachEventListeners();
  }

  private getModalTemplate(): string {
    return `
      <div class="bg-terminal-black border border-terminal-gray p-6 rounded-lg w-96 max-w-full">
        <h3 class="text-terminal-green text-lg font-bold mb-4">Select Avatar Image</h3>
        
        <div class="mb-4">
          <input type="file" accept="image/*" class="file-modal-file-input" style="display: none;" />
          
          <div class="file-modal-custom-input border border-terminal-gray rounded-lg p-4 text-center cursor-pointer hover:bg-terminal-gray hover:bg-opacity-10 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto mb-2 text-terminal-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p class="text-terminal-green text-sm">Click to select an image</p>
            <p class="text-terminal-gray text-xs mt-1">Supported formats: PNG, JPG, GIF</p>
          </div>
        </div>
        
        <div class="file-modal-preview-container hidden mb-4 border border-terminal-gray rounded-lg p-4 text-center"></div>

        <div class="flex justify-end gap-3">
          <button class="file-modal-cancel-button px-2 py-1 text-sm bg-terminal-red text-white rounded hover:bg-opacity-80 transition-colors">Cancel</button>
          <button class="file-modal-upload-button px-2 py-1 text-sm bg-terminal-green text-terminal-black rounded hover:bg-terminal-darkGreen transition-colors disabled:opacity-50" disabled>Upload</button>
        </div>
      </div>
    `;
  }

  private queryElements(): void {
    const query = (selector: string) => this.modalElement.querySelector(selector) as HTMLElement;
    
    this.fileInput = query('.file-modal-file-input') as HTMLInputElement;
    this.customInput = query('.file-modal-custom-input');
    this.previewContainer = query('.file-modal-preview-container');
    this.uploadButton = query('.file-modal-upload-button') as HTMLButtonElement;
  }

  private attachEventListeners(): void {
    const cancelButton = this.modalElement.querySelector('.file-modal-cancel-button')!;
    cancelButton.addEventListener('click', () => this.close());
    
    this.uploadButton.addEventListener('click', () => this.handleUpload());
    this.customInput.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', () => this.handleFileSelect());
  }

  private handleUpload(): void {
    const file = this.fileInput.files?.[0];
    if (file) {
      this.onFileSelect(file);
      this.close();
    }
  }

  private handleFileSelect(): void {
    const file = this.fileInput.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => this.displayPreview(e.target?.result as string);
      reader.readAsDataURL(file);
      this.uploadButton.disabled = false;
    } else {
      this.uploadButton.disabled = true;
    }
  }

  private displayPreview(imageUrl: string): void {
    this.previewContainer.classList.remove('hidden');
    this.previewContainer.innerHTML = `
      <div class="w-32 h-32 mx-auto overflow-hidden rounded-md">
        <img src="${imageUrl}" class="w-full h-full object-cover" alt="Preview" />
      </div>
    `;
    this.customInput.style.display = 'none';
  }

  public show(): void {
    document.body.appendChild(this.modalElement);
  }

  public close(): void {
    this.modalElement.remove();
  }
}