import { ModalManager, ModalContent } from '../../managers/ModalManager.js';
import { TournamentClient } from '../../game/TournamentClient';
import { tournamentWebSocketService } from '../../services/websocket/TournamentWebSocketService.js';
import { GameRenderer } from '../../game/GameRenderer';
import { InputHandler } from '../../game/InputHandler';
import { TournamentApiService } from '../../services/api/TournamentApiService.js';
import { TokenManager } from '../../services/core/TokenManager.js';

export class NewTournamentTestModal {
  private modalManager: ModalManager;
  private tournamentClient: TournamentClient | null = null;
  private container: HTMLElement | null = null;
  private tournamentId: string | null = null;
  private participants: string[] = ['', '', ''];
  private errorMsg: string = '';
  private step: 'input' | 'tournament' = 'input';

  constructor() {
    this.modalManager = ModalManager.getInstance();
  }

  show(): void {
    this.tournamentId = null;
    this.step = 'input';
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
    if (this.tournamentClient) {
      // 필요시 this.tournamentClient.destroy();
      this.tournamentClient = null;
    }
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
    if (this.step === 'input') {
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
    } else if (this.step === 'tournament') {
      // TournamentClient가 컨테이너에 렌더링함
      this.container.innerHTML = '';
    }
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
    try {
      const participants = this.participants.map(name => ({ type: 'guest' as const, displayName: name }));
      const api = new TournamentApiService();
      const res = await api.createTournament({ participants });
      this.tournamentId = String(res.id || res.tournamentId || res.tournament_id);
      this.step = 'tournament';
      this.errorMsg = '';
      this.updateContent();
      this.initTournamentClient();
    } catch (e: any) {
      this.errorMsg = e?.message || '토너먼트 생성 실패';
      this.updateContent();
    }
  }

  private async initTournamentClient() {
    if (!this.container || !this.tournamentId) return;
    const renderer = new GameRenderer(this.container); // GameRenderer는 container 인자를 요구할 수 있음
    const inputHandler = new InputHandler();
    const userId = this.decodeUserIdFromAccessToken() || undefined;
    this.tournamentClient = new TournamentClient(
      this.container,
      tournamentWebSocketService,
      renderer,
      inputHandler,
      this.tournamentId,
      userId
    );
    await this.tournamentClient.start();
  }

  // JWT에서 user_id 추출하는 메서드
  private decodeUserIdFromAccessToken(): string | undefined {
    try {
      // TokenManager를 import하지 않고 직접 세션에서 토큰을 가져옴
      const accessToken = sessionStorage.getItem('access_token_session');
      if (!accessToken) return undefined;
      const payloadBase64 = accessToken.split('.')[1];
      if (!payloadBase64) return undefined;
      const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      return payload.user_id ? String(payload.user_id) : undefined;
    } catch (e) {
      return undefined;
    }
  }
}