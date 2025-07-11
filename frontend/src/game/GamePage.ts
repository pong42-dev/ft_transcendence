import { GameClient } from '../game/GameClient';
import { GameRenderer } from '../game/GameRenderer';
import { InputHandler } from '../game/InputHandler';
import { TournamentClient } from '../game/TournamentClient';
import { ApiClient } from '../services/ApiClient'; // ApiClient를 직접 import
import { WebSocketService } from '../services/websocket/WebSocketService';
import { GameMode, GameSetupResult, CreateGameRequestDto, GameResponseDto } from '../types/types';
import { Terminal } from '../components/Terminal';
import i18next from 'i18next';

export class GamePage {
    private container: HTMLElement;
    private apiClient: ApiClient;
    private terminal: Terminal;
    private onGameEndCallback: () => void;

    private gameClient: GameClient | null = null;
    private tournamentClient: TournamentClient | null = null;
    private currentSetupResult: GameSetupResult | null = null; // 게임 설정 결과 저장

    private renderer: GameRenderer | null = null;
    
    // 브라우저 이벤트 리스너들을 추적하기 위한 변수들
    private isGameActive: boolean = false;
    private isInitializing: boolean = false; // 초기화 중복 방지
    private isTournamentCreating: boolean = false; // 토너먼트 생성 중복 방지
    private isGameEndCallbackCalled: boolean = false; // 콜백 중복 호출 방지
    private beforeUnloadHandler?: (e: BeforeUnloadEvent) => void;
    private visibilityChangeHandler?: () => void;
    private popStateHandler?: (event: PopStateEvent) => void;
    private pageHideHandler?: () => void;

    /**
     * 게임 종료 콜백을 안전하게 호출합니다 (중복 호출 방지)
     */
    private safeCallGameEndCallback(): void {
        if (!this.isGameEndCallbackCalled) {
            this.isGameEndCallbackCalled = true;
            console.log('Calling onGameEndCallback');
            this.onGameEndCallback();
        } else {
            console.log('onGameEndCallback already called, skipping');
        }
    }

    /**
     * @param container - 이 페이지가 렌더링될 부모 DOM 요소
     * @param apiClient - App.ts에서 사용하는 ApiClient의 인스턴스
     * @param gameSetupResult - 게임 설정 데이터 (null이면 모달을 열어서 설정)
     * @param onGameEnd - 게임이 완전히 끝나고 페이지를 닫아야 할 때 호출할 콜백
     */
    constructor(container: HTMLElement, apiClient: ApiClient, terminal: Terminal, gameSetupResult: GameSetupResult | null, onGameEnd: () => void) {
        this.container = container;
        this.apiClient = apiClient;
        this.terminal = terminal;
        this.onGameEndCallback = onGameEnd;
        this.init(gameSetupResult);
    }

    private async init(gameSetupResult?: GameSetupResult | null) {
        console.log('=== INIT CALLED ===');
        console.log('Current isInitializing:', this.isInitializing);
        
        // 중복 초기화 방지
        if (this.isInitializing) {
            console.log('GamePage is already initializing, skipping...');
            return;
        }
        this.isInitializing = true;
        console.log('Set isInitializing to true');

        console.log('=== GAME PAGE INIT START ===');
        console.log('Game setup result:', gameSetupResult);
        
        let setupResult = gameSetupResult;
        
        if (!setupResult) {
            console.log('No setup result, ending game');
            this.safeCallGameEndCallback();
            return;
        }

        // 게임 설정 결과 저장
        this.currentSetupResult = setupResult;
        console.log('Setup result saved');

        const gameSettings = this._createGameRequestFromSetup(setupResult);
        console.log('Game settings created:', gameSettings);

        if (!gameSettings) {
            console.log('Failed to create game settings, ending game');
            this.safeCallGameEndCallback();
            return;
        }

        try {
            if (gameSettings.type === 'local_1v1' || gameSettings.type === 'ai_1v1') {

                // 1. 단일 게임 모드일 경우: GameApiService를 호출합니다.
                console.log('Requesting to create a single game...');
                const gameInfo = await this.apiClient.game.createGame(gameSettings);
                this.startWaitingFlow(gameInfo);

            } else if (gameSettings.type === 'tournament') {

                // 2. 토너먼트 모드일 경우: TournamentApiService를 호출합니다.
                console.log('=== TOURNAMENT MODE DETECTED ===');
                console.log('Game settings:', gameSettings);
                
                // 토너먼트 생성 중복 방지
                if (this.isTournamentCreating) {
                    console.log('Tournament creation already in progress, skipping...');
                    return;
                }
                
                // Validate tournament settings before proceeding
                if (!this.validateTournamentSettings(gameSettings)) {
                    this.showTournamentError('토너먼트 설정이 유효하지 않습니다.');
                    return;
                }
                
                console.log('Requesting to create a tournament...');
                
                // 사용자 ID를 JWT에서 직접 추출 및 검증
                const userId = this.decodeUserIdFromAccessToken();
                console.log('Decoded user ID:', userId);
                if (!this.validateUserId(userId)) {
                    this.showTournamentError('토너먼트에 참가하려면 유효한 로그인이 필요합니다.');
                    return;
                }
                
                // Sanitize opponent names before sending to server
                const sanitizedSettings = {
                    ...gameSettings,
                    opponents: gameSettings.opponents?.map(name => this.sanitizeOpponentName(name))
                };
                
                console.log('Tournament request data (sanitized):', sanitizedSettings);

                // 토너먼트 생성 플래그 설정
                this.isTournamentCreating = true;

                // 토너먼트 생성 API 호출
                try {
                    const tournamentInfo = await this.apiClient.tournament.createTournament(sanitizedSettings);
                    console.log('Tournament created:', tournamentInfo);
                    
                    // TournamentClient 시작
                    this.startTournament(tournamentInfo);
                } catch (error: any) {
                    console.error('Tournament creation failed:', error);
                    if (error.status === 429) {
                        this.showTournamentError('토너먼트 생성 요청이 너무 빈번합니다. 잠시 후 다시 시도해주세요.');
                    } else if (error.status === 400) {
                        this.showTournamentError('토너먼트 설정이 올바르지 않습니다.');
                    } else if (error.status === 401 || error.status === 403) {
                        this.showTournamentError('토너먼트 생성 권한이 없습니다. 다시 로그인해주세요.');
                    } else {
                        this.showTournamentError('토너먼트 생성 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
                    }
                } finally {
                    // 토너먼트 생성 완료 (성공 또는 실패)
                    this.isTournamentCreating = false;
                }

            }
        } catch (error) {
            console.error('Failed to create game or tournament:', error);
            alert('게임을 시작하는 중 오류가 발생했습니다.');
            this.safeCallGameEndCallback();
        } finally {
            this.isInitializing = false;
        }
    }
    /**
     * [신규] 대기 화면을 설정하고 GameClient의 연결을 시작합니다.
     */
    private startWaitingFlow(gameInfo: GameResponseDto) {
        // 토너먼트 모드면 아무 동작도 하지 않음. (TournamentClient가 GameClient를 직접 생성/관리)
        if (gameInfo.type === 'tournament') {
            return;
        }
        // 1. UI 컴포넌트들을 미리 생성합니다.
        this.renderer = new GameRenderer();
        const inputHandler = new InputHandler();

        // 2. 게임이 활성 상태로 설정
        this.isGameActive = true;
        
        // 3. 터미널 입력 비활성화 (게임 중 키입력 방지)
        this.terminal.disableInput();

        // 3. 브라우저 이벤트 리스너 설정
        this.setupBrowserEventListeners();

        // 4. 대기 화면을 먼저 렌더링합니다.
        this.renderWaitingScreen();

        // 5. WebSocketService 생성
        const webSocketService = new WebSocketService();

        // 6. GameClient를 생성하고 콜백을 전달합니다.
        this.gameClient = new GameClient(
            gameInfo,
            webSocketService,
            this.renderer,
            inputHandler,
            {
                onPreGameCountdown: (time) => this.updateWaitingScreenCountdown(time),
                onGameStart: () => this.transitionToGameScreen(),
                onFinish: () => this.handleGameFinish(),
            },
            this.currentSetupResult?.aiSettings?.difficulty // AI 난이도 전달
        );

        // 7. GameClient에 연결 및 이벤트 수신 시작을 지시합니다.
        this.gameClient.connectAndListen();
    }

    /**
     * [신규] 대기 화면 UI를 렌더링합니다.
     */
    private renderWaitingScreen() {
        this.container.innerHTML = `
            <div id="waiting-screen" class="w-full h-full flex flex-col items-center justify-center bg-terminal-black text-terminal-green">
                <h2 class="text-3xl font-bold mb-4">${i18next.t('game.page.waitingScreen.gameStarting')}</h2>
                <p class="text-xl mb-8">${i18next.t('game.page.waitingScreen.waitingForServer')}</p>
                <div id="countdown-display" class="text-7xl font-mono font-bold mb-8"></div>
                <button id="cancel-game-btn" class="px-6 py-3 border border-terminal-red text-terminal-red rounded-lg hover:bg-terminal-red hover:bg-opacity-10 transition-all">
                    ${i18next.t('game.page.button.cancel')}
                </button>
            </div>
        `;
        this.container.querySelector('#cancel-game-btn')?.addEventListener('click', () => {
            this.cancelGame(); // 게임 취소 후 페이지 닫기
        });
    }

    /**
     * [신규] GameClient 콜백을 통해 대기 화면의 카운트다운 숫자를 업데이트합니다.
     */
    private updateWaitingScreenCountdown(time: number) {
        const countdownDisplay = this.container.querySelector('#countdown-display');
        if (countdownDisplay) {
            countdownDisplay.textContent = time > 0 ? time.toString() : '';
        }
    }

    /**
     * [신규] GameClient 콜백에 의해 호출되며, 실제 게임 화면으로 전환합니다.
     */
    private transitionToGameScreen() {
        if (!this.renderer) return;
        this.container.innerHTML = ''; // 대기 화면 UI 제거
        this.container.appendChild(this.renderer.render()); // 게임 렌더러의 DOM 요소를 추가
    }

    public destroy(): void {
        this.isGameActive = false;
        this.isInitializing = false;
        this.isTournamentCreating = false;
        this.isGameEndCallbackCalled = false; // 콜백 플래그 초기화
        this.removeBrowserEventListeners();
        this.gameClient?.destroy();
        this.tournamentClient?.destroy();
        this.container.innerHTML = '';
    }

    private _createGameRequestFromSetup(setupResult: GameSetupResult): CreateGameRequestDto | null {
        let gameMode: GameMode;
        let opponents: string[] = [];

        // GameSetupModal에서 넘어온 mode ('vs ai', 'local', 'tournament')에 따라 분기합니다.
        console.log('=== CREATING GAME REQUEST ===');
        console.log('Setup result mode:', setupResult.mode);
        console.log('Setup result opponents:', setupResult.opponents);
        
        switch (setupResult.mode) {
            case 'vs ai':
                // AI 모드에서는 'type'만 필요하고 opponents 배열은 비워둡니다.
                gameMode = 'ai_1v1';
                console.log('AI mode selected');
                break;

            case 'local':
                // 로컬 1:1 모드에서는 opponents 배열에 게스트 닉네임 1명을 담습니다.
                gameMode = 'local_1v1';
                const guestNickname = setupResult.opponents[0];
                console.log('Local mode selected with guest:', guestNickname);

                if (!guestNickname) {
                    console.error('Guest nickname is required for local mode');
                    return null;
                }
                opponents = [guestNickname];
                break;

            case 'tournament':
                // 토너먼트 모드에서는 opponents 배열에 게스트 닉네임 3명을 담습니다.
                gameMode = 'tournament';
                console.log('Tournament mode selected');

                // Validate tournament opponents
                if (!setupResult.opponents || !Array.isArray(setupResult.opponents)) {
                    console.error('Tournament opponents must be an array');
                    return null;
                }
                
                if (setupResult.opponents.length !== 3) {
                    console.error('Tournament requires exactly 3 opponents');
                    return null;
                }
                
                // Validate each opponent name
                for (let i = 0; i < setupResult.opponents.length; i++) {
                    const opponent = setupResult.opponents[i];
                    if (!this.validateOpponentName(opponent)) {
                        console.error(`Invalid opponent name at index ${i}:`, opponent);
                        return null;
                    }
                }
                
                // Sanitize opponent names
                opponents = setupResult.opponents.map(name => this.sanitizeOpponentName(name));
                console.log('Tournament opponents (sanitized):', opponents);
                break;

            default:
                console.error('Unsupported game mode:', setupResult.mode);
                return null;
        }

        // 최종적으로 백엔드 API에 보낼 DTO를 완성하여 반환합니다.
        // 'ai_1v1'의 경우 opponents가 빈 배열이므로 optional('?') 처리에 따라 생략될 수 있습니다.
        const finalRequest: CreateGameRequestDto = {
            type: gameMode,
            opponents: opponents? opponents : undefined, // opponents가 비어있으면 undefined로 처리
        };

        // AI 설정이 있으면 추가
        if (setupResult.aiSettings) {
            finalRequest.aiSettings = setupResult.aiSettings;
        }

        return finalRequest;
    }

    /**
     * [신규] 게임을 명시적으로 취소하는 메서드
     */
    private cancelGame() {
        console.log('Game canceled by user');
        
        // 게임 비활성화
        this.isGameActive = false;
        
        // 터미널 입력 활성화
        this.terminal.enableInput();
        
        // 브라우저 이벤트 리스너 제거
        this.removeBrowserEventListeners();
        
        // GameClient가 있으면 연결 해제 (백엔드에 disconnect 신호 전송)
        if (this.gameClient) {
            this.gameClient.destroy();
        }
        
        // TournamentClient가 있으면 연결 해제
        if (this.tournamentClient) {
            this.tournamentClient.destroy();
        }
        
        // 페이지 닫기
        this.safeCallGameEndCallback();
    }

    /**
     * [신규] 브라우저 이벤트 리스너들을 설정합니다.
     */
    private setupBrowserEventListeners() {
        // 히스토리에 게임 상태 추가 (뒤로가기 감지를 위해)
        const gameState = { isInGame: true, timestamp: Date.now() };
        history.pushState(gameState, '', window.location.href);

        // beforeunload 이벤트: 페이지를 떠나려고 할 때 (새로고침, 창 닫기 등)
        this.beforeUnloadHandler = (e: BeforeUnloadEvent) => {
            console.log('beforeunload event triggered');
            if (this.isGameActive && (this.gameClient || this.tournamentClient)) {
                // 게임이 진행 중이면 경고 메시지 표시
                e.preventDefault();
                
                // 백그라운드에서 게임 취소 처리
                this.handleUnexpectedExit();
                this.safeCallGameEndCallback();
            }
        };

        // popstate 이벤트: 브라우저 뒤로가기/앞으로가기 버튼 클릭 시
        this.popStateHandler = (_event: PopStateEvent) => {
            if (this.isGameActive && (this.gameClient || this.tournamentClient)) {
                console.log('Browser back/forward button detected during active game, canceling...');
                // 뒤로가기를 시도했을 때 게임 완전 취소
                this.handleUnexpectedExit();
                // 잠시 후 실제로 뒤로가기 실행 (게임 정리 시간 확보)
                setTimeout(() => {
                    if (!this.isGameActive) {
                        // 게임이 이미 비활성화되었다면 실제 뒤로가기 허용
                        history.back();
                    }
                }, 100);
            }
        };

        // pagehide 이벤트: 페이지가 숨겨질 때 (뒤로가기, 탭 닫기 등 - beforeunload보다 확실함)
        this.pageHideHandler = () => {
            if (this.isGameActive && (this.gameClient || this.tournamentClient)) {
                console.log('Page hide detected during active game, canceling...');
                this.handleUnexpectedExit();
            }
        };

        // visibilitychange 이벤트: 탭이 숨겨지거나 브라우저가 최소화될 때
        this.visibilityChangeHandler = () => {
            if (document.hidden && this.isGameActive && (this.gameClient || this.tournamentClient)) {
                console.log('Page became hidden during active game, canceling...');
                this.handleUnexpectedExit();
                this.safeCallGameEndCallback();
            }
        };

        // 이벤트 리스너 등록
        window.addEventListener('beforeunload', this.beforeUnloadHandler);
        window.addEventListener('popstate', this.popStateHandler);
        window.addEventListener('pagehide', this.pageHideHandler);
        document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    }

    /**
     * [신규] 예상치 못한 종료 상황을 처리합니다.
     */
    private handleUnexpectedExit() {
        if ((this.gameClient || this.tournamentClient) && this.isGameActive) {
            console.log('Handling unexpected exit');
            
            // 터미널 입력 활성화
            this.terminal.enableInput();
            
            this.gameClient?.destroy();
            this.tournamentClient?.destroy();
            this.isGameActive = false;
        }
    }

    /**
     * [신규] 토너먼트 클라이언트를 시작하는 메서드
     */
    private startTournament(tournamentInfo: any) {
        // Validate tournament info
        if (!tournamentInfo || typeof tournamentInfo !== 'object') {
            this.showTournamentError('토너먼트 정보가 유효하지 않습니다.');
            return;
        }
        
        if (!tournamentInfo.id || typeof tournamentInfo.id !== 'number') {
            this.showTournamentError('토너먼트 ID가 유효하지 않습니다.');
            return;
        }
        
        if (!this.container) {
            this.showTournamentError('UI 컨테이너를 찾을 수 없습니다.');
            return;
        }
        
        // Clean up existing tournament client
        if (this.tournamentClient) {
            console.log('Destroying existing tournament client');
            this.tournamentClient.destroy();
            this.tournamentClient = null;
        }

        // 게임이 활성 상태로 설정
        this.isGameActive = true;
        
        // 터미널 입력 비활성화 (토너먼트 중 키입력 방지)
        this.terminal.disableInput();

        // 브라우저 이벤트 리스너 설정
        this.setupBrowserEventListeners();

        // GamePage의 UI를 비우고 토너먼트 UI를 렌더링할 준비
        this.container.innerHTML = '';

        // GameRenderer 생성 (InputHandler는 TournamentClient에서 필요시 생성)
        this.renderer = new GameRenderer();
        
        // tournamentId와 userId를 TournamentClient에 전달
        const tournamentId = tournamentInfo.id; 
        const userId = this.decodeUserIdFromAccessToken();
        console.log('Tournament client decoded user ID:', userId);
        
        // Validate user ID before creating tournament client
        if (!this.validateUserId(userId)) {
            this.showTournamentError('유효하지 않은 사용자 ID입니다. 다시 로그인해주세요.');
            return;
        }
        
        try {
            this.tournamentClient = new TournamentClient(
                this.container,
                tournamentId,
                Number(userId), // JWT에서 추출한 user_id를 number로 변환
            );
            this.tournamentClient.start();
        } catch (error) {
            console.error('Failed to start tournament client:', error);
            this.showTournamentError('토너먼트 클라이언트 시작 중 오류가 발생했습니다.');
        }
    }

    /**
     * [신규] 게임 종료를 처리하고 이벤트 리스너를 정리합니다.
     */
    private handleGameFinish() {
        this.isGameActive = false;
        
        // 터미널 입력 활성화
        this.terminal.enableInput();
        
        this.removeBrowserEventListeners();
        this.safeCallGameEndCallback();
    }

    /**
     * [신규] 브라우저 이벤트 리스너들을 제거합니다.
     */
    private removeBrowserEventListeners() {
        if (this.beforeUnloadHandler) {
            window.removeEventListener('beforeunload', this.beforeUnloadHandler);
            this.beforeUnloadHandler = undefined;
        }
        if (this.popStateHandler) {
            window.removeEventListener('popstate', this.popStateHandler);
            this.popStateHandler = undefined;
        }
        if (this.pageHideHandler) {
            window.removeEventListener('pagehide', this.pageHideHandler);
            this.pageHideHandler = undefined;
        }
        if (this.visibilityChangeHandler) {
            document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
            this.visibilityChangeHandler = undefined;
        }
    }

    /**
     * JWT에서 user_id 추출하는 메서드 (보안 강화)
     */
    private decodeUserIdFromAccessToken(): string | undefined {
        try {
            const accessToken = sessionStorage.getItem('access_token_session');
            console.log('Access token status:', accessToken ? 'exists' : 'not found');
            if (!accessToken || typeof accessToken !== 'string') return undefined;
            
            // Basic JWT format validation
            const parts = accessToken.split('.');
            if (parts.length !== 3) {
                console.error('Invalid JWT format');
                return undefined;
            }
            
            const payloadBase64 = parts[1];
            if (!payloadBase64) {
                console.error('Missing JWT payload');
                return undefined;
            }
            
            // Validate base64 format
            if (!/^[A-Za-z0-9_-]+$/.test(payloadBase64)) {
                console.error('Invalid base64 format in JWT payload');
                return undefined;
            }
            
            const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(function(c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    })
                    .join('')
            );
            
            const payload = JSON.parse(jsonPayload);
            
            // Validate payload structure
            if (!payload || typeof payload !== 'object') {
                console.error('Invalid JWT payload structure');
                return undefined;
            }
            
            // Check token expiration
            if (payload.exp && typeof payload.exp === 'number') {
                const currentTime = Math.floor(Date.now() / 1000);
                if (payload.exp < currentTime) {
                    console.error('JWT token has expired');
                    return undefined;
                }
            }
            
            // Validate user_id
            if (!payload.user_id || typeof payload.user_id !== 'number') {
                console.error('Invalid or missing user_id in JWT');
                return undefined;
            }
            
            console.log('JWT payload validated successfully');
            console.log('JWT user ID:', payload.user_id);
            return String(payload.user_id);
        } catch (e) {
            console.error('JWT decoding error:', e);
            return undefined;
        }
    }

    // Tournament-specific validation and sanitization methods
    private validateTournamentSettings(gameSettings: CreateGameRequestDto): boolean {
        if (gameSettings.type !== 'tournament') return true;
        
        // Validate opponents array
        if (!gameSettings.opponents || !Array.isArray(gameSettings.opponents)) {
            console.error('Tournament requires opponents array');
            return false;
        }
        
        // Tournament should have exactly 3 opponents (4 total including current user)
        if (gameSettings.opponents.length !== 3) {
            console.error('Tournament requires exactly 3 opponents');
            return false;
        }
        
        // Validate each opponent name
        for (const opponent of gameSettings.opponents) {
            if (!this.validateOpponentName(opponent)) {
                console.error('Invalid opponent name:', opponent);
                return false;
            }
        }
        
        return true;
    }
    
    private validateOpponentName(name: string): boolean {
        if (typeof name !== 'string') return false;
        if (name.length === 0 || name.length > 50) return false;
        if (!/^[a-zA-Z0-9가-힣_\-\s]+$/.test(name)) return false; // Only allow safe characters
        return true;
    }
    
    private sanitizeOpponentName(name: string): string {
        if (typeof name !== 'string') return 'Unknown';
        
        return name
            .replace(/[<>&"']/g, '') // Remove HTML special characters
            .trim()
            .substring(0, 50) || 'Unknown';
    }
    
    private validateUserId(userId: string | undefined): boolean {
        console.log('Validating user ID:', userId, 'type:', typeof userId);
        if (!userId) {
            console.log('User ID is falsy');
            return false;
        }
        const id = parseInt(userId, 10);
        const isValid = !isNaN(id) && id > 0 && Number.isInteger(id);
        console.log('Parsed ID:', id, 'isValid:', isValid);
        return isValid;
    }
    
    private showTournamentError(message: string): void {
        console.error('Tournament error:', message);
        alert(message); // In a real app, this should be a proper modal
        this.safeCallGameEndCallback();
    }
}
