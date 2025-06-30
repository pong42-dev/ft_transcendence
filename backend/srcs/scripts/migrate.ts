import fs from 'fs'                 // 파일 시스템 다루기
import path from 'path'             // 파일 시스템 다루기
import { fileURLToPath } from 'url'
import sqlite3 from 'sqlite3'       // DB 연결
import { open } from 'sqlite'       // DB 연결
import Postgrator from 'postgrator' // migration 도구


async function doMigration (): Promise<void> {
	// DB 파일 경로: 환경 변수에서 가져오거나 기본 경로 사용
	const DB_FILE = process.env.SQLITE_DB_PATH || './database.sqlite'
	// DB 파일이 존재하지 않으면 에러 처리
	if (!fs.existsSync(DB_FILE)) {
		throw new Error(`Database file "${DB_FILE}" does not exist.`)
	}
	// SQLite 데이터베이스 열기
	const db = await open({
		filename: DB_FILE,
		driver: sqlite3.Database
	})

	const __filename = fileURLToPath(import.meta.url)
	const __dirname = path.dirname(__filename)
	try {
		// 마이그레이션 파일들(.sql)이 들어 있는 디렉토리 경로
		const migrationDir = path.join(__dirname, '../migrations')
		// 마이그레이션 디렉토리가 존재하지 않으면 에러 처리 
		if (!fs.existsSync(migrationDir)) {
			throw new Error(
				`Migration directory "${migrationDir}" does not exist. Skipping migrations.`
			)
		}
		
		// 마이그레이션 파일 목록 출력
		const migrationFiles = fs.readdirSync(migrationDir)
			.filter(file => file.endsWith('.sql'))
			.sort()
		console.log('Available migration files:', migrationFiles)
		
		// Postgrator 설정
		const postgrator = new Postgrator({
			migrationPattern: path.join(migrationDir, '*'),
			driver: 'sqlite3',
			database: DB_FILE,
			execQuery: async (query: string) => {
			  console.log('Executing query:', query.substring(0, 100) + '...')
			  await db.exec(query)
			  return { rows: [], fields: [] }
			},
			schemaTable: 'schemaversion'
		})
		// 마이그레이션 실행
		const migrations = await postgrator.migrate()
		console.log('Executed migrations:', migrations)
		console.log('Migration completed!')
	} catch (err) {
		 // 오류 발생 시 에러 출력
		console.error(err)
	} finally {
		// DB 연결 종료
		await db.close()
	}
}

doMigration()
