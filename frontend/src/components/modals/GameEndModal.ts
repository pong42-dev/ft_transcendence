/**
 * GameEndModal - 통합된 BaseModal을 활용한 게임 종료 모달
 * 
 * 게임 결과를 표시하고 다음 액션을 선택할 수 있는 모달입니다.
 */

import { GameResult } from '../../types/types.js';
import { BaseModal } from './BaseModal.js';
import i18n from '../../services/i18n';

export class GameEndModal extends BaseModal {
  private onProfileClick: () => void;
  private onNextMatch?: () => void;
  private isTournament: boolean;
  private isFinal: boolean;
  private gameResult: GameResult;
  private onGameFinish?: () => void;

  constructor(
    gameResult: GameResult, 
    isTournament: boolean, 
    isFinal: boolean, 
    onProfileClick: () => void, 
    onNextMatch?: () => void,
    onGameFinish?: () => void
  ) {
    super();
    this.gameResult = gameResult;
    this.onProfileClick = onProfileClick;
    this.onNextMatch = onNextMatch;
    this.isTournament = isTournament;
    this.isFinal = isFinal;
    this.onGameFinish = onGameFinish;
  }

  protected onShow(): void {
    // 모달이 표시될 때 초기화
  }

  protected onClose(): void {
    // 정리 작업만 수행, 자동 콜백 호출하지 않음
  }

  protected canCloseOnOutsideClick(): boolean {
    return false; // 중요한 결과이므로 외부 클릭으로 닫지 않음
  }

  protected canClose(): boolean {
    return false; // ESC 키로도 닫지 않음
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
        <h3 class="text-terminal-green text-2xl font-bold mb-1">${userWon ? i18n.t('gameEndModal.victory') : i18n.t('gameEndModal.good_game')}</h3>
        <div class="text-sm opacity-70">${userWon ? i18n.t('gameEndModal.congratulations') : i18n.t('gameEndModal.winner_announcement', { winnerName })}</div>
      </div>
      
      <div class="bg-terminal-gray bg-opacity-5 rounded-lg p-4 mb-6">
        <div class="flex justify-between items-center mb-3">
          <div class="text-lg font-bold">${i18n.t('gameEndModal.match_stats')}</div>
          <div class="text-sm opacity-50">${i18n.t('gameEndModal.final_score')}</div>
        </div>
        
        <div class="flex justify-between items-center mb-4">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg ${this.gameResult.winner === 'left' ? 'bg-terminal-green bg-opacity-20' : 'bg-terminal-gray bg-opacity-20'} flex items-center justify-center font-bold text-sm">
              ${this.gameResult.leftPlayer.nickname ? this.gameResult.leftPlayer.nickname.substring(0, 2) : 'L'}
            </div>
            <div class="text-xl font-bold">${this.gameResult.leftPlayer.score}</div>
          </div>
          <div class="text-xs opacity-50">${i18n.t('common.vs')}</div>
          <div class="flex items-center gap-2">
            <div class="text-xl font-bold">${this.gameResult.rightPlayer.score}</div>
            <div class="w-8 h-8 rounded-lg ${this.gameResult.winner === 'right' ? 'bg-terminal-green bg-opacity-20' : 'bg-terminal-red bg-opacity-20'} flex items-center justify-center font-bold text-sm">
              ${this.gameResult.rightPlayer.nickname ? this.gameResult.rightPlayer.nickname.substring(0, 2) : 'R'}
            </div>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-3 text-center">
          <div class="bg-terminal-gray bg-opacity-10 rounded-lg p-2">
            <div class="text-xl font-bold mb-1">${this.gameResult.totalRounds}</div>
            <div class="text-xs opacity-50">${i18n.t('gameEndModal.total_rounds')}</div>
          </div>
          <div class="bg-terminal-gray bg-opacity-10 rounded-lg p-2">
            <div class="text-xl font-bold mb-1">${this.gameResult.gameMode.toUpperCase()}</div>
            <div class="text-xs opacity-50">${i18n.t('gameEndModal.game_mode')}</div>
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
            ${i18n.t('gameEndModal.next_match')}
          </button>
        `;
      } else if (this.isFinal) {
        buttons += `
          <button 
            id="tournament-results-btn"
            class="w-full bg-terminal-green text-terminal-black py-3 rounded-lg font-medium hover:bg-opacity-80 transition-all"
          >
            ${i18n.t('gameEndModal.view_tournament_results')}
          </button>
        `;
      }
    }

    // Common buttons - Back to Profile을 메인 버튼으로
    buttons += `
      <button 
        id="profile-btn"
        class="w-full bg-terminal-green text-terminal-black py-3 rounded-lg font-medium hover:bg-opacity-80 transition-all"
      >
        ${i18n.t('gameEndModal.view_profile')}
      </button>
      <button 
        id="close-btn"
        class="w-full border border-terminal-gray text-terminal-gray py-3 rounded-lg font-medium hover:bg-terminal-gray hover:bg-opacity-10 transition-all"
      >
        ${i18n.t('common.close')}
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
      if (this.onGameFinish) {
        this.onGameFinish();
      }
    });
  }
}
