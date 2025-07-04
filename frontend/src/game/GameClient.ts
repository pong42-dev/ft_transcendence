// frontend/src/game/GameClient.ts

import { WebSocketService } from '../services/websocket/WebSocketService';
import { GameRenderer } from './GameRenderer';
import { InputHandler } from './InputHandler';
import { GameResponseDto, GameResult } from '../types/types';
import { GameStateDto, GameEventDto, WSPlayerInputMessage } from '../types/game-websocket';
import { GameEndModal } from '../components/modals/GameEndModal';

export class GameClient {
  // 게임 세션 정보
  private gameId: string | null = null;
  private gameMode: string | null = null;
  
  // 플레이어 ID 정보
  private playerId: number | null = null;   // '나'의 ID 또는 로컬 1P
  private player2Id: number | null = null;  // 로컬 2P의 ID
  
  private isLocalMultiplayer: boolean = false;
  private playerInfoUpdated: boolean = false; // 플레이어 정보 업데이트 여부
  private onFinishCallback: () => void;
  
  // 게임 상태 추적
  private currentScores = { left: 0, right: 0 };
  private gameEnded = false; // 게임이 정상적으로 끝났는지 추적

  constructor(
    private readonly gameInfo: GameResponseDto,
    private readonly webSocketService: WebSocketService,
    private readonly renderer: GameRenderer,
    private readonly inputHandler: InputHandler,
    onFinish: () => void,
  ) {
    this.onFinishCallback = onFinish;
  }

  public async startGame(): Promise<void> {
    try {
      this.gameId = this.gameInfo.gameId;
      this.gameMode = this.gameInfo.type;

      this.isLocalMultiplayer = this.gameMode === 'local_1v1';
      
      // 플레이어 ID 설정
      const userPlayer = this.gameInfo.players.find(p => p.type === 'user');
      if (!userPlayer) throw new Error('User player not found');
      this.playerId = userPlayer.id;

      if (this.isLocalMultiplayer) {
        const guestPlayer = this.gameInfo.players.find(p => p.type === 'guest');
        this.player2Id = guestPlayer?.id ?? null;
      }

      this.setupWebSocketListeners();
      this.setupInputHandling();

      const backendHost = 'localhost:3000';
      const wsUrl = `ws://${backendHost}/ws/game/${this.gameId}?playerId=${this.playerId}`;
      this.webSocketService.connect(wsUrl);

    } catch (error) {
      console.error('Failed to start game:', error);
      this.onFinishCallback(); // 에러 발생 시 종료
      throw error;
    }
  }

  /**
   * [반영 완료] 사용자 입력을 처리하여 웹소켓 메시지를 전송하는 메서드
   */
  private handleInput = (action: 'UP' | 'DOWN' | 'NONE', playerSide?: 'left' | 'right') => {
    if (this.isLocalMultiplayer && playerSide) {
      // 로컬 멀티플레이어: 'left' 또는 'right' 사이드에 따라 ID를 결정하여 전송
      const targetPlayerId = playerSide === 'left' ? this.playerId : this.player2Id;
      
      // targetPlayerId가 null이 아닌지 확인 후 전송
      if (targetPlayerId !== null) {
        const message: WSPlayerInputMessage = {
          type: 'player_input',
          data: {
            playerId: targetPlayerId,
            input: { action }
          }
        };
        this.webSocketService.sendMessage(message);
      }
    } else if (!this.isLocalMultiplayer) {
      // 싱글플레이어 (vs AI): 자신의 ID로만 전송
      if (this.playerId !== null) {
        const message: WSPlayerInputMessage = {
          type: 'player_input',
          data: {
            playerId: this.playerId,
            input: { action }
          }
        };
        this.webSocketService.sendMessage(message);
      }
    }
  }
  
  private setupInputHandling(): void {
    this.inputHandler.on('input', this.handleInput);
  }

  private setupWebSocketListeners(): void {
    this.webSocketService.on('open', this.handleConnectionOpen);
    this.webSocketService.on('game_state', this.handleGameState);
    this.webSocketService.on('game_event', this.handleGameEvent);
    this.webSocketService.on('error', this.handleError);
    this.webSocketService.on('close', this.handleConnectionClose);
  }
  
  private handleConnectionOpen = () => {
    this.inputHandler.activate(this.isLocalMultiplayer);
  }

  /**
   * GameInfo에서 플레이어 정보를 추출하여 렌더러에 업데이트
   */
  private updatePlayerInfoFromGameInfo(): void {
    console.log('updatePlayerInfoFromGameInfo called');
    console.log('Game info:', this.gameInfo);
    
    const players = this.gameInfo.players;
    const userPlayer = players.find(p => p.type === 'user');
    const guestPlayer = players.find(p => p.type === 'guest');

    let leftPlayerName: string;
    let rightPlayerName: string;
    let leftPlayerAvatar: string | undefined;
    let rightPlayerAvatar: string | undefined;

    if (this.gameMode === 'ai_1v1') {
      // AI 모드: AI가 왼쪽, 유저가 오른쪽
      leftPlayerName = 'AI';
      rightPlayerName = userPlayer?.name || 'Player';
      leftPlayerAvatar = undefined; // AI는 기본 아바타 사용
      rightPlayerAvatar = userPlayer?.avatarUrl;
      
    } else if (this.gameMode === 'local_1v1') {
      // 로컬 모드: 유저가 왼쪽, 게스트가 오른쪽
      leftPlayerName = userPlayer?.name || 'Player 1';
      rightPlayerName = guestPlayer?.name || 'Player 2';
      leftPlayerAvatar = userPlayer?.avatarUrl;
      rightPlayerAvatar = guestPlayer?.avatarUrl;
      
    } else {
      // 기본값 (다른 모드들)
      leftPlayerName = players[0]?.name || 'Player 1';
      rightPlayerName = players[1]?.name || 'Player 2';
      leftPlayerAvatar = players[0]?.avatarUrl;
      rightPlayerAvatar = players[1]?.avatarUrl;
    }

    console.log('Player info:', {
      leftPlayerName,
      rightPlayerName,
      leftPlayerAvatar,
      rightPlayerAvatar
    });

    // 렌더러에 플레이어 정보 업데이트 (아바타 포함)
    this.renderer.updatePlayerInfoWithAvatar(
      { name: leftPlayerName, avatarUrl: leftPlayerAvatar },
      { name: rightPlayerName, avatarUrl: rightPlayerAvatar }
    );
  }

  private handleGameState = (gameState: GameStateDto) => {
    this.renderer.update(gameState);
    
    // 첫 번째 게임 상태에서 플레이어 정보 업데이트
    if (!this.playerInfoUpdated) {
      console.log('Updating player info from game info...');
      this.updatePlayerInfoFromGameInfo();
      this.playerInfoUpdated = true;
    }
    
    // 점수 업데이트
    this.currentScores.left = gameState.scores.player1;
    this.currentScores.right = gameState.scores.player2;
  }

  private handleGameEvent = (gameEvent: GameEventDto) => {
    switch (gameEvent.event) {
      case 'countdown':
        this.renderer.showCountdown(gameEvent.data?.remainingTime);
        break;
      case 'round_start':
        this.renderer.showBall();
        break;
      case 'round_end':
        // 라운드 종료 시 특별한 처리 없음 (점수는 gameState에서 업데이트됨)
        break;
      case 'game_end':
        this.handleGameEnd(gameEvent.data?.winnerId, gameEvent.data?.finalScores);
        break;
    }
  }

  private handleGameEnd(winnerId?: number, finalScores?: { player1: number; player2: number }): void {
    // 게임 종료 처리
    this.gameEnded = true; // 게임이 정상적으로 끝났음을 표시
    this.inputHandler.deactivate();
    
    // 최종 점수 사용 (백엔드에서 제공된 경우) 또는 현재 점수 사용
    const scores = finalScores ? 
      { left: finalScores.player1, right: finalScores.player2 } : 
      this.currentScores;
    
    // 최종 라운드 수 계산 (총 점수 합계)
    const finalTotalRounds = scores.left + scores.right;
    
    // 게임 결과 데이터 구성
    const players = this.gameInfo.players;
    const userPlayer = players.find(p => p.type === 'user');
    const aiPlayer = players.find(p => p.type === 'ai');
    const guestPlayer = players.find(p => p.type === 'guest');
    
    let leftPlayer: { nickname: string; score: number; avatarUrl?: string };
    let rightPlayer: { nickname: string; score: number; avatarUrl?: string };
    let winner: 'left' | 'right';
    
    if (this.gameMode === 'ai_1v1') {
      // AI 모드: AI가 왼쪽, 유저가 오른쪽
      leftPlayer = {
        nickname: 'AI',
        score: scores.left
      };
      rightPlayer = {
        nickname: userPlayer?.name || 'Player',
        score: scores.right
      };
      
      // 승자 결정: AI가 이기면 left, 유저가 이기면 right
      winner = winnerId === aiPlayer?.id ? 'left' : 'right';
      
    } else if (this.gameMode === 'local_1v1') {
      // 로컬 모드: 유저가 왼쪽, 게스트가 오른쪽
      leftPlayer = {
        nickname: userPlayer?.name || 'Player 1',
        score: scores.left
      };
      rightPlayer = {
        nickname: guestPlayer?.name || 'Player 2',
        score: scores.right
      };
      
      // 승자 결정
      winner = winnerId === userPlayer?.id ? 'left' : 'right';
      
    } else {
      // 기본값 (다른 모드)
      leftPlayer = {
        nickname: players[0]?.name || 'Player 1',
        score: scores.left
      };
      rightPlayer = {
        nickname: players[1]?.name || 'Player 2', 
        score: scores.right
      };
      winner = winnerId === players[0]?.id ? 'left' : 'right';
    }
    
    // GameResult 객체 생성
    const gameResult: GameResult = {
      winner,
      leftPlayer,
      rightPlayer,
      totalRounds: finalTotalRounds,
      gameMode: 'regular' as const
    };

    // GameEndModal 띄우기
    const gameEndModal = new GameEndModal(
      gameResult,
      false, // isTournament
      false, // isFinal
      () => {
        // onProfileClick - 프로필 보기하고 게임 종료
        this.onFinishCallback();
      },
      undefined, // onNextMatch - 토너먼트가 아니므로 불필요
      () => {
        // onGameFinish - Close 버튼을 눌렀을 때만 게임 종료
        this.onFinishCallback();
      }
    );

    gameEndModal.show();
  }
  
  private handleError = (error: any) => {
    console.error('WebSocket error:', error);
    // 게임이 정상적으로 끝나지 않은 경우에만 콜백 호출
    if (!this.gameEnded) {
      this.onFinishCallback();
    }
  }

  private handleConnectionClose = () => {
    console.warn('WebSocket connection closed.');
    // 게임이 정상적으로 끝나지 않은 경우에만 콜백 호출
    if (!this.gameEnded) {
      this.onFinishCallback();
    }
  }

  public destroy(): void {
    this.webSocketService.off('open', this.handleConnectionOpen);
    this.webSocketService.off('game_state', this.handleGameState);
    this.webSocketService.off('game_event', this.handleGameEvent);
    this.webSocketService.off('error', this.handleError);
    this.webSocketService.off('close', this.handleConnectionClose);
    this.inputHandler.off('input', this.handleInput);
    this.webSocketService.disconnect();
    this.inputHandler.deactivate();
  }
}