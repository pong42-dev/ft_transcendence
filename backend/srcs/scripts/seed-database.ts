import { open } from 'sqlite'
import sqlite3 from 'sqlite3'
import { createPasswordManager } from "../src/plugins/app/auth/password-manager"

if (Number(process.env.CAN_SEED_DATABASE) !== 1) {
  throw new Error("You can't seed the database. Set `CAN_SEED_DATABASE=1` environment variable to allow this operation.")
}

async function seed() {
  const db = await open({
    filename: process.env.SQLITE_DB_PATH || './database.sqlite',
    driver: sqlite3.Database,
  })

  try {
    await clearTables(db)
    await seedUsers(db)
  } catch (err) {
    console.error('Error seeding database:', err)
  } finally {
    await db.close()
  }
}

async function clearTables(db: sqlite3.Database) {
  // foreign key 제약 때문에 비활성화 후 데이터 삭제
  await db.exec('PRAGMA foreign_keys = OFF')
  await db.exec('DELETE FROM friends')
  await db.exec('DELETE FROM user_profiles')
  await db.exec('DELETE FROM users')
  await db.exec('PRAGMA foreign_keys = ON')
  console.log('Tables cleared')
}

async function seedUsers(db: sqlite3.Database) {
  const passwordManager = createPasswordManager()

  const users = [
    { email: '1@gmail.com', password: '@1234567Ab', provider: 'local', provider_id: '', avatar: "uploads/avatar.webp" },
    { email: '2@gmail.com', password: '@1234567Ab', provider: 'local', provider_id: '', avatar: "uploads/avatar.webp" },
  ]

  for (const user of users) {
    const hashedPassword = await passwordManager.hashPassword(user.password)
    const result = await db.run(`
      INSERT INTO users (email, password, provider, provider_id)
      VALUES (?, ?, ?, ?)
    `, [user.email, hashedPassword, user.provider, user.provider_id])

    const userId = result.lastID
    const nameFromEmail = user.email.split('@')[0].slice(0, 10)

    await db.run(`
      INSERT INTO user_profiles (user_id, name, avatar, status)
      VALUES (?, ?, ?, ?)
    `, [userId, nameFromEmail, user.avatar, false])
  }
  console.log('Seed data inserted')
}

seed()
