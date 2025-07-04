/**
 * GameEndModal - ModalManager를 직접 활용한 게임 종료 모달
 * 
 * BaseModal을 제거하고 ModalManager를 직접 사용하여
 * 더 효율적이고 일관된 모달 시스템을 구현합니다.
 */

import { GameResult, GameMode } from '../../types/types.js';
import { ModalManager, ModalContent } from '../../managers/ModalManager.js';
import i18n from '../../services/i18n';

export class GameEndModal {
  private modalManager: ModalManager;
  private onProfileClick: () => void;
  private onNextMatch?: () => void;
  private isTournament: boolean;
  private isFinal: boolean;
  private gameResult: GameResult;
  private gameMode?: GameMode;
  private onGameFinish?: () => void;
  private contentElement: HTMLElement | null = null;

  constructor(
    gameResult: GameResult, 
    isTournament: boolean, 
    isFinal: boolean, 
    onProfileClick: () => void, 
    onNextMatch?: () => void,
    onGameFinish?: () => void,
    gameMode?: GameMode
  ) {
    this.modalManager = ModalManager.getInstance();
    this.gameResult = gameResult;
    this.onProfileClick = onProfileClick;
    this.onNextMatch = onNextMatch;
    this.isTournament = isTournament;
    this.isFinal = isFinal;
    this.gameMode = gameMode;
    this.onGameFinish = onGameFinish;
  }

  public show(): void {
    const modalContent: ModalContent = {
      title: 'Game Result',
      content: () => {
        this.contentElement = document.createElement('div');
        this.contentElement.className = 'modal-body';
        this.render();
        return this.contentElement;
      },
      onShow: () => this.onShow(),
      onClose: () => this.onClose(),
      config: {
        closable: false,
        closeOnOutsideClick: false,
        sizeClass: 'max-w-[500px] w-[95%]'
      }
    };

    this.modalManager.show(modalContent);
  }

  public close(): void {
    this.modalManager.hide();
  }

  private onShow(): void {
    // 모달이 표시될 때 초기화
  }

  private onClose(): void {
    // 정리 작업만 수행, 자동 콜백 호출하지 않음
  }

  private render(): void {
    if (!this.contentElement) return;
    
    // Determine if current user won (assuming right player is the user in most cases)
    const userWon = this.gameResult.winner === 'right';
    const winnerName = this.gameResult.winner === 'left' ? this.gameResult.leftPlayer.nickname : this.gameResult.rightPlayer.nickname;
    
    // AI 모드인지 확인
    const isAIMode = this.gameMode === 'ai_1v1';
    
    let titleText: string;
    let subtitleText: string;
    let iconEmoji: string;
    
    if (isAIMode) {
      // AI 모드일 때
      if (userWon) {
        // 유저가 이겼을 때
        titleText = 'Victory!';
        subtitleText = 'Congratulations!';
        iconEmoji = '🏆';
      } else {
        // AI가 이겼을 때
        titleText = 'Good Game!';
        subtitleText = 'AI won the game';
        iconEmoji = '🤖';
      }
    } else {
      // 로컬/게스트 모드일 때
      titleText = `${winnerName} Wins!`;
      subtitleText = 'Congratulations!';
      iconEmoji = '🏆';
    }
    
    this.contentElement.innerHTML = `
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-terminal-gray bg-opacity-10 mb-3">
          <div class="text-3xl">${iconEmoji}</div>
        </div>
        <h3 class="text-terminal-green text-2xl font-bold mb-1">${i18n.t(`gameEndModal.${titleText}`)}</h3>
        <div class="text-sm opacity-70">${i18n.t(`gameEndModal.${subtitleText}`)}</div>
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
