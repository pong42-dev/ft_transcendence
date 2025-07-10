import { open } from 'sqlite'
import sqlite3 from 'sqlite3'
import { createPasswordManager } from "../src/plugins/app/auth/password-manager"

if (process.env.CAN_SEED_DATABASE !== 'true') {
  throw new Error("You can't seed the database. Set `CAN_SEED_DATABASE=true` environment variable to allow this operation.")
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
    await seedAdditionalPlayers(db)
    await seedTournaments(db)
    await seedGames(db)
    await seedGameParticipants(db)
  } catch (err) {
    console.error('Error seeding database:', err)
  } finally {
    await db.close()
  }
}

async function clearTables(db: sqlite3.Database) {
  await db.exec('PRAGMA foreign_keys = OFF')
  await db.exec('DELETE FROM game_participants')
  await db.exec('DELETE FROM games')
  await db.exec('DELETE FROM tournaments')
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
    { email: '1@gmail.com', password: '@1234567Ab', provider: 'local', provider_id: '', avatar: "public/1.png" },
    { email: '2@gmail.com', password: '@1234567Ab', provider: 'local', provider_id: '', avatar: "public/2.png" },
    { email: '3@gmail.com', password: '@1234567Ab', provider: 'local', provider_id: '', avatar: "public/3.png" },
    { email: '4@gmail.com', password: '@1234567Ab', provider: 'local', provider_id: '', avatar: "public/4.png" },
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
  await db.run(`
    INSERT INTO players (id, type, user_id, display_name)
    VALUES (1, 'ai', NULL, 'AI')
  `)
  console.log('AI Player inserted')
}

async function seedAdditionalPlayers(db: any) {
  await db.run(`INSERT INTO players (id, type, user_id) VALUES (2, 'user', 1)`)
  await db.run(`INSERT INTO players (id, type, user_id) VALUES (3, 'user', 2)`)
  await db.run(`INSERT INTO players (id, type, user_id) VALUES (4, 'user', 3)`)
  await db.run(`INSERT INTO players (id, type, user_id) VALUES (5, 'user', 4)`)
  console.log('User Players inserted')
}

async function seedTournaments(db: any) {
  await db.run(`
    INSERT INTO tournaments (id, status, winner_player_id, ended_at)
    VALUES (1, 'ended', 2, ?)
  `, [new Date().toISOString()])
  console.log('Tournaments seed data inserted')
}

async function seedGames(db: any) {
  const now = new Date().toISOString()
  const later = new Date(Date.now() + 60 * 1000).toISOString()

  // game_id 1: local_1v1
  await db.run(`
    INSERT INTO games (id, type, status, started_at, ended_at, winner_id)
    VALUES (1, 'local_1v1', 'finished', ?, ?, ?)
  `, [now, later, 3])

  // game_id 2: ai_1v1
  await db.run(`
    INSERT INTO games (id, type, status, started_at, ended_at, winner_id)
    VALUES (2, 'ai_1v1', 'finished', ?, ?, ?)
  `, [now, later, 1])

  // 토너먼트 경기
  await db.run(`
    INSERT INTO games (id, type, tournament_id, round_number, status, started_at, ended_at, winner_id)
    VALUES (3, 'tournament', 1, 1, 'finished', ?, ?, ?)
  `, [now, later, 2])

  await db.run(`
    INSERT INTO games (id, type, tournament_id, round_number, status, started_at, ended_at, winner_id)
    VALUES (4, 'tournament', 1, 1, 'finished', ?, ?, ?)
  `, [now, later, 5])

  await db.run(`
    INSERT INTO games (id, type, tournament_id, round_number, status, started_at, ended_at, winner_id)
    VALUES (5, 'tournament', 1, 2, 'finished', ?, ?, ?)
  `, [now, later, 2])

  console.log('Games seed data inserted')
}

async function seedGameParticipants(db: any) {
  await db.run(`
    INSERT INTO game_participants (game_id, player_id, score)
    VALUES 
      -- 일반 게임
      (1, 2, 1), (1, 3, 2),
      (2, 1, 3), (2, 2, 0),

      -- 토너먼트 1라운드
      (3, 2, 2), (3, 3, 1),
      (4, 4, 0), (4, 5, 3),

      -- 토너먼트 결승
      (5, 2, 2), (5, 5, 1)
  `)

  console.log('Game participants seed data inserted')
}

seed()
