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
      try {
        const msg: WSServerMessage = JSON.parse(event.data);
        this.emit(msg.type, msg.data);
        this.emit('message', msg); // 전체 메시지 구독용
      } catch (err) {
        this.emit('error', err);
      }
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
    this.eventCallbacks.get(event)?.forEach(cb => cb(data));
  }
}

// Singleton instance for easy access
// This allows you to use webSocketService.connect(url) anywhere in your app
// without needing to import the class each time.
export const webSocketService = new WebSocketService();
