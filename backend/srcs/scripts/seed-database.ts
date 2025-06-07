import { open } from 'sqlite'
import sqlite3 from 'sqlite3'
import {createPasswordManager} from "../src/plugins/app/auth/password-manager"

if (Number(process.env.CAN_SEED_DATABASE) !== 1) {
	throw new Error("You can't seed the database. Set `CAN_SEED_DATABASE=1` environment variable to allow this operation.")
}

async function seed () {
	// SQLite 데이터베이스 연결
	const db = await open({
		filename: process.env.SQLITE_DB_PATH || './database.sqlite',
		driver: sqlite3.Database
	})

	try {
		await truncateTables(db)
		await seedUsers(db)
	} catch (error) {
		console.error('Error seeding database:', error)
	} finally {
		await db.close()
	}
}

async function truncateTables (db: sqlite3.Database) {
	const tables = await db.all('SELECT name FROM sqlite_master WHERE type="table"')

	if (tables.length > 0) {
		const tableNames = tables.map((row: { name: string }) => row.name)
		const truncateQueries = tableNames
		.map((tableName: string) => `DELETE FROM \`${tableName}\``)  // SQLite에서는 TRUNCATE 대신 DELETE 사용
		.join('; ')

		try {
		await db.exec('PRAGMA foreign_keys = OFF')  // 외래 키 제약 비활성화
		await db.exec(truncateQueries)
		console.log('All tables have been truncated successfully.')
		} finally {
		await db.exec('PRAGMA foreign_keys = ON')  // 외래 키 제약 활성화
		}
	}
}

async function seedUsers (db: sqlite3.Database) {
	const passwordManager = createPasswordManager();

	const users = [
		{ email: '1@gmail.com', password: '1', name: 'name1', provider: 'local', provider_id: '', avatar: "uploads/00dd55a1-a2a1-4826-8f2d-2b4726c39bff.png"},
		{ email: '2@gmail.com', password: '2', name: 'name2', provider: 'local', provider_id: '', avatar: "uploads/03ae714f-7efc-4911-8337-956cc2b5e735.png"},
	]

	for (const user of users) {
		// 사용자 정보 삽입
		const hash = await passwordManager.hashPassword(user.password);
		const userResult = await db.run(`
			INSERT INTO users (email, password, provider, provider_id)
			VALUES (?, ?, ?, ?)
		`, [user.email, hash, user.provider, user.provider_id])

		const userId = userResult.lastID;

		// 사용자 프로필 정보 삽입
		await db.run(`
			INSERT INTO user_profiles (user_id, name, avatar, status)
			VALUES (?, ?, ?, ?)
		`, [userId, user.email.split('@')[0], user.avatar, false])  // 기본적으로 이메일 앞부분을 이름으로 사용

		// // 사용자 토큰 정보 삽입
		// await db.run(`
		// 	INSERT INTO user_tokens (user_id, server_refresh_token, server_expires_at, google_refresh_token)
		// 	VALUES (?, ?, ?, ?)
		// `, [userId, 'sample-refresh-token', new Date().toISOString(), null])
	}
	console.log('Users have been seeded successfully.')
}

seed()
