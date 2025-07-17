# 게임 관리 CLI

이 문서는 게임 API와 상호작용하기 위한 명령줄 인터페이스인 `game-cli.ts` 스크립트 사용법을 안내합니다. 이 도구는 개발자의 테스트 및 관리 목적으로 사용됩니다.

## 과제 요구사항 및 `game-cli.ts`의 충족

본 과제의 주요 모듈인 "Basic Pong을 서버 측 Pong으로 교체 및 API 구현"에서는 CLI를 통한 게임의 부분적인 사용을 명확히 요구하고 있습니다. 원문 요구사항은 다음과 같습니다:

> Create an API that exposes the necessary resources and endpoints to interact with the Pong game, allowing **partial usage of the game via the Command-Line Interface (CLI)** and web interface.

`game-cli.ts`는 다음 기능을 제공하여 이러한 요구사항을 충족합니다.

- **사용자 인증**: `login` 명령어를 통해 CLI에서 웹 애플리케이션에 로그인하고, API 사용을 위한 인증 토큰을 획득 및 저장합니다.
- **게임 관리 (생성)**: `create` 명령어를 통해 새로운 게임 매치를 생성하여, 서버의 게임 생성 API가 정상적으로 동작함을 입증합니다.
- **게임 상태 조회**: `status` 명령어를 통해 특정 게임의 현재 상태를 API로부터 조회하고 출력합니다. 이는 실시간 게임 플레이가 아닌, 특정 시점의 게임 상태를 '조회'하는 관리 도구의 역할을 수행합니다.
- **게임 취소**: `cancel` 명령어를 통해 진행 중인 게임을 취소하여, 게임 관리 API의 핵심 기능을 보여줍니다.

이러한 기능들은 CLI가 완전한 게임 클라이언트가 아니라, API를 사용하는 '관리 도구' 또는 '테스트 도구'로서 API의 유연성과 독립성을 증명하는 역할을 합니다.

## 전제 조건

CLI를 사용하기 전에 `ts-node`가 설치되어 있고 백엔드 서버가 실행 중인지 확인하세요.

## 위치

스크립트는 `backend/scripts/game-cli.ts`에 있습니다.

## 명령어

CLI는 다음 명령어를 지원합니다:

- `login`
- `create`
- `status`
- `cancel`

모든 명령어는 `make game-cli ARGS='...'` 형식을 사용하여 실행해야 합니다. 셸(zsh 등)의 예기치 않은 확장을 방지하기 위해 전체 인수를 작은따옴표로 묶는 것이 가장 안전합니다.

### `login`

사용자를 인증하고 현재 디렉토리에 `.clitoken` 파일로 액세스 토큰을 저장합니다. 이 토큰은 이후 모든 명령에 사용됩니다.

**사용법:**

```bash
make game-cli ARGS='login --email "<귀하의_이메일>" --password "<귀하의_비밀번호>"'
```

**인수 (Arguments):**

- `--email`: 등록된 이메일 주소.
- `--password`: 비밀번호.

**예시:**

```bash
make game-cli ARGS='login --email "user@example.com" --password "password123!@#"'
```

### `create`

새로운 게임을 생성합니다.

**사용법:**

```bash
make game-cli ARGS='create <유형> [옵션]'
```

**인수 (Arguments):**

- `유형`: 생성할 게임의 유형입니다. `local` 또는 `ai`가 될 수 있습니다.

**옵션 (Options):**

- `--opponent <이름>`: (`local` 게임에 필수) 게스트 상대방의 표시 이름입니다.
- `--difficulty <레벨>`: (`ai` 게임에 선택 사항) AI의 난이도입니다. `easy`, `medium`, `hard`가 될 수 있습니다.

**예시:**

- 로컬 1대1 게임 생성:
  ```bash
  make game-cli ARGS='create local --opponent "Player2"'
  ```
- 중간 난이도 AI와의 게임 생성:
  ```bash
  make game-cli ARGS='create ai --difficulty medium'
  ```

### `status`

특정 게임의 상태를 조회합니다.

**사용법:**

```bash
make game-cli ARGS='status "<게임ID>"'
```

**인수 (Arguments):**

- `게임ID`: 확인할 게임의 ID입니다.

**예시:**

```bash
make game-cli ARGS='status "some-game-uuid"'
```

### `cancel`

진행 중인 게임을 취소합니다.

**사용법:**

```bash
make game-cli ARGS='cancel "<게임ID>"'
```

**인수 (Arguments):**

- `게임ID`: 취소할 게임의 ID입니다.

**예시:**

```bash
make game-cli ARGS='cancel "some-game-uuid"'
``` 