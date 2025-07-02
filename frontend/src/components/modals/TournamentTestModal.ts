/**
 * TournamentTestModal - 통합된 BaseModal을 활용한 토너먼트 테스트 모달
 * 
 * 토너먼트 시스템을 테스트하기 위한 모달입니다.
 */

import { BaseModal } from './BaseModal.js';
import { ApiClient } from '../../services/ApiClient.js';

export class TournamentTestModal extends BaseModal {
  private currentTournamentId: number | null = null;

  constructor(_apiClient?: ApiClient) {
    super();
    // Constructor parameter kept for compatibility but not stored
  }

  protected onShow(): void {
    // 모달이 표시될 때 초기화
  }

  protected onClose(): void {
    // 정리 작업
  }

  protected canCloseOnOutsideClick(): boolean {
    return true;
  }

  protected render(): void {
    if (!this.contentElement) return;
    
    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-terminal-green">Tournament Test</h2>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
          ✕
        </button>
      </div>
      
      <div class="space-y-6">
        <div class="bg-terminal-gray bg-opacity-10 p-4 rounded-lg">
          <h3 class="text-terminal-green font-bold mb-3">Tournament Controls</h3>
          <div class="space-y-3">
            <button id="create-tournament-btn" class="w-full bg-terminal-green text-terminal-black py-2 rounded hover:bg-opacity-80 transition-all">
              Create Test Tournament
            </button>
            <button id="join-tournament-btn" class="w-full border border-terminal-gray text-terminal-green py-2 rounded hover:bg-terminal-gray hover:bg-opacity-10 transition-all" disabled>
              Join Tournament
            </button>
            <button id="start-tournament-btn" class="w-full border border-terminal-gray text-terminal-green py-2 rounded hover:bg-terminal-gray hover:bg-opacity-10 transition-all" disabled>
              Start Tournament
            </button>
          </div>
        </div>
        
        <div class="bg-terminal-gray bg-opacity-10 p-4 rounded-lg">
          <h3 class="text-terminal-green font-bold mb-3">Tournament Status</h3>
          <div id="tournament-status" class="text-terminal-gray">
            No active tournament
          </div>
        </div>
        
        <div class="bg-terminal-gray bg-opacity-10 p-4 rounded-lg">
          <h3 class="text-terminal-green font-bold mb-3">Current Matches</h3>
          <div id="matches-list" class="text-terminal-gray">
            No matches available
          </div>
        </div>
        
        <div class="flex justify-end gap-3">
          <button id="refresh-btn" class="px-4 py-2 border border-terminal-gray text-terminal-green rounded hover:bg-terminal-gray hover:bg-opacity-10 transition-all">
            Refresh
          </button>
          <button id="close-modal-btn" class="px-4 py-2 bg-terminal-gray text-terminal-black rounded hover:bg-opacity-80 transition-all">
            Close
          </button>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    if (!this.contentElement) return;

    const createTournamentBtn = this.contentElement.querySelector('#create-tournament-btn') as HTMLButtonElement;
    const joinTournamentBtn = this.contentElement.querySelector('#join-tournament-btn') as HTMLButtonElement;
    const startTournamentBtn = this.contentElement.querySelector('#start-tournament-btn') as HTMLButtonElement;
    const refreshBtn = this.contentElement.querySelector('#refresh-btn') as HTMLButtonElement;
    const closeBtn = this.contentElement.querySelector('#close-btn') as HTMLButtonElement;
    const closeModalBtn = this.contentElement.querySelector('#close-modal-btn') as HTMLButtonElement;

    // Create tournament
    createTournamentBtn?.addEventListener('click', () => {
      this.createTestTournament();
    });

    // Join tournament
    joinTournamentBtn?.addEventListener('click', () => {
      this.joinTournament();
    });

    // Start tournament
    startTournamentBtn?.addEventListener('click', () => {
      this.startTournament();
    });

    // Refresh
    refreshBtn?.addEventListener('click', () => {
      this.refreshTournamentStatus();
    });

    // Close buttons
    closeBtn?.addEventListener('click', () => this.close());
    closeModalBtn?.addEventListener('click', () => this.close());
  }

  private async createTestTournament(): Promise<void> {
    try {
      // Mock tournament creation
      this.currentTournamentId = Math.floor(Math.random() * 1000);
      
      const statusElement = this.contentElement?.querySelector('#tournament-status');
      if (statusElement) {
        statusElement.textContent = `Tournament ${this.currentTournamentId} created. Waiting for players...`;
      }

      // Enable join and start buttons
      const joinBtn = this.contentElement?.querySelector('#join-tournament-btn') as HTMLButtonElement;
      const startBtn = this.contentElement?.querySelector('#start-tournament-btn') as HTMLButtonElement;
      
      if (joinBtn) joinBtn.disabled = false;
      if (startBtn) startBtn.disabled = false;

    } catch (error) {
      console.error('Failed to create tournament:', error);
      this.showGeneralError('Failed to create tournament');
    }
  }

  private async joinTournament(): Promise<void> {
    if (!this.currentTournamentId) return;

    try {
      // Mock joining tournament
      const statusElement = this.contentElement?.querySelector('#tournament-status');
      if (statusElement) {
        statusElement.textContent = `Joined tournament ${this.currentTournamentId}. Tournament ready to start.`;
      }
    } catch (error) {
      console.error('Failed to join tournament:', error);
      this.showGeneralError('Failed to join tournament');
    }
  }

  private async startTournament(): Promise<void> {
    if (!this.currentTournamentId) return;

    try {
      // Mock starting tournament
      const statusElement = this.contentElement?.querySelector('#tournament-status');
      const matchesList = this.contentElement?.querySelector('#matches-list');
      
      if (statusElement) {
        statusElement.textContent = `Tournament ${this.currentTournamentId} is now active!`;
      }

      if (matchesList) {
        matchesList.innerHTML = `
          <div class="space-y-2">
            <div class="flex justify-between items-center p-2 border border-terminal-gray rounded">
              <span>Match 1: Player1 vs Player2</span>
              <span class="text-terminal-green">In Progress</span>
            </div>
            <div class="flex justify-between items-center p-2 border border-terminal-gray rounded">
              <span>Match 2: Player3 vs Player4</span>
              <span class="text-terminal-gray">Waiting</span>
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error('Failed to start tournament:', error);
      this.showGeneralError('Failed to start tournament');
    }
  }

  private refreshTournamentStatus(): void {
    // Mock refresh functionality
    console.log('Refreshing tournament status...');
    
    const statusElement = this.contentElement?.querySelector('#tournament-status');
    if (statusElement && this.currentTournamentId) {
      statusElement.textContent = `Tournament ${this.currentTournamentId} status refreshed.`;
    }
  }

  protected showGeneralError(message: string): void {
    // TODO: Implement error display using BaseModal's error handling
    console.error(message);
  }
}
