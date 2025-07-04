import { GameClient } from '../game/GameClient';
import { GameRenderer } from '../game/GameRenderer';
import { InputHandler } from '../game/InputHandler';
import { ApiClient } from '../services/ApiClient'; // ApiClient를 직접 import
import { webSocketService } from '../services/websocket/WebSocketService';
import { GameMode, GameSetupResult, CreateGameRequestDto, GameResponseDto } from '../types/types';

export class GamePage {
    private container: HTMLElement;
    private apiClient: ApiClient;
    private onGameEndCallback: () => void;

    private gameClient: GameClient | null = null;

    private renderer: GameRenderer | null = null;
    
    // 브라우저 이벤트 리스너들을 추적하기 위한 변수들
    private isGameActive: boolean = false;
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
        let setupResult = gameSetupResult;
        
        if (!setupResult) {
            this.onGameEndCallback();
            return;
        }

        const gameSettings = this._createGameRequestFromSetup(setupResult);

        if (!gameSettings) {
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
                console.log('Requesting to create a tournament...');
                // TournamentApiService의 DTO에 맞게 데이터를 변환합니다.
                // const tournamentRequestData = { participants: gameSettings.players };
                // const tournamentInfo = await this.apiClient.tournament.createTournament(gameSettings);

                // 나중에 구현될 TournamentClient를 여기서 시작합니다.
                // this.startTournament(tournamentInfo); 
                alert('토너먼트 모드는 아직 준비 중입니다.');
                this.onGameEndCallback();

            }
        } catch (error) {
            console.error('Failed to create game or tournament:', error);
            alert('게임을 시작하는 중 오류가 발생했습니다.');
            this.onGameEndCallback();
        }
    }
    /**
     * [신규] 대기 화면을 설정하고 GameClient의 연결을 시작합니다.
     */
    private startWaitingFlow(gameInfo: GameResponseDto) {
        // 1. UI 컴포넌트들을 미리 생성합니다.
        this.renderer = new GameRenderer();
        const inputHandler = new InputHandler();

        // 2. 게임이 활성 상태로 설정
        this.isGameActive = true;

        // 3. 브라우저 이벤트 리스너 설정
        this.setupBrowserEventListeners();

        // 4. 대기 화면을 먼저 렌더링합니다.
        this.renderWaitingScreen();

        // 5. GameClient를 생성하고 콜백을 전달합니다.
        this.gameClient = new GameClient(
            gameInfo,
            webSocketService,
            this.renderer,
            inputHandler,
            {
                onPreGameCountdown: (time) => this.updateWaitingScreenCountdown(time),
                onGameStart: () => this.transitionToGameScreen(),
                onFinish: () => this.handleGameFinish(),
            }
        );

        // 6. GameClient에 연결 및 이벤트 수신 시작을 지시합니다.
        this.gameClient.connectAndListen();
    }

    /**
     * [신규] 대기 화면 UI를 렌더링합니다.
     */
    private renderWaitingScreen() {
        this.container.innerHTML = `
            <div id="waiting-screen" class="w-full h-full flex flex-col items-center justify-center bg-terminal-black text-terminal-green">
                <h2 class="text-3xl font-bold mb-4">Game Starting</h2>
                <p class="text-xl mb-8">Waiting for server...</p>
                <div id="countdown-display" class="text-7xl font-mono font-bold mb-8"></div>
                <button id="cancel-game-btn" class="px-6 py-3 border border-terminal-red text-terminal-red rounded-lg hover:bg-terminal-red hover:bg-opacity-10 transition-all">
                    Cancel
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

    // private startSingleGame(gameInfo: GameResponseDto) {
    //     this.container.innerHTML = '';
    //     const renderer = new GameRenderer();
    //     const inputHandler = new InputHandler();

    //     this.container.appendChild(renderer.render()); // GameRenderer의 render 메서드로 게임 화면을 렌더링합니다.

    //     // GameClient를 생성하고, ApiClient의 game 서비스를 넘겨줍니다.
    //     this.gameClient = new GameClient(
    //         gameInfo, // ApiClient의 game 서비스를 사용
    //         webSocketService,
    //         renderer,
    //         inputHandler,
    //         () => { // [핵심] GameClient에 '게임이 끝났을 때 실행할 함수'를 전달
    //             this.onGameEndCallback(); // GameClient가 끝나면 App.ts의 콜백 호출
    //         }
    //     );

    //     this.gameClient.startGame().catch(error => {
    //         console.error('An error occurred while starting the game:', error);
    //         alert('게임을 시작하는 중 오류가 발생했습니다.');
    //         this.onGameEndCallback();
    //     });
    // }

    public destroy(): void {
        this.isGameActive = false;
        this.removeBrowserEventListeners();
        this.gameClient?.destroy();
        this.container.innerHTML = '';
    }

    private _createGameRequestFromSetup(setupResult: GameSetupResult): CreateGameRequestDto | null {
        let gameMode: GameMode;
        let opponents: string[] = [];

        // GameSetupModal에서 넘어온 mode ('vs ai', 'local', 'tournament')에 따라 분기합니다.
        switch (setupResult.mode) {
            case 'vs ai':
                // AI 모드에서는 'type'만 필요하고 opponents 배열은 비워둡니다.
                gameMode = 'ai_1v1';
                break;

            case 'local':
                // 로컬 1:1 모드에서는 opponents 배열에 게스트 닉네임 1명을 담습니다.
                gameMode = 'local_1v1';
                const guestNickname = setupResult.opponents[0];

                if (!guestNickname) {
                    console.error('Guest nickname is required for local mode.');
                    return null;
                }
                opponents = [guestNickname];
                break;

            case 'tournament':
                // 토너먼트 모드에서는 opponents 배열에 게스트 닉네임 3명을 담습니다.
                gameMode = 'tournament';

                if (setupResult.opponents.length < 3) { // 3명으로 가정
                    console.error('Three guest nicknames are required for tournament mode.');
                    return null;
                }
                opponents = setupResult.opponents;
                break;

            default:
                console.error('Unsupported game mode from setup modal:', setupResult.mode);
                return null;
        }

        // 최종적으로 백엔드 API에 보낼 DTO를 완성하여 반환합니다.
        // 'ai_1v1'의 경우 opponents가 빈 배열이므로 optional('?') 처리에 따라 생략될 수 있습니다.
        const finalRequest: CreateGameRequestDto = {
            type: gameMode,
            opponents: opponents? opponents : undefined, // opponents가 비어있으면 undefined로 처리
        };

        return finalRequest;
    }

    /**
     * [신규] 게임을 명시적으로 취소하는 메서드
     */
    private cancelGame() {
        console.log('Game canceled by user');
        
        // 게임 비활성화
        this.isGameActive = false;
        
        // 브라우저 이벤트 리스너 제거
        this.removeBrowserEventListeners();
        
        // GameClient가 있으면 연결 해제 (백엔드에 disconnect 신호 전송)
        if (this.gameClient) {
            this.gameClient.destroy();
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
            if (this.isGameActive && this.gameClient) {
                // 게임이 진행 중이면 경고 메시지 표시
                e.preventDefault();
                e.returnValue = '게임이 진행 중입니다. 정말 나가시겠습니까?';
                
                // 백그라운드에서 게임 취소 처리
                this.handleUnexpectedExit();
                
                return e.returnValue;
            }
        };

        // popstate 이벤트: 브라우저 뒤로가기/앞으로가기 버튼 클릭 시
        this.popStateHandler = (_event: PopStateEvent) => {
            if (this.isGameActive && this.gameClient) {
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
            if (this.isGameActive && this.gameClient) {
                console.log('Page hide detected during active game, canceling...');
                this.handleUnexpectedExit();
            }
        };

        // visibilitychange 이벤트: 탭이 숨겨지거나 브라우저가 최소화될 때
        this.visibilityChangeHandler = () => {
            if (document.hidden && this.isGameActive && this.gameClient) {
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
        if (this.gameClient && this.isGameActive) {
            console.log('Handling unexpected exit - destroying game client');
            this.gameClient.destroy();
            this.isGameActive = false;
        }
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
}
