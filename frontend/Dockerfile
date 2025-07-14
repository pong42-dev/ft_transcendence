# 멀티 스테이지 빌드
FROM node:18-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 설치를 위해 package.json 복사
COPY package.json ./

# 의존성 설치
RUN npm install

# 나머지 소스 코드 복사
COPY . .

# .env 파일을 읽어서 JavaScript 설정 파일 생성
RUN cat .env | grep -v '^#' | grep -v '^$' | sed 's/\(.*\)=\(.*\)/  \1: "\2",/' > /tmp/env_vars.txt && \
    echo "export const ENV_CONFIG = {" > src/config/env-config.js && \
    cat /tmp/env_vars.txt >> src/config/env-config.js && \
    echo "};" >> src/config/env-config.js

# 빌드 실행
RUN npm run build

# Nginx 스테이지
FROM debian:bullseye

RUN apt-get update && apt-get -y install --no-install-recommends \
    nginx \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# SSL 디렉토리 생성 및 인증서 생성
RUN mkdir /etc/nginx/ssl && \
    openssl req -newkey rsa:4096 -x509 -sha256 -days 365 -nodes \
       -out /etc/nginx/ssl/ft_transcendence.crt \
       -keyout /etc/nginx/ssl/ft_transcendence.key \
       -subj "/C=KR/ST=Seoul/L=Seoul/O=42Seoul/OU=ft_transcendence/CN=localhost" && \
    chmod 600 /etc/nginx/ssl/ft_transcendence.key && \
    chmod 644 /etc/nginx/ssl/ft_transcendence.crt

# 빌드된 파일을 nginx html 디렉토리로 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx 설정 파일 복사
COPY nginx.conf /etc/nginx/sites-available/default

# 포트 노출
EXPOSE 80 443

# nginx 실행
CMD ["nginx", "-g", "daemon off;"]