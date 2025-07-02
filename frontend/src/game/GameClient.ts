// frontend/src/game/GameClient.ts

import { WebSocketService } from '../services/websocket/WebSocketService';
import { GameApiService } from '../services/api/GameApiService';
import { GameRenderer } from './GameRenderer';
import { InputHandler } from './InputHandler';
import { CreateGameRequestDto } from '../types/types';
import { GameStateDto, GameEventDto, PlayerInputDto } from '../types/game-websocket';

export class GameClient {
  private gameId: string | null = null;
  private playerId: number | null = null;
  private gameMode: string | null = null; // 게임 모드 저장 // 이 클라이언트를 사용하는 플레이어의 ID
  private isLocalMultiplayer: boolean = false; // 로컬 멀티플레이어 모드 여부
  private player2Id: number | null = null; // 로컬 멀티플레이어에서 2번째 플레이어 ID

  // 의존성 주입: GameClient는 직접 DOM이나 API를 다루지 않고, 서비스를 통해 작업합니다.
  constructor(
    private readonly gameApiService: GameApiService,
    private readonly webSocketService: WebSocketService,
    private readonly renderer: GameRenderer,
    private readonly inputHandler: InputHandler,
  ) {
    this.setupInputHandling();
  }

  /**
   * 게임 시작을 요청하고 전체 프로세스를 시작하는 메인 메서드
   */
  public async startGame(createGameDto: CreateGameRequestDto): Promise<void> {
    try {
      // 1. REST API로 서버에 게임 생성을 요청합니다.
      const response = await this.gameApiService.createGame(createGameDto);
      
      this.gameId = response.gameId;
      this.gameMode = response.type; // 게임 모드 저장
      
      // 2. 응답에서 사용자 플레이어 ID를 찾아 설정
      if (!response.players || !Array.isArray(response.players)) {
        console.error('Invalid response format:', response);
        throw new Error('Invalid response: players array not found');
      }
      
      const userPlayer = response.players.find(p => p.type === 'user');
      if (!userPlayer) {
        console.error('Available players:', response.players);
        throw new Error('User player not found in game response');
      }
      this.playerId = userPlayer.id;

      // 로컬 멀티플레이어 모드 설정 및 두 번째 플레이어 ID 설정
      if (response.type === 'local_1v1') {
        this.isLocalMultiplayer = true;
        const guestPlayer = response.players.find(p => p.type === 'guest');
        if (guestPlayer) {
          this.player2Id = guestPlayer.id;
        } else {
          console.warn('Guest player not found for local multiplayer game');
        }
      } else {
        this.isLocalMultiplayer = false;
        this.player2Id = null;
      }

      console.log(`Game created: ${this.gameId}, Player: ${this.playerId}, Mode: ${this.gameMode}`);

      // 3. 웹소켓 이벤트 리스너를 미리 등록합니다.
      this.setupWebSocketListeners();

      // 4. 웹소켓 서버에 연결합니다.
      const wsUrl = `ws://localhost:3000/ws/game/${this.gameId}?playerId=${this.playerId}`;
      this.webSocketService.connect(wsUrl);

    } catch (error) {
      console.error('Failed to start game:', error);
      throw error; // 에러를 다시 던져서 호출자가 처리할 수 있도록
    }
  }

  /**
   * 사용자 입력을 처리하는 로직을 InputHandler와 연결합니다.
   * 로컬 멀티플레이어의 경우 두 플레이어의 입력을 모두 처리합니다.
   */
  private setupInputHandling(): void {
    // 기존 리스너 제거 (재설정 시)
    this.inputHandler.off('input', this.handleInput);
    
    // 새 리스너 등록
    this.inputHandler.on('input', this.handleInput);
  }

  private handleInput = (action: 'UP' | 'DOWN' | 'NONE', playerSide?: 'left' | 'right') => {
    if (this.isLocalMultiplayer && playerSide) {
      // 로컬 멀티플레이어: 두 플레이어의 입력을 구분해서 전송
      const targetPlayerId = playerSide === 'left' ? this.playerId : this.player2Id;
      const playerInput: PlayerInputDto = { action };
      
      this.webSocketService.sendMessage({
        type: 'player_input',
        data: {
          playerId: targetPlayerId ?? 0,
          input: playerInput
        }
      });
    } else {
      // 싱글플레이어 또는 온라인: 기존 방식
      const playerInput: PlayerInputDto = { action };
      this.webSocketService.sendMessage({
        type: 'player_input',
        data: {
          playerId: this.playerId ?? 0,
          input: playerInput
        }
      });
    }
  }

  /**
   * 서버로부터 받을 모든 웹소켓 이벤트를 처리할 리스너들을 등록합니다.
   */
  private setupWebSocketListeners(): void {
    this.webSocketService.on('open', () => {
      console.log('WebSocket connected - Game ready');
      // 웹소켓 연결 후 입력 핸들러 활성화 (게임 모드에 따라)
      const isLocalMultiplayer = this.gameMode === 'local_1v1';
      this.inputHandler.activate(isLocalMultiplayer);
    });

    this.webSocketService.on('game_state', (gameState: GameStateDto) => {
      // 서버가 보내준 게임 상태를 받아 렌더러에 넘겨주기만 합니다.
      this.renderer.update(gameState);
    });

    this.webSocketService.on('game_event', (gameEvent: GameEventDto) => {
      // 서버가 보내준 특정 이벤트(카운트다운, 게임 종료 등)를 처리합니다.
      switch (gameEvent.event) {
        case 'countdown':
          // 카운트다운 UI를 화면에 표시
          if (typeof gameEvent.data?.remainingTime === 'number') {
            this.renderer.showCountdown(gameEvent.data.remainingTime);
          }
          break;
        case 'game_end':
          // 게임 종료 모달을 띄우고 결과 표시
          this.showGameEndModal(gameEvent.data);
          this.destroy(); // 게임이 끝났으므로 자원 정리
          // 잠시 후 프로필 페이지로 리디렉션
          setTimeout(() => {
            // router.push('/profile');
          }, 5000);
          break;
        // ... 다른 이벤트 케이스들
      }
    });

    this.webSocketService.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.destroy();
    });
  }

  /**
   * 게임 종료 시 모든 리소스를 정리합니다.
   */
  public destroy(): void {
    console.log('Cleaning up game client...');
    this.webSocketService.disconnect();
    this.inputHandler.deactivate(); // 입력 핸들러 비활성화
    // 등록했던 모든 리스너를 정리할 수 있도록 webSocketService에 offAll 같은 메서드를 추가하면 더 좋습니다.
  }

  // 이 부분은 실제 UI 프레임워크에 맞게 구현 필요
  private showGameEndModal(data: any): void {
    // new GameEndModal(data).show();
    console.log('Game Over. Winner is:', data.winnerId);
  }
}