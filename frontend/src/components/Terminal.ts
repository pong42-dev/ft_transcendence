import { DOMUpdater } from '../utils/DOMUpdater.js';
import i18n from '../services/i18n.js';

export class Terminal {
  private terminalElement: HTMLElement;
  private outputElement: HTMLElement;
  private inputElement: HTMLInputElement;
  private commandHistory: string[] = [];
  private historyIndex: number = -1;
  private commandCallback: (command: string) => void;
  private outputContent: string = '';
  private initialMessage: string = i18n.t('terminal.initial_message_logged_out');
  private isInputEnabled: boolean = true;

  constructor(commandCallback: (command: string) => void) {
    this.commandCallback = commandCallback;
    this.outputContent = this.initialMessage;
    
    // Create DOM elements only once
    this.terminalElement = document.createElement('div');
    this.terminalElement.className = 'flex flex-col h-full bg-terminal-black text-terminal-green p-4 font-jetbrains';
    
    const outputContainer = document.createElement('div');
    outputContainer.className = 'flex-grow overflow-auto scrollbar-hide';
    
    this.outputElement = document.createElement('div');
    this.outputElement.className = 'whitespace-pre-wrap text-sm opacity-90 space-y-1';
    this.outputElement.innerHTML = this.outputContent;
    
    const inputContainer = document.createElement('div');
    inputContainer.className = 'flex items-center mt-2';
    
    const promptSpan = document.createElement('span');
    promptSpan.className = 'mr-2 text-sm opacity-90';
    promptSpan.textContent = i18n.t('terminal.prompt');
    
    this.inputElement = document.createElement('input');
    this.inputElement.className = 'bg-terminal-black text-terminal-green outline-none border-none flex-grow font-jetbrains text-sm opacity-90';
    this.inputElement.setAttribute('type', 'text');
    this.inputElement.setAttribute('autocomplete', 'off');
    this.inputElement.setAttribute('spellcheck', 'false');
    this.inputElement.setAttribute('placeholder', '');
    
    this.inputElement.addEventListener('keydown', this.handleInputKeydown.bind(this));
    
    // Assemble the terminal structure
    outputContainer.appendChild(this.outputElement);
    inputContainer.appendChild(promptSpan);
    inputContainer.appendChild(this.inputElement);
    
    this.terminalElement.appendChild(outputContainer);
    this.terminalElement.appendChild(inputContainer);
    
    this.terminalElement.addEventListener('click', () => {
      if (this.isInputEnabled) {
        this.inputElement.focus();
      }
    });

    // Ensure initial scroll to bottom
    setTimeout(() => this.scrollToBottom(), 0);
  }

  public render(): HTMLElement {
    return this.terminalElement;
  }

  private scrollToBottom(): void {
    const outputContainer = this.outputElement.parentElement;
    if (outputContainer) {
      outputContainer.scrollTop = outputContainer.scrollHeight;
    }
  }

  public appendOutput(text: string): void {
    const messageElement = document.createElement('div');
    
    // Handle regular terminal output
    messageElement.className = 'text-terminal-green';
    if (text.startsWith('$')) {
      messageElement.className += ' opacity-75';
    }
    messageElement.textContent = text;
    
    // Use DOMUpdater to add list item with animation
    this.outputElement.appendChild(messageElement);
    this.outputContent = this.outputElement.innerHTML;
    
    // Use requestAnimationFrame to ensure smooth scrolling after DOM update
    requestAnimationFrame(() => this.scrollToBottom());
  }

  public clearOutput(): void {
    DOMUpdater.updateHTML(this.outputElement, '');
    this.outputContent = '';
  }

  public updateWelcomeMessage(isLoggedIn: boolean, username?: string): void {
    const welcomeMessage = isLoggedIn && username
      ? i18n.t('terminal.welcome_message_logged_in', { username })
      : i18n.t('terminal.initial_message_logged_out');
    
    const oldInitialMessage = this.initialMessage;
    this.initialMessage = welcomeMessage;
    
    // 현재 터미널이 초기 상태라면 메시지 업데이트
    if (this.outputContent === oldInitialMessage) {
      DOMUpdater.updateHTML(this.outputElement, welcomeMessage, {
        animate: true,
        duration: 300,
        onComplete: () => this.scrollToBottom()
      });
      this.outputContent = welcomeMessage;
    }
  }

  public reset(): void {
    this.clearOutput();
    this.commandHistory = [];
    this.historyIndex = -1;
    DOMUpdater.updateHTML(this.outputElement, this.initialMessage, {
      animate: true,
      duration: 200,
      onComplete: () => this.scrollToBottom()
    });
    this.outputContent = this.initialMessage;
  }

  public focus(): void {
    // 약간의 지연을 두어 DOM 업데이트 완료 후 포커스
    setTimeout(() => {
      if (this.isInputEnabled) {
        this.inputElement.focus();
      }
    }, 50);
  }

  public disableInput(): void {
    this.isInputEnabled = false;
    this.inputElement.blur();
    this.inputElement.disabled = true;
  }

  public enableInput(): void {
    this.isInputEnabled = true;
    this.inputElement.disabled = false;
  }

  private handleInputKeydown(event: KeyboardEvent): void {
    if (!this.isInputEnabled) {
      event.preventDefault();
      return;
    }
    
    if (event.key === 'Enter') {
      const command = this.inputElement.value.trim();
      
      if (command) {
        // Handle command
        this.appendOutput(`$ ${command}`);
        this.commandCallback(command);
        
        this.commandHistory.push(command);
        this.historyIndex = this.commandHistory.length;
      }
      
      this.inputElement.value = '';
      // Ensure scroll to bottom after command execution
      requestAnimationFrame(() => this.scrollToBottom());
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.commandHistory.length > 0 && this.historyIndex > 0) {
        this.historyIndex--;
        this.inputElement.value = this.commandHistory[this.historyIndex];
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.historyIndex < this.commandHistory.length - 1) {
        this.historyIndex++;
        this.inputElement.value = this.commandHistory[this.historyIndex];
      } else {
        this.historyIndex = this.commandHistory.length;
        this.inputElement.value = '';
      }
    }
  }
}