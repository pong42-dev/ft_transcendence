/**
 * AI Player Types and Interfaces
 * 
 * AI 플레이어 관련 타입 정의 및 인터페이스
 */

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface GameState {
  ballX: number;
  ballY: number;
  ballSpeedX: number;
  ballSpeedY: number;
  paddleY: number;
  opponentPaddleY: number;
  canvasWidth: number;
  canvasHeight: number;
  paddleHeight: number;
  paddleWidth: number;
  ballSize: number;
  // 점수 정보 추가 (AI 전략 선택용)
  aiScore: number;
  playerScore: number;
}

export interface PredictionResult {
  targetY: number;
  confidence: number;
  timeToReach: number;
}

export interface AIDecision {
  action: 'up' | 'down' | 'stay';
  intensity: number; // 0-1, how fast to move
}

export interface AIConfig {
  difficulty: AIDifficulty;
  reactionTime: number; // in milliseconds
  updateFrequency: number; // Hz (PRD 준수: 모든 난이도에서 1Hz)
  maxSpeed: number;
  errorRate: number; // 0-1, chance of making mistakes
  accuracy: number; // 0-1, accuracy of targeting (how close to predicted position)
}
