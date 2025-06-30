// ./frontend/src/game/GameRenderer.ts

import { GameStateDto } from '../types/game-websocket';
import { PlayerResponseDto } from '../types/types';

/**
 * Game Renderer Module (WebSocket 기반, GameConfig 완전 제거)
 * 서버에서 받은 state.settings만을 사용하여 화면을 그립니다.
 */
export class GameRenderer {
  private gameElement: HTMLElement;
  private leftPaddle: HTMLElement;
  private rightPaddle: HTMLElement;
  private ball: HTMLElement;
  private countdownElement: HTMLElement;
  private leftPlayerInfo: HTMLElement;
  private rightPlayerInfo: HTMLElement;
  private scoreElement: HTMLElement;
  private initialized = false;

  constructor() {
    this.gameElement = document.createElement('div');
    this.leftPaddle = document.createElement('div');
    this.rightPaddle = document.createElement('div');
    this.ball = document.createElement('div');
    this.countdownElement = document.createElement('div');
    this.leftPlayerInfo = document.createElement('div');
    this.rightPlayerInfo = document.createElement('div');
    this.scoreElement = document.createElement('div');
  }

  public render(): HTMLElement {
    this.gameElement.className = 'relative w-full h-full bg-terminal-black overflow-hidden';
    this.leftPlayerInfo.className = 'absolute top-4 left-4 flex items-center gap-3';
    this.rightPlayerInfo.className = 'absolute top-4 right-4 flex items-center gap-3';
    this.countdownElement.className = 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl font-bold opacity-0 transition-opacity duration-300';
    const net = document.createElement('div');
    net.className = 'absolute top-0 left-1/2 transform -translate-x-1/2 h-full border-l border-dashed border-terminal-green opacity-50';
    this.gameElement.appendChild(net);
    this.gameElement.appendChild(this.leftPaddle);
    this.gameElement.appendChild(this.rightPaddle);
    this.gameElement.appendChild(this.ball);
    this.gameElement.appendChild(this.countdownElement);
    this.gameElement.appendChild(this.leftPlayerInfo);
    this.gameElement.appendChild(this.rightPlayerInfo);
    this.gameElement.appendChild(this.scoreElement);
    return this.gameElement;
  }

  /**
   * 최초 update에서만 settings 기반 스타일 적용, 이후 위치/점수만 갱신
   */
  public update(state: GameStateDto): void {
    if (!this.initialized && state.settings) {
      this.leftPaddle.className = 'absolute bg-terminal-green';
      this.leftPaddle.style.width = `${state.settings.paddleWidth}px`;
      this.leftPaddle.style.height = `${state.settings.paddleHeight}px`;
      this.leftPaddle.style.left = `${state.settings.paddleOffset}px`;
      this.leftPaddle.style.top = `${state.settings.canvasHeight / 2 - state.settings.paddleHeight / 2}px`;
      this.rightPaddle.className = 'absolute bg-terminal-green';
      this.rightPaddle.style.width = `${state.settings.paddleWidth}px`;
      this.rightPaddle.style.height = `${state.settings.paddleHeight}px`;
      this.rightPaddle.style.right = `${state.settings.paddleOffset}px`;
      this.rightPaddle.style.top = `${state.settings.canvasHeight / 2 - state.settings.paddleHeight / 2}px`;
      this.ball.className = 'absolute bg-terminal-green rounded-full opacity-0 transition-opacity duration-300';
      this.ball.style.width = `${state.settings.ballSize}px`;
      this.ball.style.height = `${state.settings.ballSize}px`;
      this.ball.style.left = `${state.settings.canvasWidth / 2 - state.settings.ballSize / 2}px`;
      this.ball.style.top = `${state.settings.canvasHeight / 2 - state.settings.ballSize / 2}px`;
      this.gameElement.style.width = `${state.settings.canvasWidth}px`;
      this.gameElement.style.height = `${state.settings.canvasHeight}px`;
      this.initialized = true;
    }
    this.ball.style.left = `${state.ball.x}px`;
    this.ball.style.top = `${state.ball.y}px`;
    this.leftPaddle.style.top = `${state.paddles.player1.y}px`;
    this.rightPaddle.style.top = `${state.paddles.player2.y}px`;
    this.scoreElement.innerHTML = `
      <span>${state.scores.player1}</span>
      <span class="text-terminal-gray">-</span>
      <span>${state.scores.player2}</span>
    `;
  }

  public updatePlayerInfo(leftPlayer: PlayerResponseDto, rightPlayer: PlayerResponseDto): void {
    if (!leftPlayer || !rightPlayer) return;
    this.leftPlayerInfo.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-terminal-gray bg-opacity-20 flex items-center justify-center overflow-hidden">
          <span class="text-sm font-bold">${leftPlayer.name.charAt(0).toUpperCase()}</span>
        </div>
        <div class="text-sm font-bold">${leftPlayer.name}</div>
      </div>
    `;
    this.rightPlayerInfo.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="text-sm font-bold">${rightPlayer.name}</div>
        <div class="w-10 h-10 rounded-full bg-terminal-gray bg-opacity-20 flex items-center justify-center overflow-hidden">
          <span class="text-sm font-bold">${rightPlayer.name.charAt(0).toUpperCase()}</span>
        </div>
      </div>
    `;
  }

  public showCountdown(count: number | undefined | null): void {
    if (typeof count === 'number' && !isNaN(count)) {
      this.countdownElement.style.opacity = '1';
      this.ball.style.opacity = '0';
      this.countdownElement.textContent = `${count}`;
    } else {
      this.countdownElement.style.opacity = '0';
      this.countdownElement.textContent = '';
    }
  }

  public showBall(): void {
    this.countdownElement.style.opacity = '0';
    this.ball.style.opacity = '1';
  }
}