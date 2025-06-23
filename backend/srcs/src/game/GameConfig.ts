/**
 * Game Configuration Module (Server-Side)
 * 
 * 게임 설정값들을 중앙 집중 관리하는 모듈
 * 프론트엔드에서 마이그레이션된 설정값들을 서버 환경에 맞게 조정
 * 
 * @role 게임 설정 관리
 * @migrated_from frontend/src/game/GameConfig.ts
 */
export class GameConfig {
  public readonly canvasWidth: number = 600;
  public readonly canvasHeight: number = 400;
  public readonly paddleWidth: number = 10;
  public readonly paddleHeight: number = 80;
  public readonly ballSize: number = 10;
  public readonly ballSpeedX: number = 6; // Reduced from 8 for better playability
  public readonly ballSpeedY: number = 4; // Reduced from 5 for better playability
  public readonly paddleSpeed: number = 8;
  public readonly aiSpeed: number = 6;
  public readonly paddleOffset: number = 40; // left paddle: 40px from left, right paddle: 40px from right
  
  // Server-specific configurations
  public readonly gameLoopInterval: number = 1000 / 60; // 60 FPS
  public readonly maxPlayersPerGame: number = 2;
  public readonly gameSessionTimeout: number = 5 * 60 * 1000; // 5 minutes
}
