/**
 * UI 관련 유틸리티 함수들
 */
export class UIUtils {
  /**
   * 플레이어 이름을 UI 표시용으로 안전하게 새니타이즈
   */
  static sanitizePlayerName(name: string): string {
    if (typeof name !== 'string') return 'Unknown Player';
    
    // Remove potentially dangerous characters and limit length
    return name
      .replace(/[<>&"']/g, '') // Remove HTML special characters
      .trim()
      .substring(0, 50) || 'Unknown Player';
  }

  /**
   * 오류 메시지를 UI 표시용으로 안전하게 새니타이즈
   */
  static sanitizeErrorMessage(message: string): string {
    if (typeof message !== 'string') return 'Unknown Error';
    
    // Remove potentially dangerous characters and limit length for error messages
    return message
      .replace(/[<>&"']/g, '') // Remove HTML special characters
      .trim()
      .substring(0, 200) || 'Unknown Error';
  }

  /**
   * 일반 텍스트를 UI 표시용으로 안전하게 새니타이즈
   */
  static sanitizeText(text: string, maxLength: number = 100): string {
    if (typeof text !== 'string') return '';
    
    return text
      .replace(/[<>&"']/g, '') // Remove HTML special characters
      .trim()
      .substring(0, maxLength);
  }

  // ========================================
  // Validation Methods
  // ========================================

  /**
   * 사용자 ID 유효성 검증
   */
  static validateUserId(userId: any): boolean {
    return typeof userId === 'number' && userId > 0 && Number.isInteger(userId);
  }

  /**
   * 토너먼트 ID 유효성 검증
   */
  static validateTournamentId(tournamentId: any): boolean {
    return typeof tournamentId === 'number' && tournamentId > 0 && Number.isInteger(tournamentId);
  }

  /**
   * 매치 데이터 유효성 검증
   */
  static validateMatchData(data: any): boolean {
    console.log('Validating match data:', data);
    if (!data || typeof data !== 'object') {
      console.log('Invalid: data is not an object');
      return false;
    }
    
    // Check required fields
    if (!data.matchId || typeof data.matchId !== 'number' || data.matchId <= 0) {
      console.log('Invalid: matchId is invalid', data.matchId);
      return false;
    }
    if (!data.participants || !Array.isArray(data.participants)) {
      console.log('Invalid: participants is not an array');
      return false;
    }
    if (data.participants.length !== 2) {
      console.log('Invalid: participants length is not 2', data.participants.length);
      return false;
    }
    
    // Validate participants
    for (const participant of data.participants) {
      if (!participant || typeof participant !== 'object') {
        console.log('Invalid: participant is not an object', participant);
        return false;
      }
      if (!participant.id || !UIUtils.validateUserId(participant.id)) {
        console.log('Invalid: participant id is invalid', participant.id);
        return false;
      }
      if (!participant.name && !participant.display_name) {
        console.log('Invalid: participant has no name or display_name', participant);
        return false;
      }
      const name = participant.name || participant.display_name;
      if (typeof name !== 'string' || name.length > 50) {
        console.log('Invalid: participant name is invalid', name);
        return false;
      }
    }
    
    console.log('Match data validation passed');
    return true;
  }

  /**
   * 게임 결과 데이터 유효성 검증
   */
  static validateGameResult(gameResult: any): boolean {
    console.log('Validating game result:', gameResult);
    
    if (!gameResult || typeof gameResult !== 'object') {
      console.log('Invalid: gameResult is not an object');
      return false;
    }
    
    // Validate score range (typical Pong scores should be reasonable)
    const leftScore = gameResult.leftPlayer?.score || 0;
    const rightScore = gameResult.rightPlayer?.score || 0;
    
    console.log('Scores - Left:', leftScore, 'Right:', rightScore);
    
    if (typeof leftScore !== 'number' || typeof rightScore !== 'number') {
      console.log('Invalid: scores are not numbers');
      return false;
    }
    if (leftScore < 0 || rightScore < 0) {
      console.log('Invalid: negative scores');
      return false;
    }
    if (leftScore > 100 || rightScore > 100) {
      console.log('Invalid: scores too high');
      return false;
    }
    
    // Validate winner
    const winner = gameResult.winner;
    console.log('Winner:', winner);
    
    if (winner !== 'left' && winner !== 'right') {
      console.log('Invalid: winner is not left or right');
      return false;
    }
    
    console.log('Game result validation passed');
    return true;
  }

  /**
   * 플레이어 이름 유효성 검증
   */
  static validatePlayerName(name: any): boolean {
    if (typeof name !== 'string') return false;
    return name.length > 0 && name.length <= 50;
  }

  /**
   * 게임 점수 유효성 검증
   */
  static validateGameScore(score: any): boolean {
    return typeof score === 'number' && score >= 0 && score <= 100 && Number.isInteger(score);
  }

  /**
   * WebSocket 메시지 기본 구조 유효성 검증
   */
  static validateWebSocketMessage(message: any): boolean {
    return message && typeof message === 'object' && typeof message.type === 'string';
  }
}
