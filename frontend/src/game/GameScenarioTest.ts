import { GameClient } from './GameClient';
import { GameRenderer } from './GameRenderer';
import { InputHandler } from './InputHandler';
import { GameApiService } from '../services/api/GameApiService';
import { WebSocketService } from '../services/websocket/WebSocketService';
import { CreateGameRequestDto, GameMode } from '../types/types';

const MODES: { label: string; value: GameMode }[] = [
  { label: 'Local 1v1 (게스트)', value: 'local_1v1' },
  { label: 'AI 1v1 (유저 vs AI)', value: 'ai_1v1' }
];

function createTestUI(onStart: (mode: GameMode, guestName?: string) => void) {
  const ui = document.getElementById('test-ui')!;
  ui.innerHTML = '';

  const modeLabel = document.createElement('label');
  modeLabel.textContent = '게임 모드: ';
  const modeSelect = document.createElement('select');
  MODES.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.value;
    opt.textContent = m.label;
    modeSelect.appendChild(opt);
  });

  const guestLabel = document.createElement('label');
  guestLabel.textContent = '게스트 별칭: ';
  const guestInput = document.createElement('input');
  guestInput.type = 'text';
  guestInput.placeholder = '게스트 이름';
  guestInput.value = 'Guest1';

  const startBtn = document.createElement('button');
  startBtn.textContent = '게임 시작';

  ui.appendChild(modeLabel);
  ui.appendChild(modeSelect);
  ui.appendChild(guestLabel);
  ui.appendChild(guestInput);
  ui.appendChild(startBtn);

  function updateUI() {
    if (modeSelect.value === 'local_1v1') {
      guestLabel.style.display = '';
      guestInput.style.display = '';
    } else {
      guestLabel.style.display = 'none';
      guestInput.style.display = 'none';
    }
  }
  modeSelect.onchange = updateUI;
  updateUI();

  startBtn.onclick = () => {
    onStart(modeSelect.value as GameMode, guestInput.value);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('game-root')!;
  let renderer: GameRenderer | null = null;
  let inputHandler: InputHandler | null = null;
  let client: GameClient | null = null;

  createTestUI(async (mode, guestName) => {
    root.innerHTML = '';
    renderer = new GameRenderer();
    inputHandler = new InputHandler();
    const apiService = new GameApiService();
    const wsService = new WebSocketService();
    client = new GameClient(apiService, wsService, renderer, inputHandler);

    root.appendChild(renderer.render());

    // 2. 참가자 정보 준비 (mock user)
    let players: CreateGameRequestDto['players'];
    if (mode === 'local_1v1') {
      players = [
        { type: 'user', userId: 1 }, // mock user
        { type: 'guest', displayName: guestName || 'Guest1' }
      ];
    } else {
      players = [
        { type: 'user', userId: 1 }, // mock user
      ];
    }

    // 3. 게임 세션 생성 (API)
    try {
      await client.startGame({ type: mode, players });
    } catch (e) {
      alert('게임 생성 실패: ' + (e as Error).message);
      return;
    }
    // 5. 게임 종료 등은 GameClient 내부에서 WebSocket 이벤트에 따라 자동 처리(모달 등)
  });
});