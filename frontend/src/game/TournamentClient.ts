import { GameClient } from './GameClient';
import { GameRenderer } from './GameRenderer';
import { InputHandler } from './InputHandler';
import { WebSocketService } from '../services/websocket/WebSocketService';
import { ModalManager, ModalContent } from '../managers/ModalManager';
import { TournamentRenderer } from './TournamentRenderer';



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
  
  // 토너먼트 종료 상태 추가
  private tournamentEnded: boolean = false;
  
  // 사용자가 의도적으로 종료했는지 추적 (오류 메시지 표시 방지용)
  private isManualExit: boolean = false;

  // UI 렌더링 전담 클래스
  private renderer: TournamentRenderer;

  constructor(
    container: HTMLElement,
    tournamentId: number,
    currentUserId: number | null
  ) {
    this.container = container;
    this.tournamentId = tournamentId;
    this.currentUserId = currentUserId;
    this.modalManager = ModalManager.getInstance();
    this.renderer = new TournamentRenderer(currentUserId, this.bracketResults);
  }

  public start(): void {
    this.connectToTournament();
  }

  public destroy(): void {
    // 사용자가 의도적으로 종료함을 표시 (오류 메시지 방지)
    this.isManualExit = true;
    
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
  }

  private connectToTournament(): void {
    // Validate user ID and tournament ID
    if (!this.validateUserId(this.currentUserId)) {
      this.showErrorMessage('유효하지 않은 사용자 ID입니다.');
      this.destroy();
      return;
    }

    if (!this.validateTournamentId(this.tournamentId)) {
      this.showErrorMessage('유효하지 않은 토너먼트 ID입니다.');
      this.destroy();
      return;
    }

    console.log(`Connecting to tournament ${this.tournamentId} with user ${this.currentUserId}`);

    // WebSocketService 인스턴스 생성 및 연결
    this.webSocketService = new WebSocketService();
    const wsUrl = `ws://localhost:3000/ws/tournament/${this.tournamentId}?userId=${this.currentUserId}`;
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
        console.error('Error handling tournament bracket:', error);
        this.showErrorMessage('브라켓 정보 처리 중 오류가 발생했습니다.');
      }
    });
    this.webSocketService.on('bracket_update', (data: any) => {
      try {
        this.handleBracketUpdate(data);
      } catch (error) {
        console.error('Error handling bracket update:', error);
        this.showErrorMessage('브라켓 업데이트 중 오류가 발생했습니다.');
      }
    });
    this.webSocketService.on('match_starting', (data: any) => {
      try {
        this.handleMatchStarting(data);
      } catch (error) {
        console.error('Error handling match starting:', error);
        this.showErrorMessage('매치 시작 중 오류가 발생했습니다.');
        this.isProcessingMatch = false; // Reset processing state on error
      }
    });
    this.webSocketService.on('tournament_end', () => {
      try {
        this.handleTournamentEnd();
      } catch (error) {
        console.error('Error handling tournament end:', error);
        this.showErrorMessage('토너먼트 종료 처리 중 오류가 발생했습니다.');
      }
    });
    this.webSocketService.on('error', (error: any) => {
      console.error('WebSocket error:', error);
      this.showErrorMessage('토너먼트 연결 중 오류가 발생했습니다. 다시 시도해주세요.');
      this.destroy();
    });
    this.webSocketService.on('close', () => {
      console.log('WebSocket connection closed');
      // 토너먼트가 정상 종료된 경우에는 연결이 끊어져도 결과 화면 유지
      if (this.tournamentEnded) {
        console.log('Tournament ended normally, keeping result screen');
        return;
      }
      
      // 토너먼트가 정상 종료되지 않고 매치 처리 중이 아닌 경우, 그리고 사용자가 의도적으로 종료하지 않은 경우에만 오류 표시
      if (!this.isProcessingMatch && !this.isManualExit) {
        this.showErrorMessage('토너먼트 연결이 끊어졌습니다.');
        // 현재 게임도 함께 정리
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
      const newBracketHTML = this.renderer.renderBracket(semiFinals, finals);
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
    if (!this.validateMatchData(data)) {
      this.showErrorMessage('매치 데이터가 유효하지 않습니다.');
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
              this.container.innerHTML = this.renderer.renderGameCountdown(time);
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
      bracketHTML = this.renderer.renderBracket(semiFinals, finals);
    } else {
      bracketHTML = '<div class="text-center text-terminal-gray">브라켓 정보를 불러오는 중...</div>';
    }
    
    // 새로운 컴포넌트 시스템 사용
    this.container.innerHTML = this.renderer.renderTournamentWindow(
      '🏆 토너먼트 진행 중 🏆',
      message,
      bracketHTML,
      { seconds, message: '게임 시작까지' },
      'cancel',
      matchId
    );
    
    // 취소 버튼 이벤트 리스너 추가
    const cancelBtn = this.container.querySelector('#cancel-tournament-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.isManualExit = true;
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
    this.tournamentEnded = true;
    
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
      bracketHTML = this.renderer.renderBracket(semiFinals, finals);
    } else {
      bracketHTML = '<div class="text-center text-terminal-gray">브라켓 정보를 불러오는 중...</div>';
    }
    
    // 새로운 컴포넌트 시스템 사용
    this.container.innerHTML = this.renderer.renderTournamentWindow(
      '🏆 매치 결과 🏆',
      `승자: ${winnerName}`,
      bracketHTML,
      { seconds: 5, message: '다음 매치까지' },
      'cancel',
      result.matchId
    );
    
    // 취소 버튼 이벤트 리스너 추가
    const cancelBtn = this.container.querySelector('#cancel-tournament-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.isManualExit = true;
        this.destroy();
        window.location.href = '/';
      });
    }
    
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
    if (!this.validateGameResult(gameResult)) {
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
    this.tournamentEnded = true;
    
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
      bracketHTML = this.renderer.renderBracket(semiFinals, finals);
    } else {
      bracketHTML = '<div class="text-center text-terminal-red">브라켓 정보를 불러올 수 없습니다.</div>';
    }
    
    // 새로운 컴포넌트 시스템 사용 (카운트다운 없음)
    this.container.innerHTML = this.renderer.renderTournamentWindow(
      '🏆 토너먼트 완료! 🏆',
      `우승자: ${winnerName} - 축하합니다!`,
      bracketHTML,
      undefined, // 카운트다운 없음
      'home' // 홈 버튼
    );
    
    // 홈 버튼 이벤트 리스너 추가
    const homeBtn = this.container.querySelector('#home-btn');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
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
    this.isManualExit = true;
    
    // 토너먼트 종료 플래그 설정
    this.tournamentEnded = true;
    this.isProcessingMatch = false;
    
    // 정리 작업 수행
    this.destroy();
  }

  // Input validation and sanitization methods
  private validateUserId(userId: any): boolean {
    return typeof userId === 'number' && userId > 0 && Number.isInteger(userId);
  }

  private validateTournamentId(tournamentId: any): boolean {
    return typeof tournamentId === 'number' && tournamentId > 0 && Number.isInteger(tournamentId);
  }

  private validateMatchData(data: any): boolean {
    console.log('Validating match data:', data);
    if (!data || typeof data !== 'object') {
      console.log('Invalid: data is not an object');
      return false;
    }
    
    // Check required fields
    if (!data.matchId || typeof data.matchId !== 'number' || data.matchId <= 0) {
      console.log('Invalid: matchId is invalid', data.matchId);
      return false;
    }
    if (!data.participants || !Array.isArray(data.participants)) {
      console.log('Invalid: participants is not an array');
      return false;
    }
    if (data.participants.length !== 2) {
      console.log('Invalid: participants length is not 2', data.participants.length);
      return false;
    }
    
    // Validate participants
    for (const participant of data.participants) {
      if (!participant || typeof participant !== 'object') {
        console.log('Invalid: participant is not an object', participant);
        return false;
      }
      if (!participant.id || !this.validateUserId(participant.id)) {
        console.log('Invalid: participant id is invalid', participant.id);
        return false;
      }
      if (!participant.name && !participant.display_name) {
        console.log('Invalid: participant has no name or display_name', participant);
        return false;
      }
      const name = participant.name || participant.display_name;
      if (typeof name !== 'string' || name.length > 50) {
        console.log('Invalid: participant name is invalid', name);
        return false;
      }
    }
    
    console.log('Match data validation passed');
    return true;
  }

  // Validation method for game results before sending to server
  private validateGameResult(gameResult: any): boolean {
    console.log('Validating game result:', gameResult);
    
    if (!gameResult || typeof gameResult !== 'object') {
      console.log('Invalid: gameResult is not an object');
      return false;
    }
    
    // Validate score range (typical Pong scores should be reasonable)
    const leftScore = gameResult.leftPlayer?.score || 0;
    const rightScore = gameResult.rightPlayer?.score || 0;
    
    console.log('Scores - Left:', leftScore, 'Right:', rightScore);
    
    if (typeof leftScore !== 'number' || typeof rightScore !== 'number') {
      console.log('Invalid: scores are not numbers');
      return false;
    }
    if (leftScore < 0 || rightScore < 0) {
      console.log('Invalid: negative scores');
      return false;
    }
    if (leftScore > 100 || rightScore > 100) {
      console.log('Invalid: scores too high');
      return false;
    }
    
    // Validate winner
    const winner = gameResult.winner;
    console.log('Winner:', winner);
    
    if (winner !== 'left' && winner !== 'right') {
      console.log('Invalid: winner is not left or right');
      return false;
    }
    
    // 승자 검증을 더 관대하게 수정 (동점인 경우도 허용)
    if (winner === 'left' && leftScore < rightScore) {
      console.log('Invalid: left winner but right score is higher');
      return false;
    }
    if (winner === 'right' && rightScore < leftScore) {
      console.log('Invalid: right winner but left score is higher');
      return false;
    }
    
    console.log('Game result validation passed');
    return true;
  }

  private sanitizeDisplayName(name: string): string {
    if (typeof name !== 'string') return 'Unknown Player';
    
    // Remove potentially dangerous characters and limit length
    return name
      .replace(/[<>&"']/g, '') // Remove HTML special characters
      .trim()
      .substring(0, 50) || 'Unknown Player';
  }

  private showErrorMessage(message: string): void {
    console.error('Tournament error:', message);
    
    // 사용자가 의도적으로 종료한 경우 오류 메시지를 표시하지 않음
    if (this.isManualExit) {
      console.log('Skipping error message due to manual exit');
      return;
    }
    
    // Show user-friendly error message
    const errorModal: ModalContent = {
      title: '⚠️ 오류',
      content: () => {
        const el = document.createElement('div');
        el.className = 'text-center p-4';
        el.innerHTML = `
          <div class="text-terminal-red mb-4">${this.sanitizeDisplayName(message)}</div>
          <button class="px-4 py-2 bg-terminal-green text-terminal-black rounded hover:bg-terminal-yellow transition-colors">
            확인
          </button>
        `;
        
        el.querySelector('button')?.addEventListener('click', () => {
          this.modalManager.hide();
        });
        
        return el;
      },
      onShow: () => {},
      onClose: () => {},
      config: { closable: true }
    };
    
    this.modalManager.show(errorModal);
  }
}
