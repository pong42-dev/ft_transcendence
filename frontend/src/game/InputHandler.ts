// ./frontend/src/game/InputHandler.ts

type InputAction = 'UP' | 'DOWN';
type InputEventCallback = (action: InputAction) => void;

/**
 * Input Handler Module (Refactored for WebSocket)
 * * 사용자 키보드 입력을 감지하여 'UP' 또는 'DOWN' 액션 이벤트를 발생시키는 역할만 합니다.
 * 게임의 종류나 플레이어에 대한 정보를 갖지 않습니다.
 */
export class InputHandler {
  private keyState: { [key: string]: boolean } = {};
  private eventListeners: Set<InputEventCallback> = new Set();
  private isActive: boolean = false;

  constructor() {
    this.setupKeyListeners();
  }

  private setupKeyListeners(): void {
    window.addEventListener('keydown', (e) => {
      if (!this.isActive || this.keyState[e.key]) return; // 중복 입력 방지
      this.keyState[e.key] = true;
      this.handleKeyPress(e.key);
    });

    window.addEventListener('keyup', (e) => {
      this.keyState[e.key] = false;
    });
  }

  private handleKeyPress(key: string): void {
    let action: InputAction | null = null;
    switch (key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        action = 'UP';
        break;
      case 's':
      case 'arrowdown':
        action = 'DOWN';
        break;
    }

    if (action) {
      // 'input' 이벤트를 발생시켜 등록된 모든 콜백을 실행
      this.emit(action);
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
  private emit(action: InputAction): void {
    this.eventListeners.forEach(callback => callback(action));
  }
  
  // 게임 시작 시 호출하여 입력을 받기 시작
  public activate(): void {
    this.isActive = true;
    this.keyState = {};
  }

  // 게임 종료 시 호출하여 입력을 중단
  public deactivate(): void {
    this.isActive = false;
    this.keyState = {};
  }
}