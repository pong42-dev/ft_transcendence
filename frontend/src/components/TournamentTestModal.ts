import { BaseModal } from './BaseModal.js';

export class TournamentTestModal extends BaseModal {
  private players: { name: string; messages: string[]; latestParsed?: string; ws?: WebSocket }[] = [
    { name: 'Guest1', messages: [] },
    { name: 'Guest2', messages: [] },
    { name: 'Guest3', messages: [] },
  ];
  private tournamentId: number | null = null;
  private allConnected = false;
  private started = false;
  private errorMsg = '';
  private currentUserInfo: { id?: number; name?: string } = {};

  protected setupModal(): void {
    this.modalElement.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    this.contentElement.className = 'bg-terminal-black border border-terminal-gray rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto';
    this.modalElement.appendChild(this.contentElement);
    this.modalElement.addEventListener('click', (e) => {
      if (e.target === this.modalElement && this.canCloseOnOutsideClick()) {
        this.close();
      }
    });
  }

  protected onShow(): void {
    this.setCurrentUserInfo().then(() => this.render());
  }

  protected onClose(): void {
    this.disconnectAll();
  }

  protected render(): void {
    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">Tournament 실서비스 플로우 테스트</h3>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">✕</button>
      </div>
      <div class="mb-4">
        <label class="text-terminal-gray text-sm">Logged-in User: </label>
        <span class="text-terminal-green font-mono">${this.currentUserInfo.name ?? 'Not Logged In'}</span>
      </div>
      <div class="mb-4">
        <label class="text-terminal-gray text-sm">Tournament ID: </label>
        <span class="text-terminal-green font-mono">${this.tournamentId ?? '-'}</span>
      </div>
      <div class="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        ${this.players.map((p, i) => `
          <div class="border border-terminal-gray rounded-lg p-3">
            <label class="text-terminal-gray text-xs">Guest ${i + 1} Nickname</label>
            <input type="text" class="bg-terminal-black border border-terminal-gray text-terminal-green px-2 py-1 rounded text-sm w-full mb-2" id="player-name-${i}" value="${p.name}" />
            <div class="text-xs text-terminal-gray mt-2">메시지 로그:</div>
            <div id="player-msgs-${i}" class="text-xs text-terminal-green bg-terminal-black border border-terminal-gray rounded p-1 h-16 overflow-y-auto">${p.messages.map(m => `<div>${m}</div>`).join('')}</div>
            <div class="text-xs text-terminal-gray mt-2">최근 응답:</div>
            <div id="player-latest-${i}" class="text-xs bg-terminal-black border border-terminal-gray rounded p-1 h-20 overflow-y-auto">
              ${p.latestParsed ? p.latestParsed : '<span class="text-terminal-gray">-</span>'}
            </div>
          </div>
        `).join('')}
      </div>
      <div class="flex gap-4 mb-6">
        <button id="create-tournament-btn" class="bg-terminal-gray text-terminal-green px-4 py-2 rounded hover:bg-opacity-80 transition-all flex-1">1. 토너먼트 생성</button>
        <button id="start-btn" class="bg-terminal-green text-terminal-black px-4 py-2 rounded hover:bg-opacity-80 transition-all flex-1" ${!this.allConnected || this.started ? 'disabled' : ''}>2. 토너먼트 시작</button>
      </div>
      <div class="text-terminal-gray text-xs mb-2">* "토너먼트 생성"을 누르면 3명의 게스트 닉네임으로 API를 호출해 tournamentId를 받고, 그 id로 WebSocket 연결 후 "토너먼트 시작"이 가능합니다.</div>
      ${this.errorMsg ? `<div class="text-terminal-red text-xs mb-2">${this.errorMsg}</div>` : ''}
    `;
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    this.contentElement.querySelector('#close-btn')?.addEventListener('click', () => this.close());
    this.contentElement.querySelector('#create-tournament-btn')?.addEventListener('click', () => this.createTournamentAndConnect());
    this.contentElement.querySelector('#start-btn')?.addEventListener('click', () => this.startTournament());
    for (let i = 0; i < this.players.length; i++) {
      this.contentElement.querySelector(`#player-name-${i}`)?.addEventListener('input', (e: any) => {
        this.players[i].name = e.target.value;
      });
    }
  }

  private async setCurrentUserInfo(): Promise<void> {
    try {
      const apiUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ? import.meta.env.VITE_API_URL : '';
      const res = await fetch(`${apiUrl}/api/users/me`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.success && data.data && data.data.userInfo) {
        this.currentUserInfo = { name: data.data.userInfo.name, id: data.data.userInfo.user_id };
      } else {
        this.currentUserInfo = {};
      }
    } catch (e) {
      this.currentUserInfo = {};
    }
  }

  private async createTournamentAndConnect(): Promise<void> {
    this.disconnectAll();
    this.errorMsg = '';
    this.tournamentId = null;
    this.allConnected = false;
    this.started = false;
    this.players.forEach(p => { p.messages = []; p.latestParsed = ''; });
    this.render();
    try {
      // 3명의 게스트 정보만 포함
      const participants = this.players.map(p => ({
        type: 'guest',
        displayName: p.name
      }));
      const apiUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ? import.meta.env.VITE_API_URL : '';
      const res = await fetch(`${apiUrl}/api/tournaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants }),
        credentials: 'include'
      });
      if (!res.ok) {
        const err = await res.json();
        this.errorMsg = err.message || '토너먼트 생성 실패';
        this.render();
        return;
      }
      const data = await res.json();
      this.tournamentId = data.id || data.tournamentId || data.tournament_id;
      if (!this.tournamentId) {
        this.errorMsg = 'API 응답에 tournamentId가 없습니다.';
        this.render();
        return;
      }
      // WebSocket 연결
      let connectedCount = 0;
      this.players.forEach((player, idx) => {
        player.messages = [];
        player.latestParsed = '';
        const ws = new WebSocket(`ws://localhost:3000/ws/tournament/${this.tournamentId}?playerName=${encodeURIComponent(player.name)}`);
        (player as any).ws = ws;
        ws.onopen = () => {
          player.messages.push('✅ 연결됨');
          connectedCount++;
          if (connectedCount === this.players.length) {
            this.allConnected = true;
            this.render();
          } else {
            this.updatePlayerMsgs(idx);
          }
        };
        ws.onmessage = (event) => {
          let msg = event.data;
          let parsedHtml = '';
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'tournament_bracket') {
              msg = '🏆 대진표 수신: ' + JSON.stringify(data.data);
              parsedHtml = this.renderBracket(data.data);
            } else if (data.type === 'tournament_start') {
              msg = '▶️ tournament_start 수신';
              parsedHtml = `<span class='text-terminal-green'>토너먼트 시작!</span>`;
            } else {
              msg = '📩 ' + event.data;
              parsedHtml = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
            }
          } catch {
            parsedHtml = `<span class='text-terminal-gray'>${event.data}</span>`;
          }
          player.messages.push(msg);
          player.latestParsed = parsedHtml;
          this.updatePlayerMsgs(idx);
          this.updatePlayerLatest(idx);
        };
        ws.onclose = () => {
          player.messages.push('❌ 연결 종료');
          this.updatePlayerMsgs(idx);
          player.latestParsed = `<span class='text-terminal-gray'>연결 종료</span>`;
          this.updatePlayerLatest(idx);
        };
        ws.onerror = (err) => {
          player.messages.push('⚠️ 에러: ' + err);
          this.updatePlayerMsgs(idx);
          player.latestParsed = `<span class='text-terminal-red'>에러 발생</span>`;
          this.updatePlayerLatest(idx);
        };
      });
      this.allConnected = false;
      this.started = false;
      this.render();
    } catch (e: any) {
      this.errorMsg = e?.message || '토너먼트 생성 중 알 수 없는 에러';
      this.render();
    }
  }

  private renderBracket(data: any): string {
    if (!data || !data.bracket || !Array.isArray(data.bracket.rounds)) return '<span class="text-terminal-gray">대진표 데이터 없음</span>';
    return data.bracket.rounds.map((round: any[], idx: number) => `
      <div class='mb-1'>
        <span class='text-terminal-green font-bold'>Round ${idx + 1}</span>
        <ul class='ml-2'>
          ${round.map(match => `<li>Match #${match.matchId}: ${match.player1.nickname} vs ${match.player2.nickname} ${match.winnerId ? `(승자: ${match.winnerId})` : ''}</li>`).join('')}
        </ul>
      </div>
    `).join('');
  }

  private disconnectAll(): void {
    this.players.forEach((p) => {
      if (p.ws) {
        p.ws.close();
        p.ws = undefined;
      }
      p.messages = [];
      p.latestParsed = '';
    });
    this.allConnected = false;
    this.started = false;
  }

  private startTournament(): void {
    if (!this.allConnected || this.started) return;
    const ws = this.players[0].ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'tournament_start' }));
      this.players[0].messages.push('▶️ tournament_start 전송');
      this.updatePlayerMsgs(0);
      this.started = true;
      this.render();
    }
  }

  private updatePlayerMsgs(idx: number): void {
    const msgsDiv = this.contentElement.querySelector(`#player-msgs-${idx}`);
    if (msgsDiv) {
      msgsDiv.innerHTML = this.players[idx].messages.map(m => `<div>${m}</div>`).join('');
      msgsDiv.scrollTop = msgsDiv.scrollHeight;
    }
  }

  private updatePlayerLatest(idx: number): void {
    const latestDiv = this.contentElement.querySelector(`#player-latest-${idx}`);
    if (latestDiv) {
      latestDiv.innerHTML = this.players[idx].latestParsed || '<span class="text-terminal-gray">-</span>';
      latestDiv.scrollTop = latestDiv.scrollHeight;
    }
  }
} 