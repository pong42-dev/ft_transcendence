import { User } from '../models/Types';

export class GameEndModal {
  private modalElement: HTMLElement;
  private onProfileClick: () => void;
  private onNextMatch?: () => void;
  private isTournament: boolean;
  private isFinal: boolean;

  constructor(isTournament: boolean, isFinal: boolean, onProfileClick: () => void, onNextMatch?: () => void) {
    this.modalElement = document.createElement('div');
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
    
    content.innerHTML = `
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-terminal-gray bg-opacity-10 mb-3">
          <div class="text-3xl">🏆</div>
        </div>
        <h3 class="text-terminal-green text-2xl font-bold mb-1">Victory!</h3>
        <div class="text-sm opacity-70">Congratulations!</div>
      </div>
      
      <div class="bg-terminal-gray bg-opacity-5 rounded-lg p-4 mb-6">
        <div class="flex justify-between items-center mb-3">
          <div class="text-lg font-bold">Match Stats</div>
          <div class="text-sm opacity-50">Final Score</div>
        </div>
        
        <div class="flex justify-between items-center mb-4">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-terminal-gray bg-opacity-20 flex items-center justify-center font-bold text-sm">
              You
            </div>
            <div class="text-xl font-bold">5</div>
          </div>
          <div class="text-xs opacity-50">vs</div>
          <div class="flex items-center gap-2">
            <div class="text-xl font-bold">3</div>
            <div class="w-8 h-8 rounded-lg bg-terminal-red bg-opacity-20 flex items-center justify-center font-bold text-sm">
              Opp
            </div>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-3 text-center">
          <div class="bg-terminal-gray bg-opacity-10 rounded-lg p-2">
            <div class="text-xl font-bold mb-1">87%</div>
            <div class="text-xs opacity-50">Accuracy</div>
          </div>
          <div class="bg-terminal-gray bg-opacity-10 rounded-lg p-2">
            <div class="text-xl font-bold mb-1">12</div>
            <div class="text-xs opacity-50">Rally Length</div>
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