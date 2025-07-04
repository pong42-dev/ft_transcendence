import { GameState, AIDecision, AIConfig, AIDifficulty } from '../schemas/AITypes.js';
import { AIStrategy, AggressiveStrategy, DefensiveStrategy, BalancedStrategy } from './AIStrategy.js';

/**
 * AI Player
 * 
 * 고도화된 AI 플레이어 클래스
 * - 1Hz 업데이트 주기 지원
 * - 다양한 난이도
 * - 상황에 따른 적응형 전략 자동 선택
 * - 예측 기반 움직임
 * - 오류 시뮬레이션
 */
export class AIPlayer {
  private config: AIConfig;
  private lastUpdateTime: number = 0;
  private currentDecision: AIDecision = { action: 'stay', intensity: 0 };
  private reactionDelay: number = 0;
  private lastGameState?: GameState; // 디버그용 마지막 게임 상태
  
  // 적응형 전략 시스템
  private aggressiveStrategy: AIStrategy;
  private defensiveStrategy: AIStrategy;
  private balancedStrategy: AIStrategy;
  private currentStrategy: AIStrategy;
  
  constructor(difficulty: AIDifficulty = 'medium') {
    this.config = this.createConfigForDifficulty(difficulty);
    
    // 전략 객체들 초기화
    this.aggressiveStrategy = new AggressiveStrategy();
    this.defensiveStrategy = new DefensiveStrategy();
    this.balancedStrategy = new BalancedStrategy();
    this.currentStrategy = this.balancedStrategy; // 기본은 균형
  }

  /**
   * AI 업데이트 (1Hz 주기 지원 + 적응형 전략)
   */
  public update(gameState: GameState, currentTime: number): AIDecision {
    // 디버그용으로 마지막 게임 상태 저장
    this.lastGameState = gameState;
    
    const timeSinceLastUpdate = currentTime - this.lastUpdateTime;
    const updateInterval = 1000 / this.config.updateFrequency; // ms
    
    // 업데이트 주기가 되지 않았으면 이전 결정 유지
    if (timeSinceLastUpdate < updateInterval) {
      return this.currentDecision;
    }
    
    // 반응 시간 시뮬레이션
    if (this.reactionDelay > 0) {
      this.reactionDelay -= timeSinceLastUpdate;
      return this.currentDecision;
    }
    
    // 상황에 따른 적응형 전략 선택
    this.selectAdaptiveStrategy(gameState);
    
    // 선택된 전략으로 결정 생성
    let decision = this.currentStrategy.makeDecision(gameState, this.config);
    
    // 오류 시뮬레이션 (난이도에 따라)
    if (Math.random() < this.config.errorRate) {
      decision = this.simulateError(decision);
    }
    
    // 속도 제한 적용
    decision.intensity = Math.min(decision.intensity, this.config.maxSpeed);
    
    this.currentDecision = decision;
    this.lastUpdateTime = currentTime;
    
    // 다음 반응 지연 설정
    this.reactionDelay = this.config.reactionTime * (0.5 + Math.random() * 0.5);
    
    return decision;
  }

  /**
   * 게임 상황에 따른 적응형 전략 선택
   */
  private selectAdaptiveStrategy(gameState: GameState): void {
    const scoreDiff = gameState.aiScore - gameState.playerScore;
    
    if (scoreDiff < -1) {
      // AI가 2점 이상 뒤처짐 -> 공격적 전략
      this.currentStrategy = this.aggressiveStrategy;
    } else if (scoreDiff > 1) {
      // AI가 2점 이상 앞섬 -> 수비적 전략  
      this.currentStrategy = this.defensiveStrategy;
    } else {
      // 점수 차이가 1점 이하 -> 균형 전략
      this.currentStrategy = this.balancedStrategy;
    }
  }

  /**
   * 패들 위치 계산
   */
  public calculatePaddleMovement(
    currentY: number, 
    decision: AIDecision, 
    paddleHeight: number, 
    canvasHeight: number,
    paddleSpeed: number
  ): number {
    if (decision.action === 'stay') {
      return currentY;
    }
    
    const moveAmount = paddleSpeed * decision.intensity;
    let newY = currentY;
    
    if (decision.action === 'up') {
      newY = currentY - moveAmount;
    } else if (decision.action === 'down') {
      newY = currentY + moveAmount;
    }
    
    // 경계 체크
    return Math.max(0, Math.min(canvasHeight - paddleHeight, newY));
  }

  /**
   * 난이도별 설정 생성 (PRD 준수: 모든 난이도에서 1Hz 업데이트)
   */
  private createConfigForDifficulty(difficulty: AIDifficulty): AIConfig {
    switch (difficulty) {
      case 'easy':
        return {
          difficulty,
          reactionTime: 600,      // 매우 느린 반응 (0.6초)
          updateFrequency: 1,     // 1Hz (PRD 준수)
          maxSpeed: 0.6,          // 제한된 속도
          errorRate: 0.3,         // 높은 실수율 (30%)
          accuracy: 0.6           // 낮은 정확도 (60%)
        };
      
      case 'medium':
        return {
          difficulty,
          reactionTime: 300,      // 보통 반응 (0.3초)
          updateFrequency: 1,     // 1Hz (PRD 준수)
          maxSpeed: 0.8,          // 적당한 속도
          errorRate: 0.15,        // 보통 실수율 (15%)
          accuracy: 0.8           // 보통 정확도 (80%)
        };
      
      case 'hard':
        return {
          difficulty,
          reactionTime: 100,      // 빠른 반응 (0.1초)
          updateFrequency: 1,     // 1Hz (PRD 준수)
          maxSpeed: 1.0,          // 풀스피드
          errorRate: 0.05,        // 낮은 실수율 (5%)
          accuracy: 0.95          // 높은 정확도 (95%)
        };
      
      default:
        return {
          difficulty: 'medium',
          reactionTime: 300,
          updateFrequency: 1,
          maxSpeed: 0.8,
          errorRate: 0.15,
          accuracy: 0.8
        };
    }
  }

  /**
   * 오류 시뮬레이션 (인간적인 실수) - 난이도별 차별화
   */
  private simulateError(decision: AIDecision): AIDecision {
    // 난이도별로 다른 실수 유형
    const errorTypes = this.config.difficulty === 'easy' 
      ? ['wrong_direction', 'no_action', 'overreact', 'delay'] 
      : this.config.difficulty === 'medium'
      ? ['wrong_direction', 'overreact', 'underreact']
      : ['overreact']; // hard는 미세한 실수만
    
    const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    
    switch (errorType) {
      case 'wrong_direction':
        // 완전 반대 방향으로 이동 (초보자 실수)
        return {
          action: decision.action === 'up' ? 'down' : decision.action === 'down' ? 'up' : 'stay',
          intensity: decision.intensity * 0.8
        };
      
      case 'no_action':
        // 반응하지 못함 (초보자 실수)
        return { action: 'stay', intensity: 0 };
      
      case 'overreact':
        // 과도한 반응 (흔한 실수)
        return {
          action: decision.action,
          intensity: Math.min(1, decision.intensity * 1.4)
        };
        
      case 'underreact':
        // 너무 느린 반응 (중급자 실수)
        return {
          action: decision.action,
          intensity: decision.intensity * 0.6
        };
        
      case 'delay':
        // 지연 반응 (초보자 실수) - 다음 업데이트에서 반영
        this.reactionDelay += 200;
        return { action: 'stay', intensity: 0 };
      
      default:
        return decision;
    }
  }

  /**
   * 설정 변경
   */
  public updateConfig(difficulty: AIDifficulty): void {
    this.config = this.createConfigForDifficulty(difficulty);
  }

  /**
   * 현재 설정 반환
   */
  public getConfig(): AIConfig {
    return { ...this.config };
  }

  /**
   * 디버그 정보 반환
   */
  public getDebugInfo(): {
    difficulty: AIDifficulty;
    currentStrategy: string;
    lastDecision: AIDecision;
    timeSinceUpdate: number;
    reactionDelay: number;
    updateFrequency: number;
    lastScores?: { ai: number; player: number };
  } {
    return {
      difficulty: this.config.difficulty,
      currentStrategy: this.currentStrategy.getName(),
      lastDecision: this.currentDecision,
      timeSinceUpdate: Date.now() - this.lastUpdateTime,
      reactionDelay: this.reactionDelay,
      updateFrequency: this.config.updateFrequency,
      lastScores: this.lastGameState ? {
        ai: this.lastGameState.aiScore || 0,
        player: this.lastGameState.playerScore || 0
      } : undefined
    };
  }
}
