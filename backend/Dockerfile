FROM node:22-bullseye

WORKDIR /app

COPY ./srcs/package.json ./

# 의존성 설치
RUN npm install

# 전체 코드 복사
COPY ./srcs .
COPY ./.env ./

RUN npm run db:reset

# 3000 포트 오픈
EXPOSE 3000

# 서버 실행 (예: server.ts 또는 dist/server.js 등)
CMD ["npm", "run", "dev"]

