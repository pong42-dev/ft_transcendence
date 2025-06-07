import fs from 'fs'
import path from 'path'

if (Number(process.env.CAN_DROP_DATABASE) !== 1) {
	throw new Error("You can't drop the database. Set `CAN_DROP_DATABASE=1` environment variable to allow this operation.")
}

async function dropDatabase () {
	const dbFile = process.env.SQLITE_DB_PATH || './database.sqlite'

	try {
		await dropDB(dbFile)
	} catch (error) {
		console.error('Error dropping database:', error)
	}
}

async function dropDB (dbFile: string) {
	const dbPath = path.resolve(dbFile)

	if (fs.existsSync(dbPath)) {
		fs.unlinkSync(dbPath)
		console.log(`Database "${dbPath}" dropped successfully.`)
	} else {
		console.log(`No database file found at "${dbPath}". Skipping drop.`)
	}
}

dropDatabase()
