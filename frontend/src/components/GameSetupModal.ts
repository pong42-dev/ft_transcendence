import { Friend, GameSetupResult, PlayerInfo } from '../types/types.js';

export class GameSetupModal {
  private modalElement: HTMLElement;
  private contentElement: HTMLElement;
  private resolvePromise: ((value: GameSetupResult | null) => void) | null =
    null;
  private selectedMode: string = '';
  private invitedFriends: Friend[] = [];
  private selectedOpponent: Friend | null = null;
  private countdownInterval: number | null = null;
  private isCancelled: boolean = false;

  constructor() {
    this.modalElement = document.createElement('div');
    this.contentElement = document.createElement('div');
    this.setupModal();
  }

  public open(): Promise<GameSetupResult | null> {
    this.isCancelled = false;
    this.renderModeSelectionView();
    this.show();
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  private setupModal(): void {
    this.modalElement.className =
      'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    this.contentElement.className =
      'bg-terminal-black border border-terminal-gray p-4 sm:p-6 rounded-lg w-[500px] max-w-[95%] max-h-[80vh] overflow-y-auto';
    this.modalElement.appendChild(this.contentElement);
  }

  private renderModeSelectionView(): void {
    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">Select Game Mode</h3>
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
        <button data-mode="tournament" class="rounded-lg border border-terminal-gray p-4 text-left transition-all hover:bg-terminal-gray hover:bg-opacity-10">
          <div class="text-lg font-bold mb-2">Tournament</div>
          <div class="text-sm opacity-70">Compete in bracket</div>
        </button>
      </div>
    `;

    this.contentElement
      .querySelectorAll('button[data-mode]')
      .forEach((button) => {
        button.addEventListener('click', () => {
          const mode = button.getAttribute('data-mode');
          if (!mode) return;

          this.selectedMode = mode;
          if (mode === 'tournament') {
            this.renderOpponentNicknameView(true);
          } else if (mode === 'local') {
            this.renderOpponentNicknameView(false);
          } else {
            this.renderDualPlayerMatchView();
          }
        });
      });
  }

  private renderOpponentNicknameView(isTournament: boolean): void {
    const title = isTournament
      ? 'Enter Opponents Nickname'
      : 'Enter Opponent Nickname';
    const inputsHTML = isTournament
      ? this.getTournamentInputsHTML()
      : this.getSingleInputHTML();

    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">${title}</h3>
      </div>
      <div class="border border-terminal-gray rounded-lg p-4 mb-6">
        ${inputsHTML}
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

    this.contentElement
      .querySelector('#cancel-btn')
      ?.addEventListener('click', () => this.handleCancel());
    this.contentElement
      .querySelector('#start-btn')
      ?.addEventListener('click', () => {
        if (isTournament) {
          this.handleTournamentStart();
        } else {
          this.handleSingleStart();
        }
      });
  }

  private renderDualPlayerMatchView(): void {
    const players = [
      { name: 'You', isCurrentUser: true },
      {
        name:
          this.selectedMode === 'local'
            ? this.selectedOpponent?.nickname || 'Player 2'
            : 'AI',
        isNextOpponent: true,
      },
    ];

    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">${
          this.selectedMode === 'vs ai' ? 'VS AI Match' : 'Local Match'
        }</h3>
      </div>
      <div class="tournament-bracket mb-6">
        <div class="flex flex-col sm:flex-row justify-around items-center gap-4">
          <div class="flex flex-col gap-4 w-full sm:w-5/12">
            ${this.getPlayerCardHTML(players[0])}
          </div>
          
          <div class="flex items-center justify-center w-full sm:w-2/12 py-2">
            <div class="text-2xl font-bold text-terminal-gray">VS</div>
          </div>
          
          <div class="flex flex-col gap-4 w-full sm:w-5/12">
            ${this.getPlayerCardHTML(players[1])}
          </div>
        </div>
      </div>
      ${this.getCountdownHTML()}
    `;
    this.contentElement
      .querySelector('#cancel-game-btn')
      ?.addEventListener('click', () => this.handleCancel());
    this.startCountdown();
  }

  private renderTournamentBracketView(): void {
    const players = [
      { name: 'You', isCurrentUser: true },
      {
        name: this.invitedFriends[0]?.nickname || 'Player 2',
        isNextOpponent: true,
      },
      { name: this.invitedFriends[1]?.nickname || 'Player 3' },
      { name: this.invitedFriends[2]?.nickname || 'Player 4' },
    ];

    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">Tournament Bracket</h3>
        <div class="text-terminal-green opacity-50 text-sm">Semi-finals</div>
      </div>
      <div class="tournament-bracket mb-6">
        <div class="flex flex-col sm:flex-row justify-around items-stretch gap-6">
          <div class="flex flex-col gap-4 w-full sm:w-1/3">
            ${this.getPlayerCardHTML(players[0])}
            ${this.getPlayerCardHTML(players[1])}
          </div>
          
          <div class="flex flex-col gap-4 w-full sm:w-1/3">
            <div class="border border-terminal-gray rounded-lg p-4 text-center h-full flex flex-col justify-center">
              <div class="font-bold mb-1">Finals</div>
              <div class="text-xs opacity-50">Winner takes all</div>
            </div>
          </div>
          
          <div class="flex flex-col gap-4 w-full sm:w-1/3">
            ${this.getPlayerCardHTML(players[2])}
            ${this.getPlayerCardHTML(players[3])}
          </div>
        </div>
      </div>
      ${this.getCountdownHTML()}
    `;

    this.contentElement
      .querySelector('#cancel-game-btn')
      ?.addEventListener('click', () => this.handleCancel());
    this.startCountdown();
  }

  private handleSingleStart(): void {
    const opponentInput = this.contentElement.querySelector(
      '#opponent-nickname',
    ) as HTMLInputElement;
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

    this.invitedFriends = [this.selectedOpponent];
    this.renderDualPlayerMatchView();
  }

  private handleTournamentStart(): void {
    const getOpponentValue = (id: string) =>
      (
        this.contentElement.querySelector(
          `#opponent-${id}`,
        ) as HTMLInputElement
      )?.value.trim();

    const opponent1 = getOpponentValue('1');
    const opponent2 = getOpponentValue('2');
    const opponent3 = getOpponentValue('3');

    if (!opponent1 || !opponent2 || !opponent3) {
      alert('Please enter all 3 opponent nicknames');
      return;
    }

    this.invitedFriends = [
      {
        username: opponent1.toLowerCase(),
        nickname: opponent1,
        status: 'online',
        blocked: false,
      },
      {
        username: opponent2.toLowerCase(),
        nickname: opponent2,
        status: 'online',
        blocked: false,
      },
      {
        username: opponent3.toLowerCase(),
        nickname: opponent3,
        status: 'online',
        blocked: false,
      },
    ];

    this.renderTournamentBracketView();
  }

  private getSingleInputHTML(): string {
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

  private getTournamentInputsHTML(): string {
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

  private getPlayerCardHTML(player: PlayerInfo): string {
    const baseClasses = 'flex items-center justify-between p-4 rounded-lg';
    const highlightClasses = player.isCurrentUser
      ? 'bg-terminal-green bg-opacity-10 border border-terminal-green'
      : player.isNextOpponent
      ? 'bg-terminal-gray bg-opacity-20 border border-terminal-gray'
      : '';

    const youBadge = `
      <div class="text-xs px-2 py-0.5 bg-terminal-green bg-opacity-20 rounded-full whitespace-nowrap">You</div>
    `;
    const nextBadge = `
      <div class="text-xs px-2 py-0.5 bg-terminal-gray bg-opacity-20 rounded-full whitespace-nowrap">Next</div>
    `;
    const badge = player.isCurrentUser
      ? youBadge
      : player.isNextOpponent
      ? nextBadge
      : '';

    return `
      <div class="${baseClasses} ${highlightClasses}">
        <div class="flex flex-col flex-grow min-w-0 mr-2">
          <span class="font-bold truncate text-sm sm:text-base">${player.name}</span>
        </div>
        ${badge}
      </div>
    `;
  }

  private getCountdownHTML(): string {
    return `
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
  }

  private startCountdown(): void {
    let countdown = 5;
    const countdownElement = this.contentElement.querySelector('#countdown');
    console.log('Starting countdown'); // Debug log

    this.countdownInterval = window.setInterval(() => {
      if (this.isCancelled) {
        console.log('Countdown cancelled'); // Debug log
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        return;
      }

      countdown--;
      console.log('Countdown:', countdown); // Debug log
      if (countdownElement) countdownElement.textContent = countdown.toString();

      if (countdown <= 0) {
        console.log('Countdown finished, starting game'); // Debug log
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        if (!this.isCancelled) {
          this.startGame(); // Call startGame BEFORE closing
          this.close();
        }
      }
    }, 1000);
  }

  private startGame(): void {
    console.log('startGame called, isCancelled:', this.isCancelled, 'resolvePromise exists:', !!this.resolvePromise); // Debug log
    if (!this.isCancelled && this.resolvePromise) {
      console.log('Resolving with result:', { mode: this.selectedMode, opponents: this.invitedFriends }); // Debug log
      this.resolvePromise({
        mode: this.selectedMode,
        opponents: this.invitedFriends,
      });
      this.resolvePromise = null; // Clear after resolving
    }
  }

  private handleCancel(): void {
    this.isCancelled = true;
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (this.resolvePromise) {
      this.resolvePromise(null);
    }
    this.close();
  }

  public show(): void {
    document.body.appendChild(this.modalElement);
  }

  public close(): void {
    console.log('GameModal close called'); // Debug log
    this.modalElement.remove();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    // Don't set resolvePromise to null immediately - let startGame handle it
    // this.resolvePromise = null;
  }
}