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
    await seedPlayers(db)
  } catch (err) {
    console.error('Error seeding database:', err)
  } finally {
    await db.close()
  }
}

async function clearTables(db: sqlite3.Database) {
  // foreign key 제약 때문에 비활성화 후 데이터 삭제
  await db.exec('PRAGMA foreign_keys = OFF')
  await db.exec('DELETE FROM game_participants')
  await db.exec('DELETE FROM games')
  await db.exec('DELETE FROM players')
  await db.exec('DELETE FROM friends')
  await db.exec('DELETE FROM user_profiles')
  await db.exec('DELETE FROM users')
  await db.exec('PRAGMA foreign_keys = ON')
  console.log('Tables cleared')
}

async function seedUsers(db: sqlite3.Database) {
  const passwordManager = createPasswordManager()

  const users = [
    { email: '1@gmail.com', password: '@1234567Ab', provider: 'local', provider_id: '', avatar: "public/2345260e-635c-47e5-9648-2597fb864860.png" },
    { email: '2@gmail.com', password: '@1234567Ab', provider: 'local', provider_id: '', avatar: "public/7923aa74-efa6-4091-a826-1b5d4db4b065.png" },
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
  console.log('Users seed data inserted')
}

async function seedPlayers(db: any) {
  // AI 플레이어 추가
  await db.run(`
    INSERT INTO players (id, type, user_id, display_name)
    VALUES (1, 'ai', NULL, 'AI')
  `)
  console.log('Players seed data inserted')
}

seed()
