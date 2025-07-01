const WebSocket = require('ws');

// 서버 주소를 실제 서버에 맞게 수정하세요.
const ws = new WebSocket('ws://localhost:3000/ws/tournament/1234?playerId=4'); // 예시: 1234는 tournamentId

ws.on('open', function open() {
  console.log('✅ 연결됨! tournament_start 메시지 전송');
  ws.send(JSON.stringify({
    type: 'tournament_start',
    data: { playerId: 1 }
  }));
});

ws.on('message', function incoming(data) {
  console.log('📩 서버로부터 메시지:', data.toString());
});

ws.on('close', () => {
  console.log('❌ 연결 종료');
});

ws.on('error', (err) => {
  console.error('에러:', err);
});