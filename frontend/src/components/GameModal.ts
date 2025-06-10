import { Friend, User } from '../models/Types';

export class GameModal {
  private modalElement: HTMLElement;
  private contentElement: HTMLElement;
  private onStart: (mode: string, invitedFriends: Friend[]) => void;
  private onCancel: () => void;
  private selectedMode: string = '';
  private invitedFriends: Friend[] = [];
  private matchingTimeout: number | null = null;
  private countdownInterval: number | null = null;
  private isCancelled: boolean = false;
  private inviteStatuses: Map<string, 'pending' | 'accepted' | 'declined'> =
    new Map();
  private selectedOpponent: Friend | null = null;

  constructor(
    onStart: (mode: string, invitedFriends: Friend[]) => void,
    onCancel: () => void
  ) {
    this.onStart = onStart;
    this.onCancel = onCancel;
    this.modalElement = document.createElement('div');
    this.contentElement = document.createElement('div');
    this.setupModal();
  }

  private setupModal(): void {
    this.modalElement.className =
      'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    this.contentElement.className =
      'bg-terminal-black border border-terminal-gray p-4 sm:p-6 rounded-lg w-[500px] max-w-[95%] max-h-[80vh] overflow-y-auto';
    this.modalElement.appendChild(this.contentElement);
    this.showModeSelection();
  }

  private showModeSelection(): void {
    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">Select Game Mode</h3>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button class="rounded-lg border border-terminal-gray p-4 text-left transition-all hover:bg-terminal-gray hover:bg-opacity-10">
          <div class="text-lg font-bold mb-2">1vs1</div>
          <div class="text-sm opacity-70">Challenge a friend</div>
        </button>
        <button class="rounded-lg border border-terminal-gray p-4 text-left transition-all hover:bg-terminal-gray hover:bg-opacity-10">
          <div class="text-lg font-bold mb-2">Local</div>
          <div class="text-sm opacity-70">Play locally</div>
        </button>
        <button class="rounded-lg border border-terminal-gray p-4 text-left transition-all hover:bg-terminal-gray hover:bg-opacity-10">
          <div class="text-lg font-bold mb-2">Tournament</div>
          <div class="text-sm opacity-70">Compete in bracket</div>
        </button>
      </div>
    `;

    const buttons = this.contentElement.querySelectorAll('button');
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const mode =
          button.querySelector('.text-lg')?.textContent?.toLowerCase() || '';
        this.selectedMode = mode;
        if (mode === 'tournament') {
          this.showFriendInvite(true);
        } else if (mode === '1vs1') {
          this.showFriendInvite(false);
        } else {
          this.showDualPlayerMatch();
        }
      });
    });
  }

  private showFriendInvite(isTournament: boolean): void {
    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">Invite ${
          isTournament ? 'Friends' : 'Friend'
        }</h3>
      </div>
      <div class="border border-terminal-gray rounded-lg p-4 mb-6">
        <div class="max-h-48 overflow-y-auto space-y-3" id="friends-list">
          ${this.getFriendsList()}
        </div>
      </div>
      <div class="flex justify-end gap-3">
        <button class="px-4 py-2 border border-terminal-red text-terminal-red rounded-lg hover:bg-terminal-red hover:bg-opacity-10 transition-all" id="cancel-btn">
          Cancel
        </button>
        <button class="px-4 py-2 bg-terminal-green text-terminal-black rounded-lg hover:bg-opacity-80 transition-all" id="start-btn">
          Start
        </button>
      </div>
    `;

    const cancelBtn = this.contentElement.querySelector('#cancel-btn');
    const startBtn = this.contentElement.querySelector('#start-btn');
    const friendsList = this.contentElement.querySelector('#friends-list');

    friendsList?.querySelectorAll('button[data-id]').forEach((button) => {
      button.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) {
          if (isTournament) {
            this.handleInvite(id);
          } else {
            this.handleSingleInvite(id);
          }
        }
      });
    });

    cancelBtn?.addEventListener('click', () => this.handleCancel());
    startBtn?.addEventListener('click', () => {
      if (isTournament) {
        this.showTournamentBracket();
      } else {
        if (!this.selectedOpponent) {
          console.warn('No opponent selected, proceeding anyway...');
        }
        this.showDualPlayerMatch();
      }
    });

    setTimeout(() => {
      if (!this.isCancelled) {
        this.simulateFriendResponses();
      }
    }, 2000);
  }

  private handleSingleInvite(friendId: string): void {
    const friends = [
      { id: '1', name: 'GameMaster', status: 'online', winRate: '75%' },
      { id: '2', name: 'ProGamer', status: 'online', winRate: '65%' },
      { id: '3', name: 'PongKing', status: 'offline', winRate: '70%' },
    ];

    const friend = friends.find((f) => f.id === friendId);
    if (friend) {
      this.selectedOpponent = {
        username: friend.name.toLowerCase(),
        nickname: friend.name,
        status: friend.status as 'online' | 'offline' | 'in-game',
        blocked: false,
      };
      this.inviteStatuses.clear();
      this.inviteStatuses.set(friendId, 'pending');
      this.updateFriendsList();
    }
  }

  private handleInvite(friendId: string): void {
    if (!this.inviteStatuses.has(friendId)) {
      this.inviteStatuses.set(friendId, 'pending');
      this.updateFriendsList();
    }
  }

  private simulateFriendResponses(): void {
    this.inviteStatuses.forEach((status, id) => {
      if (status === 'pending') {
        const response = Math.random() > 0.5 ? 'accepted' : 'declined';
        this.inviteStatuses.set(id, response);
        if (response === 'accepted' && this.selectedMode === '1vs1') {
          const friends = [
            { id: '1', name: 'GameMaster', status: 'online', winRate: '75%' },
            { id: '2', name: 'ProGamer', status: 'online', winRate: '65%' },
            { id: '3', name: 'PongKing', status: 'offline', winRate: '70%' },
          ];
          const friend = friends.find((f) => f.id === id);
          if (friend) {
            this.selectedOpponent = {
              username: friend.name.toLowerCase(),
              nickname: friend.name,
              status: friend.status as 'online' | 'offline' | 'in-game',
              blocked: false,
            };
          }
        }
      }
    });
    this.updateFriendsList();
  }

  private updateFriendsList(): void {
    const friendsList = this.contentElement.querySelector('#friends-list');
    if (friendsList) {
      friendsList.innerHTML = this.getFriendsList();
      friendsList.querySelectorAll('button[data-id]').forEach((button) => {
        button.addEventListener('click', (e) => {
          const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
          if (id) {
            if (this.selectedMode === 'tournament') {
              this.handleInvite(id);
            } else {
              this.handleSingleInvite(id);
            }
          }
        });
      });
    }
  }

  private getFriendsList(): string {
    const friends = [
      { id: '1', name: 'GameMaster', status: 'online', winRate: '75%' },
      { id: '2', name: 'ProGamer', status: 'online', winRate: '65%' },
      { id: '3', name: 'PongKing', status: 'offline', winRate: '70%' },
    ];

    return friends
      .map((friend) => {
        const inviteStatus = this.inviteStatuses.get(friend.id);

        let statusElement = '';
        if (inviteStatus === 'pending') {
          statusElement = `
          <div class="flex items-center gap-2">
            <div class="animate-spin rounded-full h-4 w-4 border border-terminal-green border-t-transparent"></div>
            <span class="text-sm">Waiting...</span>
          </div>
        `;
        } else if (inviteStatus === 'accepted') {
          statusElement = `
          <div class="text-terminal-green flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span class="text-sm">Accepted</span>
          </div>
        `;
        } else if (inviteStatus === 'declined') {
          statusElement = `
          <div class="text-terminal-red flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            <span class="text-sm">Declined</span>
          </div>
        `;
        }

        return `
        <div class="flex items-center justify-between p-4 border border-terminal-gray rounded-lg hover:bg-terminal-gray hover:bg-opacity-5 transition-all">
          <div class="flex items-center gap-3 min-w-0">
            <div class="flex flex-col flex-grow">
              <span class="font-bold truncate">${friend.name}</span>
              <div class="flex items-center gap-2">
                <span class="text-xs opacity-50">${friend.status}</span>
                <span class="text-xs opacity-50">${friend.winRate} WR</span>
              </div>
            </div>
          </div>
          ${
            inviteStatus
              ? statusElement
              : `
            <button class="px-3 py-1.5 text-sm border border-terminal-gray rounded-lg hover:bg-terminal-gray hover:bg-opacity-10 transition-all whitespace-nowrap" data-id="${friend.id}">
              Invite
            </button>
          `
          }
        </div>
      `;
      })
      .join('');
  }

  private showDualPlayerMatch(): void {
    const players = [
      { name: 'You', winRate: '75%', isCurrentUser: true },
      {
        name:
          this.selectedMode === 'local'
            ? 'Player 2'
            : this.selectedOpponent?.nickname || 'Opponent',
        winRate: '65%',
        isNextOpponent: true,
      },
    ];

    const playerCard = (player: any) => `
      <div class="flex items-center justify-between p-4 rounded-lg ${
        player.isCurrentUser
          ? 'bg-terminal-green bg-opacity-10 border border-terminal-green'
          : player.isNextOpponent
          ? 'bg-terminal-gray bg-opacity-20 border border-terminal-gray'
          : ''
      }">
        <div class="flex flex-col flex-grow min-w-0 mr-2">
          <span class="font-bold truncate text-sm sm:text-base">${player.name}</span>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs opacity-50">${player.winRate} WR</span>
          </div>
        </div>
        ${
          player.isCurrentUser
            ? `
          <div class="text-xs px-2 py-0.5 bg-terminal-green bg-opacity-20 rounded-full whitespace-nowrap">You</div>
        `
            : player.isNextOpponent
            ? `
          <div class="text-xs px-2 py-0.5 bg-terminal-gray bg-opacity-20 rounded-full whitespace-nowrap">Next</div>
        `
            : ''
        }
      </div>
    `;

    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">${
          this.selectedMode === '1vs1' ? '1vs1 Match' : 'Local Match'
        }</h3>
      </div>
      <div class="tournament-bracket mb-6">
        <div class="flex flex-col sm:flex-row justify-around items-center gap-4">
          <div class="flex flex-col gap-4 w-full sm:w-5/12">
            ${playerCard(players[0])}
          </div>
          
          <div class="flex items-center justify-center w-full sm:w-2/12 py-2">
            <div class="text-2xl font-bold text-terminal-gray">VS</div>
          </div>
          
          <div class="flex flex-col gap-4 w-full sm:w-5/12">
            ${playerCard(players[1])}
          </div>
        </div>
      </div>
      <div class="text-center mb-4">
        <div class="text-lg font-bold mb-1">Game starts in</div>
        <div class="text-3xl font-bold text-terminal-green" id="countdown">5</div>
      </div>
      <div class="text-center">
        <button class="px-4 py-2 border border-terminal-red text-terminal-red rounded-lg hover:bg-terminal-red hover:bg-opacity-10 transition-all" id="cancel-game-btn">
          Cancel
        </button>
      </div>
    `;

    let countdown = 5;
    const countdownElement = this.contentElement.querySelector('#countdown');
    const cancelBtn = this.contentElement.querySelector('#cancel-game-btn');

    cancelBtn?.addEventListener('click', () => this.handleCancel());

    this.countdownInterval = window.setInterval(() => {
      if (this.isCancelled) {
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        return;
      }

      countdown--;
      if (countdownElement) countdownElement.textContent = countdown.toString();

      if (countdown <= 0) {
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        if (!this.isCancelled) {
          this.close();
          setTimeout(() => {
            this.startGame();
          }, 100);
        }
      }
    }, 1000);
  }

  private showTournamentBracket(): void {
    const players = [
      { name: 'You', winRate: '75%', isCurrentUser: true },
      {
        name: 'GameMaster',
        winRate: '65%',
        isNextOpponent: true,
      },
      { name: 'ProGamer', winRate: '80%' },
      { name: 'PongKing', winRate: '70%' },
    ];

    const playerCard = (player: any) => `
      <div class="flex items-center justify-between p-4 rounded-lg ${
        player.isCurrentUser
          ? 'bg-terminal-green bg-opacity-10 border border-terminal-green'
          : player.isNextOpponent
          ? 'bg-terminal-gray bg-opacity-20 border border-terminal-gray'
          : ''
      }">
        <div class="flex flex-col flex-grow min-w-0 mr-2">
          <span class="font-bold truncate text-sm sm:text-base">${player.name}</span>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs opacity-50">${player.winRate} WR</span>
          </div>
        </div>
        ${
          player.isCurrentUser
            ? `
          <div class="text-xs px-2 py-0.5 bg-terminal-green bg-opacity-20 rounded-full whitespace-nowrap">You</div>
        `
            : player.isNextOpponent
            ? `
          <div class="text-xs px-2 py-0.5 bg-terminal-gray bg-opacity-20 rounded-full whitespace-nowrap">Next</div>
        `
            : ''
        }
      </div>
    `;

    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">Tournament Bracket</h3>
        <div class="text-terminal-green opacity-50 text-sm">Semi-finals</div>
      </div>
      <div class="tournament-bracket mb-6">
        <div class="flex flex-col sm:flex-row justify-around items-stretch gap-6">
          <div class="flex flex-col gap-4 w-full sm:w-1/3">
            ${playerCard(players[0])}
            ${playerCard(players[1])}
          </div>
          
          <div class="flex flex-col gap-4 w-full sm:w-1/3">
            <div class="border border-terminal-gray rounded-lg p-4 text-center h-full flex flex-col justify-center">
              <div class="font-bold mb-1">Finals</div>
              <div class="text-xs opacity-50">Winner takes all</div>
            </div>
          </div>
          
          <div class="flex flex-col gap-4 w-full sm:w-1/3">
            ${playerCard(players[2])}
            ${playerCard(players[3])}
          </div>
        </div>
      </div>
      <div class="text-center mb-4">
        <div class="text-lg font-bold mb-1">Game starts in</div>
        <div class="text-3xl font-bold text-terminal-green" id="countdown">5</div>
      </div>
      <div class="text-center">
        <button class="px-4 py-2 border border-terminal-red text-terminal-red rounded-lg hover:bg-terminal-red hover:bg-opacity-10 transition-all" id="cancel-game-btn">
          Cancel
        </button>
      </div>
    `;

    let countdown = 5;
    const countdownElement = this.contentElement.querySelector('#countdown');
    const cancelBtn = this.contentElement.querySelector('#cancel-game-btn');

    cancelBtn?.addEventListener('click', () => this.handleCancel());

    this.countdownInterval = window.setInterval(() => {
      if (this.isCancelled) {
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        return;
      }

      countdown--;
      if (countdownElement) countdownElement.textContent = countdown.toString();

      if (countdown <= 0) {
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        if (!this.isCancelled) {
          this.close();
          setTimeout(() => {
            this.startGame();
          }, 100);
        }
      }
    }, 1000);
  }

  private startGame(): void {
    if (!this.isCancelled) {
      const currentUser = {
        nickname: 'You',
        avatarUrl: localStorage.getItem('userAvatar') || undefined,
      };

      const opponent = {
        nickname:
          this.selectedMode === 'local'
            ? 'Player 2'
            : this.selectedOpponent?.nickname || 'Opponent',
        avatarUrl: undefined,
      };

      this.onStart(this.selectedMode, this.invitedFriends);

      const pongGame = document.querySelector('pong-game');
      if (pongGame) {
        pongGame.setPlayers(currentUser, opponent);
      }
    }
  }

  private handleCancel(): void {
    this.isCancelled = true;
    if (this.matchingTimeout) clearTimeout(this.matchingTimeout);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.close();
    this.onCancel();
  }

  public show(): void {
    document.body.appendChild(this.modalElement);
  }

  public close(): void {
    this.modalElement.remove();
    if (this.matchingTimeout) clearTimeout(this.matchingTimeout);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }
}