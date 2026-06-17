import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.resolve(__dirname, './photos.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    album_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    FOREIGN KEY (album_id) REFERENCES albums (id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    last_login DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const albumColumns = db.prepare(`PRAGMA table_info(albums)`).all() as { name: string }[];
const hasPasswordColumn = albumColumns.some((column) => column.name === 'password_hash');
if (!hasPasswordColumn) {
  db.exec('ALTER TABLE albums ADD COLUMN password_hash TEXT');
}

export default db;
