// ./frontend/src/game/InputHandler.ts

import i18next from 'i18next';

type InputAction = 'UP' | 'DOWN' | 'NONE';
type PlayerSide = 'left' | 'right';
type InputEventCallback = (action: InputAction, playerSide?: PlayerSide) => void;

/**
 * Input Handler Module (Refactored for WebSocket)
 * * 사용자 키보드 입력을 감지하여 'UP' 또는 'DOWN' 액션 이벤트를 발생시키는 역할만 합니다.
 * 게임의 종류나 플레이어에 대한 정보를 갖지 않습니다.
 */
export class InputHandler {
  private keyState: { [key: string]: boolean } = {};
  private eventListeners: Set<InputEventCallback> = new Set();
  private isActive: boolean = false;
  private isLocalMultiplayer: boolean = false; // 로컬 멀티플레이어 모드

  constructor() {
    this.setupKeyListeners();
  }

  private setupKeyListeners(): void {
    window.addEventListener('keydown', (e) => {
      if (!this.isActive || this.keyState[e.key]) return; // 중복 입력 방지
      this.keyState[e.key] = true;
      this.handleKeyPress(e.key, true); // keydown
    });

    window.addEventListener('keyup', (e) => {
      if (!this.isActive || !this.keyState[e.key]) return;
      this.keyState[e.key] = false;
      this.handleKeyPress(e.key, false); // keyup
    });
  }

  private handleKeyPress(key: string, isKeyDown: boolean): void {
    let action: InputAction | null = null;
    let playerSide: PlayerSide | null = null;
    switch (key.toLowerCase()) {
      case 'w':
      case 'ㅈ':
        action = isKeyDown ? 'UP' : 'NONE';
        playerSide = 'left';
        break;
      case 's':
      case 'ㄴ':
        action = isKeyDown ? 'DOWN' : 'NONE';
        playerSide = 'left';
        break;
      case 'arrowup':
        action = isKeyDown ? 'UP' : 'NONE';
        playerSide = 'right';
        break;
      case 'arrowdown':
        action = isKeyDown ? 'DOWN' : 'NONE';
        playerSide = 'right';
        break;
    }
    
    if (action && playerSide) {
      if (this.isLocalMultiplayer) {
        // 로컬 멀티플레이어: 플레이어 구분해서 전송
        this.emit(action, playerSide);
      } else {
        // AI 게임: 위아래 방향키(오른쪽)만 처리 - 사용자가 오른쪽 패들 조작
        if (playerSide === 'right') {
          this.emit(action);
        }
      }
    }
  }

  /**
   * [핵심 변경] GameClient가 입력을 구독할 수 있도록 이벤트 리스너를 등록합니다.
   * @param event - 'input' 이벤트 타입
   * @param callback - 실행할 콜백 함수
   */
  public on(event: 'input', callback: InputEventCallback): void {
    if (event === 'input') {
      this.eventListeners.add(callback);
    }
  }

  public off(event: 'input', callback: InputEventCallback): void {
    if (event === 'input') {
      this.eventListeners.delete(callback);
    }
  }

  // 등록된 콜백들에게 이벤트를 전달
  private emit(action: InputAction, playerSide?: PlayerSide): void {
    this.eventListeners.forEach(callback => callback(action, playerSide));
  }
  
  // 게임 시작 시 호출하여 입력을 받기 시작
  public activate(isLocalMultiplayer: boolean = false): void {
    this.isActive = true;
    this.isLocalMultiplayer = isLocalMultiplayer;
    this.keyState = {};
    console.log(i18next.t('game.inputHandler.log.activated', { isLocalMultiplayer }));
  }

  // 게임 종료 시 호출하여 입력을 중단
  public deactivate(): void {
    this.isActive = false;
    this.keyState = {};
  }
}