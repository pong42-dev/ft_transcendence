/**
 * Game Configuration Module
 * 
 * 게임 설정값들을 중앙 집중 관리하는 모듈
 * 원본 PongGame.ts의 하드코딩된 설정값들을 분리하여 관리
 * 
 * @role 게임 설정 관리
 * @extracted_from PongGame.ts (기존 로직 그대로 유지)
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
}
