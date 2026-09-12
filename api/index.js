const { pool, getDb, hashPw, checkPw, newToken } = require('./db');

const ALLOWED_ORIGINS = ['https://aljiza-majlis.vercel.app'];
function isAllowedOrigin(o) {
  if (!o) return false;
  try {
    const u = new URL(o);
    if (ALLOWED_ORIGINS.includes(u.origin)) return true;
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
    if (u.hostname.endsWith('.vercel.app')) return true;
    return false;
  } catch (e) { return false; }
}
function cors(req, res) {
  const o = (req.headers && (req.headers.origin || req.headers.Origin)) || null;
  if (o && isAllowedOrigin(o)) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
}
function json(res, status, data) { res.status(status).json(data); }
function bearer(req) {
  const h = req.headers.authorization || req.headers.Authorization;
  if (!h || !h.startsWith('Bearer ')) return null;
  return h.slice(7);
}
async function authUser(req) {
  const t = bearer(req);
  if (!t) return null;
  const { rows } = await pool.query('SELECT u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = $1', [t]);
  return rows[0] || null;
}
async function needAuth(req, res) {
  const u = await authUser(req);
  if (!u) { json(res, 401, { error: 'auth required' }); return null; }
  return u;
}
async function needAdmin(req, res) {
  const u = await needAuth(req, res);
  if (!u) return null;
  if (u.role !== 'admin') { json(res, 403, { error: 'forbidden' }); return null; }
  return u;
}

module.exports = async (req, res) => {
  await getDb();
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url.split('?')[0];
  const method = req.method;
  const body = req.body || {};

  if (url === '/api/healthz' && method === 'GET') return json(res, 200, { ok: true });

  // ---- AUTH ----
  if (url === '/api/auth/login' && method === 'POST') {
    const phone = String(body.phone || '').replace(/\D/g, '');
    const password = String(body.password || '');
    const { rows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
    const user = rows[0];
    if (!user || !checkPw(password, user.pass_hash)) return json(res, 401, { error: 'bad credentials' });
    const token = newToken();
    await pool.query('INSERT INTO sessions (token, user_id) VALUES ($1,$2)', [token, user.id]);
    return json(res, 200, { accessToken: token, user: { id: user.id, full_name: user.full_name, role: user.role } });
  }
  if (url === '/api/auth/me' && method === 'GET') {
    const u = await authUser(req);
    if (!u) return json(res, 401, { error: 'auth required' });
    return json(res, 200, { id: u.id, full_name: u.full_name, role: u.role });
  }
  if (url === '/api/auth/logout' && method === 'POST') {
    const t = bearer(req);
    if (t) await pool.query('DELETE FROM sessions WHERE token = $1', [t]);
    return json(res, 200, { ok: true });
  }

  // ---- PUBLIC: settings ----
  if (url === '/api/settings' && method === 'GET') {
    const { rows } = await pool.query('SELECT value FROM settings WHERE key = $1', ['site']);
    return json(res, 200, rows[0]?.value || {});
  }

  // ---- PUBLIC: news ----
  if (url === '/api/news' && method === 'GET') {
    const { rows } = await pool.query('SELECT * FROM news ORDER BY pinned DESC, created_at DESC');
    return json(res, 200, rows);
  }

  // ---- PUBLIC: projects ----
  if (url === '/api/projects' && method === 'GET') {
    const { rows } = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
    return json(res, 200, rows);
  }

  // ---- PUBLIC: departments ----
  if (url === '/api/departments' && method === 'GET') {
    const { rows } = await pool.query('SELECT * FROM departments ORDER BY sort_order ASC');
    return json(res, 200, rows);
  }

  // ---- PUBLIC: members ----
  if (url === '/api/members' && method === 'GET') {
    const { rows } = await pool.query('SELECT * FROM members ORDER BY sort_order ASC');
    return json(res, 200, rows);
  }

  // ---- PUBLIC: services ----
  if (url === '/api/services' && method === 'GET') {
    const { rows } = await pool.query('SELECT * FROM services ORDER BY sort_order ASC');
    return json(res, 200, rows);
  }

  // ---- PUBLIC: tenders ----
  if (url === '/api/tenders' && method === 'GET') {
    const { rows } = await pool.query('SELECT * FROM tenders ORDER BY created_at DESC');
    return json(res, 200, rows);
  }

  // ---- PUBLIC: procedures ----
  if (url === '/api/procedures' && method === 'GET') {
    const { rows } = await pool.query('SELECT * FROM procedures ORDER BY sort_order ASC');
    return json(res, 200, rows);
  }

  // ---- PUBLIC: activities ----
  if (url === '/api/activities' && method === 'GET') {
    const { rows } = await pool.query('SELECT * FROM activities ORDER BY created_at DESC');
    return json(res, 200, rows);
  }

  // ---- PUBLIC: photos ----
  if (url === '/api/photos' && method === 'GET') {
    const { rows } = await pool.query('SELECT * FROM photos ORDER BY created_at DESC');
    return json(res, 200, rows);
  }

  // ---- PUBLIC: videos ----
  if (url === '/api/videos' && method === 'GET') {
    const { rows } = await pool.query('SELECT * FROM videos ORDER BY created_at DESC');
    return json(res, 200, rows);
  }

  // ---- PUBLIC: slider ----
  if (url === '/api/slider' && method === 'GET') {
    const { rows } = await pool.query('SELECT * FROM slider WHERE active = true ORDER BY sort_order ASC');
    return json(res, 200, rows);
  }

  // ---- PUBLIC: org chart ----
  if (url === '/api/org-chart' && method === 'GET') {
    const { rows } = await pool.query('SELECT * FROM org_chart ORDER BY sort_order ASC');
    return json(res, 200, rows);
  }

  // ---- PUBLIC: complaints submit ----
  if (url === '/api/complaints' && method === 'POST') {
    if (!body.name || !body.message) return json(res, 400, { error: 'name & message required' });
    const images = body.images || [];
    await pool.query(
      `INSERT INTO complaints (name, phone, subject, message, images) VALUES ($1, $2, $3, $4, $5)`,
      [body.name, body.phone || '', body.subject || '', body.message, JSON.stringify(images)]
    );
    return json(res, 201, { ok: true });
  }

  // ---- PUBLIC: complaints list ----
  if (url === '/api/complaints/list' && method === 'GET') {
    const { rows } = await pool.query('SELECT id, name, phone, subject, message, COALESCE(images,\'[]\')::jsonb AS images, status, created_at FROM complaints ORDER BY created_at DESC LIMIT 50');
    return json(res, 200, rows);
  }

  // ---- PUBLIC: inquiries submit ----
  if (url === '/api/inquiries' && method === 'POST') {
    if (!body.name || !body.message) return json(res, 400, { error: 'name & message required' });
    await pool.query(
      `INSERT INTO inquiries (name, phone, email, message) VALUES ($1, $2, $3, $4)`,
      [body.name, body.phone || '', body.email || '', body.message]
    );
    return json(res, 201, { ok: true });
  }

  // ---- ADMIN: CRUD ----
  const adminCrud = url.match(/^\/api\/admin\/(\w+)$/);
  if (adminCrud && method === 'GET') {
    const me = await needAdmin(req, res);
    if (!me) return;
    const table = adminCrud[1];
    const allowed = ['news', 'projects', 'departments', 'members', 'services', 'tenders', 'procedures', 'activities', 'photos', 'videos', 'slider', 'org_chart', 'complaints', 'inquiries', 'settings'];
    if (!allowed.includes(table)) return json(res, 404, { error: 'not found' });
    if (table === 'settings') {
      const { rows } = await pool.query('SELECT * FROM settings');
      return json(res, 200, rows);
    }
    const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY id DESC`);
    return json(res, 200, rows);
  }
  if (adminCrud && method === 'POST') {
    const me = await needAdmin(req, res);
    if (!me) return;
    const table = adminCrud[1];
    const allowed = ['news', 'projects', 'departments', 'members', 'services', 'tenders', 'procedures', 'activities', 'photos', 'videos', 'slider', 'org_chart'];
    if (!allowed.includes(table)) return json(res, 404, { error: 'not found' });

    if (table === 'settings') {
      await pool.query('UPDATE settings SET value = $1 WHERE key = $2', [JSON.stringify(body.value), body.key || 'site']);
      return json(res, 200, { ok: true });
    }

    const fields = Object.keys(body).filter(k => k !== 'id');
    const values = fields.map(f => body[f]);
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    const { rows: [item] } = await pool.query(
      `INSERT INTO ${table} (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
      values
    );
    return json(res, 201, item);
  }
  if (adminCrud && method === 'PATCH') {
    const me = await needAdmin(req, res);
    if (!me) return;
    const table = adminCrud[1];
    const allowed = ['news', 'projects', 'departments', 'members', 'services', 'tenders', 'procedures', 'activities', 'photos', 'videos', 'slider', 'org_chart', 'settings'];
    if (!allowed.includes(table)) return json(res, 404, { error: 'not found' });

    if (table === 'settings') {
      await pool.query('UPDATE settings SET value = $1 WHERE key = $2', [JSON.stringify(body.value), body.key || 'site']);
      return json(res, 200, { ok: true });
    }

    const id = body.id;
    if (!id) return json(res, 400, { error: 'id required' });
    const fields = Object.keys(body).filter(k => k !== 'id');
    const values = fields.map(f => body[f]);
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    values.push(id);
    const { rows: [item] } = await pool.query(
      `UPDATE ${table} SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
      values
    );
    return json(res, 200, item);
  }
  if (adminCrud && method === 'DELETE') {
    const me = await needAdmin(req, res);
    if (!me) return;
    const table = adminCrud[1];
    const allowed = ['news', 'projects', 'departments', 'members', 'services', 'tenders', 'procedures', 'activities', 'photos', 'videos', 'slider', 'org_chart', 'complaints', 'inquiries'];
    if (!allowed.includes(table)) return json(res, 404, { error: 'not found' });
    const id = body.id;
    if (!id) return json(res, 400, { error: 'id required' });
    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    return json(res, 200, { ok: true });
  }

  // ---- ADMIN: complaint status update ----
  const compSt = url.match(/^\/api\/admin\/complaints\/(.+)\/status$/);
  if (compSt && method === 'PATCH') {
    const me = await needAdmin(req, res);
    if (!me) return;
    const { rows: [item] } = await pool.query(
      'UPDATE complaints SET status = $1, reply = $2 WHERE id = $3 RETURNING *',
      [body.status || 'replied', body.reply || '', compSt[1]]
    );
    return json(res, 200, item);
  }

  // ---- ADMIN: inquiry read ----
  const inqRead = url.match(/^\/api\/admin\/inquiries\/(.+)\/read$/);
  if (inqRead && method === 'POST') {
    const me = await needAdmin(req, res);
    if (!me) return;
    await pool.query('UPDATE inquiries SET read = true WHERE id = $1', [inqRead[1]]);
    return json(res, 200, { ok: true });
  }

  // ---- ADMIN: dashboard stats ----
  if (url === '/api/admin/stats' && method === 'GET') {
    const me = await needAdmin(req, res);
    if (!me) return;
    const [newsR, projR, compR, inqR, tendR] = await Promise.all([
      pool.query('SELECT count(*)::int AS n FROM news'),
      pool.query('SELECT count(*)::int AS n FROM projects'),
      pool.query('SELECT count(*)::int AS n FROM complaints WHERE status = $1', ['new']),
      pool.query('SELECT count(*)::int AS n FROM inquiries WHERE read = false'),
      pool.query('SELECT count(*)::int AS n FROM tenders WHERE status = $1', ['open'])
    ]);
    return json(res, 200, {
      news: newsR.rows[0].n,
      projects: projR.rows[0].n,
      complaints: compR.rows[0].n,
      inquiries: inqR.rows[0].n,
      tenders: tendR.rows[0].n
    });
  }

  json(res, 404, { error: 'Not found' });
};
