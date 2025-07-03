import { ModalManager, ModalContent } from '../../managers/ModalManager.js';
import { UserApiService } from '../../services/api/UserApiService.js';
import { TournamentApiService } from '../../services/api/TournamentApiService.js';
import { tournamentWebSocketService } from '../../services/websocket/TournamentWebSocketService.js';
import { TournamentServerMessage } from '../../types/tournament-websocket.js';

type TournamentStep =
  | 'init'
  | 'input_names'
  | 'show_bracket'
  | 'match1'
  | 'match2'
  | 'final'
  | 'result';

export class NewTournamentTestModal {
  private modalManager: ModalManager;
  private step: TournamentStep = 'init';
  private tournamentId: number | null = null;
  private participants: string[] = ['', '', '']; // 게스트 3명만 입력받음
  private bracket: any = null;
  private matchWinners: { match1?: number; match2?: number; final?: number } = {};
  private matchIds: { match1?: number; match2?: number; final?: number } = {};
  private matchStates: { match1?: string; match2?: string; final?: string } = {};
  private tournamentDetails: any = null;
  private errorMsg = '';
  private currentUserInfo: { id?: number; name?: string; email?: string } = {};
  private wsConnected = false;
  private contentElement: HTMLElement | null = null;

  constructor(_apiClient?: any) {
    this.modalManager = ModalManager.getInstance();
    // Constructor parameter kept for compatibility but not stored
  }

  show(): void {
    const modalContent: ModalContent = {
      title: 'Tournament 수직 플로우 테스트',
      content: () => this.createContent(),
      onShow: () => this.onShow(),
      onClose: () => this.onClose(),
      config: {
        closable: true,
        closeOnOutsideClick: true,
        sizeClass: 'max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto'
      }
    };

    this.modalManager.show(modalContent);
  }

  close(): void {
    this.modalManager.hide();
  }

  private async onShow(): Promise<void> {
    await this.setCurrentUserInfo();
    this.updateContent();
  }

  private onClose(): void {
    if (this.wsConnected) {
      tournamentWebSocketService.disconnect();
      this.wsConnected = false;
    }
  }

  private createContent(): HTMLElement {
    this.contentElement = document.createElement('div');
    this.updateContent();
    return this.contentElement;
  }

  private updateContent(): void {
    if (!this.contentElement) return;

    let html: string = '';
    
    html += `<div class="mb-4 flex items-center gap-4">
      <div>
        <label class="text-terminal-gray text-sm">Logged-in User: </label>
        <span class="text-terminal-green font-mono">${this.currentUserInfo.name ?? 'Not Logged In'}</span>
      </div>
    </div>`;
    
    if (!this.currentUserInfo.email && !this.currentUserInfo.name) {
      html += `<div class='text-terminal-red text-xs mb-2'>로그인된 사용자 정보가 없습니다. 로그인 후 이용하세요.</div>`;
      this.contentElement.innerHTML = html;
      this.attachEventListeners();
      return;
    }
    
    html += `<div class="mb-4"><label class="text-terminal-gray text-sm">Tournament ID: </label><span class="text-terminal-green font-mono">${this.tournamentId ?? '-'}</span></div>`;
    
    if (this.errorMsg) {
      html += `<div class="text-terminal-red text-xs mb-2">${this.errorMsg}</div>`;
    }
    
    // 단계별 UI
    if (this.step === 'init') {
      html += `<button id="start-tournament-btn" class="bg-terminal-green text-terminal-black px-4 py-2 rounded">토너먼트 시작</button>`;
    } else if (this.step === 'input_names') {
      html += `<div class="mb-4">참가자 닉네임 입력:</div>`;
      html += `<div class="mb-2 flex items-center gap-2">
        <span class="text-terminal-green text-sm">로그인된 유저: ${this.currentUserInfo.name}</span>
      </div>`;
      // 게스트 3명 입력받음
      for (let i = 0; i < this.participants.length; i++) {
        html += `<div class="mb-2 flex items-center gap-2"><input type="text" class="bg-terminal-black border border-terminal-gray text-terminal-green px-2 py-1 rounded text-sm" id="name-input-${i}" value="${this.participants[i]}" placeholder="게스트 ${i + 1}" /></div>`;
      }
      html += `<button id="confirm-names-btn" class="bg-terminal-green text-terminal-black px-4 py-2 rounded mt-2">확인</button>`;
    } else if (this.step === 'show_bracket' || this.step === 'match1' || this.step === 'match2' || this.step === 'final') {
      html += this.renderBracketSection();
    } else if (this.step === 'result') {
      html += `<div class="mb-4 text-terminal-green font-bold">최종 우승자: ${this.getFinalWinnerName()}</div>`;
      html += `<div class="mb-2">토너먼트 상세 정보:</div>`;
      html += `<pre class="bg-terminal-black text-terminal-green text-xs p-2 rounded border border-terminal-gray max-h-64 overflow-y-auto">${JSON.stringify(this.tournamentDetails || {}, null, 2)}</pre>`;
    }
    
    this.contentElement.innerHTML = html;
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    if (!this.contentElement) return;

    this.contentElement.querySelector('#start-tournament-btn')?.addEventListener('click', () => this.handleStartTournament());
    this.contentElement.querySelector('#confirm-names-btn')?.addEventListener('click', () => this.handleConfirmNames());
    
    // 게스트 3명 입력받음
    for (let i = 0; i < this.participants.length; i++) {
      this.contentElement.querySelector(`#name-input-${i}`)?.addEventListener('input', (e: any) => {
        this.participants[i] = e.target.value;
      });
    }
    
    // 매치 시작 버튼
    this.contentElement.querySelectorAll('[data-start-match-btn]').forEach(btn => {
      btn.addEventListener('click', async (e: any) => {
        const match = btn.getAttribute('data-match');
        await this.handleStartMatch(match);
      });
    });
    
    // 매치별 승자 버튼
    this.contentElement.querySelectorAll('[data-match-winner-btn]').forEach(btn => {
      btn.addEventListener('click', async (e: any) => {
        const match = btn.getAttribute('data-match');
        const winnerIdx = Number(btn.getAttribute('data-winner-idx'));
        await this.handleSelectWinner(match, winnerIdx);
      });
    });
    
    this.contentElement.querySelector('#fetch-details-btn')?.addEventListener('click', () => this.fetchTournamentDetails());
  }

  private async setCurrentUserInfo(): Promise<void> {
    try {
      const userApi = new UserApiService();
      const user = await userApi.getProfile();
      this.currentUserInfo = { 
        name: user.nickname || user.username, 
        id: Number(user.id), 
        email: user.email 
      };
    } catch (e) {
      this.currentUserInfo = {};
    }
  }

  private async handleStartTournament(): Promise<void> {
    this.errorMsg = '';
    this.tournamentId = null;
    // 게스트 3명만 초기화
    this.participants = ['', '', ''];
    this.matchWinners = {};
    this.matchIds = {};
    this.matchStates = {};
    this.bracket = null;
    this.tournamentDetails = null;
    this.step = 'input_names';
    this.updateContent();
  }

  private async handleConfirmNames(): Promise<void> {
    // 게스트 3명 모두 입력되었는지 확인
    if (this.participants.some(name => !name.trim())) {
      this.errorMsg = '모든 게스트 닉네임을 입력하세요.';
      this.updateContent();
      return;
    }
    
    try {
      // API는 게스트 3명만 받음 (로그인된 유저는 자동으로 추가됨)
      const participants: { type: 'guest'; displayName: string }[] = this.participants.map(name => ({ 
        type: 'guest' as const, 
        displayName: name 
      }));
      
      const tournamentApi = new TournamentApiService();
      const data = await tournamentApi.createTournament({ participants });
      this.tournamentId = data.id || data.tournamentId || data.tournament_id;
      
      // 토너먼트 생성 후 바로 상세 정보를 가져와서 대진표 정보 추출
      const tournamentDetails = await tournamentApi.getTournamentDetails(this.tournamentId);
      this.tournamentDetails = tournamentDetails;
      
      // 대진표 정보를 서버에서 받은 데이터로 구성
      if (tournamentDetails.matches && tournamentDetails.matches.length > 0) {
        // 첫 번째 라운드 매치들을 찾아서 대진표 구성
        const firstRoundMatches = tournamentDetails.matches.filter((match: any) => match.round_number === 1);
        if (firstRoundMatches.length >= 2) {
          const match1Participants = firstRoundMatches[0].participants.map((p: any) => p.name);
          const match2Participants = firstRoundMatches[1].participants.map((p: any) => p.name);
          
          // 전체 참가자 목록에서 인덱스 찾기
          const allParticipants = [this.currentUserInfo.name ?? 'User1', ...this.participants];
          this.bracket = {
            match1: [
              allParticipants.findIndex((name: string) => name === match1Participants[0]) ?? 0,
              allParticipants.findIndex((name: string) => name === match1Participants[1]) ?? 1
            ],
            match2: [
              allParticipants.findIndex((name: string) => name === match2Participants[0]) ?? 2,
              allParticipants.findIndex((name: string) => name === match2Participants[1]) ?? 3
            ],
            final: [null, null],
          };
          
          // 매치 ID 저장
          this.matchIds = {
            match1: firstRoundMatches[0].id,
            match2: firstRoundMatches[1].id,
            final: undefined
          };
          
          // 결승전 매치 ID 찾기 (라운드 2)
          const finalMatch = tournamentDetails.matches.find((match: any) => match.round_number === 2);
          if (finalMatch) {
            this.matchIds.final = finalMatch.id;
          }
          
          // 매치 상태 초기화
          this.matchStates = {
            match1: 'waiting',
            match2: 'waiting',
            final: 'waiting'
          };
        } else {
          // 기본 대진표 (서버에서 매치 정보가 부족한 경우)
          this.bracket = {
            match1: [0, 1],
            match2: [2, 3],
            final: [null, null],
          };
          this.matchIds = {};
        }
      } else {
        // 기본 대진표 (서버에서 매치 정보가 없는 경우)
        this.bracket = {
          match1: [0, 1],
          match2: [2, 3],
          final: [null, null],
        };
        this.matchIds = {};
      }
      
      // --- WebSocket 연결 ---
      if (this.tournamentId !== null && typeof this.tournamentId !== 'undefined' && this.currentUserInfo.id !== undefined && this.currentUserInfo.id !== null) {
        tournamentWebSocketService.connect(String(this.tournamentId!), this.currentUserInfo.id!);
        this.wsConnected = true;
        // 메시지 리스너 등록 (예시: 콘솔 출력)
        tournamentWebSocketService.on('tournament_bracket', (data) => {
          console.log('[WS] tournament_bracket', data);
        });
        tournamentWebSocketService.on('bracket_update', (data) => {
          console.log('[WS] bracket_update', data);
        });
        tournamentWebSocketService.on('match_starting', (data) => {
          console.log('[WS] match_starting', data);
        });
        tournamentWebSocketService.on('tournament_end', (data) => {
          console.log('[WS] tournament_end', data);
        });
        // --- tournament_start 메시지 전송 ---
        tournamentWebSocketService.sendMessage({
          type: 'tournament_start',
          data: { playerId: this.currentUserInfo.id! }
        });
      }
      
      this.step = 'match1';
      this.updateContent();
    } catch (e: any) {
      this.errorMsg = e?.message || '토너먼트 생성 실패';
      this.updateContent();
    }
  }

  private renderBracketSection(): string {
    let html = '<div class="mb-4 font-bold text-terminal-green">대진표</div>';
    // 1번 유저 + 게스트 3명으로 표시
    const allParticipants = [this.currentUserInfo.name ?? 'User1', ...this.participants];
    html += `<div class="mb-2">Match 1: ${allParticipants[this.bracket.match1[0]]} vs ${allParticipants[this.bracket.match1[1]]}</div>`;
    html += `<div class="mb-2">Match 2: ${allParticipants[this.bracket.match2[0]]} vs ${allParticipants[this.bracket.match2[1]]}</div>`;
    
    if (this.step === 'match1') {
      if (this.matchStates.match1 === 'waiting') {
        html += `<div class="mb-2">Match 1 시작:</div>`;
        html += `<button data-start-match-btn data-match="match1" class="bg-terminal-green text-terminal-black px-3 py-1 rounded">Match 1 시작</button>`;
      } else if (this.matchStates.match1 === 'playing') {
        html += `<div class="mb-2">Match 1 승자 선택:</div>`;
        html += `<button data-match-winner-btn data-match="match1" data-winner-idx="${this.bracket.match1[0]}" class="bg-terminal-green text-terminal-black px-3 py-1 rounded mr-2">${allParticipants[this.bracket.match1[0]]}</button>`;
        html += `<button data-match-winner-btn data-match="match1" data-winner-idx="${this.bracket.match1[1]}" class="bg-terminal-green text-terminal-black px-3 py-1 rounded">${allParticipants[this.bracket.match1[1]]}</button>`;
      }
    } else if (this.step === 'match2') {
      if (this.matchStates.match2 === 'waiting') {
        html += `<div class="mb-2">Match 2 시작:</div>`;
        html += `<button data-start-match-btn data-match="match2" class="bg-terminal-green text-terminal-black px-3 py-1 rounded">Match 2 시작</button>`;
      } else if (this.matchStates.match2 === 'playing') {
        html += `<div class="mb-2">Match 2 승자 선택:</div>`;
        html += `<button data-match-winner-btn data-match="match2" data-winner-idx="${this.bracket.match2[0]}" class="bg-terminal-green text-terminal-black px-3 py-1 rounded mr-2">${allParticipants[this.bracket.match2[0]]}</button>`;
        html += `<button data-match-winner-btn data-match="match2" data-winner-idx="${this.bracket.match2[1]}" class="bg-terminal-green text-terminal-black px-3 py-1 rounded">${allParticipants[this.bracket.match2[1]]}</button>`;
      }
    } else if (this.step === 'final') {
      const winner1 = this.matchWinners.match1;
      const winner2 = this.matchWinners.match2;
      html += `<div class="mb-2">결승: ${allParticipants[winner1!]} vs ${allParticipants[winner2!]}</div>`;
      if (this.matchStates.final === 'waiting') {
        html += `<div class="mb-2">결승 시작:</div>`;
        html += `<button data-start-match-btn data-match="final" class="bg-terminal-green text-terminal-black px-3 py-1 rounded">결승 시작</button>`;
      } else if (this.matchStates.final === 'playing') {
        html += `<div class="mb-2">결승 승자 선택:</div>`;
        html += `<button data-match-winner-btn data-match="final" data-winner-idx="${winner1}" class="bg-terminal-green text-terminal-black px-3 py-1 rounded mr-2">${allParticipants[winner1!]}</button>`;
        html += `<button data-match-winner-btn data-match="final" data-winner-idx="${winner2}" class="bg-terminal-green text-terminal-black px-3 py-1 rounded">${allParticipants[winner2!]}</button>`;
      }
    }
    
    if (this.step === 'final') {
      html += `<button id="fetch-details-btn" class="bg-terminal-gray text-terminal-green px-3 py-1 rounded ml-4">토너먼트 상세 정보 확인</button>`;
    }
    
    return html;
  }

  private async handleStartMatch(match: string): Promise<void> {
    // 기존 HTTP API 호출 주석 처리
    // await tournamentApiService.startMatch(this.matchIds[match]);
    if (this.matchIds[match as keyof typeof this.matchIds]) {
      tournamentWebSocketService.sendMessage({
        type: 'match_start',
        data: { matchId: this.matchIds[match as keyof typeof this.matchIds]! }
      });
      // 상태 갱신은 서버에서 오는 메시지로 처리하는 것이 이상적이지만, 테스트를 위해 임시로 상태 변경
      this.matchStates[match as keyof typeof this.matchStates] = 'playing';
      this.updateContent();
    }
  }

  private async handleSelectWinner(match: string, winnerIdx: number): Promise<void> {
    // 기존 HTTP API 호출 주석 처리
    // await tournamentApiService.setMatchWinner(this.matchIds[match], winnerIdx);
    if (this.matchIds[match as keyof typeof this.matchIds]) {
      tournamentWebSocketService.sendMessage({
        type: 'match_result',
        data: { matchId: this.matchIds[match as keyof typeof this.matchIds]!, winnerId: winnerIdx }
      });
      // 상태 갱신은 서버에서 오는 메시지로 처리하는 것이 이상적이지만, 테스트를 위해 임시로 상태 변경
      this.matchWinners[match as keyof typeof this.matchWinners] = winnerIdx;
      this.matchStates[match as keyof typeof this.matchStates] = 'finished';
      
      // 다음 단계로 이동
      if (match === 'match1') {
        this.step = 'match2';
      } else if (match === 'match2') {
        this.step = 'final';
      } else if (match === 'final') {
        this.step = 'result';
      }
      this.updateContent();
    }
  }

  private getFinalWinnerName(): string {
    if (this.matchWinners.final !== undefined) {
      const allParticipants = [this.currentUserInfo.name ?? 'User1', ...this.participants];
      return allParticipants[this.matchWinners.final];
    }
    return '-';
  }

  private async fetchTournamentDetails(): Promise<void> {
    if (!this.tournamentId) return;
    try {
      const tournamentApi = new TournamentApiService();
      this.tournamentDetails = await tournamentApi.getTournamentDetails(this.tournamentId);
      this.step = 'result';
      this.updateContent();
    } catch (e: any) {
      this.errorMsg = e?.message || '토너먼트 상세 정보 조회 실패';
      this.updateContent();
    }
  }
}