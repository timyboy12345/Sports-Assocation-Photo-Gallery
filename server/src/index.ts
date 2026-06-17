import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import session from 'express-session';
import { rateLimit } from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';
import { Issuer, Strategy, Client } from 'openid-client';
import db from './db';

const app = express();
const port: string = process.env.PORT || '3001';

// Ensure uploads directory exists
const uploadsDir = process.env.UPLOADS_PATH || path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const THUMBNAIL_SUFFIX = '.thumb.webp';
const COMPRESSED_SUFFIX = '.compressed.webp';
const currentlyProcessingPhotos = new Set<string>();

const getVariantPaths = (originalPath: string) => {
  const parsedPath = path.parse(originalPath);
  return {
    thumbnailPath: path.join(parsedPath.dir, `${parsedPath.name}${THUMBNAIL_SUFFIX}`),
    compressedPath: path.join(parsedPath.dir, `${parsedPath.name}${COMPRESSED_SUFFIX}`)
  };
};

const processPhotoVariants = async (relativeFilename: string) => {
  if (currentlyProcessingPhotos.has(relativeFilename)) return;
  currentlyProcessingPhotos.add(relativeFilename);

  console.log('Processing photo:', relativeFilename);

  try {
    const sourcePath = path.join(uploadsDir, relativeFilename);
    if (!fs.existsSync(sourcePath)) return;

    const { thumbnailPath, compressedPath } = getVariantPaths(sourcePath);
    const sourceBuffer = await fs.promises.readFile(sourcePath);
    const baseImage = sharp(sourceBuffer, { failOn: 'none' }).rotate();

    if (!fs.existsSync(thumbnailPath)) {
      console.log(' - Generating thumbnail for:', relativeFilename);

      await baseImage
        .clone()
        .resize(520, 520, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(thumbnailPath);
    }

    if (!fs.existsSync(compressedPath)) {
      console.log(' - Generating compressed variant for:', relativeFilename);

      await baseImage
        .clone()
        .webp({ quality: 90 })
        .toFile(compressedPath);
    }

    console.log(' - Photo variants generated for:', relativeFilename);
  } catch (err) {
    console.error('Failed variant generation for file:', relativeFilename, err);
  } finally {
    currentlyProcessingPhotos.delete(relativeFilename);
  }
};

const processPhotosInBackground = async (relativeFilenames: string[]) => {
  for (const filename of relativeFilenames) {
    await processPhotoVariants(filename);
  }

  console.log('All photos processed');
};

const processAllPhotosInBackground = () => {
  const photos = db.prepare('SELECT filename FROM photos').all() as { filename: string }[];
  processPhotosInBackground(photos.map((photo) => photo.filename));
};

app.use(cors({origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true}));
app.use(express.json());
app.use('/api/uploads', express.static(uploadsDir));

// Session config
app.use(session({
  secret: process.env.SESSION_SECRET || 'photo-viewer-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using https
}));

// Placeholder OIDC Config (Should be moved to .env)
const OIDC_ISSUER = process.env.OIDC_ISSUER || 'https://accounts.google.com';
const OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID || 'your-client-id';
const OIDC_CLIENT_SECRET = process.env.OIDC_CLIENT_SECRET || 'your-client-secret';
const REDIRECT_URI = (process.env.SERVER_URL || 'http://localhost:3001') + '/api/auth/callback';

let client: Client;

// Initialize OIDC Client
async function initOidc() {
  try {
    const issuer = await Issuer.discover(OIDC_ISSUER);
    client = new issuer.Client({
      client_id: OIDC_CLIENT_ID,
      client_secret: OIDC_CLIENT_SECRET,
      redirect_uris: [REDIRECT_URI],
      response_types: ['code'],
    });
    console.log('OIDC Client initialized');
  } catch (err) {
    console.error('OIDC Initialization failed:', err);
  }
}

initOidc();

// Helper to sanitize folder names
const sanitizeFolderName = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const hashAlbumPassword = (password: string) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const verifyAlbumPassword = (password: string, storedHash: string) => {
  const [salt, hashHex] = storedHash.split(':');
  if (!salt || !hashHex) return false;

  const storedBuffer = Buffer.from(hashHex, 'hex');
  const suppliedBuffer = crypto.scryptSync(password, salt, storedBuffer.length);
  return crypto.timingSafeEqual(storedBuffer, suppliedBuffer);
};

// Auth Middleware
const isAuthenticated = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if ((req.session as any).user) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

const mutationRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many requests' }
});

// --- Auth Routes ---
app.get('/api/auth/login', (req, res) => {
  if (!client) return res.status(500).send('OIDC not initialized');
  const url = client.authorizationUrl({
    scope: 'openid email profile',
  });
  res.redirect(url);
});

app.get('/api/auth/callback', async (req, res) => {
  if (!client) return res.status(500).send('OIDC not initialized');
  const params = client.callbackParams(req);
  try {
    const tokenSet = await client.callback(REDIRECT_URI, params);
    const userinfo = await client.userinfo(tokenSet);

    // Persist user in DB
    const email = userinfo.email;
    const name = (userinfo as any).name || (userinfo as any).preferred_username || email;

    db.prepare(`
      INSERT INTO users (email, name, last_login) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(email) DO UPDATE SET 
        name = excluded.name,
        last_login = CURRENT_TIMESTAMP
    `).run(email, name);

    (req.session as any).user = userinfo;
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/admin`);
  } catch (err) {
    console.error('Auth callback failed:', err);
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/auth/me', (req, res) => {
  res.json((req.session as any).user || null);
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/api/users', isAuthenticated, (req, res) => {
  const users = db.prepare('SELECT id, email, name, last_login FROM users ORDER BY last_login DESC').all();
  res.json(users);
});

// --- Gallery Routes ---
app.get('/api/albums', (req, res) => {
  const albums = db.prepare(`
    SELECT a.id, a.name, a.date,
      CASE WHEN a.password_hash IS NULL OR a.password_hash = '' THEN 0 ELSE 1 END as has_password,
      (SELECT filename FROM photos WHERE album_id = a.id LIMIT 1) as cover_photo,
      (SELECT COUNT(*) FROM photos WHERE album_id = a.id) as photo_count
    FROM albums a 
    ORDER BY date DESC
  `).all();
  res.json(albums);
});

app.get('/api/albums/:id', (req, res) => {
  const album = db.prepare(`
    SELECT *,
      CASE WHEN password_hash IS NULL OR password_hash = '' THEN 0 ELSE 1 END as has_password
    FROM albums
    WHERE id = ?
  `).get(req.params.id) as any;
  if (!album) {
    return res.status(404).json({ error: 'Album not found' });
  }

  const user = (req.session as any).user;
  const requiresPassword = Boolean(album.password_hash);
  if (requiresPassword && !user) {
    const pass = typeof req.query.pass === 'string' ? req.query.pass : '';
    if (!pass || !verifyAlbumPassword(pass, album.password_hash)) {
      return res.status(403).json({ error: 'Album is password protected', requiresPassword: true });
    }
  }

  const photos = db.prepare('SELECT * FROM photos WHERE album_id = ?').all(req.params.id);
  res.json({
    album: {
      id: album.id,
      name: album.name,
      date: album.date,
      has_password: album.has_password
    },
    photos
  });
});

// --- Protected Routes ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const albumId = req.params.id;
    const album = db.prepare('SELECT name FROM albums WHERE id = ?').get(albumId) as any;
    if (!album) return cb(new Error('Album not found'), '');

    const folderName = sanitizeFolderName(album.name);
    const albumDir = path.join(uploadsDir, folderName);

    if (!fs.existsSync(albumDir)) {
      fs.mkdirSync(albumDir, { recursive: true });
    }
    cb(null, albumDir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

app.post('/api/albums', isAuthenticated, (req, res) => {
  const { name, password } = req.body;
  const passwordHash = typeof password === 'string' && password.trim() ? hashAlbumPassword(password) : null;
  const info = db.prepare('INSERT INTO albums (name, password_hash) VALUES (?, ?)').run(name, passwordHash);
  res.json({ id: info.lastInsertRowid, name });
});

app.patch('/api/albums/:id', isAuthenticated, (req, res) => {
  const { date, name, password } = req.body;
  const updates: string[] = ['date = ?', 'name = ?'];
  const values: any[] = [date, name];

  if (typeof password === 'string') {
    if (password.trim()) {
      updates.push('password_hash = ?');
      values.push(hashAlbumPassword(password));
    } else {
      updates.push('password_hash = NULL');
    }
  }

  values.push(req.params.id);
  db.prepare(`UPDATE albums SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

app.delete('/api/albums/:id', isAuthenticated, mutationRateLimit, (req, res) => {
  const albumId = req.params.id;
  const album = db.prepare('SELECT id FROM albums WHERE id = ?').get(albumId) as { id: number } | undefined;

  if (!album) {
    return res.status(404).json({ error: 'Album not found' });
  }

  const photoCount = db.prepare('SELECT COUNT(*) as count FROM photos WHERE album_id = ?').get(albumId) as { count: number };
  if (photoCount.count > 0) {
    return res.status(400).json({ error: 'Album is not empty' });
  }

  db.prepare('DELETE FROM albums WHERE id = ?').run(albumId);
  res.json({ success: true });
});

app.delete('/api/photos/:id', isAuthenticated, mutationRateLimit, (req, res) => {
  const photo = db.prepare('SELECT filename FROM photos WHERE id = ?').get(req.params.id) as any;
  if (photo) {
    const filePath = path.join(uploadsDir, photo.filename);
    const { thumbnailPath, compressedPath } = getVariantPaths(filePath);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (fs.existsSync(thumbnailPath)) {
      fs.unlinkSync(thumbnailPath);
    }

    if (fs.existsSync(compressedPath)) {
      fs.unlinkSync(compressedPath);
    }

    db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id);
  }
  res.json({ success: true });
});

app.post('/api/albums/:id/upload', isAuthenticated, mutationRateLimit, upload.array('photos'), (req, res) => {
  const albumId = req.params.id;
  const files = req.files as Express.Multer.File[];

  const album = db.prepare('SELECT name FROM albums WHERE id = ?').get(albumId) as any;
  const folderName = sanitizeFolderName(album.name);

  const insert = db.prepare('INSERT INTO photos (album_id, filename) VALUES (?, ?)');
  const transaction = db.transaction((photos: any[]) => {
    for (const photo of photos) {
      // Store relative path (folder/filename) in DB
      insert.run(albumId, `${folderName}/${photo.filename}`);
    }
  });

  transaction(files);
  processPhotosInBackground(files.map((photo) => `${folderName}/${photo.filename}`));
  res.json({ success: true, count: files.length });
});

processAllPhotosInBackground();
setInterval(processAllPhotosInBackground, 60 * 60 * 1000);

app.listen(parseInt(port), '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${port}`);
});
