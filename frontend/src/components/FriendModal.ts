import { ApiClient, ApiError } from '../services/ApiClient.js';
import { Friend, User } from '../types/types.js';

export class FriendModal {
  private modalElement: HTMLElement;
  private contentElement: HTMLElement;
  private apiClient: ApiClient;
  private friends: Array<Friend & { user_id: number }> = [];
  private currentView: 'list' | 'add' | 'profile' = 'list';
  private selectedFriendId: number | null = null;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
    this.modalElement = document.createElement('div');
    this.contentElement = document.createElement('div');
    this.setupModal();
  }

  public async open(): Promise<void> {
    await this.loadFriends();
    this.renderListView();
    this.show();
  }

  private setupModal(): void {
    this.modalElement.className =
      'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    this.contentElement.className =
      'bg-terminal-black border border-terminal-gray p-6 rounded-lg w-[600px] max-w-[95%] max-h-[80vh] overflow-hidden flex flex-col';
    this.modalElement.appendChild(this.contentElement);

    this.modalElement.addEventListener('click', (e) => {
      if (e.target === this.modalElement) {
        this.close();
      }
    });
  }

  private async loadFriends(): Promise<void> {
    try {
      this.friends = await this.apiClient.friend.getFriends();
    } catch (error) {
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
              `<div class="w-16 h-16 rounded-full mr-4 border border-terminal-gray bg-terminal-gray bg-opacity-20 flex items-center justify-center text-terminal-gray text-2xl">${profile.nickname.charAt(0).toUpperCase()}</div>`
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
        if (error instanceof ApiError && error.status === 409) {
          resultDiv.className = 'mb-4 p-3 rounded bg-terminal-yellow bg-opacity-20 border border-terminal-yellow text-terminal-yellow';
          resultDiv.textContent = `Already following ${username}.`;
        } else if (error instanceof ApiError && error.status === 404) {
          resultDiv.className = 'mb-4 p-3 rounded bg-terminal-red bg-opacity-20 border border-terminal-red text-terminal-red';
          resultDiv.textContent = `User ${username} not found.`;
        } else {
          resultDiv.className = 'mb-4 p-3 rounded bg-terminal-red bg-opacity-20 border border-terminal-red text-terminal-red';
          resultDiv.textContent = `Failed to follow ${username}.`;
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
        const errorDiv = document.createElement('div');
        errorDiv.className = 'mt-2 p-2 rounded bg-terminal-red bg-opacity-20 border border-terminal-red text-terminal-red text-sm';
        errorDiv.textContent = 'Failed to unfollow friend.';
        unfollowBtn.parentNode?.insertBefore(errorDiv, unfollowBtn);
      }
    });
  }

  public show(): void {
    document.body.appendChild(this.modalElement);
  }

  public close(): void {
    this.modalElement.remove();
  }
}