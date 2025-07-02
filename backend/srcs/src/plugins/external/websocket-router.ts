import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { GameWebSocketHandler } from '../../websocket/GameWebsocketHandler.js';
// import { TournamentWebSocketHandler } from '../../websocket/TournamentWebsocketHandler.js'; // 추후 구현

export default fp(async function (fastify: FastifyInstance) {
  const gameWsHandler = new GameWebSocketHandler();
  // const tournamentWsHandler = new TournamentWebSocketHandler(); // 추후 구현

  // /ws/game/:gameId → GameWebSocketHandler
  fastify.get('/ws/game/:gameId', { websocket: true }, (connection, request) => {
    gameWsHandler.handleConnection(connection, request);
  });

  // /ws/tournament/:tournamentId → TournamentWebSocketHandler (준비)
  // fastify.get('/ws/tournament/:tournamentId', { websocket: true }, (connection, request) => {
  //   tournamentWsHandler.handleConnection(connection, request);
  // });

  fastify.log.info('WebSocket router plugin registered');
}, {
  name: 'websocket-router',
  dependencies: ['websocket']
});