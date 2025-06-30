import { BaseModal } from './BaseModal.js';
import { TokenManager } from '../services/core/TokenManager.js';
import { ApiClient } from '../services/ApiClient.js';

export class TournamentTestModal extends BaseModal {
  private apiClient: ApiClient;
  private currentTournamentId: number | null = null;
  private currentMatches: any[] = [];

  constructor(apiClient?: ApiClient) {
    super();
    this.apiClient = apiClient || new ApiClient();
  }

  protected setupModal(): void {
    this.modalElement.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    this.contentElement.className = 'bg-terminal-black border border-terminal-gray rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto';
    this.modalElement.appendChild(this.contentElement);

    this.modalElement.addEventListener('click', (e) => {
      if (e.target === this.modalElement && this.canCloseOnOutsideClick()) {
        this.close();
      }
    });
  }

  protected onShow(): void {
    this.render();
  }

  protected onClose(): void {
    // 정리 작업
  }

  protected render(): void {
    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">Tournament Test - Full Cycle</h3>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
          ✕
        </button>
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 왼쪽 컬럼: 토너먼트 생성 및 관리 -->
        <div class="space-y-6">
          <!-- 토너먼트 생성 섹션 -->
          <div class="border border-terminal-gray rounded-lg p-4">
            <h4 class="text-terminal-green font-bold mb-3">1. Create Tournament</h4>
            <div class="grid grid-cols-2 gap-2 mb-3">
              <input type="text" id="player1" placeholder="Player 1 (User)" class="bg-terminal-black border border-terminal-gray text-terminal-green px-2 py-1 rounded text-sm" value="User1">
              <input type="text" id="player2" placeholder="Player 2 (Guest)" class="bg-terminal-black border border-terminal-gray text-terminal-green px-2 py-1 rounded text-sm" value="Guest1">
              <input type="text" id="player3" placeholder="Player 3 (Guest)" class="bg-terminal-black border border-terminal-gray text-terminal-green px-2 py-1 rounded text-sm" value="Guest2">
              <input type="text" id="player4" placeholder="Player 4 (Guest)" class="bg-terminal-black border border-terminal-gray text-terminal-green px-2 py-1 rounded text-sm" value="Guest3">
            </div>
            <button id="create-tournament-btn" 
                    class="w-full bg-terminal-gray text-terminal-green py-2 rounded hover:bg-opacity-80 transition-all mb-3">
              Create Tournament
            </button>
            <div id="tournament-status" class="text-sm text-terminal-gray">
              No tournament created
            </div>
          </div>

          <!-- 토너먼트 상세 정보 섹션 -->
          <div class="border border-terminal-gray rounded-lg p-4">
            <h4 class="text-terminal-green font-bold mb-3">2. Tournament Details</h4>
            <div class="flex gap-2 mb-3">
              <input type="number" id="tournament-id-input" placeholder="Tournament ID" class="bg-terminal-black border border-terminal-gray text-terminal-green px-2 py-1 rounded text-sm flex-1">
              <button id="get-tournament-details-btn" 
                      class="bg-terminal-gray text-terminal-green px-3 py-1 rounded hover:bg-opacity-80 transition-all text-sm">
                Get Details
              </button>
            </div>
            <div id="tournament-details" class="text-sm text-terminal-gray">
              Enter tournament ID and click "Get Details"
            </div>
          </div>

          <!-- 참가자 목록 섹션 -->
          <div class="border border-terminal-gray rounded-lg p-4">
            <h4 class="text-terminal-green font-bold mb-3">3. Participants</h4>
            <div class="flex gap-2 mb-3">
              <input type="number" id="participants-tournament-id" placeholder="Tournament ID" class="bg-terminal-black border border-terminal-gray text-terminal-green px-2 py-1 rounded text-sm flex-1">
              <button id="get-participants-btn" 
                      class="bg-terminal-gray text-terminal-green px-3 py-1 rounded hover:bg-opacity-80 transition-all text-sm">
                Get Participants
              </button>
            </div>
            <div id="participants-list" class="text-sm text-terminal-gray">
              Enter tournament ID and click "Get Participants"
            </div>
          </div>

          <!-- 토너먼트 진행 상황 섹션 -->
          <div class="border border-terminal-gray rounded-lg p-4">
            <h4 class="text-terminal-green font-bold mb-3">4. Tournament Progress</h4>
            <div class="flex gap-2 mb-3">
              <input type="number" id="progress-tournament-id" placeholder="Tournament ID" class="bg-terminal-black border border-terminal-gray text-terminal-green px-2 py-1 rounded text-sm flex-1">
              <button id="get-progress-btn" 
                      class="bg-terminal-gray text-terminal-green px-3 py-1 rounded hover:bg-opacity-80 transition-all text-sm">
                Get Progress
              </button>
            </div>
            <div id="tournament-progress" class="text-sm text-terminal-gray">
              Enter tournament ID and click "Get Progress"
            </div>
          </div>

          <!-- 토너먼트 취소 섹션 -->
          <div class="border border-terminal-gray rounded-lg p-4">
            <h4 class="text-terminal-green font-bold mb-3">5. Cancel Tournament</h4>
            <div class="flex gap-2 mb-3">
              <input type="number" id="cancel-tournament-id" placeholder="Tournament ID" class="bg-terminal-black border border-terminal-gray text-terminal-green px-2 py-1 rounded text-sm flex-1">
              <button id="cancel-tournament-btn" 
                      class="bg-terminal-gray text-terminal-green px-3 py-1 rounded hover:bg-opacity-80 transition-all text-sm">
                Cancel
              </button>
            </div>
            <div id="cancel-status" class="text-sm text-terminal-gray">
              Enter tournament ID and click "Cancel"
            </div>
          </div>
        </div>

        <!-- 오른쪽 컬럼: 매치 관리 및 히스토리 -->
        <div class="space-y-6">
          <!-- 대진표 표시 섹션 -->
          <div class="border border-terminal-gray rounded-lg p-4">
            <h4 class="text-terminal-green font-bold mb-3">6. Tournament Bracket</h4>
            <div class="flex gap-2 mb-3">
              <input type="number" id="bracket-tournament-id" placeholder="Tournament ID" class="bg-terminal-black border border-terminal-gray text-terminal-green px-2 py-1 rounded text-sm flex-1">
              <button id="get-bracket-btn" 
                      class="bg-terminal-gray text-terminal-green px-3 py-1 rounded hover:bg-opacity-80 transition-all text-sm">
                Get Bracket
              </button>
            </div>
            <div id="bracket-display" class="space-y-2 max-h-40 overflow-y-auto">
              <div class="text-center py-4 text-terminal-gray opacity-70">
                Enter tournament ID and click "Get Bracket"
              </div>
            </div>
          </div>

          <!-- 매치 진행 시뮬레이션 섹션 -->
          <div class="border border-terminal-gray rounded-lg p-4">
            <h4 class="text-terminal-green font-bold mb-3">7. Match Simulation</h4>
            <div class="grid grid-cols-3 gap-2 mb-3">
              <input type="number" id="match-tournament-id" placeholder="Tournament ID" class="bg-terminal-black border border-terminal-gray text-terminal-green px-2 py-1 rounded text-sm">
              <input type="number" id="match-id" placeholder="Match ID" class="bg-terminal-black border border-terminal-gray text-terminal-green px-2 py-1 rounded text-sm">
              <input type="number" id="winner-id" placeholder="Winner ID" class="bg-terminal-black border border-terminal-gray text-terminal-green px-2 py-1 rounded text-sm">
            </div>
            <div class="flex gap-2 mb-3">
              <button id="start-match-btn" 
                      class="bg-terminal-gray text-terminal-green px-3 py-1 rounded hover:bg-opacity-80 transition-all text-sm flex-1">
                Start Match
              </button>
              <button id="end-match-btn" 
                      class="bg-terminal-gray text-terminal-green px-3 py-1 rounded hover:bg-opacity-80 transition-all text-sm flex-1">
                End Match
              </button>
            </div>
            <div id="match-status" class="text-sm text-terminal-gray">
              Enter tournament ID, match ID, and winner ID
            </div>
          </div>

          <!-- 토너먼트 목록 섹션 -->
          <div class="border border-terminal-gray rounded-lg p-4">
            <h4 class="text-terminal-green font-bold mb-3">8. All Tournaments</h4>
            <button id="load-tournaments-btn" 
                    class="w-full bg-terminal-gray text-terminal-green py-2 rounded hover:bg-opacity-80 transition-all mb-3">
              Load All Tournaments
            </button>
            <div id="tournaments-list" class="space-y-2 max-h-32 overflow-y-auto">
              <div class="text-center py-4 text-terminal-gray opacity-70">
                Click "Load All Tournaments" to see tournament list
              </div>
            </div>
          </div>

          <!-- 프로필 토너먼트 기록 섹션 -->
          <div class="border border-terminal-gray rounded-lg p-4">
            <h4 class="text-terminal-green font-bold mb-3">9. My Tournament History</h4>
            <button id="load-profile-btn" 
                    class="w-full bg-terminal-gray text-terminal-green py-2 rounded hover:bg-opacity-80 transition-all mb-3">
              Load My History
            </button>
            <div id="profile-data" class="space-y-2 max-h-32 overflow-y-auto">
              <div class="text-center py-4 text-terminal-gray opacity-70">
                Click "Load My History" to see tournament history
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- API 응답 로그 섹션 -->
      <div class="border border-terminal-gray rounded-lg p-4 mt-6">
        <h4 class="text-terminal-green font-bold mb-3">API Response Log</h4>
        <div id="api-log" class="bg-terminal-black border border-terminal-gray rounded p-3 text-xs text-terminal-gray max-h-48 overflow-y-auto">
          <div class="text-center py-2 opacity-70">API responses will appear here...</div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const closeBtn = this.contentElement.querySelector('#close-btn');
    const createTournamentBtn = this.contentElement.querySelector('#create-tournament-btn');
    const getTournamentDetailsBtn = this.contentElement.querySelector('#get-tournament-details-btn');
    const getParticipantsBtn = this.contentElement.querySelector('#get-participants-btn');
    const getProgressBtn = this.contentElement.querySelector('#get-progress-btn');
    const cancelTournamentBtn = this.contentElement.querySelector('#cancel-tournament-btn');
    const getBracketBtn = this.contentElement.querySelector('#get-bracket-btn');
    const startMatchBtn = this.contentElement.querySelector('#start-match-btn');
    const endMatchBtn = this.contentElement.querySelector('#end-match-btn');
    const loadTournamentsBtn = this.contentElement.querySelector('#load-tournaments-btn');
    const loadProfileBtn = this.contentElement.querySelector('#load-profile-btn');

    closeBtn?.addEventListener('click', () => this.close());
    createTournamentBtn?.addEventListener('click', () => this.createTournament());
    getTournamentDetailsBtn?.addEventListener('click', () => this.getTournamentDetails());
    getParticipantsBtn?.addEventListener('click', () => this.getTournamentParticipants());
    getProgressBtn?.addEventListener('click', () => this.getTournamentProgress());
    cancelTournamentBtn?.addEventListener('click', () => this.cancelTournament());
    getBracketBtn?.addEventListener('click', () => this.getTournamentBracket());
    startMatchBtn?.addEventListener('click', () => this.startMatch());
    endMatchBtn?.addEventListener('click', () => this.endMatch());
    loadTournamentsBtn?.addEventListener('click', () => this.loadTournaments());
    loadProfileBtn?.addEventListener('click', () => this.loadProfile());
  }

  private logApiResponse(title: string, data: any): void {
    const logElement = this.contentElement.querySelector('#api-log');
    if (logElement) {
      const timestamp = new Date().toLocaleTimeString();
      const logEntry = document.createElement('div');
      logEntry.className = 'mb-2 p-2 bg-terminal-gray bg-opacity-10 rounded';
      logEntry.innerHTML = `
        <div class="text-terminal-green font-bold">${title} (${timestamp})</div>
        <pre class="text-xs mt-1 overflow-x-auto">${JSON.stringify(data, null, 2)}</pre>
      `;
      logElement.appendChild(logEntry);
      logElement.scrollTop = logElement.scrollHeight;
    }
  }

  private async createTournament(): Promise<void> {
    try {
      const userId = 4; // 현재 로그인한 사용자 ID

      const player1 = (this.contentElement.querySelector('#player1') as HTMLInputElement)?.value || 'Player1';
      const player2 = (this.contentElement.querySelector('#player2') as HTMLInputElement)?.value || 'Player2';
      const player3 = (this.contentElement.querySelector('#player3') as HTMLInputElement)?.value || 'Player3';
      const player4 = (this.contentElement.querySelector('#player4') as HTMLInputElement)?.value || 'Player4';

      const response = await this.apiClient.tournament.createTournament({
        participants: [
          { type: 'user', userId: userId, displayName: player1 },
          { type: 'guest', displayName: player2 },
          { type: 'guest', displayName: player3 },
          { type: 'guest', displayName: player4 }
        ]
      });

      this.logApiResponse('Create Tournament Response', response);

      if (response && response.id) {
        this.currentTournamentId = response.id;
        const statusElement = this.contentElement.querySelector('#tournament-status');
        if (statusElement) {
          statusElement.innerHTML = `<span class="text-terminal-green">Tournament created! ID: ${response.id}</span>`;
        }
        
        // 토너먼트 생성 후 대진표 조회
        await this.getTournamentBracket(response.id);
      } else {
        alert(`Failed to create tournament: ${response?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create tournament:', error);
      alert(`Failed to create tournament: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getTournamentDetails(): Promise<void> {
    try {
      const tournamentId = parseInt((this.contentElement.querySelector('#tournament-id-input') as HTMLInputElement)?.value || '0');
      if (!tournamentId) {
        alert('Please enter a tournament ID');
        return;
      }

      const response = await this.apiClient.tournament.getTournamentDetails(tournamentId);
      this.logApiResponse('Tournament Details Response', response);

      const detailsElement = this.contentElement.querySelector('#tournament-details');
      if (detailsElement) {
        if (response && response.id) {
          detailsElement.innerHTML = `
            <div class="p-2 bg-terminal-gray bg-opacity-10 rounded">
              <div><strong>ID:</strong> ${response.id}</div>
              <div><strong>Status:</strong> ${response.status}</div>
              <div><strong>Created:</strong> ${new Date(response.created_at).toLocaleString()}</div>
              ${response.ended_at ? `<div><strong>Ended:</strong> ${new Date(response.ended_at).toLocaleString()}</div>` : ''}
              ${response.winner_player_id ? `<div><strong>Winner:</strong> Player ${response.winner_player_id}</div>` : ''}
            </div>
          `;
        } else {
          detailsElement.innerHTML = '<span class="text-terminal-red">Tournament not found</span>';
        }
      }
    } catch (error) {
      console.error('Failed to get tournament details:', error);
      alert(`Failed to get tournament details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getTournamentParticipants(): Promise<void> {
    try {
      const tournamentId = parseInt((this.contentElement.querySelector('#participants-tournament-id') as HTMLInputElement)?.value || '0');
      if (!tournamentId) {
        alert('Please enter a tournament ID');
        return;
      }

      const response = await this.apiClient.tournament.getTournamentParticipants(tournamentId);
      this.logApiResponse('Tournament Participants Response', response);

      const participantsElement = this.contentElement.querySelector('#participants-list');
      if (participantsElement) {
        if (response && Array.isArray(response)) {
          if (response.length > 0) {
            participantsElement.innerHTML = response.map((participant: any) => `
              <div class="p-2 bg-terminal-gray bg-opacity-10 rounded mb-2">
                <div><strong>ID:</strong> ${participant.id}</div>
                <div><strong>Type:</strong> ${participant.type}</div>
                <div><strong>Name:</strong> ${participant.display_name || participant.name || 'Unknown'}</div>
                ${participant.user_id ? `<div><strong>User ID:</strong> ${participant.user_id}</div>` : ''}
              </div>
            `).join('');
          } else {
            participantsElement.innerHTML = '<span class="text-terminal-gray">No participants found</span>';
          }
        } else {
          participantsElement.innerHTML = '<span class="text-terminal-red">Failed to load participants</span>';
        }
      }
    } catch (error) {
      console.error('Failed to get tournament participants:', error);
      alert(`Failed to get tournament participants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getTournamentProgress(): Promise<void> {
    try {
      const tournamentId = parseInt((this.contentElement.querySelector('#progress-tournament-id') as HTMLInputElement)?.value || '0');
      if (!tournamentId) {
        alert('Please enter a tournament ID');
        return;
      }

      const response = await this.apiClient.tournament.getTournamentProgress(tournamentId);
      this.logApiResponse('Tournament Progress Response', response);

      const progressElement = this.contentElement.querySelector('#tournament-progress');
      if (progressElement) {
        if (response && response.tournament) {
          progressElement.innerHTML = `
            <div class="p-2 bg-terminal-gray bg-opacity-10 rounded">
              <div><strong>Status:</strong> ${response.tournament.status}</div>
              <div><strong>Total Matches:</strong> ${response.total_matches}</div>
              <div><strong>Completed Matches:</strong> ${response.completed_matches}</div>
              <div><strong>Current Round:</strong> ${response.current_round}</div>
              ${response.winner ? `<div><strong>Winner:</strong> ${response.winner.display_name || response.winner.name}</div>` : ''}
            </div>
          `;
        } else {
          progressElement.innerHTML = '<span class="text-terminal-red">Failed to load progress</span>';
        }
      }
    } catch (error) {
      console.error('Failed to get tournament progress:', error);
      alert(`Failed to get tournament progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async cancelTournament(): Promise<void> {
    try {
      const tournamentId = parseInt((this.contentElement.querySelector('#cancel-tournament-id') as HTMLInputElement)?.value || '0');
      if (!tournamentId) {
        alert('Please enter a tournament ID');
        return;
      }

      const response = await this.apiClient.tournament.cancelTournament(tournamentId);
      this.logApiResponse('Cancel Tournament Response', response);

      const cancelElement = this.contentElement.querySelector('#cancel-status');
      if (cancelElement) {
        if (response && response.message) {
          cancelElement.innerHTML = `<span class="text-terminal-green">${response.message}</span>`;
        } else {
          cancelElement.innerHTML = '<span class="text-terminal-red">Failed to cancel tournament</span>';
        }
      }
    } catch (error) {
      console.error('Failed to cancel tournament:', error);
      alert(`Failed to cancel tournament: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getTournamentBracket(tournamentId?: number): Promise<void> {
    try {
      const id = tournamentId || parseInt((this.contentElement.querySelector('#bracket-tournament-id') as HTMLInputElement)?.value || '0');
      if (!id) {
        alert('Please enter a tournament ID');
        return;
      }

      const bracketResponse = await this.apiClient.tournament.getTournamentMatches(id);
      this.logApiResponse('Tournament Bracket Response', bracketResponse);

      const bracketDisplay = this.contentElement.querySelector('#bracket-display');
      if (bracketDisplay) {
        if (bracketResponse && Array.isArray(bracketResponse)) {
          if (bracketResponse.length > 0) {
            this.currentMatches = bracketResponse;
            bracketDisplay.innerHTML = `
              <div class="mb-3 p-2 bg-terminal-gray bg-opacity-10 rounded text-sm">
                <strong>Tournament #${id}</strong> - ${bracketResponse.length} matches
              </div>
              ${bracketResponse.map((match: any) => `
                <div class="p-3 bg-terminal-gray bg-opacity-5 rounded">
                  <div class="font-medium">Match #${match.id} (Round ${match.round_number})</div>
                  <div class="text-sm text-terminal-gray">Status: ${match.status}</div>
                  ${match.participants && match.participants.length > 0 ? 
                    `<div class="text-sm text-terminal-gray mt-1">
                      Participants: ${match.participants.map((p: any) => p.display_name || p.name || `Player${p.id}`).join(' vs ')}
                    </div>` : 
                    '<div class="text-sm text-terminal-gray mt-1">No participants</div>'
                  }
                  ${match.winner_id ? `<div class="text-sm text-terminal-green mt-1">Winner: Player ${match.winner_id}</div>` : ''}
                  ${match.started_at ? `<div class="text-xs text-terminal-gray mt-1">Started: ${new Date(match.started_at).toLocaleString()}</div>` : ''}
                </div>
              `).join('')}
            `;
          } else {
            bracketDisplay.innerHTML = '<div class="text-center py-4 text-terminal-gray opacity-70">No matches found</div>';
          }
        } else {
          bracketDisplay.innerHTML = '<div class="text-center py-4 text-terminal-gray opacity-70">No bracket data available</div>';
        }
      }
    } catch (error) {
      console.error('Failed to load tournament bracket:', error);
      const bracketDisplay = this.contentElement.querySelector('#bracket-display');
      if (bracketDisplay) {
        bracketDisplay.innerHTML = '<div class="text-center py-4 text-terminal-red opacity-70">Failed to load tournament bracket</div>';
      }
    }
  }

  private async startMatch(): Promise<void> {
    try {
      const tournamentId = parseInt((this.contentElement.querySelector('#match-tournament-id') as HTMLInputElement)?.value || '0');
      const matchId = parseInt((this.contentElement.querySelector('#match-id') as HTMLInputElement)?.value || '0');
      
      if (!tournamentId || !matchId) {
        alert('Please enter both tournament ID and match ID');
        return;
      }

      const response = await this.apiClient.tournament.startMatch(tournamentId, matchId);
      this.logApiResponse('Start Match Response', response);

      const matchStatusElement = this.contentElement.querySelector('#match-status');
      if (matchStatusElement) {
        if (response && response.message) {
          matchStatusElement.innerHTML = `<span class="text-terminal-green">${response.message} (Game ID: ${response.gameId})</span>`;
        } else {
          matchStatusElement.innerHTML = '<span class="text-terminal-red">Failed to start match</span>';
        }
      }
    } catch (error) {
      console.error('Failed to start match:', error);
      alert(`Failed to start match: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async endMatch(): Promise<void> {
    try {
      const tournamentId = parseInt((this.contentElement.querySelector('#match-tournament-id') as HTMLInputElement)?.value || '0');
      const matchId = parseInt((this.contentElement.querySelector('#match-id') as HTMLInputElement)?.value || '0');
      const winnerId = parseInt((this.contentElement.querySelector('#winner-id') as HTMLInputElement)?.value || '0');
      
      if (!tournamentId || !matchId || !winnerId) {
        alert('Please enter tournament ID, match ID, and winner ID');
        return;
      }

      const response = await this.apiClient.tournament.endMatch(tournamentId, matchId, winnerId);
      this.logApiResponse('End Match Response', response);

      const matchStatusElement = this.contentElement.querySelector('#match-status');
      if (matchStatusElement) {
        if (response && response.message) {
          let statusText = `<span class="text-terminal-green">${response.message}</span>`;
          if (response.nextMatchId) {
            statusText += `<br><span class="text-terminal-yellow">Next match ID: ${response.nextMatchId}</span>`;
          }
          matchStatusElement.innerHTML = statusText;
        } else {
          matchStatusElement.innerHTML = '<span class="text-terminal-red">Failed to end match</span>';
        }
      }
    } catch (error) {
      console.error('Failed to end match:', error);
      alert(`Failed to end match: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async loadTournaments(): Promise<void> {
    try {
      const response = await this.apiClient.tournament.getTournaments();
      this.logApiResponse('Load Tournaments Response', response);

      const tournamentsList = this.contentElement.querySelector('#tournaments-list');
      if (tournamentsList) {
        const tournaments = Array.isArray(response) ? response : (response.data || response);
        
        if (tournaments && tournaments.length > 0) {
          tournamentsList.innerHTML = tournaments.map((tournament: any) => `
            <div class="flex justify-between items-center p-3 bg-terminal-gray bg-opacity-5 rounded">
              <div>
                <div class="font-medium">Tournament #${tournament.id}</div>
                <div class="text-sm text-terminal-gray">Status: ${tournament.status}</div>
              </div>
              <div class="text-right">
                <div class="text-xs text-terminal-gray">Created: ${new Date(tournament.created_at).toLocaleDateString()}</div>
                ${tournament.winner_player_id ? `<div class="text-xs text-terminal-green">Winner: Player ${tournament.winner_player_id}</div>` : ''}
              </div>
            </div>
          `).join('');
        } else {
          tournamentsList.innerHTML = '<div class="text-center py-4 text-terminal-gray opacity-70">No tournaments found</div>';
        }
      }
    } catch (error) {
      console.error('Failed to load tournaments:', error);
      const tournamentsList = this.contentElement.querySelector('#tournaments-list');
      if (tournamentsList) {
        tournamentsList.innerHTML = '<div class="text-center py-4 text-terminal-red opacity-70">Failed to load tournaments</div>';
      }
    }
  }

  private async loadProfile(): Promise<void> {
    try {
      const userProfile = await this.apiClient.tournament.getUserProfile();
      this.logApiResponse('User Profile Response', userProfile);

      if (userProfile && userProfile.success && userProfile.data) {
        const userName = userProfile.data.userInfo?.name;
        
        const userTournamentsResponse = await this.apiClient.tournament.getUserTournamentHistory();
        this.logApiResponse('User Tournament History Response', userTournamentsResponse);

        const profileData = this.contentElement.querySelector('#profile-data');
        if (profileData) {
          if (userTournamentsResponse && Array.isArray(userTournamentsResponse)) {
            if (userTournamentsResponse.length > 0) {
              profileData.innerHTML = `
                <div class="mb-3 p-2 bg-terminal-gray bg-opacity-10 rounded text-sm">
                  <strong>사용자:</strong> ${userName || 'Unknown'} 
                  <br><strong>참여 토너먼트:</strong> ${userTournamentsResponse.length}개
                </div>
                ${userTournamentsResponse.map((tournament: any) => `
                  <div class="p-3 bg-terminal-gray bg-opacity-5 rounded">
                    <div class="font-medium">Tournament #${tournament.tournament_id}</div>
                    <div class="text-sm text-terminal-gray">Date: ${new Date(tournament.tournament_date).toLocaleDateString()}</div>
                    <div class="text-sm text-terminal-gray">Final Rank: ${tournament.final_rank}</div>
                    <div class="text-sm text-terminal-gray mt-1">Participants: ${tournament.participants.join(', ')}</div>
                    <div class="mt-2">
                      ${tournament.rounds.map((round: any, idx: number) => `
                        <div class="p-2 bg-terminal-gray bg-opacity-10 rounded mb-1">
                          <div><strong>Round ${round.round_number}:</strong> ${round.players.join(' vs ')}</div>
                          <div>Winner: ${round.winner || '-'}</div>
                          ${round.result ? `<div>Result: ${round.result}</div>` : ''}
                        </div>
                      `).join('')}
                    </div>
                  </div>
                `).join('')}
              `;
            } else {
              profileData.innerHTML = '<div class="text-center py-4 text-terminal-gray opacity-70">No tournaments participated</div>';
            }
          } else {
            profileData.innerHTML = '<div class="text-center py-4 text-terminal-gray opacity-70">No tournament data available</div>';
          }
        }
      } else {
        const profileData = this.contentElement.querySelector('#profile-data');
        if (profileData) {
          profileData.innerHTML = '<div class="text-center py-4 text-terminal-red opacity-70">Failed to load user profile</div>';
        }
      }
    } catch (error) {
      console.error('Failed to load tournament history:', error);
      const profileData = this.contentElement.querySelector('#profile-data');
      if (profileData) {
        profileData.innerHTML = '<div class="text-center py-4 text-terminal-red opacity-70">Failed to load tournament history</div>';
      }
    }
  }
} 