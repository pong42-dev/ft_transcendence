FROM node:22-bullseye

WORKDIR /app

COPY ./package.json ./

# 의존성 설치
RUN npm install

# 전체 코드 복사
COPY ./ .
COPY ./.env ./

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# 3000 포트 오픈
EXPOSE 3000

# 서버 실행 (예: server.ts 또는 dist/server.js 등)
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["npm", "run", "dev"]

