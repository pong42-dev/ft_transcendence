// ./frontend/src/game/GameRenderer.ts

import { GameStateDto } from '../types/game-websocket.js';
import { PlayerResponseDto } from '../types/types.js';
import i18next from '../services/i18n.js';

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
   * 화면 크기에 맞게 스케일링 적용
   */
  /**
   * 게임 상태 업데이트 - 원래 상태로 복원
   */
  public update(state: GameStateDto): void {
    // 💡 1. 서버의 기준 캔버스 크기와 클라이언트의 실제 렌더링 크기를 가져옵니다.
    //    (가정: state.settings에 canvasWidth, canvasHeight가 포함되어 있음)
    if (!state.settings || !state.settings.canvasWidth || !state.settings.canvasHeight) {
      // 설정값이 없으면 렌더링을 중단하여 오류를 방지합니다.
      return;
    }

    const serverCanvasWidth = state.settings.canvasWidth;
    const serverCanvasHeight = state.settings.canvasHeight;

    const clientRect = this.gameElement.getBoundingClientRect();
    const clientWidth = clientRect.width;
    const clientHeight = clientRect.height;

    // 💡 2. 스케일 비율을 계산합니다.
    const scaleX = clientWidth / serverCanvasWidth;
    const scaleY = clientHeight / serverCanvasHeight;
    // 게임 오브젝트의 크기는 X축, Y축 중 더 작은 비율을 따르는 것이 일반적입니다. (가로/세로 비율 유지)
    const scale = Math.min(scaleX, scaleY);


    // 💡 3. 스케일링된 값으로 오브젝트의 크기와 위치를 설정합니다.

    // 최초 한 번만 기본 스타일 설정
    if (!this.initialized) {
      this.leftPaddle.style.position = 'absolute';
      this.leftPaddle.style.backgroundColor = '#00ff00';

      this.rightPaddle.style.position = 'absolute';
      this.rightPaddle.style.backgroundColor = '#00ff00';

      this.ball.style.position = 'absolute';
      this.ball.style.backgroundColor = '#00ff00';
      this.ball.style.borderRadius = '50%';
      this.ball.style.opacity = '1';
      this.ball.style.transition = 'opacity 0.3s ease';

      this.initialized = true;
    }

    // 패들 크기 스케일링
    this.leftPaddle.style.width = `${state.settings.paddleWidth * scale}px`;
    this.leftPaddle.style.height = `${state.settings.paddleHeight * scaleY}px`;
    this.rightPaddle.style.width = `${state.settings.paddleWidth * scale}px`;
    this.rightPaddle.style.height = `${state.settings.paddleHeight * scaleY}px`;

    // 공 크기 스케일링
    this.ball.style.width = `${state.settings.ballSize * scale}px`;
    this.ball.style.height = `${state.settings.ballSize * scale}px`;

    // 패들 위치 스케일링
    // 패들의 X좌표(left, right)는 고정값이므로 Y좌표만 스케일링합니다.
    const leftPaddleX = state.settings.paddleOffset * scaleX;
    const rightPaddleX = clientWidth - (state.settings.paddleOffset * scaleX) - (state.settings.paddleWidth * scale); // right 속성 대신 left 사용

    this.leftPaddle.style.left = `${leftPaddleX}px`;
    this.leftPaddle.style.top = `${state.paddles.player1.y * scaleY}px`;

    // right 속성 대신 left 속성을 사용해야 더 정확한 위치 계산이 가능합니다.
    this.rightPaddle.style.right = ''; // 기존 right 속성 초기화
    this.rightPaddle.style.left = `${rightPaddleX}px`;
    this.rightPaddle.style.top = `${state.paddles.player2.y * scaleY}px`;

    // 공 위치 스케일링
    this.ball.style.left = `${state.ball.x * scaleX}px`;
    this.ball.style.top = `${state.ball.y * scaleY}px`;

    // 점수 업데이트 (이 부분은 스케일링과 무관)
    this.scoreElement.innerHTML = `
      <span>${state.scores.player1}</span>
      <span style="color: #666; margin: 0 8px;">-</span>
      <span>${state.scores.player2}</span>
    `;
  }

  public updatePlayerInfo(leftPlayer: PlayerResponseDto, rightPlayer: PlayerResponseDto): void {
    if (!leftPlayer || !rightPlayer) return;

    // 왼쪽 플레이어: 아바타 → 이름 순서
    const leftAvatarHtml = leftPlayer.avatarUrl
      ? `<img src="${leftPlayer.avatarUrl}" class="w-full h-full object-cover rounded-full" alt="${leftPlayer.name}">`
      : `<span class="text-sm">${leftPlayer.name?.charAt(0).toUpperCase() || i18next.t('game.renderer.playerInfo.defaultPlayerInitial')}</span>`;

    this.leftPlayerInfo.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-terminal-gray bg-opacity-20 flex items-center justify-center overflow-hidden">
          ${leftAvatarHtml}
        </div>
        <div class="text-sm font-bold">${leftPlayer.name || i18next.t('game.renderer.playerInfo.defaultPlayer1')}</div>
      </div>
    `;

    // 오른쪽 플레이어: 이름 → 아바타 순서
    const rightAvatarHtml = rightPlayer.avatarUrl
      ? `<img src="${rightPlayer.avatarUrl}" class="w-full h-full object-cover rounded-full" alt="${rightPlayer.name}">`
      : `<span class="text-sm">${rightPlayer.name?.charAt(0).toUpperCase() || i18next.t('game.renderer.playerInfo.defaultPlayerInitial')}</span>`;

    this.rightPlayerInfo.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="text-sm font-bold">${rightPlayer.name || i18next.t('game.renderer.playerInfo.defaultPlayer2')}</div>
        <div class="w-10 h-10 rounded-full bg-terminal-gray bg-opacity-20 flex items-center justify-center overflow-hidden">
          ${rightAvatarHtml}
        </div>
      </div>
    `;
  }

  public updateRound(round: number): void {
    this.roundElement.className = 'absolute top-16 left-1/2 transform -translate-x-1/2 text-sm opacity-70';
    this.roundElement.textContent = i18next.t('game.renderer.round', { round });
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
        <div class="text-2xl opacity-70 text-center">${i18next.t('game.renderer.round', { round })}</div>
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