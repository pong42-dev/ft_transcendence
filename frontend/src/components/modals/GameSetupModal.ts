/**
 * GameSetupModal - 통합된 BaseModal을 활용한 게임 설정 모달
 * 
 * 기존 GameSetupModal을 BaseModal 기반으로 리팩토링하여
 * ModalManager를 활용하는 일관된 모달 시스템으로 통합합니다.
 */

import { Friend, GameSetupResult } from '../../types/types.js';
import { BaseModal } from './BaseModal.js';

export class GameSetupModal extends BaseModal {
  private resolvePromise: ((value: GameSetupResult | null) => void) | null = null;
  private selectedOpponent: Friend | null = null;
  private isCancelled: boolean = false;

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

  protected onShow(): void {
    // 모달이 표시될 때 초기화
  }

  protected onClose(): void {
    // Promise 해결
    if (this.resolvePromise && !this.isCancelled) {
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
        <h3 class="text-terminal-green text-xl font-bold">Select Game Mode</h3>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
          ✕
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button data-mode="vs ai" class="rounded-lg border border-terminal-gray p-4 text-left transition-all hover:bg-terminal-gray hover:bg-opacity-10">
          <div class="text-lg font-bold mb-2">VS AI</div>
          <div class="text-sm opacity-70">Challenge AI opponent</div>
        </button>
        <button data-mode="local" class="rounded-lg border border-terminal-gray p-4 text-left transition-all hover:bg-terminal-gray hover:bg-opacity-10">
          <div class="text-lg font-bold mb-2">Local</div>
          <div class="text-sm opacity-70">Play with friends</div>
        </button>
        <button data-mode="remote" class="rounded-lg border border-terminal-gray p-4 text-left transition-all hover:bg-terminal-gray hover:bg-opacity-10">
          <div class="text-lg font-bold mb-2">Remote</div>
          <div class="text-sm opacity-70">Play online</div>
        </button>
      </div>
      <div class="flex justify-end gap-2 mt-6">
        <button id="cancel-btn" class="px-4 py-2 text-terminal-gray border border-terminal-gray rounded hover:bg-terminal-gray hover:bg-opacity-10 transition-all">
          Cancel
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
      case 'remote':
        this.renderFriendSelectionView();
        break;
      default:
        console.warn('Unknown game mode:', mode);
    }
  }

  private handleAIMode(): void {
    const result: GameSetupResult = {
      mode: 'vs ai',
      opponents: [] // AI 모드에서는 상대방이 없음
    };
    
    if (this.resolvePromise) {
      this.resolvePromise(result);
      this.resolvePromise = null;
      this.close();
    }
  }

  private handleLocalMode(): void {
    const result: GameSetupResult = {
      mode: 'local',
      opponents: [] // 로컬 모드에서는 상대방이 없음
    };
    
    if (this.resolvePromise) {
      this.resolvePromise(result);
      this.resolvePromise = null;
      this.close();
    }
  }

  private renderFriendSelectionView(): void {
    if (!this.contentElement) return;

    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">Select Opponent</h3>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
          ✕
        </button>
      </div>
      
      <div class="mb-4">
        <input 
          type="text" 
          id="friend-search" 
          placeholder="Search friends..."
          class="w-full px-4 py-2 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green focus:outline-none focus:border-terminal-green"
        />
      </div>
      
      <div class="max-h-[300px] overflow-y-auto mb-6">
        <div id="friends-list" class="space-y-2">
          <!-- Friends will be populated here -->
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
          <button id="invite-btn" class="px-4 py-2 bg-terminal-green text-terminal-black rounded hover:bg-opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled>
            Send Invite
          </button>
        </div>
      </div>
    `;

    this.loadFriendsList();
    this.attachFriendSelectionEventListeners();
  }

  private loadFriendsList(): void {
    // Mock friends data - 실제로는 API에서 가져와야 함
    const mockFriends: Friend[] = [
      { id: 1, username: 'alice_dev', nickname: 'Alice', status: 'online', blocked: false },
      { id: 2, username: 'bob_coder', nickname: 'Bob', status: 'offline', blocked: false },
      { id: 3, username: 'charlie_game', nickname: 'Charlie', status: 'online', blocked: false },
    ];

    this.renderFriendsList(mockFriends);
  }

  private renderFriendsList(friends: Friend[]): void {
    if (!this.contentElement) return;

    const friendsList = this.contentElement.querySelector('#friends-list');
    if (!friendsList) return;

    if (friends.length === 0) {
      friendsList.innerHTML = `
        <div class="text-center text-terminal-gray py-8">
          <p>No friends found</p>
        </div>
      `;
      return;
    }

    friendsList.innerHTML = friends.map(friend => `
      <div class="friend-item flex items-center justify-between p-3 border border-terminal-gray rounded-lg hover:bg-terminal-gray hover:bg-opacity-10 transition-all cursor-pointer" data-friend-id="${friend.id}">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-terminal-green bg-opacity-20 rounded-full flex items-center justify-center">
            <span class="text-terminal-green font-bold">${friend.username.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <div class="font-medium">${friend.username}</div>
            <div class="text-sm text-terminal-gray">${friend.status === 'online' ? 'Online' : 'Offline'}</div>
          </div>
        </div>
        <div class="text-terminal-green opacity-0 friend-check">✓</div>
      </div>
    `).join('');

    // Add click listeners to friend items
    const friendItems = friendsList.querySelectorAll('.friend-item');
    friendItems.forEach(item => {
      item.addEventListener('click', () => {
        const friendId = item.getAttribute('data-friend-id');
        const friend = friends.find(f => f.id?.toString() === friendId);
        if (friend) {
          this.selectFriend(friend, item as HTMLElement);
        }
      });
    });
  }

  private selectFriend(friend: Friend, element: HTMLElement): void {
    // Clear previous selections
    const allChecks = this.contentElement?.querySelectorAll('.friend-check');
    allChecks?.forEach(check => {
      (check as HTMLElement).style.opacity = '0';
    });

    const allItems = this.contentElement?.querySelectorAll('.friend-item');
    allItems?.forEach(item => {
      item.classList.remove('border-terminal-green');
      item.classList.add('border-terminal-gray');
    });

    // Select current friend
    this.selectedOpponent = friend;
    element.classList.remove('border-terminal-gray');
    element.classList.add('border-terminal-green');
    
    const check = element.querySelector('.friend-check') as HTMLElement;
    if (check) {
      check.style.opacity = '1';
    }

    // Enable invite button
    const inviteBtn = this.contentElement?.querySelector('#invite-btn') as HTMLButtonElement;
    if (inviteBtn) {
      inviteBtn.disabled = false;
    }
  }

  private attachFriendSelectionEventListeners(): void {
    if (!this.contentElement) return;

    const searchInput = this.contentElement.querySelector('#friend-search') as HTMLInputElement;
    const backBtn = this.contentElement.querySelector('#back-btn') as HTMLButtonElement;
    const cancelBtn = this.contentElement.querySelector('#cancel-btn') as HTMLButtonElement;
    const inviteBtn = this.contentElement.querySelector('#invite-btn') as HTMLButtonElement;
    const closeBtn = this.contentElement.querySelector('#close-btn') as HTMLButtonElement;

    // Search functionality
    searchInput?.addEventListener('input', () => {
      // TODO: Implement friend search
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

    // Invite button
    inviteBtn?.addEventListener('click', () => {
      if (this.selectedOpponent) {
        this.sendGameInvite();
      }
    });
  }

  private sendGameInvite(): void {
    if (!this.selectedOpponent) return;

    const result: GameSetupResult = {
      mode: 'remote',
      opponents: [this.selectedOpponent]
    };

    if (this.resolvePromise) {
      this.resolvePromise(result);
      this.resolvePromise = null;
      this.close();
    }
  }
}
