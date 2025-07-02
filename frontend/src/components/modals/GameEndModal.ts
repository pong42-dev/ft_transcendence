/**
 * GameEndModal - 통합된 BaseModal을 활용한 게임 종료 모달
 * 
 * 게임 결과를 표시하고 다음 액션을 선택할 수 있는 모달입니다.
 */

import { GameResult } from '../../types/types.js';
import { BaseModal } from './BaseModal.js';

export class GameEndModal extends BaseModal {
  private onProfileClick: () => void;
  private onNextMatch?: () => void;
  private isTournament: boolean;
  private isFinal: boolean;
  private gameResult: GameResult;

  constructor(
    gameResult: GameResult, 
    isTournament: boolean, 
    isFinal: boolean, 
    onProfileClick: () => void, 
    onNextMatch?: () => void
  ) {
    super();
    this.gameResult = gameResult;
    this.onProfileClick = onProfileClick;
    this.onNextMatch = onNextMatch;
    this.isTournament = isTournament;
    this.isFinal = isFinal;
  }

  protected onShow(): void {
    // 모달이 표시될 때 초기화
  }

  protected onClose(): void {
    // 정리 작업
  }

  protected canCloseOnOutsideClick(): boolean {
    return false; // 중요한 결과이므로 외부 클릭으로 닫지 않음
  }

  protected render(): void {
    if (!this.contentElement) return;
    
    // Determine if current user won (assuming right player is the user in most cases)
    const userWon = this.gameResult.winner === 'right';
    const winnerName = this.gameResult.winner === 'left' ? this.gameResult.leftPlayer.nickname : this.gameResult.rightPlayer.nickname;
    
    this.contentElement.innerHTML = `
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-terminal-gray bg-opacity-10 mb-3">
          <div class="text-3xl">${userWon ? '🏆' : '💪'}</div>
        </div>
        <h3 class="text-terminal-green text-2xl font-bold mb-1">${userWon ? 'Victory!' : 'Good Game!'}</h3>
        <div class="text-sm opacity-70">${userWon ? 'Congratulations!' : `${winnerName} wins!`}</div>
      </div>
      
      <div class="bg-terminal-gray bg-opacity-5 rounded-lg p-4 mb-6">
        <div class="flex justify-between items-center mb-3">
          <div class="text-lg font-bold">Match Stats</div>
          <div class="text-sm opacity-50">Final Score</div>
        </div>
        
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <div class="text-2xl font-bold text-terminal-green">${this.gameResult.leftPlayer.score}</div>
            <div class="text-sm opacity-70">${this.gameResult.leftPlayer.nickname}</div>
          </div>
          <div class="flex items-center justify-center">
            <div class="text-terminal-gray">VS</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-terminal-green">${this.gameResult.rightPlayer.score}</div>
            <div class="text-sm opacity-70">${this.gameResult.rightPlayer.nickname}</div>
          </div>
        </div>
        
        <div class="border-t border-terminal-gray border-opacity-20 mt-4 pt-4">
          <div class="grid grid-cols-2 gap-4 text-center text-sm">
            <div>
              <div class="text-terminal-green font-bold">${this.gameResult.totalRounds}</div>
              <div class="opacity-70">Total Rounds</div>
            </div>
            <div>
              <div class="text-terminal-green font-bold">${this.gameResult.gameMode}</div>
              <div class="opacity-70">Game Mode</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="space-y-3">
        ${this.renderActionButtons()}
      </div>
    `;

    this.attachEventListeners();
  }

  private renderActionButtons(): string {
    let buttons = '';

    // Tournament specific buttons
    if (this.isTournament) {
      if (!this.isFinal && this.onNextMatch) {
        buttons += `
          <button 
            id="next-match-btn"
            class="w-full bg-terminal-green text-terminal-black py-3 rounded-lg font-medium hover:bg-opacity-80 transition-all"
          >
            Next Match
          </button>
        `;
      } else if (this.isFinal) {
        buttons += `
          <button 
            id="tournament-results-btn"
            class="w-full bg-terminal-green text-terminal-black py-3 rounded-lg font-medium hover:bg-opacity-80 transition-all"
          >
            View Tournament Results
          </button>
        `;
      }
    }

    // Common buttons
    buttons += `
      <button 
        id="profile-btn"
        class="w-full border border-terminal-gray text-terminal-green py-3 rounded-lg font-medium hover:bg-terminal-gray hover:bg-opacity-10 transition-all"
      >
        View Profile
      </button>
      <button 
        id="close-btn"
        class="w-full border border-terminal-gray text-terminal-gray py-3 rounded-lg font-medium hover:bg-terminal-gray hover:bg-opacity-10 transition-all"
      >
        Close
      </button>
    `;

    return buttons;
  }

  private attachEventListeners(): void {
    if (!this.contentElement) return;

    const nextMatchBtn = this.contentElement.querySelector('#next-match-btn') as HTMLButtonElement;
    const tournamentResultsBtn = this.contentElement.querySelector('#tournament-results-btn') as HTMLButtonElement;
    const profileBtn = this.contentElement.querySelector('#profile-btn') as HTMLButtonElement;
    const closeBtn = this.contentElement.querySelector('#close-btn') as HTMLButtonElement;

    // Next match button
    nextMatchBtn?.addEventListener('click', () => {
      if (this.onNextMatch) {
        this.close();
        this.onNextMatch();
      }
    });

    // Tournament results button
    tournamentResultsBtn?.addEventListener('click', () => {
      this.close();
      // TODO: Show tournament results
    });

    // Profile button
    profileBtn?.addEventListener('click', () => {
      this.close();
      this.onProfileClick();
    });

    // Close button
    closeBtn?.addEventListener('click', () => {
      this.close();
    });
  }
}
