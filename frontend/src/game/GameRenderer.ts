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
  private roundElement: HTMLElement;
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
    this.roundElement = document.createElement('div');
    
    // Initialize the game area
    this.setupGameArea();
  }

  private setupGameArea(): void {
  
    // Set up the main game element with proper styles - 동적 사이징
    this.gameElement.className = 'relative w-full h-full bg-terminal-black overflow-hidden';
    
    // Set up UI elements with proper absolute positioning
    this.leftPlayerInfo.className = 'absolute top-4 left-4 flex items-center gap-3 text-terminal-green z-10';
    
    this.rightPlayerInfo.className = 'absolute top-4 right-4 flex items-center gap-3 text-terminal-green z-10';
    
    this.countdownElement.className = 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl font-bold opacity-0 transition-opacity duration-300';
    
    // Set up score element
    this.scoreElement.className = 'absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 text-2xl font-bold';
    
    // Set up round element
    this.roundElement.className = 'absolute top-16 left-1/2 transform -translate-x-1/2 text-sm opacity-70';
    
    // Create the net
    const net = document.createElement('div');
    net.className = 'absolute top-0 left-1/2 transform -translate-x-1/2 h-full border-l border-dashed border-terminal-green opacity-50';
    
    // Add all elements to the game area
    this.gameElement.appendChild(net);
    this.gameElement.appendChild(this.leftPaddle);
    this.gameElement.appendChild(this.rightPaddle);
    this.gameElement.appendChild(this.ball);
    this.gameElement.appendChild(this.countdownElement);
    this.gameElement.appendChild(this.leftPlayerInfo);
    this.gameElement.appendChild(this.rightPlayerInfo);
    this.gameElement.appendChild(this.scoreElement);
    this.gameElement.appendChild(this.roundElement);
    
    // Add the game element to the container
  }

  public render(): HTMLElement {
    return this.gameElement;
  }

  /**
   * 최초 update에서만 settings 기반 스타일 적용, 이후 위치/점수만 갱신
   */
  public update(state: GameStateDto): void {
    if (!this.initialized && state.settings) {
      // Left paddle setup
      this.leftPaddle.style.position = 'absolute';
      this.leftPaddle.style.backgroundColor = '#00ff00';
      this.leftPaddle.style.width = `${state.settings.paddleWidth}px`;
      this.leftPaddle.style.height = `${state.settings.paddleHeight}px`;
      this.leftPaddle.style.left = `${state.settings.paddleOffset}px`;
      this.leftPaddle.style.top = `${state.settings.canvasHeight / 2 - state.settings.paddleHeight / 2}px`;
      
      // Right paddle setup
      this.rightPaddle.style.position = 'absolute';
      this.rightPaddle.style.backgroundColor = '#00ff00';
      this.rightPaddle.style.width = `${state.settings.paddleWidth}px`;
      this.rightPaddle.style.height = `${state.settings.paddleHeight}px`;
      this.rightPaddle.style.right = `${state.settings.paddleOffset}px`;
      this.rightPaddle.style.top = `${state.settings.canvasHeight / 2 - state.settings.paddleHeight / 2}px`;
      
      // Ball setup
      this.ball.style.position = 'absolute';
      this.ball.style.backgroundColor = '#00ff00';
      this.ball.style.borderRadius = '50%';
      this.ball.style.width = `${state.settings.ballSize}px`;
      this.ball.style.height = `${state.settings.ballSize}px`;
      this.ball.style.left = `${state.settings.canvasWidth / 2 - state.settings.ballSize / 2}px`;
      this.ball.style.top = `${state.settings.canvasHeight / 2 - state.settings.ballSize / 2}px`;
      this.ball.style.opacity = '1'; // Make ball visible
      this.ball.style.transition = 'opacity 0.3s ease';
      
    }
    
    // Update positions
    this.ball.style.left = `${state.ball.x}px`;
    this.ball.style.top = `${state.ball.y}px`;
    this.leftPaddle.style.top = `${state.paddles.player1.y}px`;
    this.rightPaddle.style.top = `${state.paddles.player2.y}px`;
    
    // Update score
    this.scoreElement.innerHTML = `
      <span>${state.scores.player1}</span>
      <span style="color: #666; margin: 0 8px;">-</span>
      <span>${state.scores.player2}</span>
    `;
  }

  public updatePlayerInfo(leftPlayer: PlayerResponseDto, rightPlayer: PlayerResponseDto): void {
    if (!leftPlayer || !rightPlayer) return;
    
    // 왼쪽 플레이어: 아바타 → 이름 순서
    this.leftPlayerInfo.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-terminal-gray bg-opacity-20 flex items-center justify-center overflow-hidden">
          <span class="text-sm">${leftPlayer.name?.charAt(0).toUpperCase() || 'P'}</span>
        </div>
        <div class="text-sm font-bold">${leftPlayer.name || 'Player 1'}</div>
      </div>
    `;
    
    // 오른쪽 플레이어: 이름 → 아바타 순서  
    this.rightPlayerInfo.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="text-sm font-bold">${rightPlayer.name || 'Player 2'}</div>
        <div class="w-10 h-10 rounded-full bg-terminal-gray bg-opacity-20 flex items-center justify-center overflow-hidden">
          <span class="text-sm">${rightPlayer.name?.charAt(0).toUpperCase() || 'P'}</span>
        </div>
      </div>
    `;
  }

  public updateRound(round: number): void {
    this.roundElement.className = 'absolute top-16 left-1/2 transform -translate-x-1/2 text-sm opacity-70';
    this.roundElement.textContent = `Round ${round}`;
  }

  // 기존 updatePlayerInfo에 아바타 지원 추가
  public updatePlayerInfoWithAvatar(leftPlayer: { name: string; avatarUrl?: string }, rightPlayer: { name: string; avatarUrl?: string }): void {
    console.log('updatePlayerInfoWithAvatar called with:', leftPlayer, rightPlayer);
    
    if (!leftPlayer || !rightPlayer) {
      console.log('Missing player data, returning');
      return;
    }
    
    this.leftPlayerInfo.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-terminal-gray bg-opacity-20 flex items-center justify-center overflow-hidden">
          ${leftPlayer.avatarUrl ? 
            `<img src="${leftPlayer.avatarUrl}" alt="${leftPlayer.name}" class="w-full h-full object-cover">` :
            `<span class="text-sm font-bold">${leftPlayer.name.charAt(0).toUpperCase()}</span>`
          }
        </div>
        <div class="text-sm font-bold">${leftPlayer.name}</div>
      </div>
    `;
    
    this.rightPlayerInfo.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="text-sm font-bold">${rightPlayer.name}</div>
        <div class="w-10 h-10 rounded-full bg-terminal-gray bg-opacity-20 flex items-center justify-center overflow-hidden">
          ${rightPlayer.avatarUrl ? 
            `<img src="${rightPlayer.avatarUrl}" alt="${rightPlayer.name}" class="w-full h-full object-cover">` :
            `<span class="text-sm font-bold">${rightPlayer.name.charAt(0).toUpperCase()}</span>`
          }
        </div>
      </div>
    `;
    
    console.log('Player info HTML updated');
    console.log('Left player info element:', this.leftPlayerInfo);
    console.log('Right player info element:', this.rightPlayerInfo);
  }

  // 라운드 정보와 함께 카운트다운 표시
  public showCountdownWithRound(count: number, round: number): void {
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

  // 점수와 라운드를 별도로 업데이트하는 메서드들
  public updateScore(leftScore: number, rightScore: number): void {
    this.scoreElement.className = 'absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 text-2xl font-bold';
    this.scoreElement.innerHTML = `
      <span>${leftScore}</span>
      <span class="text-terminal-gray">-</span>
      <span>${rightScore}</span>
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