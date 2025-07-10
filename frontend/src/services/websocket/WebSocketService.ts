import { WSServerMessage, WSClientMessage } from '../../types/game-websocket';

export type WebSocketEvent = string;
export type EventCallback = (data: any) => void;

export class WebSocketService {
  private socket: WebSocket | null = null;
  private eventCallbacks: Map<WebSocketEvent, Set<EventCallback>> = new Map();

  connect(url: string) {
    this.disconnect();
    this.socket = new WebSocket(url);

    this.socket.onopen = () => this.emit('open');
    this.socket.onclose = () => this.emit('close');
    this.socket.onerror = (e) => this.emit('error', e);

    this.socket.onmessage = (event) => {
      // 메시지 처리를 비동기로 수행하여 메인 스레드 블로킹 방지
      setTimeout(() => {
        try {
          const msg: WSServerMessage = JSON.parse(event.data);
          this.emit(msg.type, msg.data);
          this.emit('message', msg); // 전체 메시지 구독용
        } catch (err) {
          this.emit('error', err);
        }
      }, 0);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  sendMessage(msg: WSClientMessage) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    }
  }

  on(event: WebSocketEvent, callback: EventCallback) {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, new Set());
    }
    this.eventCallbacks.get(event)!.add(callback);
  }

  off(event: WebSocketEvent, callback: EventCallback) {
    this.eventCallbacks.get(event)?.delete(callback);
  }

  private emit(event: WebSocketEvent, data?: any) {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks && callbacks.size > 0) {
      // 콜백을 배열로 복사하여 실행 중 콜백 변경으로 인한 문제 방지
      const callbackArray = Array.from(callbacks);
      callbackArray.forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in WebSocket callback for event '${event}':`, err);
        }
      });
    }
  }
}

// Singleton instance for easy access
// This allows you to use webSocketService.connect(url) anywhere in your app
// without needing to import the class each time.
export const webSocketService = new WebSocketService();
