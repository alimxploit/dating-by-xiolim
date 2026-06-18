const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../jodoh.db'));

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY,
      username TEXT,
      nama TEXT,
      umur INTEGER,
      gender TEXT,
      cari TEXT,
      lokasi TEXT,
      bio TEXT,
      foto_id TEXT,
      aktif INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dari_user INTEGER,
      ke_user INTEGER,
      UNIQUE(dari_user, ke_user)
    );
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1 INTEGER,
      user2 INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user1, user2)
    );
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1 INTEGER,
      user2 INTEGER,
      aktif INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS wizard (
      user_id INTEGER PRIMARY KEY,
      step TEXT,
      mode TEXT DEFAULT 'daftar',
      field TEXT
    );
  `);
  console.log('✅ Database siap!');
}

const getUser      = (id)     => db.prepare('SELECT * FROM users WHERE user_id = ?').get(id);
const upsertUser   = (d)      => db.prepare(`
  INSERT INTO users (user_id,username,nama,umur,gender,cari,lokasi,bio,foto_id)
  VALUES (@user_id,@username,@nama,@umur,@gender,@cari,@lokasi,@bio,@foto_id)
  ON CONFLICT(user_id) DO UPDATE SET
    username=@username,nama=@nama,umur=@umur,gender=@gender,
    cari=@cari,lokasi=@lokasi,bio=@bio,foto_id=@foto_id,aktif=1
`).run(d);
const updateField  = (id,f,v) => db.prepare(`UPDATE users SET ${f} = ? WHERE user_id = ?`).run(v, id);
const setAktif     = (id,v)   => db.prepare('UPDATE users SET aktif = ? WHERE user_id = ?').run(v, id);

const getWizard    = (id)         => db.prepare('SELECT * FROM wizard WHERE user_id = ?').get(id);
const setWizard    = (id,s,m,f)   => db.prepare(`
  INSERT INTO wizard (user_id,step,mode,field) VALUES (?,?,?,?)
  ON CONFLICT(user_id) DO UPDATE SET step=?,mode=?,field=?
`).run(id,s,m||'daftar',f||null, s,m||'daftar',f||null);
const clearWizard  = (id)         => db.prepare('DELETE FROM wizard WHERE user_id = ?').run(id);

const getKandidat  = (id) => {
  const u = getUser(id); if (!u) return null;
  return db.prepare(`
    SELECT * FROM users WHERE user_id!=? AND aktif=1 AND gender=?
    AND user_id NOT IN (SELECT ke_user FROM likes WHERE dari_user=?)
    ORDER BY RANDOM() LIMIT 1
  `).get(id, u.cari, id);
};

const addLike      = (a,b) => { try { db.prepare('INSERT OR IGNORE INTO likes (dari_user,ke_user) VALUES (?,?)').run(a,b); } catch(e){} };
const cekMatch     = (a,b) => !!db.prepare('SELECT 1 FROM likes WHERE dari_user=? AND ke_user=?').get(b,a);
const createMatch  = (a,b) => { const [x,y]=[Math.min(a,b),Math.max(a,b)]; try { db.prepare('INSERT OR IGNORE INTO matches (user1,user2) VALUES (?,?)').run(x,y); } catch(e){} };
const getMatches   = (id)  => db.prepare(`
  SELECT u.* FROM matches m
  JOIN users u ON (CASE WHEN m.user1=? THEN m.user2 ELSE m.user1 END = u.user_id)
  WHERE (m.user1=? OR m.user2=?) AND u.aktif=1
`).all(id,id,id);
const isMatch      = (a,b) => { const [x,y]=[Math.min(a,b),Math.max(a,b)]; return !!db.prepare('SELECT 1 FROM matches WHERE user1=? AND user2=?').get(x,y); };

const getChatAktif = (id)  => db.prepare('SELECT * FROM chat_sessions WHERE (user1=? OR user2=?) AND aktif=1 LIMIT 1').get(id,id);
const startChat    = (a,b) => {
  db.prepare('UPDATE chat_sessions SET aktif=0 WHERE user1=? OR user2=?').run(a,a);
  db.prepare('UPDATE chat_sessions SET aktif=0 WHERE user1=? OR user2=?').run(b,b);
  db.prepare('INSERT INTO chat_sessions (user1,user2) VALUES (?,?)').run(a,b);
};
const endChat      = (id)  => db.prepare('UPDATE chat_sessions SET aktif=0 WHERE user1=? OR user2=?').run(id,id);
const getLawan     = (s,id)=> s.user1===id ? s.user2 : s.user1;

module.exports = {
  initDB, getUser, upsertUser, updateField, setAktif,
  getWizard, setWizard, clearWizard,
  getKandidat, addLike, cekMatch, createMatch, getMatches, isMatch,
  getChatAktif, startChat, endChat, getLawan,
};
                    
