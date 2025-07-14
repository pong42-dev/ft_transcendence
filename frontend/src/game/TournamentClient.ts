import { GameClient } from './GameClient.js';
import { GameRenderer } from './GameRenderer.js';
import { InputHandler } from './InputHandler.js';
import { WebSocketService } from '../services/websocket/WebSocketService.js';
import { ModalManager } from '../managers/ModalManager.js';
import { TournamentRenderer } from './TournamentRenderer.js';
import { TournamentErrorHandler } from './TournamentErrorHandler.js';
import { UIUtils } from '../utils/UIUtils.js';
import i18next from '../services/i18n.js';



export interface TournamentMatch {
  id: number;
  round_number: number;
  status: string;
  participants: Array<{
    id: number;
    name: string;
    display_name?: string;
    user_id?: number;
    type?: 'user' | 'guest'; // 플레이어 타입 추가
    avatarUrl?: string; // 아바타 URL 추가
  }>;
  winner_id?: number;
  started_at?: string;
  resultSent?: boolean; // 결과 전송 여부 추적
}

export interface TournamentProgress {
  tournament_id: number;
  status: string;
  current_match?: TournamentMatch;
  next_matches: TournamentMatch[];
  completed_matches: TournamentMatch[];
  participants: Array<{
    id: number;
    name: string;
    user_id?: number;
    eliminated: boolean;
  }>;
}

// TournamentMatchResult 타입 실제 선언
export type TournamentMatchResult = {
  matchId: number;
  winnerId: number;
  scores: Array<{ playerId: number; score: number }>;
  participants: Array<{
    id: number;
    name: string;
    type: 'user' | 'guest';
    displayName?: string;
    userId?: number | null;
  }>;
};

export class TournamentClient {
  private container: HTMLElement;
  private tournamentId: number;
  private currentUserId: number | null;
  private gamePage?: { removeBrowserEventListeners: () => void };
  // 현재 활성화된 게임 클라이언트 추적
  private currentGameClient: GameClient | null = null;
  private webSocketService: WebSocketService | null = null;
  private currentMatch: TournamentMatch | null = null; // 현재 매치 정보를 단일 인스턴스로 관리
  private bracketMatches: TournamentMatch[] | null = null; // 브라켓 정보를 저장할 배열
  private modalManager: ModalManager;

  // 브라켓 결과 상태 추가
  private bracketResults: TournamentMatchResult[] = [];
  
  // 타이밍 제어를 위한 상태 추가
  private isProcessingMatch: boolean = false;
  private currentTimeout: number | null = null;

  // UI 렌더링 전담 클래스
  private renderer: TournamentRenderer;
  
  // 오류 처리 전담 클래스
  private errorHandler: TournamentErrorHandler;

  constructor(
    container: HTMLElement,
    tournamentId: number,
    currentUserId: number | null,
    gamePage?: { removeBrowserEventListeners: () => void }
  ) {
    this.container = container;
    this.tournamentId = tournamentId;
    this.currentUserId = currentUserId;
    this.gamePage = gamePage;
    this.modalManager = ModalManager.getInstance();
    this.renderer = new TournamentRenderer(currentUserId, this.bracketResults);
    this.errorHandler = new TournamentErrorHandler();
  }

  public start(): void {
    this.connectToTournament();
  }

  public destroy(): void {
    // 사용자가 의도적으로 종료함을 표시 (오류 메시지 방지)
    this.errorHandler.setManualExit(true);
    
    // 타이머 정리
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    
    // 현재 활성화된 게임 클라이언트 정리
    if (this.currentGameClient) {
      console.log('Destroying current game client during tournament cleanup');
      this.currentGameClient.destroy();
      this.currentGameClient = null;
    }
    
    // WebSocket 연결 정리 (연결이 끊어지면 백엔드에서 자동으로 removePlayer 호출됨)
    this.webSocketService?.disconnect();
    
    this.container.innerHTML = '';
    this.isProcessingMatch = false;
    
    // 오류 핸들러 정리
    this.errorHandler.cleanup();
  }

  private connectToTournament(): void {
    // Validate user ID and tournament ID
    if (!UIUtils.validateUserId(this.currentUserId)) {
      this.errorHandler.handleValidationError('userId');
      this.destroy();
      return;
    }

    if (!UIUtils.validateTournamentId(this.tournamentId)) {
      this.errorHandler.handleValidationError('tournamentId');
      this.destroy();
      return;
    }

    console.log(`Connecting to tournament ${this.tournamentId} with user ${this.currentUserId}`);

    // WebSocketService 인스턴스 생성 및 연결
    this.webSocketService = new WebSocketService();
    const wsUrl = `wss://localhost/ws/tournament/${this.tournamentId}?userId=${this.currentUserId}`;
    this.webSocketService.connect(wsUrl);

    this.webSocketService.on('open', () => {
      console.log('WebSocket connection opened, sending tournament_start message');
      // 연결 성공 시 tournament_start 메시지 자동 전송
      if (this.currentUserId !== null) {
        const message = {
          type: 'tournament_start',
          data: { playerId: this.currentUserId }
        };
        console.log('Sending tournament_start message:', message);
        
        // 짧은 지연 후 메시지 전송 (연결이 완전히 안정화되도록)
        setTimeout(() => {
          const ws = (this.webSocketService as any).socket;
          if (ws && ws.readyState === WebSocket.OPEN) {
            console.log('WebSocket is open, sending JSON message');
            ws.send(JSON.stringify(message));
            console.log('Message sent successfully');
          } else {
            console.error('WebSocket not open, readyState:', ws?.readyState);
          }
        }, 100); // 100ms 지연
      } else {
        console.error('Cannot send tournament_start: currentUserId is null');
      }
    });

    this.webSocketService.on('close', () => {
      console.log('WebSocket connection closed');
    });

    this.webSocketService.on('error', (error: any) => {
      console.error('WebSocket error:', error);
    });

    this.webSocketService.on('tournament_bracket', (data: any) => {
      try {
        this.handleTournamentBracket(data);
      } catch (error) {
        this.errorHandler.handleTournamentBracketError(error);
      }
    });
    this.webSocketService.on('bracket_update', (data: any) => {
      try {
        this.handleBracketUpdate(data);
      } catch (error) {
        this.errorHandler.handleBracketUpdateError(error);
      }
    });
    this.webSocketService.on('match_starting', (data: any) => {
      try {
        this.handleMatchStarting(data);
      } catch (error) {
        this.errorHandler.handleMatchStartingError(error);
        this.isProcessingMatch = false; // Reset processing state on error
      }
    });
    this.webSocketService.on('tournament_end', () => {
      try {
        this.handleTournamentEnd();
      } catch (error) {
        this.errorHandler.handleTournamentEndError(error);
      }
    });
    this.webSocketService.on('error', (error: any) => {
      this.errorHandler.handleWebSocketError(error);
      this.destroy();
    });
    this.webSocketService.on('close', () => {
      const shouldDestroy = this.errorHandler.handleWebSocketClose(this.isProcessingMatch);
      if (shouldDestroy) {
        this.destroy();
      }
    });
  }

  private handleTournamentBracket(data: any): void {
    console.log('Tournament bracket received:', data);
    
    // 백엔드에서 보내는 bracket 구조를 처리
    if (data.bracket && data.bracket.rounds) {
      // bracket.rounds 구조는 일단 빈 배열로 초기화하고 bracket_update를 기다림
      this.bracketMatches = [];
      console.log('Initial bracket received, waiting for bracket_update with matches');
    } else if (data.matches) {
      this.bracketMatches = data.matches;
    } else {
      console.error('Invalid bracket data structure:', data);
      this.bracketMatches = [];
    }
    
    // 토너먼트 시작 시 브라켓을 5초간 표시
    this.showBracketWithCountdown(0, 5, '토너먼트 시작');
  }

  private handleBracketUpdate(data: any): void {
    console.log('Bracket update received:', data);
    if (data && data.matches) {
      this.bracketMatches = data.matches;
      console.log('Updated bracket matches:', this.bracketMatches);
      
      // 현재 브라켓이 화면에 표시되고 있다면 업데이트
      this.updateCurrentBracketDisplay();
    }
  }

  private updateCurrentBracketDisplay(): void {
    // 현재 화면에 브라켓이 표시되고 있는지 확인
    const bracketContainer = this.container.querySelector('.tournament-bracket');
    if (bracketContainer && this.bracketMatches) {
      // 현재 표시된 브라켓 HTML을 새로운 데이터로 교체
      const semiFinals = this.bracketMatches.filter(m => m.round_number === 1);
      const finals = this.bracketMatches.filter(m => m.round_number === 2);
      const newBracketHTML = this.renderer.renderBracketLayoutContainer(semiFinals, finals);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = newBracketHTML;
      const newBracketElement = tempDiv.querySelector('.tournament-bracket');
      
      if (newBracketElement) {
        bracketContainer.parentNode?.replaceChild(newBracketElement, bracketContainer);
      }
    }
  }

  private handleMatchStarting(data: any): void {
    console.log('Match starting, data received:', data);
    
    // 이미 매치 처리 중이면 무시
    if (this.isProcessingMatch) {
      console.log('Already processing a match, ignoring');
      return;
    }
    
    // Validate match data
    if (!UIUtils.validateMatchData(data)) {
      this.errorHandler.handleValidationError('matchData');
      return;
    }
    
    // 현재 매치와 동일한 매치인지 확인 (중복 방지)
    if (this.currentMatch && this.currentMatch.id === data.matchId) {
      console.log('Same match already being processed, ignoring');
      return;
    }
    
    this.isProcessingMatch = true;
    
    const { matchId, gameId, participants, round_number } = data;
    
    // gameId를 문자열로 정규화 (백엔드에서 때로는 숫자, 때로는 문자열로 보냄)
    const normalizedGameId = String(gameId);
    
    this.currentMatch = {
      id: matchId,
      round_number: round_number,
      status: 'starting',
      participants: participants || [],
      winner_id: undefined,
      started_at: undefined,
      resultSent: false
    };
    
    console.log('Current match set to:', this.currentMatch);
    
    // 1. 브라켓과 함께 5초 카운트다운 표시
    this.showBracketWithCountdown(matchId, 5, '매치 시작');
    
    // 2. 5초 후 게임 시작
    this.currentTimeout = window.setTimeout(() => {
      // GameResponseDto 형태로 변환 - 실제 플레이어 정보가 포함되도록 수정
      const gameInfo = {
        gameId: normalizedGameId,
        type: 'tournament' as const,
        status: 'countdown' as const,
        players: participants.map((p: any) => {
          // 전체 참가자 정보에서 아바타 URL 등 추가 정보 찾기
          const fullParticipantInfo = this.bracketMatches
            ?.flatMap(m => m.participants)
            .find(fp => fp.id === p.id);

          return {
            id: p.id,
            type: p.user_id ? 'user' : 'guest',
            name: p.display_name || p.name || `Player${p.id}`,
            avatarUrl: fullParticipantInfo?.avatarUrl || undefined
          };
        })
      };
      
      // 2-1. 이번 매치를 위한 새로운 GameRenderer와 InputHandler 생성
      const renderer = new GameRenderer();
      const inputHandler = new InputHandler();
      
      // 2-2. 기존 토너먼트 WebSocket을 재사용
      const gameWebSocketService = this.webSocketService!;
      
      // 2-3. 이번 매치를 위한 새로운 GameClient 생성하고 콜백을 전달
      this.currentGameClient = new GameClient(
        gameInfo,
        gameWebSocketService,
        renderer,
        inputHandler,
        {
          onPreGameCountdown: (time) => {
            // 게임 카운트다운 중에는 카운트다운 화면 표시
            if (time > 0) {
              this.container.innerHTML = this.renderer.renderGameCountdownContainer(time);
            }
          },
          onGameStart: () => {
            this.container.innerHTML = ''; // 대기 화면 UI 제거
            this.container.appendChild(renderer.render()); // 게임 렌더러의 DOM 요소 추가
          },
          onFinish: (result: any) => {
            console.log('Game finished, processing result and updating bracket');
            
            if (result) {
              try {
                const tournamentResult = this.convertGameResultToTournamentResult(result);
                this.onGameResult(tournamentResult);
                
                // 게임 결과 후 브라켓과 카운트다운 표시 (5초)
                this.showGameResultWithBracket(tournamentResult);
                
              } catch (error) {
                console.error('Error converting game result:', error);
              }
            }

            // 게임 클라이언트 리소스 정리 (하지만 토너먼트 WebSocket은 유지)
            this.currentGameClient?.destroy();
            this.currentGameClient = null;
            this.isProcessingMatch = false; // 매치 처리 완료  
          }
        }
      );
      
      // 2-4. GameClient에 연결 및 이벤트 수신 시작
      this.currentGameClient.connectAndListen();
    }, 5000); // 5초 대기
  }

  /**
   * 브라켓과 함께 카운트다운을 표시하는 메서드
   */
  private showBracketWithCountdown(matchId: number, seconds: number, message: string): void {
    // 브라켓 HTML 생성
    let bracketHTML: string;
    if (this.bracketMatches) {
      const semiFinals = this.bracketMatches.filter(m => m.round_number === 1);
      const finals = this.bracketMatches.filter(m => m.round_number === 2);
      bracketHTML = this.renderer.renderBracketLayoutContainer(semiFinals, finals);
    } else {
      bracketHTML = `<div class="text-center text-terminal-gray">${i18next.t('tournament.client.renderer.loading_bracket')}</div>`;
    }
    
    // 새로운 컴포넌트 시스템 사용
    this.container.innerHTML = this.renderer.renderTournamentWindow(
      i18next.t('tournament.client.renderer.tournament_progress'),
      message,
      bracketHTML,
      { seconds, message: i18next.t('tournament.client.renderer.game_starts_in') },
      'cancel',
      matchId
    );
    
    // 취소 버튼 이벤트 리스너 추가
    const cancelBtn = this.container.querySelector('#cancel-tournament-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.gamePage?.removeBrowserEventListeners();
        this.errorHandler.setManualExit(true);
        this.destroy();
        window.location.href = '/';
      });
    }
    
    // 카운트다운 요소 참조
    const countdownElement = this.container.querySelector('#countdown-number');
    let countdown = seconds;
    
    const updateCountdown = () => {
      countdown--;
      if (countdownElement && countdown >= 0) {
        countdownElement.textContent = countdown.toString();
        if (countdown >= 0) {
          setTimeout(updateCountdown, 1000);
        }
      }
    };
    
    // 1초 후부터 카운트다운 시작
    setTimeout(updateCountdown, 1000);
  }

  private handleTournamentEnd = (): void => {
    console.log('Tournament ended');
    
    // 토너먼트 정상 종료 플래그 설정
    this.errorHandler.setTournamentEnded(true);
    
    // 타이머 정리
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    
    // 토너먼트 종료 시 모든 모달 닫기
    this.modalManager.hide();
    this.isProcessingMatch = false;
    
    // 즉시 최종 토너먼트 결과 표시
    this.showFinalTournamentResultModal();
  };

  /**
   * 게임 결과와 함께 업데이트된 브라켓을 표시하는 메서드
   */
  private showGameResultWithBracket(result: TournamentMatchResult): void {
    // 우승자 정보 표시
    const winnerInfo = result.participants.find(p => p.id === result.winnerId);
    const winnerName = winnerInfo ? (winnerInfo.displayName || winnerInfo.name) : 'Unknown';
    
    // 브라켓 HTML 생성
    let bracketHTML: string;
    if (this.bracketMatches) {
      const semiFinals = this.bracketMatches.filter(m => m.round_number === 1);
      const finals = this.bracketMatches.filter(m => m.round_number === 2);
      bracketHTML = this.renderer.renderBracketLayoutContainer(semiFinals, finals);
    } else {
      bracketHTML = `<div class="text-center text-terminal-gray">${i18next.t('tournament.client.renderer.loading_bracket')}</div>`;
    }
    
    // 새로운 컴포넌트 시스템 사용
    this.container.innerHTML = this.renderer.renderTournamentWindow(
      i18next.t('tournament.client.renderer.match_result'),
      i18next.t('tournament.client.renderer.winner', { winnerName }),
      bracketHTML,
      { seconds: 5, message: i18next.t('tournament.client.renderer.next_match_in') },
      'cancel',
      result.matchId
    );
    
    // 카운트다운 요소 참조
    const countdownElement = this.container.querySelector('#countdown-number');
    let countdown = 5;
    
    const updateCountdown = () => {
      countdown--;
      if (countdownElement && countdown >= 0) {
        countdownElement.textContent = countdown.toString();
        if (countdown >= 0) {
          setTimeout(updateCountdown, 1000);
        }
      }
    };
    
    // 1초 후부터 카운트다운 시작
    setTimeout(updateCountdown, 1000);
  }

  // GameResult를 TournamentMatchResult로 변환하는 헬퍼 메서드
  private convertGameResultToTournamentResult(gameResult: any): TournamentMatchResult {
    if (!this.currentMatch) {
      throw new Error('Current match is not available for result conversion');
    }

    // Validate game result before processing
    if (!UIUtils.validateGameResult(gameResult)) {
      throw new Error('Invalid game result data');
    }

    console.log('Converting game result:', gameResult);
    console.log('Current match:', this.currentMatch);

    const matchId = this.currentMatch.id;
    
    // 참가자 정보를 더 정확하게 매핑
    const participants = this.currentMatch.participants.map((p, index) => {
      // 실제 이름 우선순위: display_name > name > fallback
      let displayName = p.display_name || p.name;
      
      // 만약 여전히 Player 1, Player 2 같은 기본값이면 gameResult에서 찾아보기
      if (!displayName || displayName.startsWith('Player')) {
        if (index === 0 && gameResult.leftPlayer?.name) {
          displayName = gameResult.leftPlayer.name;
        } else if (index === 1 && gameResult.rightPlayer?.name) {
          displayName = gameResult.rightPlayer.name;
        }
      }
      
      return {
        id: p.id || index + 1,
        name: displayName || `Player ${index + 1}`,
        type: (p.type || 'guest') as 'user' | 'guest',
        displayName: displayName,
        userId: p.user_id || null
      };
    });

    // GameResult에서 winnerId 추출 (더 안전한 방식)
    let winnerId: number;
    const leftScore = gameResult.leftPlayer?.score || 0;
    const rightScore = gameResult.rightPlayer?.score || 0;
    
    if (gameResult.winner === 'left' || leftScore > rightScore) {
      winnerId = participants[0]?.id || 1;
    } else {
      winnerId = participants[1]?.id || 2;
    }

    // 점수 정보 생성
    const scores = [
      {
        playerId: participants[0]?.id || 1,
        score: leftScore
      },
      {
        playerId: participants[1]?.id || 2,
        score: rightScore
      }
    ];

    const result: TournamentMatchResult = {
      matchId,
      winnerId,
      scores,
      participants
    };

    console.log('Converted tournament result:', result);
    return result;
  }

  // result를 받아 브라켓 상태를 갱신하고 렌더링하는 public 메서드
  public onGameResult(result: TournamentMatchResult) {
    const idx = this.bracketResults.findIndex(r => r.matchId === result.matchId);
    if (idx >= 0) {
      this.bracketResults[idx] = result;
    } else {
      this.bracketResults.push(result);
    }
    
    // 렌더러의 브라켓 결과 업데이트
    this.renderer.updateBracketResults(this.bracketResults);
  }

  // TournamentClient에 최종 토너먼트 결과 모달을 띄우는 메서드 (홈으로 버튼 있음)
  public showFinalTournamentResultModal() {
    // 토너먼트 정상 종료 플래그 설정 (만약 이전에 설정되지 않았다면)
    this.errorHandler.setTournamentEnded(true);
    
    // 최종 우승자 찾기
    const finalMatch = this.bracketMatches?.find(m => m.round_number === 2);
    const winnerId = finalMatch?.winner_id;
    const winner = finalMatch?.participants?.find(p => p.id === winnerId);
    const winnerName = winner ? (winner.display_name || winner.name) : 'Unknown';
    
    // 기존 브라켓 렌더링 함수 재사용
    let bracketHTML: string;
    if (this.bracketMatches) {
      const semiFinals = this.bracketMatches.filter(m => m.round_number === 1);
      const finals = this.bracketMatches.filter(m => m.round_number === 2);
      bracketHTML = this.renderer.renderBracketLayoutContainer(semiFinals, finals);
    } else {
      bracketHTML = `<div class="text-center text-terminal-red">${i18next.t('tournament.client.errorHandler.websocket_errors.connection_error')}</div>`;
    }
    
    // 새로운 컴포넌트 시스템 사용 (카운트다운 없음)
    this.container.innerHTML = this.renderer.renderTournamentWindow(
      i18next.t('tournament.client.renderer.tournament_complete'),
      i18next.t('tournament.client.renderer.champion', { winnerName }),
      bracketHTML,
      undefined, // 카운트다운 없음
      'home' // 홈 버튼
    );
    
    // 홈 버튼 이벤트 리스너 추가
    const homeBtn = this.container.querySelector('#home-btn');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        this.gamePage?.removeBrowserEventListeners();
        window.location.href = '/';
      });
    }
  }

  /**
   * 토너먼트를 강제로 중단합니다 (예상치 못한 종료 상황에서 호출)
   */
  public forceStop(): void {
    console.log('Force stopping tournament client');
    
    // 사용자가 의도적으로 종료함을 표시 (오류 메시지 방지)
    this.errorHandler.setManualExit(true);
    
    // 토너먼트 종료 플래그 설정
    this.errorHandler.setTournamentEnded(true);
    this.isProcessingMatch = false;
    
    // 정리 작업 수행
    this.destroy();
  }

}
