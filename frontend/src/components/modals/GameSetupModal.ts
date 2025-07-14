/**
 * GameSetupModal - ModalManager를 직접 활용한 게임 설정 모달
 * 
 * BaseModal을 제거하고 ModalManager를 직접 사용하여
 * 더 효율적이고 일관된 모달 시스템을 구현합니다.
 */

import { GameSetupResult } from '../../types/types.js';
import { ModalManager, ModalContent } from '../../managers/ModalManager.js';
import i18n from '../../services/i18n.js';
import { validateNickname } from '../../utils/validators.js';

export class GameSetupModal {
  private modalManager: ModalManager;
  private resolvePromise: ((value: GameSetupResult | null) => void) | null = null;
  private isCancelled: boolean = false;
  private selectedMode: string = '';
  private countdownInterval: number | null = null;
  private contentElement: HTMLElement | null = null;
  // AI 설정 추가
  private aiDifficulty: 'easy' | 'medium' | 'hard' = 'medium';

  constructor() {
    this.modalManager = ModalManager.getInstance();
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
    this.hide();
  }

  private show(): void {
    const modalContent: ModalContent = {
      title: i18n.t('gameSetupModal.select_game_mode'),
      content: () => {
        this.contentElement = document.createElement('div');
        this.contentElement.className = 'modal-body';
        this.renderModeSelectionView();
        return this.contentElement;
      },
      onShow: () => this.onShow(),
      onClose: () => this.onClose(),
      config: {
        closable: true,
        closeOnOutsideClick: true,
        sizeClass: 'max-w-[600px] w-[95%]'
      }
    };

    this.modalManager.show(modalContent);
  }

  private hide(): void {
    this.modalManager.hide();
  }

  private onShow(): void {
    // 모달이 표시될 때 초기화
  }

  private onClose(): void {
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

  private renderModeSelectionView(): void {
    if (!this.contentElement) return;

    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button data-mode="vs ai" class="rounded-lg border border-terminal-gray p-4 text-left transition-all hover:bg-terminal-gray hover:bg-opacity-10">
          <div class="text-lg font-bold mb-2">${i18n.t('gameSetupModal.vs_ai')}</div>
          <div class="text-sm opacity-70">${i18n.t('gameSetupModal.challenge_ai_opponent')}</div>
        </button>
        <button data-mode="local" class="rounded-lg border border-terminal-gray p-4 text-left transition-all hover:bg-terminal-gray hover:bg-opacity-10">
          <div class="text-lg font-bold mb-2">${i18n.t('gameSetupModal.local')}</div>
          <div class="text-sm opacity-70">${i18n.t('gameSetupModal.play_with_a_guest')}</div>
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
    this.renderAISettingsView();
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
      i18n.t('gameSetupModal.enter_guest_names', { count: playerCount }) : 
      i18n.t('gameSetupModal.enter_guest_name');

    let inputFields = '';
    for (let i = 0; i < playerCount; i++) {
      const playerNumber = playerCount > 1 ? ` ${i + 1}` : '';
      inputFields += `
        <div class="mb-4">
          <label class="block text-terminal-gray text-sm font-medium mb-2">
            ${i18n.t('gameSetupModal.guest_player_nickname', { number: playerNumber })}
          </label>
          <input 
            type="text" 
            id="guest-name-input-${i}" 
            placeholder="${i18n.t('gameSetupModal.enter_guest_player_name_placeholder', { number: playerNumber })}"
            class="w-full px-4 py-3 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green focus:outline-none focus:border-terminal-green"
            maxlength="16"
            autocomplete="off"
          />
          <div class="text-xs text-terminal-red mt-1 hidden" id="guest-nickname-${i}-error"></div>
        </div>
      `;
    }

    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">${title}</h3>
      </div>
      
      <div class="mb-6">
        ${inputFields}
        <div class="text-xs text-terminal-gray mt-1">
          ${isMultiplePlayers ? i18n.t('gameSetupModal.enter_nicknames_hint') : i18n.t('gameSetupModal.enter_nickname_hint')}
        </div>
      </div>
      
      <div class="flex justify-end gap-2">
        <button id="cancel-btn" class="px-4 py-2 text-terminal-gray border border-terminal-gray rounded hover:bg-terminal-gray hover:bg-opacity-10 transition-all">
          ${i18n.t('common.cancel')}
        </button>
        <button id="start-game-btn" class="px-4 py-2 bg-terminal-green text-terminal-black rounded hover:bg-opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled>
          ${i18n.t('gameSetupModal.start_game')}
        </button>
      </div>
    `;

    this.attachGuestInputEventListeners(playerCount);
  }

  private attachGuestInputEventListeners(playerCount: number = 1): void {
    if (!this.contentElement) return;

    const cancelBtn = this.contentElement.querySelector('#cancel-btn') as HTMLButtonElement;
    const startGameBtn = this.contentElement.querySelector('#start-game-btn') as HTMLButtonElement;

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
      let allValid = true;
      guestNameInputs.forEach((input, idx) => {
        const nickname = input.value.trim();
        const result = validateNickname(nickname);
        const errorDiv = this.contentElement?.querySelector(`#guest-nickname-${idx}-error`) as HTMLElement;
        if (nickname && !result.isValid) {
          errorDiv.textContent = i18n.t(result.error || 'validation.invalid_nickname_format');
          errorDiv.classList.remove('hidden');
          input.classList.add('border-terminal-red');
          input.classList.remove('border-terminal-gray');
          allValid = false;
        } else {
          errorDiv.classList.add('hidden');
          input.classList.remove('border-terminal-red');
          input.classList.add('border-terminal-gray');
          if (!nickname) allValid = false;
        }
      });
      if (startGameBtn) {
        startGameBtn.disabled = !allValid;
      }
    };

    // Add input validation to all inputs
    guestNameInputs.forEach(input => {
      input.addEventListener('input', validateInputs);
      input.addEventListener('blur', validateInputs);
    });

    // Cancel button
    cancelBtn?.addEventListener('click', () => {
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

  private renderAISettingsView(): void {
    if (!this.contentElement) return;

    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">${i18n.t('gameSetupModal.ai_difficulty_title')}</h3>
      </div>
      
      <div class="space-y-4">
        <!-- Difficulty Selection -->
        <div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label class="difficulty-label p-4 rounded-lg border border-terminal-gray cursor-pointer hover:bg-terminal-gray hover:bg-opacity-10 transition-all text-center">
              <input type="radio" name="difficulty" value="easy" class="sr-only">
              <div>
                <div class="text-terminal-green font-medium text-lg"></div>
                <div class="font-bold mt-2">${i18n.t('gameSetupModal.easy')}</div>
              </div>
            </label>
            <label class="difficulty-label p-4 rounded-lg border border-terminal-gray cursor-pointer hover:bg-terminal-gray hover:bg-opacity-10 transition-all text-center">
              <input type="radio" name="difficulty" value="medium" class="sr-only" checked>
              <div>
                <div class="text-terminal-green font-medium text-lg"></div>
                <div class="font-bold mt-2">${i18n.t('gameSetupModal.medium')}</div>
              </div>
            </label>
            <label class="difficulty-label p-4 rounded-lg border border-terminal-gray cursor-pointer hover:bg-terminal-gray hover:bg-opacity-10 transition-all text-center">
              <input type="radio" name="difficulty" value="hard" class="sr-only">
              <div>
                <div class="text-terminal-green font-medium text-lg"></div>
                <div class="font-bold mt-2">${i18n.t('gameSetupModal.hard')}</div>
              </div>
            </label>
          </div>
        </div>
      </div>
      
      <div class="flex justify-end gap-2 mt-6">
        <button id="cancel-btn" class="px-4 py-2 text-terminal-gray border border-terminal-gray rounded hover:bg-terminal-gray hover:bg-opacity-10 transition-all">
          ${i18n.t('common.cancel')}
        </button>
        <button id="start-ai-game-btn" class="px-4 py-2 bg-terminal-green text-terminal-black rounded hover:bg-opacity-80 transition-all">
          ${i18n.t('gameSetupModal.start_game')}
        </button>
      </div>
    `;

    this.attachAISettingsEventListeners();
  }

  private attachAISettingsEventListeners(): void {
    if (!this.contentElement) return;

    const cancelBtn = this.contentElement.querySelector('#cancel-btn') as HTMLButtonElement;
    const startAIGameBtn = this.contentElement.querySelector('#start-ai-game-btn') as HTMLButtonElement;
    const difficultyLabels = this.contentElement.querySelectorAll('.difficulty-label');

    const updateSelectedStyle = () => {
      difficultyLabels.forEach(label => {
        const radio = label.querySelector('input[type="radio"]') as HTMLInputElement;
        if (radio.checked) {
          label.classList.add('border-terminal-green', 'bg-terminal-green', 'bg-opacity-20');
          label.classList.remove('border-terminal-gray');
        } else {
          label.classList.remove('border-terminal-green', 'bg-terminal-green', 'bg-opacity-20');
          label.classList.add('border-terminal-gray');
        }
      });
    };

    difficultyLabels.forEach(label => {
      label.addEventListener('click', () => {
        const radio = label.querySelector('input[type="radio"]') as HTMLInputElement;
        radio.checked = true;
        updateSelectedStyle();
      });
    });

    // Initial style update
    updateSelectedStyle();

    // Cancel button
    cancelBtn?.addEventListener('click', () => {
      this.isCancelled = true;
      this.close();
    });

    // Start AI game button
    startAIGameBtn?.addEventListener('click', () => {
      // Get selected difficulty
      const difficultyInput = this.contentElement?.querySelector('input[name="difficulty"]:checked') as HTMLInputElement;
      
      this.aiDifficulty = (difficultyInput?.value as 'easy' | 'medium' | 'hard') || 'medium';

      // Create game setup result with AI settings
      const result: GameSetupResult = {
        mode: 'vs ai',
        opponents: ['AI'],
        aiSettings: {
          difficulty: this.aiDifficulty
        }
      };

      if (this.resolvePromise) {
        this.resolvePromise(result);
        this.resolvePromise = null;
      }
      
      this.close();
    });
  }





}
