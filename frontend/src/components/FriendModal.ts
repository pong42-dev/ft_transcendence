import { ApiClient, ApiError } from '../services/ApiClient.js';
import { Friend } from '../types/types.js';
import { BaseModal } from './BaseModal.js';

export class FriendModal extends BaseModal {
  private apiClient: ApiClient;
  private friends: Array<Friend & { user_id: number }> = [];
  private currentView: 'list' | 'add' | 'profile' = 'list'; // Used in render methods
  private selectedFriendId: number | null = null;

  constructor(apiClient: ApiClient) {
    super();
    this.apiClient = apiClient;
  }

  public async open(): Promise<void> {
    await this.loadFriends();
    this.show();
  }

  protected setupModal(): void {
    super.setupModal();
    this.contentElement.className =
      'bg-terminal-black border border-terminal-gray p-6 rounded-lg w-[600px] max-w-[95%] max-h-[80vh] overflow-y-auto flex flex-col';
  }

  protected onShow(): void {
    this.renderListView();
  }

  protected onClose(): void {
    // 특별한 정리 작업 없음
  }

  protected render(): void {
    this.renderListView();
  }

  private async loadFriends(): Promise<void> {
    try {
      this.friends = await this.apiClient.friend.getFriends();
    } catch (error) {
      this.handleError(error as Error, 'Failed to load friends list');
      this.friends = [];
    }
  }

  private renderListView(): void {
    this.currentView = 'list';
    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">Friends</h3>
        <button class="px-3 py-1 border border-terminal-green text-terminal-green rounded hover:bg-terminal-green hover:bg-opacity-10 transition-all" id="add-friend-btn">
          Add Friend
        </button>
      </div>
      
      <div class="flex-grow overflow-y-auto mb-4">
        ${this.friends.length === 0 ? this.getEmptyStateHTML() : this.getFriendsListHTML()}
      </div>
      
      <div class="flex justify-end">
        <button class="px-4 py-2 border border-terminal-gray text-terminal-gray rounded hover:bg-terminal-gray hover:bg-opacity-10 transition-all" id="close-btn">
          Close
        </button>
      </div>
    `;

    this.attachListViewEventListeners();
  }

  private renderAddView(): void {
    this.currentView = 'add';
    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">Add Friend</h3>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="back-btn">
          ← Back
        </button>
      </div>
      
      <div class="mb-6">
        <label class="block text-sm font-medium mb-2 text-terminal-green">Username</label>
        <div class="flex gap-2">
          <input 
            type="text" 
            id="username-input" 
            class="flex-grow px-3 py-2 bg-terminal-black border border-terminal-gray rounded text-terminal-green focus:outline-none focus:border-terminal-green"
            placeholder="Enter username to follow..."
            autocomplete="off"
          />
          <button class="px-4 py-2 bg-terminal-green text-terminal-black rounded hover:bg-opacity-80 transition-all" id="add-btn">
            Follow
          </button>
        </div>
        <div class="mt-2 text-sm text-terminal-gray opacity-70">
          Enter the exact username of the person you want to follow.
        </div>
      </div>
      
      <div id="add-result" class="mb-4 hidden"></div>
      
      <div class="flex justify-end">
        <button class="px-4 py-2 border border-terminal-gray text-terminal-gray rounded hover:bg-terminal-gray hover:bg-opacity-10 transition-all" id="close-btn">
          Close
        </button>
      </div>
    `;

    this.attachAddViewEventListeners();
  }

  private async renderProfileView(friendId: number): Promise<void> {
    this.currentView = 'profile';
    this.selectedFriendId = friendId;
    
    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">Friend Profile</h3>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="back-btn">
          ← Back
        </button>
      </div>
      
      <div class="flex items-center justify-center mb-4">
        <div class="text-terminal-green">Loading...</div>
      </div>
    `;

    try {
      const profile = await this.apiClient.friend.getFriendProfile(friendId);
      this.contentElement.innerHTML = `
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-terminal-green text-xl font-bold">Friend Profile</h3>
          <button class="text-terminal-gray hover:text-terminal-green transition-all" id="back-btn">
            ← Back
          </button>
        </div>
        
        <div class="border border-terminal-gray rounded-lg p-4 mb-6">
          <div class="flex items-center mb-4">
            ${profile.avatarUrl ? 
              `<img src="${profile.avatarUrl}" alt="Avatar" class="w-16 h-16 rounded-full mr-4 border border-terminal-gray">` :
              `<div class="w-16 h-16 rounded-full mr-4 border border-terminal-gray bg-terminal-gray bg-opacity-20 flex items-center justify-center text-terminal-gray text-2xl">${(profile.nickname || profile.username).charAt(0).toUpperCase()}</div>`
            }
            <div>
              <h4 class="text-lg font-bold text-terminal-green">${profile.nickname || profile.username}</h4>
              <div class="text-sm text-terminal-gray">@${profile.username}</div>
              <div class="text-sm text-terminal-gray">Games: ${profile.gamesWon}/${profile.gamesPlayed}</div>
            </div>
          </div>
        </div>
        
        <div class="flex justify-between">
          <button class="px-4 py-2 border border-terminal-red text-terminal-red rounded hover:bg-terminal-red hover:bg-opacity-10 transition-all" id="unfollow-btn">
            Unfollow
          </button>
          <button class="px-4 py-2 border border-terminal-gray text-terminal-gray rounded hover:bg-terminal-gray hover:bg-opacity-10 transition-all" id="close-btn">
            Close
          </button>
        </div>
      `;
    } catch (error) {
      this.contentElement.innerHTML = `
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-terminal-green text-xl font-bold">Friend Profile</h3>
          <button class="text-terminal-gray hover:text-terminal-green transition-all" id="back-btn">
            ← Back
          </button>
        </div>
        
        <div class="text-center mb-6">
          <div class="text-terminal-red">Failed to load friend profile</div>
        </div>
        
        <div class="flex justify-end">
          <button class="px-4 py-2 border border-terminal-gray text-terminal-gray rounded hover:bg-terminal-gray hover:bg-opacity-10 transition-all" id="close-btn">
            Close
          </button>
        </div>
      `;
    }

    this.attachProfileViewEventListeners();
  }

  private getEmptyStateHTML(): string {
    return `
      <div class="text-center py-8">
        <div class="text-terminal-gray text-lg mb-2">No friends yet</div>
        <div class="text-terminal-gray text-sm opacity-70">Start following people to see them here!</div>
      </div>
    `;
  }

  private getFriendsListHTML(): string {
    return `
      <div class="space-y-2">
        ${this.friends.map(friend => `
          <div class="flex items-center justify-between p-3 border border-terminal-gray rounded hover:bg-terminal-gray hover:bg-opacity-10 transition-all cursor-pointer" data-friend-id="${friend.user_id}">
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full mr-3 border border-terminal-gray bg-terminal-gray bg-opacity-20 flex items-center justify-center text-terminal-gray">${friend.nickname.charAt(0).toUpperCase()}</div>
              <div>
                <div class="font-medium text-terminal-green">${friend.nickname}</div>
                <div class="text-sm text-terminal-gray">@${friend.username}</div>
              </div>
            </div>
            <div class="flex items-center">
              <span class="inline-block w-2 h-2 rounded-full mr-2 ${this.getStatusColor(friend.status)}"></span>
              <span class="text-sm text-terminal-gray">${friend.status}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  private getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'online':
        return 'bg-terminal-green';
      case 'ingame':
      case 'in-game':
        return 'bg-terminal-yellow';
      case 'offline':
      default:
        return 'bg-terminal-gray';
    }
  }

  private attachListViewEventListeners(): void {
    const addFriendBtn = this.contentElement.querySelector('#add-friend-btn');
    const closeBtn = this.contentElement.querySelector('#close-btn');
    const friendItems = this.contentElement.querySelectorAll('[data-friend-id]');

    addFriendBtn?.addEventListener('click', () => this.renderAddView());
    closeBtn?.addEventListener('click', () => this.close());

    friendItems.forEach(item => {
      item.addEventListener('click', () => {
        const friendId = parseInt(item.getAttribute('data-friend-id') || '0');
        if (friendId) {
          this.renderProfileView(friendId);
        }
      });
    });
  }

  private attachAddViewEventListeners(): void {
    const backBtn = this.contentElement.querySelector('#back-btn');
    const closeBtn = this.contentElement.querySelector('#close-btn');
    const addBtn = this.contentElement.querySelector('#add-btn');
    const usernameInput = this.contentElement.querySelector('#username-input') as HTMLInputElement;

    backBtn?.addEventListener('click', () => this.renderListView());
    closeBtn?.addEventListener('click', () => this.close());

    const handleAdd = async () => {
      const username = usernameInput?.value.trim();
      if (!username) return;

      const resultDiv = this.contentElement.querySelector('#add-result') as HTMLElement;
      resultDiv.className = 'mb-4 p-3 rounded';
      resultDiv.textContent = 'Following...';
      resultDiv.classList.remove('hidden');

      try {
        await this.apiClient.friend.addFriend(username);
        resultDiv.className = 'mb-4 p-3 rounded bg-terminal-green bg-opacity-20 border border-terminal-green text-terminal-green';
        resultDiv.textContent = `Successfully started following ${username}!`;
        usernameInput.value = '';
        await this.loadFriends();
      } catch (error) {
        // 클라이언트 에러(4xx)는 정상적인 응답이므로 디버그 레벨로 로깅
        if (error instanceof Error && 'status' in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 500) {
            console.debug('[FriendModal] Client error (expected):', error.message);
          } else {
            console.error('[FriendModal] Add friend error:', error);
          }
        } else {
          console.error('[FriendModal] Add friend error:', error);
        }
        
        let errorMessage = `Failed to follow ${username}.`;
        let isConflict = false;
        
        if (error instanceof Error) {
          // 상세 에러 메시지 추출
          errorMessage = error.message;
          
          // 상태 코드 확인
          if ('status' in error) {
            const status = (error as any).status;
            isConflict = status === 409;
          }
          
          // ApiError 타입 확인 (기존 코드와의 호환성)
          if (error instanceof ApiError) {
            isConflict = error.status === 409;
            errorMessage = error.message;
          }
        }
        
        // 409 Conflict 에러의 경우 구체적인 메시지 표시
        if (isConflict) {
          if (errorMessage.includes('already following') || errorMessage.includes('You are already following')) {
            resultDiv.className = 'mb-4 p-3 rounded bg-terminal-yellow bg-opacity-20 border border-terminal-yellow text-terminal-yellow';
            resultDiv.textContent = `Already following ${username}.`;
          } else if (errorMessage.includes('does not exist') || errorMessage.includes('User does not exist')) {
            resultDiv.className = 'mb-4 p-3 rounded bg-terminal-red bg-opacity-20 border border-terminal-red text-terminal-red';
            resultDiv.textContent = `User ${username} not found.`;
          } else {
            resultDiv.className = 'mb-4 p-3 rounded bg-terminal-red bg-opacity-20 border border-terminal-red text-terminal-red';
            resultDiv.textContent = errorMessage;
          }
        } else {
          // 일반 에러
          resultDiv.className = 'mb-4 p-3 rounded bg-terminal-red bg-opacity-20 border border-terminal-red text-terminal-red';
          resultDiv.textContent = errorMessage;
        }
      }
    };

    addBtn?.addEventListener('click', handleAdd);
    usernameInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleAdd();
      }
    });
  }

  private attachProfileViewEventListeners(): void {
    const backBtn = this.contentElement.querySelector('#back-btn');
    const closeBtn = this.contentElement.querySelector('#close-btn');
    const unfollowBtn = this.contentElement.querySelector('#unfollow-btn');

    backBtn?.addEventListener('click', () => this.renderListView());
    closeBtn?.addEventListener('click', () => this.close());

    unfollowBtn?.addEventListener('click', async () => {
      if (!this.selectedFriendId) return;

      try {
        await this.apiClient.friend.removeFriend(this.selectedFriendId);
        await this.loadFriends();
        this.renderListView();
      } catch (error) {
        // 클라이언트 에러(4xx)는 정상적인 응답이므로 디버그 레벨로 로깅
        if (error instanceof Error && 'status' in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 500) {
            console.debug('[FriendModal] Client error (expected):', error.message);
          } else {
            console.error('[FriendModal] Remove friend error:', error);
          }
        } else {
          console.error('[FriendModal] Remove friend error:', error);
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'mt-2 p-2 rounded bg-terminal-red bg-opacity-20 border border-terminal-red text-terminal-red text-sm';
        
        if (error instanceof ApiError) {
          if (error.status === 409) {
            if (error.message?.includes('not following') || error.message?.includes('You are not following')) {
              errorDiv.textContent = 'You are not following this user.';
            } else if (error.message?.includes('Invalid friend ID')) {
              errorDiv.textContent = 'Invalid friend ID.';
            } else {
              errorDiv.textContent = error.message || 'Failed to unfollow friend.';
            }
          } else {
            errorDiv.textContent = error.message || 'Failed to unfollow friend.';
          }
        } else {
          errorDiv.textContent = 'Failed to unfollow friend.';
        }
        
        unfollowBtn.parentNode?.insertBefore(errorDiv, unfollowBtn);
      }
    });
  }

  // BaseModal의 show/close 메서드 사용
}