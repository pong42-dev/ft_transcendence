// backend/srcs/plugins/external/websocket-router.ts

import { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { WebSocket } from 'ws';
import { GameWebSocketHandler } from '../../websocket/GameWebsocketHandler.js';
import { TournamentWebSocketHandler } from '../../websocket/TournamentWebsocketHandler.js';

async function websocketRouter(fastify: FastifyInstance) {
  // 각 핸들러 인스턴스 생성
  const gameHandler = new GameWebSocketHandler();
  const tournamentHandler = new TournamentWebSocketHandler(fastify);

  // 기존 게임 경로는 GameWebSocketHandler가 처리
  fastify.get('/ws/game/:gameId', { websocket: true }, (socket: WebSocket, request: FastifyRequest) => {
    gameHandler.handleConnection(socket, request);
  });

  // 새로운 토너먼트 경로는 TournamentWebSocketHandler가 처리
  fastify.get('/ws/tournament/:tournamentId', { websocket: true }, (socket: WebSocket, request: FastifyRequest) => {
    tournamentHandler.handleConnection(socket, request);
  });
}

export default fp(websocketRouter, {
  name: 'websocket-router',
  dependencies: ['websocket']
});