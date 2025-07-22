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
  
  // Terminal state flags for efficient tracking
  private isShowingInitialMessage: boolean = true;
  private hasUserCommands: boolean = false;

  constructor(commandCallback: (command: string) => void) {
    this.commandCallback = commandCallback;
    this.outputContent = ''; // 초기에는 빈 상태로 시작
    
    // Create DOM elements only once
    this.terminalElement = document.createElement('div');
    this.terminalElement.className = 'flex flex-col h-full bg-terminal-black text-terminal-green p-4 font-jetbrains';
    
    const outputContainer = document.createElement('div');
    outputContainer.className = 'flex-grow overflow-auto scrollbar-hide';
    
    this.outputElement = document.createElement('div');
    this.outputElement.className = 'whitespace-pre-wrap text-sm opacity-90 space-y-1';
    // 초기에는 비어있는 상태로 시작, 필요시 initializeWithMessage() 호출
    
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

  /**
   * 터미널을 초기 웰컴 메시지로 초기화
   */
  public initializeWithWelcomeMessage(): void {
    if (this.outputContent === '') {
      this.outputElement.innerHTML = this.initialMessage;
      this.outputContent = this.initialMessage;
      this.isShowingInitialMessage = true;
      this.hasUserCommands = false;
    }
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
      // 사용자 명령어가 실행된 것을 표시
      this.hasUserCommands = true;
    }
    messageElement.textContent = text;
    
    // Use DOMUpdater to add list item with animation
    this.outputElement.appendChild(messageElement);
    this.outputContent = this.outputElement.innerHTML;
    
    // 새로운 출력이 추가되면 더 이상 초기 메시지 상태가 아님
    this.isShowingInitialMessage = false;
    
    // Use requestAnimationFrame to ensure smooth scrolling after DOM update
    requestAnimationFrame(() => this.scrollToBottom());
  }

  public clearOutput(): void {
    DOMUpdater.updateHTML(this.outputElement, '');
    this.outputContent = '';
    // 출력이 지워지면 초기 상태로 복원
    this.isShowingInitialMessage = true;
    this.hasUserCommands = false;
  }

  public updateWelcomeMessage(isLoggedIn: boolean, username?: string): void {
    const newWelcomeMessage = isLoggedIn && username
      ? i18n.t('terminal.welcome_message_logged_in', { username })
      : i18n.t('terminal.initial_message_logged_out');
    
    // 메시지가 실제로 변경된 경우에만 업데이트
    if (this.initialMessage !== newWelcomeMessage) {
      console.log('🖥️ Terminal welcome message changed:', {
        from: this.initialMessage,
        to: newWelcomeMessage
      });
      
      this.initialMessage = newWelcomeMessage;
      
      // 터미널이 초기 상태(사용자 명령어가 없는 상태)인 경우에만 업데이트
      if (this.isShowingInitialMessage && !this.hasUserCommands) {
        DOMUpdater.updateHTML(this.outputElement, newWelcomeMessage, {
          animate: true,
          duration: 300,
          onComplete: () => this.scrollToBottom()
        });
        this.outputContent = newWelcomeMessage;
      }
    }
  }

  public reset(): void {
    this.clearOutput();
    this.commandHistory = [];
    this.historyIndex = -1;
    
    // 초기 메시지로 리셋
    DOMUpdater.updateHTML(this.outputElement, this.initialMessage, {
      animate: true,
      duration: 200,
      onComplete: () => this.scrollToBottom()
    });
    this.outputContent = this.initialMessage;
    
    // 플래그 상태도 초기화
    this.isShowingInitialMessage = true;
    this.hasUserCommands = false;
  }

  /**
   * 터미널을 초기화하되, 이후 메시지 추가를 위해 초기 상태 플래그는 false로 설정
   */
  public resetForNewContent(): void {
    this.clearOutput();
    this.commandHistory = [];
    this.historyIndex = -1;
    
    // 플래그를 false로 설정하여 UIRenderer의 웰컴 메시지 덮어쓰기 방지
    this.isShowingInitialMessage = false;
    this.hasUserCommands = false;
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