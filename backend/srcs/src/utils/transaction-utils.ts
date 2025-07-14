import { Knex } from 'knex';

/**
 * SQLite BUSY 오류를 처리하는 트랜잭션 재시도 함수
 */
export async function withRetryTransaction<T>(
  knex: Knex,
  operation: (trx: Knex.Transaction) => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const trx = await knex.transaction();
    
    try {
      const result = await operation(trx);
      await trx.commit();
      return result;
    } catch (error: any) {
      await trx.rollback();
      lastError = error;
      
      // SQLite BUSY 오류인지 확인
      const isBusyError = error.message?.includes('database is locked') || 
                         error.message?.includes('BUSY') ||
                         error.code === 'SQLITE_BUSY';
      
      if (isBusyError && attempt < maxRetries) {
        // 지수 백오프로 재시도
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`SQLite BUSY error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // BUSY 오류가 아니거나 최대 재시도 횟수에 도달한 경우
      throw error;
    }
  }
  
  throw lastError!;
}

/**
 * 토너먼트 관련 DB 작업을 위한 트랜잭션 래퍼
 */
export async function withTournamentTransaction<T>(
  knex: Knex,
  operation: (trx: Knex.Transaction) => Promise<T>
): Promise<T> {
  return withRetryTransaction(knex, operation, 5, 200); // 토너먼트는 더 많은 재시도
}

/**
 * 매치 관련 DB 작업을 위한 트랜잭션 래퍼
 */
export async function withMatchTransaction<T>(
  knex: Knex,
  operation: (trx: Knex.Transaction) => Promise<T>
): Promise<T> {
  return withRetryTransaction(knex, operation, 3, 150);
}

/**
 * 동시 DB 접근을 방지하기 위한 락 메커니즘
 */
export class DatabaseLock {
  private static locks = new Map<string, Promise<any>>();
  
  static async withLock<T>(
    lockKey: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // 이미 진행 중인 작업이 있으면 대기
    if (this.locks.has(lockKey)) {
      await this.locks.get(lockKey);
    }
    
    // 새로운 락 생성
    const lockPromise = operation().finally(() => {
      this.locks.delete(lockKey);
    });
    
    this.locks.set(lockKey, lockPromise);
    return lockPromise;
  }
  
  static async withTournamentLock<T>(
    tournamentId: number,
    operation: () => Promise<T>
  ): Promise<T> {
    return this.withLock(`tournament_${tournamentId}`, operation);
  }
  
  static async withMatchLock<T>(
    matchId: number,
    operation: () => Promise<T>
  ): Promise<T> {
    return this.withLock(`match_${matchId}`, operation);
  }
} 