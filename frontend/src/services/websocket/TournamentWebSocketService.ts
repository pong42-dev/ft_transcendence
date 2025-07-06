import { TournamentServerMessage } from '../../types/tournament-websocket';

export class TournamentWebSocketService {
  private socket: WebSocket | null = null;
  private listeners: { [key: string]: ((data: any) => void)[] } = {};

  connect(tournamentId: string, playerId: number) {
    const backendHost = 'localhost:3000';
    const url = `ws://${backendHost}/ws/tournament/${tournamentId}?userId=${playerId}`;
    console.log('Connecting to tournament WebSocket:', url);
    this.socket = new WebSocket(url, []);

    this.socket.onopen = () => {
      console.log('Tournament WebSocket connected successfully');
      if (this.listeners['open']) {
        this.listeners['open'].forEach(cb => cb(null));
      }
    };

    this.socket.onmessage = (event) => {
      const message: TournamentServerMessage = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.socket.onerror = (error) => {
      console.error('Tournament WebSocket error:', error);
      if (this.listeners['error']) {
        this.listeners['error'].forEach(cb => cb(error));
      }
    };

    this.socket.onclose = (event) => {
      console.log('Tournament WebSocket closed:', event.code, event.reason);
      if (this.listeners['close']) {
        this.listeners['close'].forEach(cb => cb(event));
      }
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  sendMessage(msg: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    }
  }

  on(type: string, callback: (data: any) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(callback);
  }

  off(type: string, callback: (data: any) => void) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
  }

  private handleMessage(message: TournamentServerMessage) {
    if (this.listeners[message.type]) {
      this.listeners[message.type].forEach(cb => cb(message.data));
    }
    // 전체 메시지 구독용
    if (this.listeners['message']) {
      this.listeners['message'].forEach(cb => cb(message));
    }
  }
}

export const tournamentWebSocketService = new TournamentWebSocketService(); 