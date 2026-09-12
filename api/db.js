const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

function hashPw(password) { return bcrypt.hashSync(String(password), 10); }
function checkPw(password, h) {
  try { return bcrypt.compareSync(String(password), h); } catch (e) { return false; }
}
function newToken() { return 'majlis_' + crypto.randomBytes(16).toString('hex'); }

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      pass_hash TEXT NOT NULL,
      algo TEXT DEFAULT 'bcrypt',
      role TEXT DEFAULT 'admin',
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value JSONB
    );

    CREATE TABLE IF NOT EXISTS news (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      image TEXT DEFAULT '',
      pinned BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      image TEXT DEFAULT '',
      status TEXT DEFAULT 'current',
      start_date DATE,
      end_date DATE,
      nature TEXT DEFAULT '',
      location TEXT DEFAULT '',
      goals TEXT DEFAULT '',
      images JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS departments (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      name_en TEXT DEFAULT '',
      head_name TEXT DEFAULT '',
      head_phone TEXT DEFAULT '',
      description TEXT DEFAULT '',
      icon TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'عضو',
      phone TEXT DEFAULT '',
      image TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT '',
      link TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS tenders (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      image TEXT DEFAULT '',
      deadline TEXT DEFAULT '',
      status TEXT DEFAULT 'open',
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS procedures (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      steps TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS activities (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      image TEXT DEFAULT '',
      type TEXT DEFAULT 'activity',
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS photos (
      id SERIAL PRIMARY KEY,
      title TEXT DEFAULT '',
      image TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS videos (
      id SERIAL PRIMARY KEY,
      title TEXT DEFAULT '',
      url TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'new',
      reply TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS inquiries (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      message TEXT NOT NULL,
      read BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS slider (
      id SERIAL PRIMARY KEY,
      title TEXT DEFAULT '',
      subtitle TEXT DEFAULT '',
      image TEXT DEFAULT '',
      link TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS org_chart (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      image TEXT DEFAULT '',
      parent_id INTEGER REFERENCES org_chart(id) ON DELETE SET NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
}

async function seedAll() {
  const { rows: existing } = await pool.query('SELECT count(*)::int AS n FROM users');
  if (existing[0].n > 0) return;

  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  const adminPhone = process.env.ADMIN_PHONE || '0999999999';

  await pool.query(
    `INSERT INTO users (full_name, phone, pass_hash, role) VALUES ($1, $2, $3, 'admin')`,
    ['مدير المجلس', adminPhone, hashPw(adminPass)]
  );

  await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
    ['site', JSON.stringify({
      name: 'مجلس بلدية الجيزة',
      nameEn: 'Al-Jeeza Municipality Council',
      subtitle: 'ريف درعا — الجمهورية العربية السورية',
      phone: '',
      email: '',
      address: '',
      facebook: '',
      twitter: '',
      telegram: '',
      tiktok: '',
      stats: {
        employees: 600,
        population: 89000,
        regions: 9,
        villages: 34
      }
    })]
  );

  const departments = [
    { name: 'دائرة الهندسة والمشاريع', icon: '🏗️', sort: 1 },
    { name: 'دائرة المالية والإدارية', icon: '💰', sort: 2 },
    { name: 'دائرة الشؤون الاجتماعية', icon: '👥', sort: 3 },
    { name: 'دائرة الخدمات البلدية', icon: '🏛️', sort: 4 },
    { name: 'دائرة النظافة والبيئة', icon: '🌿', sort: 5 },
    { name: 'دائرة التخطيط والتنظيم', icon: '📐', sort: 6 },
    { name: 'قسم الشؤون القانونية', icon: '⚖️', sort: 7 },
    { name: 'قسم العلاقات العامة', icon: '📢', sort: 8 }
  ];
  for (const d of departments) {
    await pool.query(
      `INSERT INTO departments (name, icon, sort_order) VALUES ($1, $2, $3)`,
      [d.name, d.icon, d.sort]
    );
  }

  const members = [
    { name: 'المهندس / مراد ظاهر سلطان', role: 'رئيس البلدية', sort: 1 },
    { name: 'الباشا / مراد سلطان', role: 'نائب الرئيس', sort: 2 },
    { name: 'عضو / أحمد الخطيب', role: 'عضو مجلس', sort: 3 },
    { name: 'عضو / فاطمة الحسان', role: 'عضو مجلس', sort: 4 },
    { name: 'عضو / خالد العويسي', role: 'عضو مجلس', sort: 5 },
    { name: 'عضو / سارة الدوسري', role: 'عضو مجلس', sort: 6 }
  ];
  for (const m of members) {
    await pool.query(
      `INSERT INTO members (name, role, sort_order) VALUES ($1, $2, $3)`,
      [m.name, m.role, m.sort]
    );
  }

  const services = [
    { title: 'طلبات الصيانة', description: 'تقديم طلبات صيانة للشوارع والمباني العامة', icon: '🔧', sort: 1 },
    { title: 'شكاوى المواطنين', description: 'تقديم شكاوى وملاحظات المواطنين', icon: '📝', sort: 2 },
    { title: 'رخص البناء', description: 'استخراج وتجديد رخص البناء', icon: '🏢', sort: 3 },
    { title: 'المسقفات', description: 'خدمات الأراضي والمسقفات', icon: '🌾', sort: 4 },
    { title: 'مخالفات السير', description: 'الاستعلام عن مخالفات السير', icon: '🚦', sort: 5 },
    { title: 'الشهادات الإدارية', description: 'استخراج شهادات إدارية متنوعة', icon: '📋', sort: 6 },
    { title: 'ال vụ أنظمة', description: 'خدمات الأنظمة والتنظيم العمراني', icon: '📐', sort: 7 },
    { title: 'خدمة الاستبيانات', description: 'المشاركة في الاستبيانات والآراء', icon: '📊', sort: 8 }
  ];
  for (const s of services) {
    await pool.query(
      `INSERT INTO services (title, description, icon, sort_order) VALUES ($1, $2, $3, $4)`,
      [s.title, s.description, s.icon, s.sort]
    );
  }

  await pool.query(
    `INSERT INTO news (title, body) VALUES ($1, $2)`,
    ['مرحباً بكم في مجلس بلدية الجيزة', 'هذا الموقع جاء للتعريف بهذا الجزء العزيز من الوطن وخدمة المواطنين']
  );

  await pool.query(
    `INSERT INTO slider (title, subtitle, sort_order) VALUES ($1, $2, $3)`,
    ['مرحباً بكم في مجلس بلدية الجيزة', 'نعمل جاهدين لخدمة المواطنين وتحسين البنية التحتية', 1]
  );

  console.log('[majlis] Database seeded successfully');
}

let _ready = null;
async function getDb() {
  if (!_ready) {
    _ready = ensureSchema().then(() => seedAll());
  }
  await _ready;
  return pool;
}

module.exports = { pool, getDb, hashPw, checkPw, newToken };
