import { Player } from '../types/types.js';
import { GameConfig } from './GameConfig.js';

/**
 * Game Renderer Module
 * 
 * UI 렌더링 및 DOM 조작을 담당하는 모듈
 * 원본 PongGame.ts의 화면 표시 및 UI 업데이트 로직을 분리
 * 
 * @role UI 렌더링 및 화면 표시
 * @extracted_from PongGame.ts (기존 로직 그대로 유지)
 */
export class GameRenderer {
  private config: GameConfig;
  private gameElement: HTMLElement;
  private leftPaddle: HTMLElement;
  private rightPaddle: HTMLElement;
  private ball: HTMLElement;
  private countdownElement: HTMLElement;
  private leftPlayerInfo: HTMLElement;
  private rightPlayerInfo: HTMLElement;
  private scoreElement: HTMLElement;
  private roundElement: HTMLElement;

  constructor(config: GameConfig) {
    this.config = config;
    this.gameElement = document.createElement('div');
    this.leftPaddle = document.createElement('div');
    this.rightPaddle = document.createElement('div');
    this.ball = document.createElement('div');
    this.countdownElement = document.createElement('div');
    this.leftPlayerInfo = document.createElement('div');
    this.rightPlayerInfo = document.createElement('div');
    this.scoreElement = document.createElement('div');
    this.roundElement = document.createElement('div');
  }

  public render(): HTMLElement {
    this.gameElement.className = 'relative w-full h-full bg-terminal-black overflow-hidden';
    
    this.leftPlayerInfo.className = 'absolute top-4 left-4 flex items-center gap-3';
    this.rightPlayerInfo.className = 'absolute top-4 right-4 flex items-center gap-3';
    
    this.countdownElement.className = 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl font-bold opacity-0 transition-opacity duration-300';
    
    const net = document.createElement('div');
    net.className = 'absolute top-0 left-1/2 transform -translate-x-1/2 h-full border-l border-dashed border-terminal-green opacity-50';
    
    this.leftPaddle.className = 'absolute bg-terminal-green';
    this.leftPaddle.style.width = `${this.config.paddleWidth}px`;
    this.leftPaddle.style.height = `${this.config.paddleHeight}px`;
    this.leftPaddle.style.left = `${this.config.paddleOffset}px`;
    this.leftPaddle.style.top = `${this.config.canvasHeight / 2 - this.config.paddleHeight / 2}px`;
    
    this.rightPaddle.className = 'absolute bg-terminal-green';
    this.rightPaddle.style.width = `${this.config.paddleWidth}px`;
    this.rightPaddle.style.height = `${this.config.paddleHeight}px`;
    this.rightPaddle.style.right = `${this.config.paddleOffset}px`;
    this.rightPaddle.style.top = `${this.config.canvasHeight / 2 - this.config.paddleHeight / 2}px`;
    
    this.ball.className = 'absolute bg-terminal-green rounded-full opacity-0 transition-opacity duration-300';
    this.ball.style.width = `${this.config.ballSize}px`;
    this.ball.style.height = `${this.config.ballSize}px`;
    this.ball.style.left = `${this.config.canvasWidth / 2 - this.config.ballSize / 2}px`;
    this.ball.style.top = `${this.config.canvasHeight / 2 - this.config.ballSize / 2}px`;
    
    this.gameElement.appendChild(net);
    this.gameElement.appendChild(this.leftPaddle);
    this.gameElement.appendChild(this.rightPaddle);
    this.gameElement.appendChild(this.ball);
    this.gameElement.appendChild(this.countdownElement);
    this.gameElement.appendChild(this.leftPlayerInfo);
    this.gameElement.appendChild(this.rightPlayerInfo);
    this.gameElement.appendChild(this.scoreElement);
    this.gameElement.appendChild(this.roundElement);

    return this.gameElement;
  }

  public updatePlayerInfo(leftPlayer: Player | null, rightPlayer: Player | null): void {
    if (!leftPlayer || !rightPlayer) return;

    this.leftPlayerInfo.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-terminal-gray bg-opacity-20 flex items-center justify-center overflow-hidden">
          ${leftPlayer.avatarUrl ? 
            `<img src="${leftPlayer.avatarUrl}" alt="${leftPlayer.nickname}" class="w-full h-full object-cover">` :
            `<span class="text-sm">${leftPlayer.nickname?.charAt(0).toUpperCase() || 'P'}</span>`
          }
        </div>
        <div class="text-sm font-bold">${leftPlayer.nickname || 'Player 1'}</div>
      </div>
    `;

    this.rightPlayerInfo.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="text-sm font-bold">${rightPlayer.nickname || 'Player 2'}</div>
        <div class="w-10 h-10 rounded-full bg-terminal-gray bg-opacity-20 flex items-center justify-center overflow-hidden">
          ${rightPlayer.avatarUrl ? 
            `<img src="${rightPlayer.avatarUrl}" alt="${rightPlayer.nickname}" class="w-full h-full object-cover">` :
            `<span class="text-sm">${rightPlayer.nickname?.charAt(0).toUpperCase() || 'P'}</span>`
          }
        </div>
      </div>
    `;
  }

  public updateScore(leftScore: number, rightScore: number): void {
    this.scoreElement.className = 'absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 text-2xl font-bold';
    this.scoreElement.innerHTML = `
      <span>${leftScore}</span>
      <span class="text-terminal-gray">-</span>
      <span>${rightScore}</span>
    `;
  }

  public updateRound(round: number): void {
    this.roundElement.className = 'absolute top-16 left-1/2 transform -translate-x-1/2 text-sm opacity-70';
    this.roundElement.textContent = `Round ${round}`;
  }

  public updateBallPosition(x: number, y: number): void {
    this.ball.style.left = `${x}px`;
    this.ball.style.top = `${y}px`;
  }

  public updatePaddlePositions(leftY: number, rightY: number): void {
    this.leftPaddle.style.top = `${leftY}px`;
    this.rightPaddle.style.top = `${rightY}px`;
  }

  public showCountdown(count: number, round: number): void {
    this.countdownElement.style.opacity = '1';
    this.ball.style.opacity = '0';
    
    this.countdownElement.innerHTML = `
      <div class="flex flex-col items-center">
        <div class="text-6xl font-bold mb-2 text-center">${count}</div>
        <div class="text-2xl opacity-70 text-center">Round ${round}</div>
      </div>
    `;
  }

  public hideCountdown(): void {
    this.countdownElement.style.opacity = '0';
    this.ball.style.opacity = '1';
  }

//   public resizeCanvas(width: number, height: number): void {
//     // Update canvas dimensions if needed
//   }
}
