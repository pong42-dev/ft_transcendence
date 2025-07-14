import { GameState, AIDecision, AIConfig } from '../schemas/AITypes.js';
import { BallPredictor } from './BallPredictor.js';

/**
 * AI Strategy Interface
 * 
 * 다양한 AI 전략을 구현하기 위한 인터페이스
 */
export interface AIStrategy {
  makeDecision(gameState: GameState, config: AIConfig): AIDecision;
  getName(): string;
}

/**
 * Aggressive AI Strategy
 * 
 * 공격적인 플레이 스타일 - 빠르고 적극적으로 움직임
 */
export class AggressiveStrategy implements AIStrategy {
  public makeDecision(gameState: GameState, config: AIConfig): AIDecision {
    const paddleCenter = gameState.paddleY + gameState.paddleHeight / 2;
    
    // 공이 다가오고 있으면 예측 위치로, 아니면 중앙으로
    let targetY: number;
    
    if (this.isBallComingTowards(gameState)) {
      const prediction = BallPredictor.predictBallPosition(gameState, 40 + gameState.paddleWidth);
      targetY = prediction.targetY;
      
      // accuracy 적용: 낮은 정확도일수록 예측 위치에서 벗어남
      if (config.accuracy < 1.0) {
        const inaccuracy = (1 - config.accuracy) * 80; // 최대 80px 오차
        const randomOffset = (Math.random() - 0.5) * 2 * inaccuracy;
        targetY += randomOffset;
      }
    } else {
      // 공격적 특성: 중앙보다 약간 앞쪽으로 이동
      targetY = gameState.canvasHeight * 0.45;
    }
    
    const diff = targetY - paddleCenter;
    const threshold = 15; // 더 민감하게 반응
    
    if (Math.abs(diff) < threshold) {
      return { action: 'stay', intensity: 0 };
    }
    
    return {
      action: diff > 0 ? 'down' : 'up',
      intensity: Math.min(1, Math.abs(diff) / 100) * 1.2 // 공격적이므로 더 빠르게
    };
  }
  
  private isBallComingTowards(gameState: GameState): boolean {
    return gameState.ballSpeedX < 0; // 왼쪽으로 움직이면 AI쪽으로 오는 것
  }
  
  public getName(): string {
    return 'Aggressive';
  }
}

/**
 * Defensive AI Strategy
 * 
 * 수비적인 플레이 스타일 - 안정적이고 보수적으로 움직임
 */
export class DefensiveStrategy implements AIStrategy {
  public makeDecision(gameState: GameState, config: AIConfig): AIDecision {
    const paddleCenter = gameState.paddleY + gameState.paddleHeight / 2;
    
    // 항상 중앙 근처에서 대기
    let targetY = gameState.canvasHeight / 2;
    
    // 공이 가까이 올 때만 예측 위치로 이동
    if (this.isBallClose(gameState)) {
      const prediction = BallPredictor.predictBallPosition(gameState, 40 + gameState.paddleWidth);
      if (prediction.confidence > 0.7) {
        targetY = prediction.targetY;
        
        // accuracy 적용: 수비적이므로 정확도가 더 중요함
        if (config.accuracy < 1.0) {
          const inaccuracy = (1 - config.accuracy) * 50; // 수비적이므로 오차 범위 작음
          const randomOffset = (Math.random() - 0.5) * 2 * inaccuracy;
          targetY += randomOffset;
        }
      }
    }
    
    const diff = targetY - paddleCenter;
    const threshold = 25; // 더 큰 임계값으로 안정적 플레이
    
    if (Math.abs(diff) < threshold) {
      return { action: 'stay', intensity: 0 };
    }
    
    return {
      action: diff > 0 ? 'down' : 'up',
      intensity: Math.min(1, Math.abs(diff) / 150) * 0.8 // 수비적이므로 느리게
    };
  }
  
  private isBallClose(gameState: GameState): boolean {
    return gameState.ballSpeedX < 0 && gameState.ballX < gameState.canvasWidth * 0.6;
  }
  
  public getName(): string {
    return 'Defensive';
  }
}

/**
 * Balanced AI Strategy
 * 
 * 균형잡힌 플레이 스타일 - 상황에 따라 적응적으로 움직임
 */
export class BalancedStrategy implements AIStrategy {
  public makeDecision(gameState: GameState, config: AIConfig): AIDecision {
    const paddleCenter = gameState.paddleY + gameState.paddleHeight / 2;
    
    let targetY: number;
    
    if (this.isBallComingTowards(gameState)) {
      // 공이 다가올 때는 예측 위치 사용
      const prediction = BallPredictor.predictBallPosition(gameState, 40 + gameState.paddleWidth);
      targetY = prediction.confidence > 0.5 ? prediction.targetY : gameState.ballY + gameState.ballSize / 2;
      
      // accuracy 적용: 균형적이므로 중간 정도의 오차
      if (config.accuracy < 1.0) {
        const inaccuracy = (1 - config.accuracy) * 60; // 중간 정도 오차 범위
        const randomOffset = (Math.random() - 0.5) * 2 * inaccuracy;
        targetY += randomOffset;
      }
    } else {
      // 공이 멀어질 때는 중앙으로 복귀
      targetY = gameState.canvasHeight / 2;
    }
    
    const diff = targetY - paddleCenter;
    const threshold = 20;
    
    if (Math.abs(diff) < threshold) {
      return { action: 'stay', intensity: 0 };
    }
    
    return {
      action: diff > 0 ? 'down' : 'up',
      intensity: Math.min(1, Math.abs(diff) / 120)
    };
  }
  
  private isBallComingTowards(gameState: GameState): boolean {
    return gameState.ballSpeedX < 0;
  }
  
  public getName(): string {
    return 'Balanced';
  }
}


