import { Friend } from '../models/Types';

export class GameModal {
  private modalElement: HTMLElement;
  private contentElement: HTMLElement;
  private onStart: (mode: string, invitedFriends: Friend[]) => void;
  private onCancel: () => void;
  private selectedMode: string = '';
  private invitedFriends: Friend[] = [];
  private countdownInterval: number | null = null;
  private isCancelled: boolean = false;
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
          <div class="text-lg font-bold mb-2">VS AI</div>
          <div class="text-sm opacity-70">Challenge AI opponent</div>
        </button>
        <button class="rounded-lg border border-terminal-gray p-4 text-left transition-all hover:bg-terminal-gray hover:bg-opacity-10">
          <div class="text-lg font-bold mb-2">Local</div>
          <div class="text-sm opacity-70">Play with friends</div>
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
          this.setOpponentNickname(true);
        } else if (mode === 'local') {
          this.setOpponentNickname(false);
        } else {
          this.showDualPlayerMatch();
        }
      });
    });
  }

  private setOpponentNickname(isTournament: boolean): void {
    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">Enter ${
          isTournament ? 'Opponents' : 'Opponent'
        } Nickname</h3>
      </div>
      <div class="border border-terminal-gray rounded-lg p-4 mb-6">
        ${isTournament ? this.getTournamentInputs() : this.getSingleInput()}
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

    cancelBtn?.addEventListener('click', () => this.handleCancel());
    startBtn?.addEventListener('click', () => {
      if (isTournament) {
        this.handleTournamentStart();
      } else {
        this.handleSingleStart();
      }
    });
  }

  private getSingleInput(): string {
    return `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2 text-terminal-green">Opponent Nickname</label>
          <input 
            type="text" 
            id="opponent-nickname" 
            class="w-full px-3 py-2 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green focus:outline-none focus:border-terminal-green"
            placeholder="Enter opponent's nickname..."
            autocomplete="off"
          />
        </div>
      </div>
    `;
  }

  private getTournamentInputs(): string {
    return `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2 text-terminal-green">Tournament Opponents (3 players)</label>
          <div class="space-y-3">
            <input 
              type="text" 
              id="opponent-1" 
              class="w-full px-3 py-2 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green focus:outline-none focus:border-terminal-green"
              placeholder="Player 2 nickname..."
              autocomplete="off"
            />
            <input 
              type="text" 
              id="opponent-2" 
              class="w-full px-3 py-2 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green focus:outline-none focus:border-terminal-green"
              placeholder="Player 3 nickname..."
              autocomplete="off"
            />
            <input 
              type="text" 
              id="opponent-3" 
              class="w-full px-3 py-2 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green focus:outline-none focus:border-terminal-green"
              placeholder="Player 4 nickname..."
              autocomplete="off"
            />
          </div>
        </div>
      </div>
    `;
  }

  private handleSingleStart(): void {
    const opponentInput = this.contentElement.querySelector('#opponent-nickname') as HTMLInputElement;
    const opponentNickname = opponentInput?.value.trim();

    if (!opponentNickname) {
      alert('Please enter an opponent nickname');
      return;
    }

    this.selectedOpponent = {
      username: opponentNickname.toLowerCase(),
      nickname: opponentNickname,
      status: 'online',
      blocked: false,
    };

    this.showDualPlayerMatch();
  }

  private handleTournamentStart(): void {
    const opponent1Input = this.contentElement.querySelector('#opponent-1') as HTMLInputElement;
    const opponent2Input = this.contentElement.querySelector('#opponent-2') as HTMLInputElement;
    const opponent3Input = this.contentElement.querySelector('#opponent-3') as HTMLInputElement;

    const opponent1 = opponent1Input?.value.trim();
    const opponent2 = opponent2Input?.value.trim();
    const opponent3 = opponent3Input?.value.trim();

    if (!opponent1 || !opponent2 || !opponent3) {
      alert('Please enter all 3 opponent nicknames');
      return;
    }

    // 토너먼트용 상대방들 설정
    this.invitedFriends = [
      { username: opponent1.toLowerCase(), nickname: opponent1, status: 'online', blocked: false },
      { username: opponent2.toLowerCase(), nickname: opponent2, status: 'online', blocked: false },
      { username: opponent3.toLowerCase(), nickname: opponent3, status: 'online', blocked: false },
    ];

    this.showTournamentBracket();
  }

  private showDualPlayerMatch(): void {
    const players = [
      { name: 'You', isCurrentUser: true },
      {
        name:
          this.selectedMode === 'local'
            ? 'Player 2'
            : this.selectedOpponent?.nickname || 'Opponent',
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
          this.selectedMode === 'vs ai' ? 'VS AI Match' : 'Local Match'
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
      { name: 'You', isCurrentUser: true },
      {
        name: this.invitedFriends[0]?.nickname || 'Player 2',
        isNextOpponent: true,
      },
      { name: this.invitedFriends[1]?.nickname || 'Player 3' },
      { name: this.invitedFriends[2]?.nickname || 'Player 4' },
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
      this.onStart(this.selectedMode, this.invitedFriends);
    }
  }

  private handleCancel(): void {
    this.isCancelled = true;
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.close();
    this.onCancel();
  }

  public show(): void {
    document.body.appendChild(this.modalElement);
  }

  public close(): void {
    this.modalElement.remove();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }
}