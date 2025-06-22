/**
 * Input Handler Module
 * 
 * 키보드 입력 및 AI 제어를 담당하는 모듈
 * 원본 PongGame.ts의 입력 처리 로직을 분리
 * 
 * @role 사용자 입력 및 AI 제어
 * @extracted_from PongGame.ts (기존 로직 그대로 유지)
 */
export class InputHandler {
  private keyState: { [key: string]: boolean } = {};

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keyState[e.key] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keyState[e.key] = false;
    });
  }
  
  public cleanup(): void {
    // Remove event listeners if needed for cleanup
    // For now, we'll keep it simple like the original
  }

  public activate(): void {
    // Clear any existing key states
    this.keyState = {};
  }

  public deactivate(): void {
    this.keyState = {};
  }

  public isKeyPressed(key: string): boolean {
    return !!this.keyState[key];
  }

  public getPlayerInputs(isMultiplayer: boolean): { leftInput: 'UP' | 'DOWN' | 'NONE', rightInput: 'UP' | 'DOWN' | 'NONE' } {
    let leftInput: 'UP' | 'DOWN' | 'NONE' = 'NONE';
    let rightInput: 'UP' | 'DOWN' | 'NONE' = 'NONE';

    if (isMultiplayer) {
      // Local multiplayer mode: Player1 (W/S) controls left paddle, Player2 (Arrow keys) controls right paddle
      
      // Player1 controls (W/S for left paddle) - optimized direct access
      if (this.keyState['w'] || this.keyState['W']) {
        leftInput = 'UP';
      } else if (this.keyState['s'] || this.keyState['S']) {
        leftInput = 'DOWN';
      }
      
      // Player2 controls (Arrow keys for right paddle) - optimized direct access
      if (this.keyState['ArrowUp']) {
        rightInput = 'UP';
      } else if (this.keyState['ArrowDown']) {
        rightInput = 'DOWN';
      }
    } else {
      // VS AI mode: Player (Arrow keys) controls right paddle, AI controls left paddle
      
      // Player controls (Arrow keys for right paddle) - optimized direct access
      if (this.keyState['ArrowUp']) {
        rightInput = 'UP';
      } else if (this.keyState['ArrowDown']) {
        rightInput = 'DOWN';
      }
      
      // Left input is handled by AI in GameLogic
    }

    return { leftInput, rightInput };
  }
}
