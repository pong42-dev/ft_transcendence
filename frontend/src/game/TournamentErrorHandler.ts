import { ModalManager, ModalContent } from '../managers/ModalManager.js';
import i18next from '../services/i18n.js';

/**
 * TournamentErrorHandler - 토너먼트 관련 오류 및 비정상 종료 처리 전담 클래스
 * 
 * TournamentClient에서 오류 처리 로직을 분리하여
 * 에러 핸들링 관련 코드를 별도로 관리합니다.
 */
export class TournamentErrorHandler {
  private modalManager: ModalManager;
  private isManualExit: boolean = false;
  private tournamentEnded: boolean = false;
  private isPageUnloading: boolean = false;
  private lastErrorTime: number = 0;
  private errorDebounceMs: number = 1000; // 1초 내 중복 에러 방지

  constructor() {
    this.modalManager = ModalManager.getInstance();
    this.setupPageUnloadListener();
  }

  /**
   * 사용자가 의도적으로 종료했는지 설정
   */
  setManualExit(isManual: boolean): void {
    this.isManualExit = isManual;
  }

  /**
   * 토너먼트 종료 상태 설정
   */
  setTournamentEnded(ended: boolean): void {
    this.tournamentEnded = ended;
  }

  /**
   * 사용자가 의도적으로 종료했는지 확인
   */
  isManuallyExited(): boolean {
    return this.isManualExit;
  }

  /**
   * 토너먼트가 종료되었는지 확인
   */
  isTournamentEnded(): boolean {
    return this.tournamentEnded;
  }

  /**
   * WebSocket 연결 오류 처리
   */
  handleWebSocketError(error: any): void {
    console.error('WebSocket error:', error);
    this.showErrorMessage(i18next.t('tournament.client.errorHandler.websocket_errors.connection_error'));
  }

  /**
   * WebSocket 연결 종료 처리
   */
  handleWebSocketClose(isProcessingMatch: boolean): boolean {
    console.log('WebSocket connection closed');
    
    // 페이지 언로드 중이면 오류 메시지를 표시하지 않음
    if (this.isPageUnloading) {
      console.log('Page is unloading, skipping error message');
      return false; // 추가 처리 불필요
    }
    
    // 토너먼트가 정상 종료된 경우에는 연결이 끊어져도 결과 화면 유지
    if (this.tournamentEnded) {
      console.log('Tournament ended normally, keeping result screen');
      return false; // 추가 처리 불필요
    }
    
    // 사용자가 의도적으로 종료한 경우 오류 메시지 표시하지 않음
    if (this.isManualExit) {
      console.log('Manual exit detected, skipping error message');
      return false; // 추가 처리 불필요
    }
    
    // 토너먼트가 정상 종료되지 않고 매치 처리 중이 아닌 경우에만 오류 표시
    if (!isProcessingMatch) {
      this.showErrorMessage(i18next.t('tournament.client.errorHandler.websocket_errors.connection_closed'));
      return true; // 추가 정리 작업 필요
    }
    
    return false;
  }

  /**
   * 매치 시작 오류 처리
   */
  handleMatchStartingError(error: any): void {
    console.error('Error handling match starting:', error);
    this.showErrorMessage(i18next.t('tournament.client.errorHandler.tournament_errors.match_starting_error'));
  }

  /**
   * 브라켓 업데이트 오류 처리
   */
  handleBracketUpdateError(error: any): void {
    console.error('Error handling bracket update:', error);
    this.showErrorMessage(i18next.t('tournament.client.errorHandler.tournament_errors.bracket_update_error'));
  }

  /**
   * 토너먼트 브라켓 처리 오류
   */
  handleTournamentBracketError(error: any): void {
    console.error('Error handling tournament bracket:', error);
    this.showErrorMessage(i18next.t('tournament.client.errorHandler.tournament_errors.bracket_processing_error'));
  }

  /**
   * 토너먼트 종료 오류 처리
   */
  handleTournamentEndError(error: any): void {
    console.error('Error handling tournament end:', error);
    this.showErrorMessage(i18next.t('tournament.client.errorHandler.tournament_errors.tournament_end_error'));
  }

  /**
   * 유효성 검증 오류 처리
   */
  handleValidationError(field: string): void {
    const messages: Record<string, string> = {
      'userId': i18next.t('tournament.client.errorHandler.validation_errors.invalid_user_id'),
      'tournamentId': i18next.t('tournament.client.errorHandler.validation_errors.invalid_tournament_id'),
      'matchData': i18next.t('tournament.client.errorHandler.validation_errors.invalid_match_data'),
      'gameResult': i18next.t('tournament.client.errorHandler.validation_errors.invalid_game_result'),
      'playerName': i18next.t('tournament.client.errorHandler.validation_errors.invalid_player_name'),
      'gameScore': i18next.t('tournament.client.errorHandler.validation_errors.invalid_game_score'),
      'webSocketMessage': i18next.t('tournament.client.errorHandler.validation_errors.invalid_websocket_message')
    };
    
    this.showErrorMessage(messages[field] || i18next.t('tournament.client.errorHandler.validation_errors.invalid_data'));
  }

  /**
   * 연결 타임아웃 오류 처리
   */
  handleConnectionTimeout(): void {
    this.showErrorMessage(i18next.t('tournament.client.errorHandler.websocket_errors.timeout'));
  }

  /**
   * 권한 오류 처리
   */
  handleAuthorizationError(): void {
    this.showErrorMessage(i18next.t('tournament.client.errorHandler.websocket_errors.authorization_error'));
  }

  /**
   * 토너먼트 상태 오류 처리
   */
  handleTournamentStateError(): void {
    this.showErrorMessage(i18next.t('tournament.client.errorHandler.websocket_errors.tournament_state_error'));
  }

  /**
   * 일반적인 오류 메시지 표시
   */
  private showErrorMessage(message: string): void {
    console.error('Tournament error:', message);
    
    // 에러 메시지 디바운싱 - 너무 빈번한 에러 메시지 방지
    const currentTime = Date.now();
    if (currentTime - this.lastErrorTime < this.errorDebounceMs) {
      console.log('Skipping error message due to debouncing');
      return;
    }
    this.lastErrorTime = currentTime;
    
    // 페이지 언로드 중이면 오류 메시지를 표시하지 않음
    if (this.isPageUnloading) {
      console.log('Skipping error message due to page unloading');
      return;
    }
    
    // 사용자가 의도적으로 종료한 경우 오류 메시지를 표시하지 않음
    if (this.isManualExit) {
      console.log('Skipping error message due to manual exit');
      return;
    }
    
    // 에러 디바운싱: 1초 이내에 발생한 중복 에러 메시지는 무시
    const now = Date.now();
    if (now - this.lastErrorTime < this.errorDebounceMs) {
      console.log('Duplicate error message, skipping:', message);
      return;
    }
    this.lastErrorTime = now;

    // Show user-friendly error message
    const errorModal: ModalContent = {
      title: i18next.t('tournament.client.errorHandler.error_title'),
      content: () => {
        const el = document.createElement('div');
        el.className = 'text-center p-4';
        el.innerHTML = `
          <div class="text-terminal-red mb-4" id="error-message-content"></div>
          <button class="px-4 py-2 bg-terminal-green text-terminal-black rounded hover:bg-terminal-yellow transition-colors">
            ${i18next.t('tournament.client.errorHandler.confirm')}
          </button>
        `;

        const errorMessageEl = el.querySelector('#error-message-content');
        if (errorMessageEl) {
          errorMessageEl.textContent = message;
        }
        
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

  /**
   * 페이지 언로드 이벤트 리스너 설정
   * 사용자가 뒤로가기, 새로고침, 탭 닫기 등을 할 때 감지
   */
  private setupPageUnloadListener(): void {
    // beforeunload 이벤트 - 페이지를 떠나려고 할 때
    const handleBeforeUnload = () => {
      console.log('Page beforeunload detected');
      this.isPageUnloading = true;
      this.isManualExit = true; // 페이지 언로드는 의도적 종료로 간주
    };

    // unload 이벤트 - 페이지가 실제로 언로드될 때
    const handleUnload = () => {
      console.log('Page unload detected');
      this.isPageUnloading = true;
      this.isManualExit = true;
    };

    // pagehide 이벤트 - 페이지가 숨겨질 때 (모바일에서 중요)
    const handlePageHide = () => {
      console.log('Page pagehide detected');
      this.isPageUnloading = true;
      this.isManualExit = true;
    };

    // visibilitychange 이벤트 - 탭이 백그라운드로 이동할 때
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('Page visibility hidden - potentially unloading');
        // 탭이 숨겨진 상태에서는 일시적으로 오류 메시지 표시 중단
        this.isPageUnloading = true;
      } else {
        console.log('Page visibility visible - restoring normal state');
        // 탭이 다시 활성화되면 정상 상태로 복원
        setTimeout(() => {
          this.isPageUnloading = false;
        }, 1000); // 1초 후 정상 상태로 복원
      }
    };

    // URL 변경 감지 (SPA에서 라우팅 변경 시)
    let currentUrl = window.location.href;
    const checkUrlChange = () => {
      if (window.location.href !== currentUrl) {
        console.log('URL change detected - navigation occurred');
        this.isPageUnloading = true;
        this.isManualExit = true;
        currentUrl = window.location.href;
      }
    };
    
    // URL 변경을 주기적으로 체크 (SPA 라우팅 변경 감지)
    const urlCheckInterval = setInterval(checkUrlChange, 500);
    
    // 페이지 언로드 시 인터벌 정리
    window.addEventListener('beforeunload', () => {
      clearInterval(urlCheckInterval);
    });

    // popstate 이벤트 - 브라우저 뒤로가기/앞으로가기
    window.addEventListener('popstate', () => {
      console.log('Browser navigation detected (back/forward)');
      this.isPageUnloading = true;
      this.isManualExit = true;
    });

    // 페이지 언로드 관련 이벤트들 등록
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 추가: 브라우저 탭/창 닫기 감지
    window.addEventListener('resize', () => {
      // 창 크기가 0이 되면 탭이 닫힌다고 간주
      if (window.innerWidth === 0 || window.innerHeight === 0) {
        console.log('Window size became 0 - tab likely closing');
        this.isPageUnloading = true;
        this.isManualExit = true;
      }
    });
  }

  /**
   * 페이지가 언로드 중인지 확인
   */
  isPageCurrentlyUnloading(): boolean {
    return this.isPageUnloading;
  }

  /**
   * 리소스 정리
   */
  cleanup(): void {
    this.isManualExit = false;
    this.tournamentEnded = false;
    this.isPageUnloading = false;
    this.lastErrorTime = 0;
    
    // 이벤트 리스너 제거는 하지 않음 (전역 이벤트이므로 다른 인스턴스에서도 사용할 수 있음)
    // 대신 상태만 초기화
  }
}
