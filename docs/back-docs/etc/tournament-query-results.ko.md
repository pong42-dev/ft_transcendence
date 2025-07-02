# 토너먼트 레포지토리 쿼리 가이드

이 문서는 백엔드 토너먼트 기능의 핵심인 `tournaments-repository`와 `matches-repository`의 모든 주요 함수에 대한 설명과 예상 결과, 동작 방식을 정리합니다.

---

## Ⅰ. 데이터 조회 (Read Queries)

프론트엔드로 전달되는 데이터의 구조를 파악하기 위한 조회 쿼리 예시입니다.

### **사용 사례 1: 토너먼트 목록 전체 조회**
> 💡 **목표**: "진행중"이거나 "종료된" 모든 토너먼트의 목록을 간략하게 확인합니다.

- **함수**: `tournamentsRepository.getAllTournaments()`
- **API**: `GET /api/tournaments`
- **결과**: 토너먼트의 기본 정보 배열.
```json
[ { "id": 1, "status": "ended", "winner_player_id": 3, /* ... */ } ]
```

### **사용 사례 2: 토너먼트 상세 정보 및 대진표 조회**
> 💡 **목표**: 특정 토너먼트의 참가자, 모든 경기의 대진표 및 결과를 한 번에 조회합니다.

- **함수**: `tournamentsRepository.getTournamentWithDetails(tournamentId)`
- **API**: `GET /api/tournaments/:tournamentId`
- **결과**: 토너먼트 상세 정보, 참가자 목록, 경기 목록을 포함하는 단일 객체.
```json
{
  "id": 1, "status": "ended", "winner_player_id": 3,
  "participants": [ /* ... */ ],
  "matches": [ /* ... */ ]
}
```

### **사용 사례 3: "나의 토너먼트 전적" 조회**
> 💡 **목표**: 로그인한 사용자가 참여했던 모든 토너먼트의 요약 정보를 조회합니다.

- **함수**: `tournamentsRepository.getUserTournamentHistory(userId)`
- **API**: `GET /api/tournaments/user/history`
- **특징**: 사용자가 속했던 토너먼트의 **전체 경기 흐름**을 제공하여, 자신이 치르지 않은 경기의 결과도 함께 파악할 수 있습니다.
- **결과**: 사용자의 토너먼트 기록 배열. 각 요소는 최종 순위, 전체 참가자, 라운드별 경기 결과를 포함합니다.
```json
[
  {
    "tournament_id": 1, "final_rank": 2,
    "participants": [ "Alice", "Bob_Guest", "Charlie", "David_Guest" ],
    "rounds": [ /* ... */ ]
  }
]
```
---

## Ⅱ. 데이터 생성 및 변경 (Write & Control Queries)

토너먼트의 생성 및 상태 변경과 관련된 핵심적인 쓰기/제어 함수들입니다. 주로 트랜잭션 내에서 실행되며, 반환값보다는 수행하는 역할이 중요합니다.

### **[C] 토너먼트 생성 흐름**
> 💡 **API**: `POST /api/tournaments` 요청 시 아래 함수들이 **단일 트랜잭션** 내에서 순차적으로 호출됩니다.

1.  **`tournamentsRepository.addTournamentParticipantWithTransaction`**
    *   **역할**: 토너먼트 참가자를 `players` 테이블에 등록합니다.
    *   **동작**:
        *   `type: 'user'`인 경우, `users` 테이블에 이미 존재하는 유저이므로 `user_id`를 그대로 사용합니다.
        *   `type: 'guest'`인 경우, `display_name`으로 새로운 게스트 플레이어를 생성합니다.
    *   **반환값**: 생성된 플레이어의 ID.

2.  **`tournamentsRepository.generateTournamentBracketWithTransaction`**
    *   **역할**: 등록된 참가자 4명으로 초기 대진표(4강 2경기)를 생성하여 `games` 테이블에 삽입합니다.
    *   **동작**: 참가자들을 무작위로 섞어 두 개의 경기를 생성합니다. (`round_number: 1`)
    *   **반환값**: `void`

### **[U] 경기 진행 및 결과 처리 흐름**
> 💡 **API**: `POST /api/tournaments/:tournamentId/matches/:matchId/start` 및 `.../end` 요청 시 호출됩니다.

1.  **`matchesRepository.updateMatchStatus`**
    *   **역할**: 경기의 상태를 변경합니다.
    *   **호출 시점**:
        *   경기 시작 시: `status`를 `waiting` -> `playing`으로 변경.
        *   경기 종료 시: `status`를 `playing` -> `ended`로 변경.
    *   **반환값**: `void`

2.  **`matchesRepository.processMatchResult`**
    *   **역할**: 종료된 경기의 결과를 처리하고, 다음 라운드를 준비하는 **핵심 로직**입니다.
    *   **호출 시점**: `POST .../:matchId/end` API에서 호출됩니다.
    *   **동작**:
        *   `games` 테이블에 승자 ID(`winner_id`)와 점수를 기록합니다.
        *   **(4강전 종료 시)**: 승자를 다음 라운드(결승전) 진출자로 결정합니다. 두 4강전이 모두 끝나면, 두 명의 승자로 새로운 결승전 경기를 `games` 테이블에 생성합니다. (`round_number: 2`)
    *   **반환값**: 처리된 경기 정보.

3.  **`matchesRepository.setTournamentWinner`**
    *   **역할**: 토너먼트의 최종 우승자를 `tournaments` 테이블에 기록하고, 토너먼트 상태를 `ended`로 변경합니다.
    *   **호출 시점**: 결승전(`round_number: 2`) 경기의 결과 처리가 끝난 후 호출됩니다.
    *   **반환값**: `void`

---

## Ⅲ. 보조 및 내부용 조회 (Helper Queries)

상태 확인 등 내부 로직에서 사용되는 간단한 조회 함수들입니다.

- **`tournamentsRepository.getTournament(tournamentId)`**
    - **역할**: 토너먼트의 기본 정보(주로 `status`)만 빠르게 조회하여, 로직 처리 전 조건을 검사하는 데 사용됩니다. (예: "이미 종료된 토너먼트인가?")

- **`matchesRepository.getMatchById(matchId)`**
    - **역할**: 특정 경기 하나의 상세 정보를 조회합니다. 경기 상태를 확인하거나, 참가자 정보를 얻을 때 사용됩니다.

- **`matchesRepository.getNextPendingMatch(tournamentId)`**
    - **역할**: 현재 토너먼트에서 아직 시작하지 않은 다음 경기를 찾습니다. (예: 4강 1경기가 끝난 후, 4강 2경기를 찾을 때 사용)

```json
{
  "id": 1,
  "tournament_id": 1,
  "round_number": 1,
  "status": "ended",
  "winner_id": 1,
  "player1_id": 1,
  "player2_id": 2,
  "player1_score": 5,
  "player2_score": 2,
  "player1_name": "Alice",
  "player2_name": "Bob_Guest"
}
``` 