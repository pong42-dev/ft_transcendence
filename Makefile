# Makefile 정의
NAME=ft_transcendence

# .env 파일을 읽기
include ./.env
export $(shell sed 's/=.*//g' srcs/.env)

# 기본 타겟
all: up

# 사용자 홈 디렉토리 내에 WordPress 데이터를 저장할 디렉토리 생성
# 사용자 홈 디렉토리 내에 MariaDB 데이터를 저장할 디렉토리 생성
# Docker Compose로 정의된 컨테이너를 빌드 및 실행 (./docker-compose.yml과 ./.env 파일 사용)
up:
	mkdir -p /Users/${LOGIN}/app/dev/tmp
	docker compose -f ./docker-compose.yml --env-file ./.env up --build

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
	rm -rf /Users/${LOGIN}/app/dev/tmp

# Docker 시스템에서 사용되지 않는 데이터, 이미지, 컨테이너를 모두 삭제
fclean: clean
	docker system prune -af

re: fclean all