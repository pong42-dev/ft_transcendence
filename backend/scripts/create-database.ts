import fs from 'fs'
import path from 'path'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

if (process.env.CAN_CREATE_DATABASE !== 'true') {
	throw new Error("You can't create the database. Set `CAN_CREATE_DATABASE=true` environment variable to allow this operation.")
}

const DB_FILE = process.env.SQLITE_DB_PATH || './database/database.sqlite'

async function createDatabase () {
	if (fs.existsSync(DB_FILE)) {
		console.log(`Database already exists at ${DB_FILE}`)
		return
	}

	const dir = path.dirname(DB_FILE)
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true })
		console.log(`Created directory: ${dir}`)
	}

	const db = await open({
		filename: DB_FILE,
		driver: sqlite3.Database
	})

	await db.close()
	console.log(`SQLite database created at ${DB_FILE}`)
}

createDatabase()
