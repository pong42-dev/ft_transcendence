# 개발 환경용 프론트엔드 Dockerfile
FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 설치를 위해 package.json 복사
COPY package.json ./

# 의존성 설치
RUN npm install

# 나머지 소스 코드 복사
COPY . .

# Vite 개발 서버 포트 노출 (5173)
EXPOSE 5173

# 개발 서버 실행
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]