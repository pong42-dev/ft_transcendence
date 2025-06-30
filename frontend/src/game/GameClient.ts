// frontend/src/game/GameClient.ts

import { WebSocketService } from '../services/websocket/WebSocketService';
import { GameApiService } from '../services/api/GameApiService';
import { GameRenderer } from './GameRenderer';
import { InputHandler } from './InputHandler';
import { CreateGameRequestDto } from '../types/types';
import { GameStateDto, GameEventDto, PlayerInputDto } from '../types/game-websocket';

export class GameClient {
  private gameId: string | null = null;
  private playerId: number | null = null; // 이 클라이언트를 사용하는 플레이어의 ID

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
      // 중요: 이 클라이언트를 사용하는 플레이어의 ID를 어딘가에서 받아와야 합니다.
      // 예시: this.playerId = getMyPlayerIdFromAuthState();

      console.log(`Game session created with ID: ${this.gameId}`);

      // 2. 웹소켓 이벤트 리스너를 미리 등록합니다.
      this.setupWebSocketListeners();

      // 3. 웹소켓 서버에 연결합니다.
      const wsUrl = `/ws/game/${this.gameId}?playerId=${this.playerId}`;
      this.webSocketService.connect(wsUrl);

    } catch (error) {
      console.error('Failed to start game:', error);
      // 사용자에게 에러 알림 UI 표시
    }
  }

  /**
   * 사용자 입력을 처리하는 로직을 InputHandler와 연결합니다.
   */
  private setupInputHandling(): void {
    // InputHandler가 키 입력을 감지하면, 이 콜백 함수를 실행합니다.
    this.inputHandler.on('input', (action: 'UP' | 'DOWN') => {
      // 받은 입력을 서버로 전송합니다.
      const playerInput: PlayerInputDto = { action };
      this.webSocketService.sendMessage({
        type: 'player_input',
        data: {
          playerId: this.playerId ?? 0,
          input: playerInput
        }
      });
    });
  }

  /**
   * 서버로부터 받을 모든 웹소켓 이벤트를 처리할 리스너들을 등록합니다.
   */
  private setupWebSocketListeners(): void {
    this.webSocketService.on('open', () => {
      console.log('WebSocket connection established. Ready to play!');
      // 필요시, 'player_ready' 같은 메시지를 보내 준비 상태를 알릴 수 있습니다.
    });

    this.webSocketService.on('game_state', (gameState: GameStateDto) => {
      // 서버가 보내준 게임 상태를 받아 렌더러에 넘겨주기만 합니다.
      this.renderer.update(gameState);
    });

    this.webSocketService.on('game_event', (gameEvent: GameEventDto) => {
      console.log('Game event received:', gameEvent.event);
      // 서버가 보내준 특정 이벤트(카운트다운, 게임 종료 등)를 처리합니다.
      switch (gameEvent.event) {
        case 'countdown':
          // 카운트다운 UI를 화면에 표시
          this.renderer.showCountdown(gameEvent.data?.remainingTime);
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