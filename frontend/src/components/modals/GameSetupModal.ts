/**
 * GameSetupModal - 통합된 BaseModal을 활용한 게임 설정 모달
 * 
 * 기존 GameSetupModal을 BaseModal 기반으로 리팩토링하여
 * ModalManager를 활용하는 일관된 모달 시스템으로 통합합니다.
 */

import { GameSetupResult } from '../../types/types.js';
import { BaseModal } from './BaseModal.js';
import i18n from '../../services/i18n';

export class GameSetupModal extends BaseModal {
  private resolvePromise: ((value: GameSetupResult | null) => void) | null = null;
  private isCancelled: boolean = false;
  private selectedMode: string = '';
  private countdownInterval: number | null = null;

  constructor() {
    super();
  }

  public open(): Promise<GameSetupResult | null> {
    this.isCancelled = false;
    this.show();
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  public close(): void {
    // Promise가 아직 해결되지 않았다면 취소로 처리
    if (this.resolvePromise) {
      this.isCancelled = true;
    }
    super.close();
  }

  protected onShow(): void {
    // 모달이 표시될 때 초기화
  }

  protected onClose(): void {
    // 카운트다운 타이머 정리
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    
    // Promise 해결 - 취소된 경우에만 null 반환
    if (this.resolvePromise && this.isCancelled) {
      this.resolvePromise(null);
      this.resolvePromise = null;
    }
  }

  protected canCloseOnOutsideClick(): boolean {
    return true;
  }

  protected render(): void {
    if (!this.contentElement) return;
    
    this.renderModeSelectionView();
  }

  private renderModeSelectionView(): void {
    if (!this.contentElement) return;

    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">${i18n.t('gameSetupModal.select_game_mode')}</h3>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
          ✕
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button data-mode="vs ai" class="rounded-lg border border-terminal-gray p-4 text-left transition-all hover:bg-terminal-gray hover:bg-opacity-10">
          <div class="text-lg font-bold mb-2">${i18n.t('gameSetupModal.vs_ai')}</div>
          <div class="text-sm opacity-70">${i18n.t('gameSetupModal.challenge_ai_opponent')}</div>
        </button>
        <button data-mode="local" class="rounded-lg border border-terminal-gray p-4 text-left transition-all hover:bg-terminal-gray hover:bg-opacity-10">
          <div class="text-lg font-bold mb-2">${i18n.t('gameSetupModal.local')}</div>
          <div class="text-sm opacity-70">${i18n.t('gameSetupModal.play_with_a guest')}</div>
        </button>
        <button data-mode="tournament" class="rounded-lg border border-terminal-gray p-4 text-left transition-all hover:bg-terminal-gray hover:bg-opacity-10">
          <div class="text-lg font-bold mb-2">${i18n.t('gameSetupModal.tournament')}</div>
          <div class="text-sm opacity-70">${i18n.t('gameSetupModal.play_tournament_with_3_guests')}</div>
        </button>
      </div>
      <div class="flex justify-end gap-2 mt-6">
        <button id="cancel-btn" class="px-4 py-2 text-terminal-gray border border-terminal-gray rounded hover:bg-terminal-gray hover:bg-opacity-10 transition-all">
          ${i18n.t('common.cancel')}
        </button>
      </div>
    `;

    this.attachModeSelectionEventListeners();
  }

  private attachModeSelectionEventListeners(): void {
    if (!this.contentElement) return;

    const modeButtons = this.contentElement.querySelectorAll('[data-mode]');
    const cancelBtn = this.contentElement.querySelector('#cancel-btn') as HTMLButtonElement;
    const closeBtn = this.contentElement.querySelector('#close-btn') as HTMLButtonElement;

    // Mode selection
    modeButtons.forEach(button => {
      button.addEventListener('click', () => {
        const mode = button.getAttribute('data-mode') || '';
        this.handleModeSelection(mode);
      });
    });

    // Cancel button
    cancelBtn?.addEventListener('click', () => {
      this.isCancelled = true;
      this.close();
    });

    // Close button
    closeBtn?.addEventListener('click', () => {
      this.isCancelled = true;
      this.close();
    });
  }

  private handleModeSelection(mode: string): void {
    switch (mode) {
      case 'vs ai':
        this.handleAIMode();
        break;
      case 'local':
        this.handleLocalMode();
        break;
      case 'tournament':
        this.handleTournamentMode();
        break;
      default:
        console.warn('Unknown game mode:', mode);
    }
  }

  private handleAIMode(): void {
    this.selectedMode = 'vs ai';
    
    // AI 모드 게임 설정 결과를 반환
    const result: GameSetupResult = {
      mode: 'vs ai',
      opponents: ['AI']
    };

    if (this.resolvePromise) {
      this.resolvePromise(result);
      this.resolvePromise = null;
    }
    
    this.close();
  }

  private handleLocalMode(): void {
    this.selectedMode = 'local';
    this.renderGuestInputView(1);
  }

  private handleTournamentMode(): void {
    this.selectedMode = 'tournament';
    this.renderGuestInputView(3);
  }

  private renderGuestInputView(playerCount: number = 1): void {
    if (!this.contentElement) return;

    const isMultiplePlayers = playerCount > 1;
    const title = isMultiplePlayers ? 
      `Enter ${playerCount} Guest Player Names` : 
      'Enter Guest Player Name';

    let inputFields = '';
    for (let i = 0; i < playerCount; i++) {
      const playerNumber = playerCount > 1 ? ` ${i + 1}` : '';
      inputFields += `
        <div class="mb-4">
          <label class="block text-terminal-gray text-sm font-medium mb-2">
            Guest Player${playerNumber} Nickname
          </label>
          <input 
            type="text" 
            id="guest-name-input-${i}" 
            placeholder="Enter guest player${playerNumber} name..."
            class="w-full px-4 py-3 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green focus:outline-none focus:border-terminal-green"
            maxlength="20"
            autocomplete="off"
          />
        </div>
      `;
    }

    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">${title}</h3>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
          ✕
        </button>
      </div>
      
      <div class="mb-6">
        ${inputFields}
        <div class="text-xs text-terminal-gray mt-1">
          Enter ${isMultiplePlayers ? 'nicknames' : 'a nickname'} for the guest player${isMultiplePlayers ? 's' : ''} (max 20 characters each)
        </div>
      </div>
      
      <div class="flex justify-between gap-2">
        <button id="back-btn" class="px-4 py-2 text-terminal-gray border border-terminal-gray rounded hover:bg-terminal-gray hover:bg-opacity-10 transition-all">
          Back
        </button>
        <div class="flex gap-2">
          <button id="cancel-btn" class="px-4 py-2 text-terminal-gray border border-terminal-gray rounded hover:bg-terminal-gray hover:bg-opacity-10 transition-all">
            Cancel
          </button>
          <button id="start-game-btn" class="px-4 py-2 bg-terminal-green text-terminal-black rounded hover:bg-opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled>
            Start Game
          </button>
        </div>
      </div>
    `;

    this.attachGuestInputEventListeners(playerCount);
  }

  private attachGuestInputEventListeners(playerCount: number = 1): void {
    if (!this.contentElement) return;

    const backBtn = this.contentElement.querySelector('#back-btn') as HTMLButtonElement;
    const cancelBtn = this.contentElement.querySelector('#cancel-btn') as HTMLButtonElement;
    const startGameBtn = this.contentElement.querySelector('#start-game-btn') as HTMLButtonElement;
    const closeBtn = this.contentElement.querySelector('#close-btn') as HTMLButtonElement;

    // Get all input elements
    const guestNameInputs: HTMLInputElement[] = [];
    for (let i = 0; i < playerCount; i++) {
      const input = this.contentElement.querySelector(`#guest-name-input-${i}`) as HTMLInputElement;
      if (input) {
        guestNameInputs.push(input);
      }
    }

    // Input validation function
    const validateInputs = () => {
      const allValid = guestNameInputs.every(input => input.value.trim().length > 0);
      if (startGameBtn) {
        startGameBtn.disabled = !allValid;
      }
    };

    // Add input validation to all inputs
    guestNameInputs.forEach(input => {
      input.addEventListener('input', validateInputs);
    });

    // Back button
    backBtn?.addEventListener('click', () => {
      this.renderModeSelectionView();
    });

    // Cancel button
    cancelBtn?.addEventListener('click', () => {
      this.isCancelled = true;
      this.close();
    });

    // Close button
    closeBtn?.addEventListener('click', () => {
      this.isCancelled = true;
      this.close();
    });

    // Start game button
    startGameBtn?.addEventListener('click', () => {
      const guestNames = guestNameInputs
        .map(input => input.value.trim())
        .filter(name => name.length > 0);

      if (guestNames.length === playerCount) {
        // Create game setup result
        const result: GameSetupResult = {
          mode: this.selectedMode,
          opponents: guestNames
        };

        if (this.resolvePromise) {
          this.resolvePromise(result);
          this.resolvePromise = null;
        }
        
        this.close();
      }
    });

    // Enter key support for all inputs
    guestNameInputs.forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !startGameBtn.disabled) {
          startGameBtn.click();
        }
      });
    });

    // Focus on first input
    if (guestNameInputs.length > 0) {
      guestNameInputs[0].focus();
    }
  }

}
