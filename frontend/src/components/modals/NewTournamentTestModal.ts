import { ModalManager, ModalContent } from '../../managers/ModalManager.js';
import { GamePage } from '../../game/GamePage';

export class NewTournamentTestModal {
  private modalManager: ModalManager;
  private container: HTMLElement | null = null;
  private participants: string[] = ['', '', ''];
  private errorMsg: string = '';

  constructor() {
    this.modalManager = ModalManager.getInstance();
  }

  show(): void {
    const modalContent: ModalContent = {
      title: 'Tournament 실서비스 플로우',
      content: () => this.createContent(),
      onShow: () => this.onShow(),
      onClose: () => this.onClose(),
      config: {
        closable: true,
        closeOnOutsideClick: true,
        sizeClass: 'max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto'
      }
    };
    this.modalManager.show(modalContent);
  }

  close(): void {
    this.modalManager.hide();
  }

  private async onShow(): Promise<void> {
    this.updateContent();
  }

  private onClose(): void {
    // 정리 작업
  }

  private createContent(): HTMLElement {
    this.container = document.createElement('div');
    this.container.style.minHeight = '600px';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.justifyContent = 'center';
    this.container.style.alignItems = 'center';
    return this.container;
  }

  private updateContent() {
    if (!this.container) return;
    let html = '';
    html += `<div class="mb-4 text-lg font-bold text-terminal-green">참가자 닉네임 입력</div>`;
    for (let i = 0; i < this.participants.length; i++) {
      html += `<div class="mb-2 flex items-center gap-2"><input type="text" class="bg-terminal-black border border-terminal-gray text-terminal-green px-2 py-1 rounded text-sm" id="name-input-${i}" value="${this.participants[i]}" placeholder="게스트 ${i + 1}" /></div>`;
    }
    html += `<button id="confirm-names-btn" class="bg-terminal-green text-terminal-black px-4 py-2 rounded mt-2">확인</button>`;
    if (this.errorMsg) {
      html += `<div class="text-terminal-red text-xs mt-2">${this.errorMsg}</div>`;
    }
    this.container.innerHTML = html;
    this.attachInputEventListeners();
  }

  private attachInputEventListeners() {
    if (!this.container) return;
    for (let i = 0; i < this.participants.length; i++) {
      this.container.querySelector(`#name-input-${i}`)?.addEventListener('input', (e: any) => {
        this.participants[i] = e.target.value;
      });
    }
    this.container.querySelector('#confirm-names-btn')?.addEventListener('click', () => this.handleConfirmNames());
  }

  private async handleConfirmNames() {
    if (this.participants.some(name => !name.trim())) {
      this.errorMsg = '모든 게스트 닉네임을 입력하세요.';
      this.updateContent();
      return;
    }
    // GamePage를 통해 토너먼트 모드로 진입
    this.startGamePageTournamentMode();
  }

  private startGamePageTournamentMode() {
    // GamePage를 메인 컨테이너에 생성해서 토너먼트 모드로 실행
    const mainContent = document.querySelector('.main-content') as HTMLElement;
    if (!mainContent) {
      alert('게임 컨테이너를 찾을 수 없습니다.');
      return;
    }
    // GamePage 생성 (tournament 모드)
    const apiClient = (this.modalManager as any).apiClient;
    const gameSetupResult = {
      mode: 'tournament',
      opponents: this.participants
    };
    new GamePage(
      mainContent,
      apiClient,
      gameSetupResult,
      () => {
        // 토너먼트 종료 후 콜백 (필요시 구현)
        this.close();
      }
    );
    this.close(); // 모달 닫기
  }
}