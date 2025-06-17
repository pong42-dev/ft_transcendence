
---

# Project Structure

```
.
├── @types
│   └── fastify.d.ts
├── LICENSE
├── database
│   └── database.sqlite
├── migrations
│   ├── 001.do.users.sql
│   ├── 001.undo.users.sql
│   ├── ...
├── package-lock.json
├── package.json
├── scripts
│   ├── create-database.ts
│   ├── drop-database.ts
│   ├── migrate.ts
│   └── seed-database.ts
├── src
│   ├── app.ts
│   ├── plugins
│   │   ├── app
│   │   │   ├── auth
│   │   │   ├── users
│   │   │   └── utils
│   │   └── external
│   ├── routes
│   │   └── api
│   │       └── users
│   ├── schemas
│   └── server.ts
├── tsconfig.json
└── uploads
    └── avatar
```

---

## Detailed Explanation of Project Directory Structure

### 1. `@types`

* **Description:** Folder containing type declaration files (.d.ts) used throughout the project.
* **Example:** `fastify.d.ts` — Custom type declarations related to Fastify.

---

### 2. `database`

* **Description:** Folder where the actual database file is stored.
* **File:** `database.sqlite` — SQLite database file.

---

### 3. `migrations`

* **Description:** Folder containing SQL scripts to manage the database schema.
* **Purpose:** To handle table creation, modification, and deletion.
* **File structure:**

  * `001.do.users.sql`, `001.undo.users.sql` — First migration and rollback scripts
  * `002.do.user_profiles.sql`, `002.undo.user_profiles.sql` — User profile table migration
  * ...
  * The number indicates the execution order; `.do.` scripts apply changes, `.undo.` scripts rollback changes.

---

### 4. `package.json` and `package-lock.json`

* **Description:** Files defining the project dependencies, scripts, and metadata.

---

### 5. `scripts`

* **Description:** Folder containing project management scripts.
* **Key files:**

  * `create-database.ts` — Script to initialize the database
  * `drop-database.ts` — Script to drop/delete the database
  * `migrate.ts` — Script to execute migrations
  * `seed-database.ts` — Script to insert initial seed data

---

### 6. `src`

* **Description:** The main folder containing source code.
* Subdirectory roles:

#### 6-1. `src/app.ts`

* Core app setup and Fastify server instance creation code.

#### 6-2. `src/plugins`

* Collection of features organized as plugins. Structured as Fastify plugins.

##### - `app`

* Core application modules by functionality.

  * `auth` — Authentication related code (middleware, OAuth, login, 2FA, etc.)
  * `users` — User-related data handling (repositories, etc.)
  * `utils` — Common utility functions (error handling, file management, validation, etc.)

##### - `external`

* External integrations or common modules (env variables, JWT, Knex setup, sessions, QR codes, etc.)

#### 6-3. `src/routes`

* Folder containing API route modules, organized by URL path.
* Example: Routes related to `/api/users` like authentication, login, registration, token refresh, profile management, etc.

#### 6-4. `src/schemas`

* JSON Schema or TypeScript interfaces for data structure definitions.
* Used for request/response validation related to authentication, users, registration, etc.

#### 6-5. `src/server.ts`

* The entry point script to actually run the Fastify server.

---

### 7. `tsconfig.json`

* TypeScript compiler configuration file.

---

### 8. `uploads`

* Folder to store user-uploaded files.
* Contains a subfolder `avatar` for profile images.

---

## Summary

| Directory/File  | Role and Description                     |
| --------------- | ---------------------------------------- |
| `@types`        | Global type declarations repository      |
| `database`      | Location of actual SQLite database file  |
| `migrations`    | SQL scripts for DB schema changes        |
| `scripts`       | Scripts for DB and project management    |
| `src/app.ts`    | Fastify app setup                        |
| `src/plugins`   | Feature plugins code (auth, users, etc.) |
| `src/routes`    | API routing modules                      |
| `src/schemas`   | Data validation schemas                  |
| `src/server.ts` | Server startup entry point               |
| `tsconfig.json` | TypeScript configuration                 |
| `uploads`       | Storage for uploaded files               |

---
