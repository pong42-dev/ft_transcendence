// Removed unused import
import { GameResult } from '../types/types.js';

export class GameEndModal {
  private modalElement: HTMLElement;
  private onProfileClick: () => void;
  private onNextMatch?: () => void;
  private isTournament: boolean;
  private isFinal: boolean;
  private gameResult: GameResult;

  constructor(
    gameResult: GameResult, 
    isTournament: boolean, 
    isFinal: boolean, 
    onProfileClick: () => void, 
    onNextMatch?: () => void
  ) {
    this.modalElement = document.createElement('div');
    this.gameResult = gameResult;
    this.onProfileClick = onProfileClick;
    this.onNextMatch = onNextMatch;
    this.isTournament = isTournament;
    this.isFinal = isFinal;
    this.setupModal();
  }

  private setupModal(): void {
    this.modalElement.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    
    const content = document.createElement('div');
    content.className = 'bg-terminal-black border border-terminal-gray p-6 rounded-lg w-[400px] max-w-full';
    
    // Determine if current user won (assuming right player is the user in most cases)
    const userWon = this.gameResult.winner === 'right';
    const winnerName = this.gameResult.winner === 'left' ? this.gameResult.leftPlayer.nickname : this.gameResult.rightPlayer.nickname;
    
    content.innerHTML = `
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-terminal-gray bg-opacity-10 mb-3">
          <div class="text-3xl">${userWon ? '🏆' : '💪'}</div>
        </div>
        <h3 class="text-terminal-green text-2xl font-bold mb-1">${userWon ? 'Victory!' : 'Good Game!'}</h3>
        <div class="text-sm opacity-70">${userWon ? 'Congratulations!' : `${winnerName} wins!`}</div>
      </div>
      
      <div class="bg-terminal-gray bg-opacity-5 rounded-lg p-4 mb-6">
        <div class="flex justify-between items-center mb-3">
          <div class="text-lg font-bold">Match Stats</div>
          <div class="text-sm opacity-50">Final Score</div>
        </div>
        
        <div class="flex justify-between items-center mb-4">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg ${this.gameResult.winner === 'left' ? 'bg-terminal-green bg-opacity-20' : 'bg-terminal-gray bg-opacity-20'} flex items-center justify-center font-bold text-sm">
              ${this.gameResult.leftPlayer.nickname.substring(0, 2)}
            </div>
            <div class="text-xl font-bold">${this.gameResult.leftPlayer.score}</div>
          </div>
          <div class="text-xs opacity-50">vs</div>
          <div class="flex items-center gap-2">
            <div class="text-xl font-bold">${this.gameResult.rightPlayer.score}</div>
            <div class="w-8 h-8 rounded-lg ${this.gameResult.winner === 'right' ? 'bg-terminal-green bg-opacity-20' : 'bg-terminal-red bg-opacity-20'} flex items-center justify-center font-bold text-sm">
              ${this.gameResult.rightPlayer.nickname.substring(0, 2)}
            </div>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-3 text-center">
          <div class="bg-terminal-gray bg-opacity-10 rounded-lg p-2">
            <div class="text-xl font-bold mb-1">${this.gameResult.totalRounds}</div>
            <div class="text-xs opacity-50">Total Rounds</div>
          </div>
          <div class="bg-terminal-gray bg-opacity-10 rounded-lg p-2">
            <div class="text-xl font-bold mb-1">${this.gameResult.gameMode.toUpperCase()}</div>
            <div class="text-xs opacity-50">Game Mode</div>
          </div>
        </div>
      </div>

      <div class="flex justify-center gap-3">
        ${this.isTournament && !this.isFinal ? `
          <button class="px-4 py-2 bg-terminal-green text-terminal-black rounded-lg hover:bg-opacity-80 transition-all flex items-center gap-2" id="next-match-btn">
            <span>Next Match</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        ` : `
          <button class="px-4 py-2 bg-terminal-green text-terminal-black rounded-lg hover:bg-opacity-80 transition-all" id="profile-btn">
            Back to Profile
          </button>
        `}
      </div>
    `;

    const profileBtn = content.querySelector('#profile-btn');
    const nextMatchBtn = content.querySelector('#next-match-btn');

    profileBtn?.addEventListener('click', () => {
      this.close();
      this.onProfileClick();
    });

    nextMatchBtn?.addEventListener('click', () => {
      this.close();
      if (this.onNextMatch) this.onNextMatch();
    });

    this.modalElement.appendChild(content);
  }

  public show(): void {
    document.body.appendChild(this.modalElement);
  }

  public close(): void {
    this.modalElement.remove();
  }
}