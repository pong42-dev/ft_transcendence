import { Player } from '../types/types.js';

export class PongGame {
  private canvasWidth: number = 600;
  private canvasHeight: number = 400;
  private paddleWidth: number = 10;
  private paddleHeight: number = 80;
  private ballSize: number = 10;
  private ballX: number = 0;
  private ballY: number = 0;
  private ballSpeedX: number = 8;
  private ballSpeedY: number = 5;
  private leftPaddleY: number = 0;
  private rightPaddleY: number = 0;
  private gameElement: HTMLElement;
  private leftPaddle: HTMLElement;
  private rightPaddle: HTMLElement;
  private ball: HTMLElement;
  private countdownElement: HTMLElement;
  private leftPlayerInfo: HTMLElement;
  private rightPlayerInfo: HTMLElement;
  private scoreElement: HTMLElement;
  private roundElement: HTMLElement;
  private animationId: number = 0;
  private isMultiplayer: boolean = false;
  private keyState: { [key: string]: boolean } = {};
  private onGameEnd?: (winner: 'left' | 'right') => void;
  public gameMode: 'regular' | 'tournament' | 'demo' = 'demo';
  public isTournamentFinal: boolean = false;
  private gameStarted: boolean = false;
  private countdownTimer: number | null = null;
  private leftPlayer: Player | null = null;
  private rightPlayer: Player | null = null;
  // TODO: Implement score tracking
  // private _leftScore: number = 0;
  // private _rightScore: number = 0;
  private currentRound: number = 1;
  private roundWins: { left: number; right: number } = { left: 0, right: 0 };

  constructor(onGameEnd?: (winner: 'left' | 'right') => void) {
    this.gameElement = document.createElement('div');
    this.leftPaddle = document.createElement('div');
    this.rightPaddle = document.createElement('div');
    this.ball = document.createElement('div');
    this.countdownElement = document.createElement('div');
    this.leftPlayerInfo = document.createElement('div');
    this.rightPlayerInfo = document.createElement('div');
    this.scoreElement = document.createElement('div');
    this.roundElement = document.createElement('div');
    this.onGameEnd = onGameEnd;
    
    this.setupControls();
    this.resetGame();
  }

  public setPlayers(leftPlayer: Player, rightPlayer: Player): void {
    this.leftPlayer = leftPlayer;
    this.rightPlayer = rightPlayer;
    this.updatePlayerInfo();
  }

  private updatePlayerInfo(): void {
    if (!this.leftPlayer || !this.rightPlayer) return;

    this.leftPlayerInfo.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-terminal-gray bg-opacity-20 flex items-center justify-center overflow-hidden">
          ${this.leftPlayer.avatarUrl ? 
            `<img src="${this.leftPlayer.avatarUrl}" alt="${this.leftPlayer.nickname}" class="w-full h-full object-cover">` :
            `<span class="text-sm">${this.leftPlayer.nickname.charAt(0).toUpperCase()}</span>`
          }
        </div>
        <div class="text-sm font-bold">${this.leftPlayer.nickname}</div>
      </div>
    `;

    this.rightPlayerInfo.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="text-sm font-bold">${this.rightPlayer.nickname}</div>
        <div class="w-10 h-10 rounded-full bg-terminal-gray bg-opacity-20 flex items-center justify-center overflow-hidden">
          ${this.rightPlayer.avatarUrl ? 
            `<img src="${this.rightPlayer.avatarUrl}" alt="${this.rightPlayer.nickname}" class="w-full h-full object-cover">` :
            `<span class="text-sm">${this.rightPlayer.nickname.charAt(0).toUpperCase()}</span>`
          }
        </div>
      </div>
    `;

    this.updateScore();
    this.updateRound();
  }

  private updateScore(): void {
    this.scoreElement.className = 'absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 text-2xl font-bold';
    this.scoreElement.innerHTML = `
      <span>${this.roundWins.left}</span>
      <span class="text-terminal-gray">-</span>
      <span>${this.roundWins.right}</span>
    `;
  }

  private updateRound(): void {
    this.roundElement.className = 'absolute top-16 left-1/2 transform -translate-x-1/2 text-sm opacity-70';
    this.roundElement.textContent = `Round ${this.currentRound}`;
  }

  public setGameMode(mode: 'regular' | 'tournament' | 'demo'): void {
    this.gameMode = mode;
    if (mode === 'demo') {
      this.setPlayers(
        { nickname: 'Player 1' },
        { nickname: 'Player 2' }
      );
    }
  }

  private setupControls(): void {
    window.addEventListener('keydown', (e) => {
      this.keyState[e.key] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keyState[e.key] = false;
    });
  }

  public setMultiplayerMode(enabled: boolean): void {
    this.isMultiplayer = enabled;
  }

  public render(): HTMLElement {
    this.gameElement.className = 'relative w-full h-full bg-terminal-black overflow-hidden';
    
    this.leftPlayerInfo.className = 'absolute top-4 left-4 flex items-center gap-3';
    this.rightPlayerInfo.className = 'absolute top-4 right-4 flex items-center gap-3';
    
    this.countdownElement.className = 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl font-bold opacity-0 transition-opacity duration-300';
    
    const net = document.createElement('div');
    net.className = 'absolute top-0 left-1/2 transform -translate-x-1/2 h-full border-l border-dashed border-terminal-green opacity-50';
    
    this.leftPaddle.className = 'absolute bg-terminal-green';
    this.leftPaddle.style.width = `${this.paddleWidth}px`;
    this.leftPaddle.style.height = `${this.paddleHeight}px`;
    this.leftPaddle.style.left = '40px';
    this.leftPaddle.style.top = `${this.leftPaddleY}px`;
    
    this.rightPaddle.className = 'absolute bg-terminal-green';
    this.rightPaddle.style.width = `${this.paddleWidth}px`;
    this.rightPaddle.style.height = `${this.paddleHeight}px`;
    this.rightPaddle.style.right = '40px';
    this.rightPaddle.style.top = `${this.rightPaddleY}px`;
    
    this.ball.className = 'absolute bg-terminal-green rounded-full opacity-0 transition-opacity duration-300';
    this.ball.style.width = `${this.ballSize}px`;
    this.ball.style.height = `${this.ballSize}px`;
    this.ball.style.left = `${this.ballX}px`;
    this.ball.style.top = `${this.ballY}px`;
    
    this.gameElement.appendChild(net);
    this.gameElement.appendChild(this.leftPaddle);
    this.gameElement.appendChild(this.rightPaddle);
    this.gameElement.appendChild(this.ball);
    this.gameElement.appendChild(this.countdownElement);
    this.gameElement.appendChild(this.leftPlayerInfo);
    this.gameElement.appendChild(this.rightPlayerInfo);
    this.gameElement.appendChild(this.scoreElement);
    this.gameElement.appendChild(this.roundElement);

    this.updatePlayerInfo();
    
    return this.gameElement;
  }

  public start(): void {
    this.resetGame();
    if (this.gameMode !== 'demo') {
      this.startCountdown();
    } else {
      this.startGame();
    }
  }

  private startCountdown(): void {
    let count = 3;
    this.countdownElement.style.opacity = '1';
    
    const updateCount = () => {
      if (count > 0) {
        this.countdownElement.innerHTML = `
          <div class="flex flex-col items-center">
            <div class="text-6xl font-bold mb-2 text-center">${count}</div>
            <div class="text-2xl opacity-70 text-center">Round ${this.currentRound}</div>
          </div>
        `;
        count--;
        this.countdownTimer = window.setTimeout(updateCount, 1000);
      } else {
        this.countdownElement.style.opacity = '0';
        this.ball.style.opacity = '1';
        this.startGame();
      }
    };
    
    updateCount();
  }

  private startGame(): void {
    this.gameStarted = true;
    this.update();
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
    }
    this.gameStarted = false;
    this.resetGameState();
  }

  private resetGameState(): void {
    // TODO: Reset scores when implementing score tracking
    // this._leftScore = 0;
    // this._rightScore = 0;
    this.currentRound = 1;
    this.roundWins = { left: 0, right: 0 };
    this.updateScore();
    this.updateRound();
  }

  private resetGame(): void {
    this.ballX = this.canvasWidth / 2 - this.ballSize / 2;
    this.ballY = this.canvasHeight / 2 - this.ballSize / 2;
    this.ballSpeedX = 8 * (Math.random() > 0.5 ? 1 : -1);
    this.ballSpeedY = 5 * (Math.random() > 0.5 ? 1 : -1);
    this.leftPaddleY = this.canvasHeight / 2 - this.paddleHeight / 2;
    this.rightPaddleY = this.canvasHeight / 2 - this.paddleHeight / 2;
    this.gameStarted = false;
  }

  private resetRound(): void {
    this.resetGame();
    this.startCountdown();
  }

  private handleRoundEnd(winner: 'left' | 'right'): void {
    if (winner === 'left') {
      this.roundWins.left++;
    } else {
      this.roundWins.right++;
    }

    this.updateScore();

    if (this.roundWins.left >= 2 || this.roundWins.right >= 2) {
      // Match is over
      if (this.onGameEnd) {
        this.stop();
        this.onGameEnd(this.roundWins.left > this.roundWins.right ? 'left' : 'right');
      }
    } else {
      // Start next round
      this.currentRound++;
      this.updateRound();
      this.resetRound();
    }
  }

  private update(): void {
    if (!this.gameStarted) return;
    
    const rect = this.gameElement.getBoundingClientRect();
    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;
    
    if (this.updateBallPosition()) {
      return; // Round ended
    }
    
    if (this.isMultiplayer) {
      this.updatePlayerPaddle();
    } else {
      this.updateAIPaddles();
    }
    
    this.updateDOMElements();
    this.animationId = requestAnimationFrame(this.update.bind(this));
  }

  private updateBallPosition(): boolean {
    this.ballX += this.ballSpeedX;
    this.ballY += this.ballSpeedY;
    
    if (this.ballY <= 0 || this.ballY + this.ballSize >= this.canvasHeight) {
      this.ballSpeedY = -this.ballSpeedY;
    }
    
    if (this.ballX <= 0) {
      if (this.gameMode !== 'demo') {
        this.handleRoundEnd('right');
        return true;
      }
      this.resetGame();
    } else if (this.ballX + this.ballSize >= this.canvasWidth) {
      if (this.gameMode !== 'demo') {
        this.handleRoundEnd('left');
        return true;
      }
      this.resetGame();
    }
    
    this.checkPaddleCollision();
    return false;
  }

  private checkPaddleCollision(): void {
    if (
      this.ballX <= 40 + this.paddleWidth &&
      this.ballY + this.ballSize >= this.leftPaddleY &&
      this.ballY <= this.leftPaddleY + this.paddleHeight
    ) {
      this.ballSpeedX = Math.abs(this.ballSpeedX);
      this.ballSpeedY += (Math.random() * 2 - 1);
      this.ballX = 40 + this.paddleWidth;
    }
    
    const rightPaddleX = this.canvasWidth - 40 - this.paddleWidth;
    if (
      this.ballX + this.ballSize >= rightPaddleX &&
      this.ballY + this.ballSize >= this.rightPaddleY &&
      this.ballY <= this.rightPaddleY + this.paddleHeight
    ) {
      this.ballSpeedX = -Math.abs(this.ballSpeedX);
      this.ballSpeedY += (Math.random() * 2 - 1);
      this.ballX = rightPaddleX - this.ballSize;
    }
  }

  private updatePlayerPaddle(): void {
    const paddleSpeed = 8;
    
    if (this.keyState['ArrowUp']) {
      this.rightPaddleY = Math.max(0, this.rightPaddleY - paddleSpeed);
    }
    if (this.keyState['ArrowDown']) {
      this.rightPaddleY = Math.min(this.canvasHeight - this.paddleHeight, this.rightPaddleY + paddleSpeed);
    }
    
    const leftPaddleCenter = this.leftPaddleY + this.paddleHeight / 2;
    const leftTargetY = this.ballY + this.ballSize / 2;
    
    if (this.ballSpeedX < 0) {
      if (leftPaddleCenter < leftTargetY - 10) {
        this.leftPaddleY += 6;
      } else if (leftPaddleCenter > leftTargetY + 10) {
        this.leftPaddleY -= 6;
      }
    }
    
    this.leftPaddleY = Math.max(0, Math.min(this.canvasHeight - this.paddleHeight, this.leftPaddleY));
  }

  private updateAIPaddles(): void {
    const paddleSpeed = 6;
    
    const leftPaddleCenter = this.leftPaddleY + this.paddleHeight / 2;
    const leftTargetY = this.ballY + this.ballSize / 2;
    
    if (this.ballSpeedX < 0) {
      if (leftPaddleCenter < leftTargetY - 10) {
        this.leftPaddleY += paddleSpeed;
      } else if (leftPaddleCenter > leftTargetY + 10) {
        this.leftPaddleY -= paddleSpeed;
      }
    }
    
    const rightPaddleCenter = this.rightPaddleY + this.paddleHeight / 2;
    const rightTargetY = this.ballY + this.ballSize / 2;
    
    if (this.ballSpeedX > 0) {
      if (rightPaddleCenter < rightTargetY - 10) {
        this.rightPaddleY += paddleSpeed;
      } else if (rightPaddleCenter > rightTargetY + 10) {
        this.rightPaddleY -= paddleSpeed;
      }
    }
    
    this.leftPaddleY = Math.max(0, Math.min(this.canvasHeight - this.paddleHeight, this.leftPaddleY));
    this.rightPaddleY = Math.max(0, Math.min(this.canvasHeight - this.paddleHeight, this.rightPaddleY));
  }

  private updateDOMElements(): void {
    this.ball.style.left = `${this.ballX}px`;
    this.ball.style.top = `${this.ballY}px`;
    this.leftPaddle.style.top = `${this.leftPaddleY}px`;
    this.rightPaddle.style.top = `${this.rightPaddleY}px`;
  }
}