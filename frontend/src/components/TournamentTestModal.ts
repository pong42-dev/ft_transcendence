import { BaseModal } from './BaseModal.js';
import { TokenManager } from '../services/core/TokenManager.js';
import { ApiClient } from '../services/ApiClient.js';

export class TournamentTestModal extends BaseModal {
  private apiClient: ApiClient;

  constructor(apiClient?: ApiClient) {
    super();
    this.apiClient = apiClient || new ApiClient();
  }

  protected setupModal(): void {
    this.modalElement.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    this.contentElement.className = 'bg-terminal-black border border-terminal-gray rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto';
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
        <h3 class="text-terminal-green text-xl font-bold">Tournament Test</h3>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
          ✕
        </button>
      </div>
      
      <div class="space-y-6">
        <!-- 토너먼트 생성 섹션 -->
        <div class="border border-terminal-gray rounded-lg p-4">
          <h4 class="text-terminal-green font-bold mb-3">Create Tournament</h4>
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
        </div>

        <!-- 대진표 표시 섹션 -->
        <div class="border border-terminal-gray rounded-lg p-4">
          <h4 class="text-terminal-green font-bold mb-3">Tournament Bracket</h4>
          <div id="bracket-display" class="space-y-2">
            <div class="text-center py-4 text-terminal-gray opacity-70">
              Create a tournament to see the bracket
            </div>
          </div>
        </div>

        <!-- 토너먼트 목록 섹션 -->
        <div class="border border-terminal-gray rounded-lg p-4">
          <h4 class="text-terminal-green font-bold mb-3">Tournament List</h4>
          <button id="load-tournaments-btn" 
                  class="w-full bg-terminal-gray text-terminal-green py-2 rounded hover:bg-opacity-80 transition-all mb-3">
            Load Tournaments
          </button>
          <div id="tournaments-list" class="space-y-2">
            <div class="text-center py-4 text-terminal-gray opacity-70">
              Click "Load Tournaments" to see tournament list
            </div>
          </div>
        </div>

        <!-- 프로필 토너먼트 기록 섹션 -->
        <div class="border border-terminal-gray rounded-lg p-4">
          <h4 class="text-terminal-green font-bold mb-3">My Tournament History</h4>
          <button id="load-profile-btn" 
                  class="w-full bg-terminal-gray text-terminal-green py-2 rounded hover:bg-opacity-80 transition-all mb-3">
            Load My Profile
          </button>
          <div id="profile-data" class="space-y-2">
            <div class="text-center py-4 text-terminal-gray opacity-70">
              Click "Load My Profile" to see tournament history
            </div>
          </div>
        </div>

        <!-- API 응답 로그 섹션 -->
        <div class="border border-terminal-gray rounded-lg p-4">
          <h4 class="text-terminal-green font-bold mb-3">API Response Log</h4>
          <div id="api-log" class="bg-terminal-black border border-terminal-gray rounded p-3 text-xs text-terminal-gray max-h-32 overflow-y-auto">
            <div class="text-center py-2 opacity-70">API responses will appear here...</div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const closeBtn = this.contentElement.querySelector('#close-btn');
    const createTournamentBtn = this.contentElement.querySelector('#create-tournament-btn');
    const loadTournamentsBtn = this.contentElement.querySelector('#load-tournaments-btn');
    const loadProfileBtn = this.contentElement.querySelector('#load-profile-btn');

    closeBtn?.addEventListener('click', () => this.close());
    createTournamentBtn?.addEventListener('click', () => this.createTournament());
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
      // 먼저 사용자 프로필을 가져와서 사용자 ID 확인
      const userProfile = await this.apiClient.tournament.getUserProfile();
      
      if (!userProfile || !userProfile.success || !userProfile.data) {
        alert('Failed to get user profile');
        return;
      }

      // JWT 토큰에서 사용자 ID 추출 (임시로 하드코딩된 값 사용)
      // 실제로는 토큰을 디코드해서 user_id를 가져와야 함
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
        alert(`Tournament created successfully! ID: ${response.id}`);
        
        // 토너먼트 생성 후 대진표 조회
        await this.loadTournamentBracket(response.id);
      } else {
        alert(`Failed to create tournament: ${response?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create tournament:', error);
      alert(`Failed to create tournament: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async loadTournamentBracket(tournamentId: number): Promise<void> {
    try {
      const bracketResponse = await this.apiClient.tournament.getTournamentMatches(tournamentId);
      this.logApiResponse('Tournament Bracket Response', bracketResponse);

      const bracketDisplay = this.contentElement.querySelector('#bracket-display');
      if (bracketDisplay) {
        if (bracketResponse && Array.isArray(bracketResponse)) {
          if (bracketResponse.length > 0) {
            bracketDisplay.innerHTML = `
              <div class="mb-3 p-2 bg-terminal-gray bg-opacity-10 rounded text-sm">
                <strong>Tournament #${tournamentId}</strong>
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

  private async loadTournaments(): Promise<void> {
    try {
      const response = await this.apiClient.tournament.getTournaments();
      this.logApiResponse('Load Tournaments Response', response);

      const tournamentsList = this.contentElement.querySelector('#tournaments-list');
      if (tournamentsList) {
        // 서버 응답이 배열이면 직접 사용, 아니면 data 필드에서 추출
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
      // 먼저 사용자 프로필을 가져옴
      const userProfile = await this.apiClient.tournament.getUserProfile();
      this.logApiResponse('User Profile Response', userProfile);

      // 사용자 프로필이 성공적으로 로드되었으면 사용자별 토너먼트 히스토리 조회
      if (userProfile && userProfile.success && userProfile.data) {
        const userName = userProfile.data.userInfo?.name;
        
        // 사용자별 토너먼트 히스토리 조회
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
                    <div class="font-medium">Tournament #${tournament.id}</div>
                    <div class="text-sm text-terminal-gray">Date: ${new Date(tournament.created_at).toLocaleDateString()}</div>
                    <div class="text-sm text-terminal-gray">Status: ${tournament.status}</div>
                    ${tournament.winner_player_id ? `<div class="text-sm text-terminal-green">Winner: Player ${tournament.winner_player_id}</div>` : ''}
                    ${tournament.participants && tournament.participants.length > 0 ? 
                      `<div class="text-sm text-terminal-gray mt-1">Participants: ${tournament.participants.map((p: any) => p.display_name || p.name || `Player${p.id}`).join(', ')}</div>` : 
                      ''
                    }
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