// ./frontend/src/game/GameRenderer.ts

import { GameStateDto } from '../types/game-websocket'; // 실제 경로에 맞게 수정
import { PlayerResponseDto } from '../types/types';     // 실제 경로에 맞게 수정
import { GameConfig } from './GameConfig';

/**
 * Game Renderer Module (Refactored for WebSocket)
 * * GameClient로부터 받은 상태(state)를 화면에 그리는 역할만 담당합니다.
 * 자체적인 상태나 로직을 갖지 않습니다.
 */
export class GameRenderer {
  // ... 기존 프로퍼티들은 그대로 유지 ...
  private config: GameConfig;
  private gameElement: HTMLElement;
  private leftPaddle: HTMLElement;
  private rightPaddle: HTMLElement;
  private ball: HTMLElement;
  private countdownElement: HTMLElement;
  private leftPlayerInfo: HTMLElement;
  private rightPlayerInfo: HTMLElement;
  private scoreElement: HTMLElement;
  
  // 생성자는 기존과 동일
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
  }

  // render 메서드는 기존과 동일
  public render(): HTMLElement {
    // ... 기존 render 로직 ...
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

    return this.gameElement;
  }

  /**
   * [핵심 변경] 서버로부터 받은 게임 상태 전체를 받아 화면을 업데이트합니다.
   * GameClient는 이 메서드 하나만 호출하면 됩니다.
   * @param state - 서버에서 받은 GameStateDto 객체
   */
  public update(state: GameStateDto): void {
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

  // 플레이어 정보 업데이트는 초기 한 번만 필요할 수 있으므로 별도 메서드로 유지
   /**
   * [구현 완료] 플레이어 정보를 받아와 UI를 업데이트합니다.
   * GameClient가 게임 시작 시 한 번 호출해줍니다.
   * @param leftPlayer - 왼쪽 플레이어 정보 DTO
   * @param rightPlayer - 오른쪽 플레이어 정보 DTO
   */
  public updatePlayerInfo(leftPlayer: PlayerResponseDto, rightPlayer: PlayerResponseDto): void {
    if (!leftPlayer || !rightPlayer) return;

    // 왼쪽 플레이어 UI 업데이트
    this.leftPlayerInfo.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-terminal-gray bg-opacity-20 flex items-center justify-center overflow-hidden">
          
          <span class="text-sm font-bold">${leftPlayer.name.charAt(0).toUpperCase()}</span>
          
        </div>
        <div class="text-sm font-bold">${leftPlayer.name}</div>
      </div>
    `;

    // 오른쪽 플레이어 UI 업데이트
    this.rightPlayerInfo.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="text-sm font-bold">${rightPlayer.name}</div>
        <div class="w-10 h-10 rounded-full bg-terminal-gray bg-opacity-20 flex items-center justify-center overflow-hidden">
          
          <span class="text-sm font-bold">${rightPlayer.name.charAt(0).toUpperCase()}</span>

        </div>
      </div>
    `;
  }

  
  // 카운트다운 표시는 이벤트 기반이므로 별도 메서드로 유지
  public showCountdown(count: number | undefined | null): void {
    if (typeof count === 'number' && !isNaN(count)) {
      this.countdownElement.style.opacity = '1';
      this.ball.style.opacity = '0';
      this.countdownElement.textContent = `${count}`;
    } else {
      // count가 undefined/null이면 카운트다운 숨김
      this.countdownElement.style.opacity = '0';
      this.countdownElement.textContent = '';
    }
  }

  // 카운트다운이 끝나고 게임이 시작될 때 공을 표시
  public showBall(): void {
    this.countdownElement.style.opacity = '0';
    this.ball.style.opacity = '1';
  }
}