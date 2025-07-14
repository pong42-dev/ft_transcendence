/**
 * 향상된 로깅 시스템
 * 개발/운영 환경에 따라 다른 로깅 레벨과 출력 방식을 제공합니다.
 */

import { isProduction } from '../config/environment.js';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  context?: string;
  userId?: string;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  constructor() {
    // 환경에 따른 로그 레벨 설정
    this.logLevel = isProduction() ? LogLevel.ERROR : LogLevel.DEBUG;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private createLogEntry(level: LogLevel, message: string, data?: any, context?: string): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context,
      userId: this.getCurrentUserId()
    };
  }

  private getCurrentUserId(): string | undefined {
    // TokenManager나 현재 사용자 정보에서 가져오기
    try {
      return localStorage.getItem('currentUserId') || undefined;
    } catch {
      return undefined;
    }
  }

  private addToLogs(entry: LogEntry): void {
    this.logs.push(entry);
    
    // 로그 개수 제한
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  private formatMessage(entry: LogEntry): string {
    const prefix = entry.context ? `[${entry.context}]` : '';
    const userInfo = entry.userId ? ` (User: ${entry.userId})` : '';
    return `${prefix} ${entry.message}${userInfo}`;
  }

  debug(message: string, data?: any, context?: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry = this.createLogEntry(LogLevel.DEBUG, message, data, context);
    this.addToLogs(entry);
    
    console.debug(this.formatMessage(entry), data);
  }

  info(message: string, data?: any, context?: string): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const entry = this.createLogEntry(LogLevel.INFO, message, data, context);
    this.addToLogs(entry);
    
    console.info(this.formatMessage(entry), data);
  }

  warn(message: string, data?: any, context?: string): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const entry = this.createLogEntry(LogLevel.WARN, message, data, context);
    this.addToLogs(entry);
    
    console.warn(this.formatMessage(entry), data);
  }

  error(message: string, data?: any, context?: string): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const entry = this.createLogEntry(LogLevel.ERROR, message, data, context);
    this.addToLogs(entry);
    
    console.error(this.formatMessage(entry), data);
  }

  // API 요청/응답 로깅을 위한 특별 메소드들
  apiRequest(method: string, url: string, data?: any): void {
    this.debug(`API Request: ${method} ${url}`, data, 'API');
  }

  apiResponse(method: string, url: string, status: number, data?: any): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.DEBUG;
    const message = `API Response: ${method} ${url} - ${status}`;
    
    if (level === LogLevel.ERROR) {
      this.error(message, data, 'API');
    } else {
      this.debug(message, data, 'API');
    }
  }

  // 게임 상태 로깅
  gameAction(action: string, data?: any): void {
    this.info(`Game Action: ${action}`, data, 'Game');
  }

  // 인증 관련 로깅
  authAction(action: string, data?: any): void {
    this.info(`Auth Action: ${action}`, data, 'Auth');
  }

  // 로그 레벨 동적 변경
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info(`Log level changed to: ${LogLevel[level]}`);
  }

  // 저장된 로그 조회
  getLogs(level?: LogLevel, context?: string, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;

    if (level !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.level >= level);
    }

    if (context) {
      filteredLogs = filteredLogs.filter(log => log.context === context);
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }

    return filteredLogs;
  }

  // 로그 내보내기 (디버깅용)
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // 로그 지우기
  clearLogs(): void {
    this.logs = [];
    this.info('Logs cleared');
  }
}

// 편의를 위한 전역 로거 인스턴스
export const logger = Logger.getInstance();

// 개발용 단축 함수들
export const log = {
  debug: (message: string, data?: any, context?: string) => logger.debug(message, data, context),
  info: (message: string, data?: any, context?: string) => logger.info(message, data, context),
  warn: (message: string, data?: any, context?: string) => logger.warn(message, data, context),
  error: (message: string, data?: any, context?: string) => logger.error(message, data, context),
  api: {
    request: (method: string, url: string, data?: any) => logger.apiRequest(method, url, data),
    response: (method: string, url: string, status: number, data?: any) => logger.apiResponse(method, url, status, data)
  },
  game: (action: string, data?: any) => logger.gameAction(action, data),
  auth: (action: string, data?: any) => logger.authAction(action, data)
};
