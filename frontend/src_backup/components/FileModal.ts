export class FileModal {
  private modalElement: HTMLElement;
  private fileInput: HTMLInputElement;
  private onFileSelect: (file: File) => void;
  private previewContainer: HTMLElement;
  private customInput: HTMLElement;

  constructor(onFileSelect: (file: File) => void) {
    this.onFileSelect = onFileSelect;
    this.modalElement = document.createElement('div');
    this.fileInput = document.createElement('input');
    this.previewContainer = document.createElement('div');
    this.customInput = document.createElement('div');
    this.setupModal();
  }

  private setupModal(): void {
    // Modal backdrop
    this.modalElement.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    
    // Modal content
    const content = document.createElement('div');
    content.className = 'bg-terminal-black border border-terminal-gray p-6 rounded-lg w-96 max-w-full';
    
    // Title
    const title = document.createElement('h3');
    title.className = 'text-terminal-green text-lg font-bold mb-4';
    title.textContent = 'Select Avatar Image';
    
    // File input wrapper
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'mb-4';
    
    this.fileInput.type = 'file';
    this.fileInput.accept = 'image/*';
    this.fileInput.className = 'text-terminal-green text-sm cursor-pointer';
    this.fileInput.addEventListener('change', () => this.handleFileSelect());
    
    // Custom file input styling
    this.customInput.className = 'border border-terminal-gray rounded-lg p-4 text-center cursor-pointer hover:bg-terminal-gray hover:bg-opacity-10 transition-colors';
    this.customInput.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto mb-2 text-terminal-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <p class="text-terminal-green text-sm">Click to select an image</p>
      <p class="text-terminal-gray text-xs mt-1">Supported formats: PNG, JPG, GIF</p>
    `;
    
    this.customInput.addEventListener('click', () => this.fileInput.click());
    this.fileInput.style.display = 'none';

    // Preview container with the same border style
    this.previewContainer.className = 'hidden border border-terminal-gray rounded-lg p-4 text-center';
    
    // Buttons
    const buttons = document.createElement('div');
    buttons.className = 'flex justify-end gap-3';
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'px-2 py-1 text-sm bg-terminal-red text-white rounded hover:bg-opacity-80 transition-colors';
    cancelButton.textContent = 'Cancel';
    cancelButton.onclick = () => this.close();
    
    const uploadButton = document.createElement('button');
    uploadButton.className = 'px-2 py-1 text-sm bg-terminal-green text-terminal-black rounded hover:bg-terminal-darkGreen transition-colors';
    uploadButton.textContent = 'Upload';
    uploadButton.onclick = () => {
      const file = this.fileInput.files?.[0];
      if (file) {
        this.onFileSelect(file);
        this.close();
      }
    };
    
    buttons.appendChild(cancelButton);
    buttons.appendChild(uploadButton);
    
    // Assemble modal
    inputWrapper.appendChild(this.fileInput);
    inputWrapper.appendChild(this.customInput);
    
    content.appendChild(title);
    content.appendChild(inputWrapper);
    content.appendChild(this.previewContainer);
    content.appendChild(buttons);
    
    this.modalElement.appendChild(content);
  }

  private handleFileSelect(): void {
    const file = this.fileInput.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewContainer.className = 'mb-4 border border-terminal-gray rounded-lg p-4 text-center';
        this.previewContainer.innerHTML = `
          <div class="w-32 h-32 mx-auto overflow-hidden">
            <img src="${e.target?.result}" class="w-full h-full object-cover" alt="Preview" />
          </div>
        `;
        this.customInput.style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  }

  public show(): void {
    document.body.appendChild(this.modalElement);
  }

  public close(): void {
    this.modalElement.remove();
  }
}