# ft_transcendence
for 42 school project ft_transcendence

## 빠른 시작

### Docker를 사용한 전체 환경 실행
```bash
make all
```

### 개발 모드 실행
```bash
# 환경 상태 확인
make status

# 개발 가이드 확인
make dev-guide
```

## 문서

### 프론트엔드 개발 문서
- [프론트엔드 개발 환경 가이드](./docs/front-docs/frontend-development-environment-guide.md)
- [컴포넌트 아키텍처](./docs/front-docs/component-architecture.md)
- [코드베이스 구조 가이드](./docs/front-docs/codebase-structure-guide.md)
- [프로젝트 개요 및 아키텍처](./docs/front-docs/project-overview-architecture.md)

### API 문서
- [API 서비스 가이드](./docs/front-api-docs/api-service-guide.md)

### 백엔드 문서
- [API 사용자 인증](./docs/back-docs/api/users/)
- [기타 문서](./docs/back-docs/etc/)

## 주요 기능

- **사용자 인증**: 로컬 로그인, Google OAuth, 2FA 지원
- **친구 시스템**: 친구 추가/삭제, 온라인 상태 확인
- **게임**: Pong 게임, 실시간 매치메이킹
- **Mock 개발 환경**: 백엔드 없이 프론트엔드 개발 가능
