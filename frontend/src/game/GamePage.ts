// frontend/src/pages/GamePage.ts

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
    // private tournamentClient: TournamentClient | null = null; 

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
                this.startSingleGame(gameInfo);

            } else if (gameSettings.type === 'tournament') {

                // 2. 토너먼트 모드일 경우: TournamentApiService를 호출합니다.
                console.log('Requesting to create a tournament...');
                // TournamentApiService의 DTO에 맞게 데이터를 변환합니다.
                // const tournamentRequestData = { participants: gameSettings.players };
                // const tournamentInfo = await this.apiClient.tournament.createTournament();

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

    private startSingleGame(gameInfo: GameResponseDto) {
        this.container.innerHTML = '';
        const renderer = new GameRenderer();
        const inputHandler = new InputHandler();

        this.container.appendChild(renderer.render()); // GameRenderer의 render 메서드로 게임 화면을 렌더링합니다.

        // GameClient를 생성하고, ApiClient의 game 서비스를 넘겨줍니다.
        this.gameClient = new GameClient(
            gameInfo, // ApiClient의 game 서비스를 사용
            webSocketService,
            renderer,
            inputHandler,
            () => { // [핵심] GameClient에 '게임이 끝났을 때 실행할 함수'를 전달
                this.onGameEndCallback(); // GameClient가 끝나면 App.ts의 콜백 호출
            }
        );

        this.gameClient.startGame().catch(error => {
            console.error('An error occurred while starting the game:', error);
            alert('게임을 시작하는 중 오류가 발생했습니다.');
            this.onGameEndCallback();
        });
    }

    public destroy(): void {
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
}
