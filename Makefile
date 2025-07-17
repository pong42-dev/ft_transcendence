# Makefile 정의
NAME=ft_transcendence

# .env 파일을 읽기
include ./.env
export $(shell sed 's/=.*//g' .env)

# 기본 타겟
all: setup up

# 사용자 홈 디렉토리 내에 WordPress 데이터를 저장할 디렉토리 생성
# 사용자 홈 디렉토리 내에 MariaDB 데이터를 저장할 디렉토리 생성
# Docker Compose로 정의된 컨테이너를 빌드 및 실행 (./docker-compose.yml과 ./.env 파일 사용)
up:
	@echo "🐳 Docker 컨테이너 시작"
	@echo "포트: 프론트엔드=${FRONTEND_PORT}, 백엔드=${BACKEND_PORT}"
	mkdir -p ${DATA_PATH}
	docker compose -f ./docker-compose.yml --env-file ./.env up --build

game-cli:
	@docker-compose exec backend npx tsx scripts/game-cli.ts $(ARGS)

# -f ./docker-compose.yml : 사용할 Compose 파일 경로 지정(기본 ./docker-compose.yml)
# --env-file ./.env : .env 파일의 경로를 명시.
# up : 컨테이너를 생성하고 시작하는 명령어. 
# --build : 이미지가 있어도 다시 빌드하는 명령어 (Dockerfile 변경사항 반영 시 필요)
# -d : Detached 모드로 실행. 

# Docker Compose로 실행된 컨테이너 종료 (실행 중인 모든 컨테이너 종료)
down:
	docker compose -f ./docker-compose.yml down

# Docker Compose로 실행된 컨테이너 및 볼륨 제거
clean:
	docker compose -f ./docker-compose.yml down -v
	rm -rf ${DATA_PATH}

# Docker 시스템에서 사용되지 않는 데이터, 이미지, 컨테이너를 모두 삭제
fclean: clean
	docker system prune -af

re: fclean all

# 환경 설정 및 파일 검증
setup:
	@echo "🔧 ft_transcendence 환경 설정"
	@echo "================================"
	@echo "프로젝트: ${PROJECT_NAME}"
	@echo "사용자: ${LOGIN}"
	@echo "환경: ${NODE_ENV}"
	@echo "================================"
	@echo ""
	@echo "📝 환경 변수 파일 검증:"
	@if [ -f ".env" ]; then \
		echo "  ✅ ./.env (Docker & Makefile 설정)"; \
	else \
		echo "  ❌ ./.env 파일이 없습니다!"; \
		exit 1; \
	fi
	@if [ -f "backend/.env" ]; then \
		echo "  ✅ backend/.env (백엔드 설정)"; \
	else \
		echo "  ❌ backend/.env 파일이 없습니다!"; \
		echo "     backend/.env 파일을 생성해주세요."; \
		exit 1; \
	fi
	@if [ -f "frontend/.env" ]; then \
		echo "  ✅ frontend/.env (프론트엔드 설정)"; \
	else \
		echo "  ❌ frontend/.env 파일이 없습니다!"; \
		echo "     frontend/.env 파일을 생성해주세요."; \
		exit 1; \
	fi
	@echo ""
	@echo "📂 필요한 디렉토리 생성:"
	@mkdir -p ${DATA_PATH}
	@echo "  ✅ 데이터 디렉토리: ${DATA_PATH}"
	@echo ""
	@echo "✅ 환경 설정 완료!"

# 환경 상태 확인
status:
	@echo "📋 ft_transcendence 상태 확인"
	@echo "================================"
	@echo ""
	@echo "🔧 환경 변수:"
	@echo "  프로젝트명: ${PROJECT_NAME}"
	@echo "  사용자: ${LOGIN}"
	@echo "  환경 모드: ${NODE_ENV}"
	@echo "  데이터 경로: ${DATA_PATH}"
	@echo ""
	@echo "🌐 포트 설정:"
	@echo "  프론트엔드: ${FRONTEND_PORT} (HTTP), ${FRONTEND_SSL_PORT} (HTTPS)"
	@echo "  백엔드: ${BACKEND_PORT}"
	@echo ""
	@echo "📁 환경 파일:"
	@if [ -f ".env" ]; then echo "  ✅ ./.env"; else echo "  ❌ ./.env"; fi
	@if [ -f "backend/.env" ]; then echo "  ✅ backend/.env"; else echo "  ❌ backend/.env"; fi
	@if [ -f "frontend/.env" ]; then echo "  ✅ frontend/.env"; else echo "  ❌ frontend/.env"; fi
	@echo ""
	@echo "🐳 Docker 상태:"
	@docker compose ps 2>/dev/null || echo "  🛑 컨테이너가 실행되지 않음"

# 개발 환경 가이드
dev-guide:
	@echo "🚀 개발 환경 실행 가이드"
	@echo "================================"
	@echo ""
	@echo "1️⃣ 환경 검증:"
	@echo "   make status"
	@echo ""
	@echo "2️⃣ 로컬 개발 실행:"
	@echo "   터미널 1 (백엔드): cd backend && npm run dev"
	@echo "   터미널 2 (프론트엔드): cd frontend && npm run dev"
	@echo ""
	@echo "3️⃣ Docker 실행:"
	@echo "   make all"
	@echo ""
	@echo "🌐 접속 URL:"
	@echo "   개발 모드:"
	@echo "     - 프론트엔드: http://localhost:5173"
	@echo "     - 백엔드: http://localhost:3000"
	@echo "   Docker 모드:"
	@echo "     - 프론트엔드: http://localhost:${FRONTEND_PORT} (HTTP), https://localhost:${FRONTEND_SSL_PORT} (HTTPS)"
	@echo "     - 백엔드: http://localhost:${BACKEND_PORT}"

# 도움말
help:
	@echo "📚 ft_transcendence Makefile 사용법"
	@echo "===================================="
	@echo ""
	@echo "🏗️  빌드 & 실행:"
	@echo "   make all       - 환경 설정 후 Docker 실행"
	@echo "   make up        - Docker 컨테이너 빌드 및 실행"
	@echo "   make down      - Docker 컨테이너 종료"
	@echo ""
	@echo "🧹 정리:"
	@echo "   make clean     - 컨테이너 및 볼륨 제거"
	@echo "   make fclean    - 모든 Docker 데이터 정리"
	@echo "   make re        - 전체 재빌드"
	@echo ""
	@echo "⚙️  관리:"
	@echo "   make setup     - 환경 설정 및 검증"
	@echo "   make status    - 현재 상태 확인"
	@echo "   make dev-guide - 개발 환경 가이드"
	@echo ""
	@echo "❓ 기타:"
	@echo "   make help      - 이 도움말 표시"

.PHONY: all setup up down clean fclean re status dev-guide help game-cli