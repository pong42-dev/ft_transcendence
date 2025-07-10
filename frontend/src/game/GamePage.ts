import { GameClient } from '../game/GameClient';
import { GameRenderer } from '../game/GameRenderer';
import { InputHandler } from '../game/InputHandler';
import { TournamentClient } from '../game/TournamentClient';
import { ApiClient } from '../services/ApiClient'; // ApiClient를 직접 import
import { WebSocketService } from '../services/websocket/WebSocketService';
import { GameMode, GameSetupResult, CreateGameRequestDto, GameResponseDto } from '../types/types';
import { GameEndModal } from '../components/modals/GameEndModal';
import i18next from 'i18next';

export class GamePage {
    private container: HTMLElement;
    private apiClient: ApiClient;
    private onGameEndCallback: () => void;

    private gameClient: GameClient | null = null;
    private tournamentClient: TournamentClient | null = null;
    private currentSetupResult: GameSetupResult | null = null; // 게임 설정 결과 저장

    private renderer: GameRenderer | null = null;
    
    // 브라우저 이벤트 리스너들을 추적하기 위한 변수들
    private isGameActive: boolean = false;
    private isInitializing: boolean = false; // 초기화 중복 방지
    private isTournamentCreating: boolean = false; // 토너먼트 생성 중복 방지
    private beforeUnloadHandler?: (e: BeforeUnloadEvent) => void;
    private visibilityChangeHandler?: () => void;
    private popStateHandler?: (event: PopStateEvent) => void;
    private pageHideHandler?: () => void;

    /**
     * @param container - 이 페이지가 렌더링될 부모 DOM 요소
     * @param apiClient - App.ts에서 사용하는 ApiClient의 인스턴스
     * @param gameSetupResult - 게임 설정 데이터 (null이면 모달을 열어서 설정)
     * @param onGameEnd - 게임이 완전히 끝나고 페이지를 닫아야 할 때 호출할 콜백
     */
    constructor(container: HTMLElement, apiClient: ApiClient, gameSetupResult: GameSetupResult | null, onGameEnd: () => void) {
        this.container = container;
        this.apiClient = apiClient;
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
            this.onGameEndCallback();
            return;
        }

        // 게임 설정 결과 저장
        this.currentSetupResult = setupResult;
        console.log('Setup result saved');

        const gameSettings = this._createGameRequestFromSetup(setupResult);
        console.log('Game settings created:', gameSettings);

        if (!gameSettings) {
            console.log('Failed to create game settings, ending game');
            this.onGameEndCallback();
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
                
                console.log('Requesting to create a tournament...');
                
                // 사용자 ID를 JWT에서 직접 추출
                const userId = this.decodeUserIdFromAccessToken();
                console.log(i18next.t('game.page.log.decodedUserId'), userId);
                if (!userId) {
                    console.error(i18next.t('game.page.error.loginRequiredForTournament'));
                    alert(i18next.t('game.page.alert.loginRequiredForTournament'));
                    this.onGameEndCallback();
                    return;
                }
                
                // GamePage의 CreateGameRequestDto를 그대로 백엔드에 전송
                console.log('Tournament request data:', gameSettings);

                // 토너먼트 생성 플래그 설정
                this.isTournamentCreating = true;

                // 토너먼트 생성 API 호출
                try {
                    const tournamentInfo = await this.apiClient.tournament.createTournament(gameSettings);
                    console.log(i18next.t('game.page.log.tournamentCreated'), tournamentInfo);
                    
                    // TournamentClient 시작
                    this.startTournament(tournamentInfo);
                } catch (error: any) {
                    console.error(i18next.t('game.page.error.tournamentCreationFailed'), error);
                    if (error.status === 429) {
                        alert(i18next.t('game.page.alert.tournamentCreationRateLimit'));
                    } else {
                        alert(i18next.t('game.page.alert.tournamentCreationFailed') + (error.message || i18next.t('common.error.unknownError')));
                    }
                    this.onGameEndCallback();
                    return;
                } finally {
                    // 토너먼트 생성 완료 (성공 또는 실패)
                    this.isTournamentCreating = false;
                }

            }
        } catch (error) {
            console.error(i18next.t('game.page.error.failedToCreateGameOrTournament'), error);
            alert(i18next.t('game.page.alert.failedToStartGame'));
            this.onGameEndCallback();
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
                console.log(i18next.t('game.page.log.aiModeSelected'));
                break;

            case 'local':
                // 로컬 1:1 모드에서는 opponents 배열에 게스트 닉네임 1명을 담습니다.
                gameMode = 'local_1v1';
                const guestNickname = setupResult.opponents[0];
                console.log(i18next.t('game.page.log.localModeSelected'), guestNickname);

                if (!guestNickname) {
                    console.error(i18next.t('game.page.error.guestNicknameRequired'));
                    return null;
                }
                opponents = [guestNickname];
                break;

            case 'tournament':
                // 토너먼트 모드에서는 opponents 배열에 게스트 닉네임 3명을 담습니다.
                gameMode = 'tournament';
                console.log(i18next.t('game.page.log.tournamentModeSelected'));

                if (setupResult.opponents.length < 3) { // 3명으로 가정
                    console.error(i18next.t('game.page.error.threeGuestNicknamesRequired'));
                    return null;
                }
                opponents = setupResult.opponents;
                console.log(i18next.t('game.page.log.tournamentOpponents'), opponents);
                break;

            default:
                console.error(i18next.t('game.page.error.unsupportedGameMode'), setupResult.mode);
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
        console.log(i18next.t('game.page.log.gameCanceledByUser'));
        
        // 게임 비활성화
        this.isGameActive = false;
        
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
        this.onGameEndCallback();
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
            if (this.isGameActive && (this.gameClient || this.tournamentClient)) {
                // 게임이 진행 중이면 경고 메시지 표시
                e.preventDefault();
                e.returnValue = i18next.t('game.page.alert.gameInProgressWarning');
                
                // 백그라운드에서 게임 취소 처리
                this.handleUnexpectedExit();
                
                return e.returnValue;
            }
        };

        // popstate 이벤트: 브라우저 뒤로가기/앞으로가기 버튼 클릭 시
        this.popStateHandler = (_event: PopStateEvent) => {
            if (this.isGameActive && (this.gameClient || this.tournamentClient)) {
                console.log('Browser back/forward button detected during active game, canceling...');
                // 뒤로가기를 시도했을 때 게임 취소
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
            console.log(i18next.t('game.page.log.handlingUnexpectedExit'));
            this.gameClient?.destroy();
            this.tournamentClient?.destroy();
            this.isGameActive = false;
        }
    }

    /**
     * [신규] 토너먼트 클라이언트를 시작하는 메서드
     */
    private startTournament(tournamentInfo: any) {
        if (!this.container) return;
        if (this.tournamentClient) {
            console.log(i18next.t('game.page.log.destroyingExistingTournamentClient'));
            this.tournamentClient.destroy();
            this.tournamentClient = null;
        }

        // 게임이 활성 상태로 설정
        this.isGameActive = true;

        // 브라우저 이벤트 리스너 설정
        this.setupBrowserEventListeners();

        // GamePage의 UI를 비우고 토너먼트 UI를 렌더링할 준비
        this.container.innerHTML = '';

        // GameRenderer와 InputHandler 생성
        this.renderer = new GameRenderer();
        const inputHandler = new InputHandler();
        
        // tournamentId와 userId를 TournamentClient에 전달
        const tournamentId = tournamentInfo.id; 
        const userId = this.decodeUserIdFromAccessToken();
        console.log(i18next.t('game.page.log.tournamentClientDecodedUserId'), userId);
        
        this.tournamentClient = new TournamentClient(
            this.container,
            tournamentId,
            Number(userId), // JWT에서 추출한 user_id를 number로 변환
            this.renderer,
            inputHandler,
            this // GamePage 인스턴스 전달
        );
        this.tournamentClient.start();
    }

    /**
     * [신규] 게임 종료를 처리하고 이벤트 리스너를 정리합니다.
     */
    private handleGameFinish() {
        this.isGameActive = false;
        this.removeBrowserEventListeners();
        this.onGameEndCallback();
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
     * JWT에서 user_id 추출하는 메서드
     */
    private decodeUserIdFromAccessToken(): string | undefined {
        try {
            const accessToken = sessionStorage.getItem('access_token_session');
            console.log(i18next.t('game.page.log.accessTokenStatus'), accessToken ? i18next.t('common.status.exists') : i18next.t('common.status.notFound'));
            if (!accessToken) return undefined;
            
            const payloadBase64 = accessToken.split('.')[1];
            if (!payloadBase64) return undefined;
            
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
            console.log(i18next.t('game.page.log.jwtPayload'), payload);
            console.log(i18next.t('game.page.log.jwtUserId'), payload.user_id);
            return payload.user_id ? String(payload.user_id) : undefined;
        } catch (e) {
            console.error(i18next.t('game.page.error.jwtDecodingError'), e);
            return undefined;
        }
    }
}
