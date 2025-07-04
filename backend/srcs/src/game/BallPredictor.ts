import { GameState, PredictionResult } from '../schemas/AITypes.js';

/**
 * Ball Predictor
 * 
 * 공의 궤적을 예측하여 AI가 최적의 위치로 이동할 수 있도록 도움
 */
export class BallPredictor {
  /**
   * 공이 AI 패들에 도달할 위치를 예측
   */
  public static predictBallPosition(gameState: GameState, paddleX: number): PredictionResult {
    const {
      ballX,
      ballY,
      ballSpeedX,
      ballSpeedY,
      canvasWidth,
      canvasHeight,
      ballSize
    } = gameState;

    // 공이 AI 패들 방향으로 오고 있지 않다면 현재 위치 반환
    if ((paddleX < canvasWidth / 2 && ballSpeedX > 0) || 
        (paddleX > canvasWidth / 2 && ballSpeedX < 0)) {
      return {
        targetY: ballY + ballSize / 2,
        confidence: 0.1,
        timeToReach: Infinity
      };
    }

    let predictedX = ballX;
    let predictedY = ballY;
    let currentSpeedX = ballSpeedX;
    let currentSpeedY = ballSpeedY;
    let timeSteps = 0;
    const maxTimeSteps = 1000; // 무한 루프 방지

    // 공이 패들 X 위치에 도달할 때까지 시뮬레이션
    while (Math.abs(predictedX - paddleX) > Math.abs(currentSpeedX) && timeSteps < maxTimeSteps) {
      predictedX += currentSpeedX;
      predictedY += currentSpeedY;

      // 위아래 벽과의 충돌 처리
      if (predictedY <= 0) {
        predictedY = 0;
        currentSpeedY = -currentSpeedY;
      } else if (predictedY + ballSize >= canvasHeight) {
        predictedY = canvasHeight - ballSize;
        currentSpeedY = -currentSpeedY;
      }

      timeSteps++;
    }

    const confidence = Math.max(0, 1 - timeSteps / maxTimeSteps);
    const timeToReach = timeSteps;

    return {
      targetY: predictedY + ballSize / 2,
      confidence,
      timeToReach
    };
  }

  /**
   * 공이 특정 지점을 지날 때의 Y 위치를 예측 (더 정교한 버전)
   */
  public static predictBallAtX(gameState: GameState, targetX: number): PredictionResult {
    const {
      ballX,
      ballY,
      ballSpeedX,
      ballSpeedY,
      canvasHeight,
      ballSize
    } = gameState;

    if (ballSpeedX === 0) {
      return {
        targetY: ballY + ballSize / 2,
        confidence: 0,
        timeToReach: Infinity
      };
    }

    // 선형 예측 (벽 충돌 무시)
    const timeToTarget = (targetX - ballX) / ballSpeedX;
    
    if (timeToTarget < 0) {
      return {
        targetY: ballY + ballSize / 2,
        confidence: 0,
        timeToReach: Infinity
      };
    }

    // 벽 충돌을 고려한 Y 위치 계산
    let predictedY = ballY + ballSpeedY * timeToTarget;
    let bounces = 0;

    // Y 위치가 경계를 넘나드는 경우 반사 계산
    while (predictedY < 0 || predictedY + ballSize > canvasHeight) {
      if (predictedY < 0) {
        predictedY = -predictedY;
      } else if (predictedY + ballSize > canvasHeight) {
        predictedY = 2 * (canvasHeight - ballSize) - predictedY;
      }
      bounces++;
      
      // 너무 많은 반사는 예측 신뢰도를 떨어뜨림
      if (bounces > 10) break;
    }

    const confidence = Math.max(0, 1 - bounces * 0.1 - timeToTarget * 0.001);

    return {
      targetY: Math.max(0, Math.min(canvasHeight - ballSize, predictedY)) + ballSize / 2,
      confidence,
      timeToReach: timeToTarget
    };
  }
}
