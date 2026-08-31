/**
 * 人人帮 数据库层
 * 支持 MySQL（生产环境）和 SQLite（本地开发）
 * MySQL 用于 Railway 持久化存储
 */
const path = require('path');
const fs = require('fs');

let useMySQL = false;
let pool = null;
let sqliteDb = null;

// ============ MySQL 初始化 ============
async function initMySQL() {
  const mysql = require('mysql2/promise');
  const mysqlUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (!mysqlUrl) return false;

  console.log('[数据库] 尝试连接MySQL，URL:', mysqlUrl.substring(0, 30) + '...');

  try {
    // 解析URL，构建连接配置
    const url = new URL(mysqlUrl);
    const config = {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.replace('/', '')),
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      connectTimeout: 15000,
      acquireTimeout: 15000
    };
    console.log('[数据库] MySQL配置:', { host: config.host, port: config.port, user: config.user, database: config.database });

    pool = mysql.createPool(config);
    // 测试连接
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    useMySQL = true;
    console.log('[数据库] MySQL 连接成功');
    await initMySQLTables();
    return true;
  } catch (e) {
    console.error('[数据库] MySQL 连接失败，回退到SQLite:', e.message);
    console.error('[数据库] 错误堆栈:', e.stack);
    useMySQL = false;
    pool = null;
    return false;
  }
}

async function initMySQLTables() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS members (
        wallet VARCHAR(64) PRIMARY KEY,
        referrer VARCHAR(64),
        nickname VARCHAR(50) DEFAULT '',
        avatar_id INT DEFAULT 0,
        birthday VARCHAR(20) DEFAULT '',
        phone VARCHAR(20) DEFAULT '',
        debt_amount FLOAT DEFAULT 0,
        is_member TINYINT DEFAULT 0,
        level TINYINT DEFAULT 0,
        direct_count INT DEFAULT 0,
        team_count INT DEFAULT 0,
        thanks_card_sent TINYINT DEFAULT 0,
        created_at INT DEFAULT 0,
        become_member_at INT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS balances (
        wallet VARCHAR(64) PRIMARY KEY,
        available FLOAT DEFAULT 0,
        updated_at INT DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ledger (
        id INT AUTO_INCREMENT PRIMARY KEY,
        wallet VARCHAR(64) NOT NULL,
        type VARCHAR(30) NOT NULL,
        amount FLOAT NOT NULL,
        balance_after FLOAT NOT NULL,
        ref_id INT,
        created_at INT DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS card_purchases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        buyer VARCHAR(64) NOT NULL,
        tx_hash VARCHAR(100) UNIQUE,
        amount FLOAT DEFAULT 180,
        distribution TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at INT DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS thanks_purchases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        buyer VARCHAR(64) NOT NULL,
        receiver VARCHAR(64) NOT NULL,
        tx_hash VARCHAR(100) UNIQUE,
        amount FLOAT DEFAULT 300,
        status VARCHAR(20) DEFAULT 'pending',
        created_at INT DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        wallet VARCHAR(64) NOT NULL,
        amount FLOAT NOT NULL,
        actual_amount FLOAT NOT NULL,
        tx_hash VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        created_at INT DEFAULT 0,
        processed_at INT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    // MySQL不支持CREATE INDEX IF NOT EXISTS，用try/catch忽略已存在的错误
    try { await conn.query('CREATE INDEX idx_members_referrer ON members(referrer)'); } catch(e) {}
    try { await conn.query('CREATE INDEX idx_ledger_wallet ON ledger(wallet)'); } catch(e) {}
    try { await conn.query('CREATE INDEX idx_withdrawals_status ON withdrawals(status)'); } catch(e) {}
    console.log('[数据库] MySQL 表初始化完成');
  } finally {
    conn.release();
  }
}

// ============ SQLite 初始化（本地开发用） ============
function initSQLite() {
  const Database = require('better-sqlite3');
  const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'renrenbang.db');
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  sqliteDb = new Database(DB_PATH);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS members (
      wallet TEXT PRIMARY KEY,
      referrer TEXT,
      nickname TEXT DEFAULT '',
      avatar_id INTEGER DEFAULT 0,
      birthday TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      debt_amount REAL DEFAULT 0,
      is_member INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      direct_count INTEGER DEFAULT 0,
      team_count INTEGER DEFAULT 0,
      thanks_card_sent INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      become_member_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS balances (
      wallet TEXT PRIMARY KEY,
      available REAL DEFAULT 0,
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      ref_id INTEGER,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS card_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buyer TEXT NOT NULL,
      tx_hash TEXT UNIQUE,
      amount REAL DEFAULT 180,
      distribution TEXT,
      status TEXT DEFAULT 'pending',
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS thanks_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buyer TEXT NOT NULL,
      receiver TEXT NOT NULL,
      tx_hash TEXT UNIQUE,
      amount REAL DEFAULT 300,
      status TEXT DEFAULT 'pending',
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet TEXT NOT NULL,
      amount REAL NOT NULL,
      actual_amount REAL NOT NULL,
      tx_hash TEXT,
      status TEXT DEFAULT 'pending',
      created_at INTEGER DEFAULT (strftime('%s','now')),
      processed_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_members_referrer ON members(referrer);
    CREATE INDEX IF NOT EXISTS idx_ledger_wallet ON ledger(wallet);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
  `);
  console.log('[数据库] SQLite 初始化完成');
}

// ============ 统一查询方法 ============
async function queryOne(sql, params = []) {
  if (useMySQL) {
    const [rows] = await pool.execute(sql, params);
    return rows[0] || null;
  } else {
    return sqliteDb.prepare(sql).get(...params);
  }
}

async function queryAll(sql, params = []) {
  if (useMySQL) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } else {
    return sqliteDb.prepare(sql).all(...params);
  }
}

async function execute(sql, params = []) {
  if (useMySQL) {
    const [result] = await pool.execute(sql, params);
    return { changes: result.affectedRows, lastInsertRowid: result.insertId };
  } else {
    const info = sqliteDb.prepare(sql).run(...params);
    return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
  }
}

// ============ 会员操作 ============
const dbapi = {
  async init() {
    const mysqlOk = await initMySQL();
    if (!mysqlOk) {
      initSQLite();
    }
  },

  isMySQL() {
    return useMySQL;
  },

  async getMember(wallet) {
    return queryOne('SELECT * FROM members WHERE wallet = ?', [wallet.toLowerCase()]);
  },

  async createMember(wallet, referrer) {
    const w = wallet.toLowerCase();
    const r = referrer ? referrer.toLowerCase() : null;
    if (useMySQL) {
      await execute('INSERT IGNORE INTO members (wallet, referrer) VALUES (?, ?)', [w, r]);
      await execute('INSERT IGNORE INTO balances (wallet, available) VALUES (?, 0)', [w]);
    } else {
      sqliteDb.prepare('INSERT OR IGNORE INTO members (wallet, referrer) VALUES (?, ?)').run(w, r);
      sqliteDb.prepare('INSERT OR IGNORE INTO balances (wallet, available) VALUES (?, 0)').run(w);
    }
    return this.getMember(w);
  },

  async updateProfile(wallet, data) {
    const w = wallet.toLowerCase();
    const fields = [];
    const values = [];
    if (data.nickname !== undefined) { fields.push('nickname = ?'); values.push(data.nickname); }
    if (data.avatar_id !== undefined) { fields.push('avatar_id = ?'); values.push(data.avatar_id); }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
    if (data.debt_amount !== undefined) { fields.push('debt_amount = ?'); values.push(data.debt_amount); }
    if (fields.length === 0) return;
    values.push(w);
    await execute(`UPDATE members SET ${fields.join(', ')} WHERE wallet = ?`, values);
  },

  async setMember(wallet) {
    if (useMySQL) {
      await execute('UPDATE members SET is_member = 1, become_member_at = UNIX_TIMESTAMP() WHERE wallet = ?', [wallet.toLowerCase()]);
    } else {
      sqliteDb.prepare("UPDATE members SET is_member = 1, become_member_at = strftime('%s','now') WHERE wallet = ?").run(wallet.toLowerCase());
    }
  },

  async upgradeV9(wallet) {
    await execute('UPDATE members SET level = 1 WHERE wallet = ?', [wallet.toLowerCase()]);
  },

  async markThanksSent(wallet) {
    await execute('UPDATE members SET thanks_card_sent = 1 WHERE wallet = ?', [wallet.toLowerCase()]);
  },

  async getUplinkChain(wallet, maxDepth = 64) {
    const chain = [];
    const seen = new Set();
    let current = await this.getMember(wallet);
    if (!current || !current.referrer) return chain;
    let depth = 0;
    let ref = current.referrer;
    while (ref && depth < maxDepth) {
      if (seen.has(ref)) break;
      seen.add(ref);
      const m = await this.getMember(ref);
      if (!m) break;
      chain.push(m);
      ref = m.referrer;
      depth++;
    }
    return chain;
  },

  async getDirectReferrals(wallet) {
    return queryAll('SELECT * FROM members WHERE referrer = ? ORDER BY created_at DESC', [wallet.toLowerCase()]);
  },

  async getTeam9Levels(wallet) {
    const result = [];
    const seen = new Set([wallet.toLowerCase()]);
    let currentLevel = [wallet.toLowerCase()];
    for (let lv = 1; lv <= 9; lv++) {
      const placeholders = currentLevel.map(() => '?').join(',');
      const members = await queryAll(
        `SELECT * FROM members WHERE referrer IN (${placeholders}) ORDER BY created_at DESC`,
        currentLevel
      );
      const newMembers = members.filter(m => !seen.has(m.wallet));
      if (newMembers.length === 0) break;
      newMembers.forEach(m => seen.add(m.wallet));
      result.push({ level: lv, members: newMembers });
      currentLevel = newMembers.map(m => m.wallet);
    }
    return result;
  },

  async incDirectCount(wallet) {
    await execute('UPDATE members SET direct_count = direct_count + 1 WHERE wallet = ?', [wallet.toLowerCase()]);
  },

  async incTeamCountUp9(wallet) {
    const chain = await this.getUplinkChain(wallet, 9);
    for (const m of chain) {
      await execute('UPDATE members SET team_count = team_count + 1 WHERE wallet = ?', [m.wallet]);
    }
    return chain;
  },

  // ============ 余额操作 ============
  async getBalance(wallet) {
    const row = await queryOne('SELECT available FROM balances WHERE wallet = ?', [wallet.toLowerCase()]);
    return row ? row.available : 0;
  },

  async addBalance(wallet, amount, type, refId = null) {
    const w = wallet.toLowerCase();
    await execute('UPDATE balances SET available = available + ?, updated_at = ? WHERE wallet = ?',
      [amount, Math.floor(Date.now() / 1000), w]);
    const bal = await this.getBalance(w);
    await execute('INSERT INTO ledger (wallet, type, amount, balance_after, ref_id) VALUES (?, ?, ?, ?, ?)',
      [w, type, amount, bal, refId]);
    return bal;
  },

  async subBalance(wallet, amount, type, refId = null) {
    return this.addBalance(wallet, -amount, type, refId);
  },

  // ============ 购卡记录 ============
  async createCardPurchase(buyer, txHash, distribution) {
    if (useMySQL) {
      const result = await execute(
        'INSERT INTO card_purchases (buyer, tx_hash, amount, distribution, status) VALUES (?, ?, 180, ?, ?)',
        [buyer.toLowerCase(), txHash, JSON.stringify(distribution), 'confirmed']
      );
      return result.lastInsertRowid;
    } else {
      const info = sqliteDb.prepare(`
        INSERT INTO card_purchases (buyer, tx_hash, amount, distribution, status)
        VALUES (?, ?, 180, ?, 'confirmed')
      `).run(buyer.toLowerCase(), txHash, JSON.stringify(distribution));
      return info.lastInsertRowid;
    }
  },

  async getCardPurchaseByTx(txHash) {
    return queryOne('SELECT * FROM card_purchases WHERE tx_hash = ?', [txHash]);
  },

  async updateCardPurchase(id, distribution) {
    await execute('UPDATE card_purchases SET distribution = ? WHERE id = ?', [JSON.stringify(distribution), id]);
  },

  // ============ 感恩卡记录 ============
  async createThanksPurchase(buyer, receiver, txHash) {
    const result = await execute(
      'INSERT INTO thanks_purchases (buyer, receiver, tx_hash, amount, status) VALUES (?, ?, ?, 300, ?)',
      [buyer.toLowerCase(), receiver.toLowerCase(), txHash, 'confirmed']
    );
    return result.lastInsertRowid;
  },

  // ============ 提现记录 ============
  async createWithdrawal(wallet, amount) {
    const actual = amount - 1;
    const result = await execute(
      'INSERT INTO withdrawals (wallet, amount, actual_amount, status) VALUES (?, ?, ?, ?)',
      [wallet.toLowerCase(), amount, actual, 'pending']
    );
    return result.lastInsertRowid;
  },

  async getPendingWithdrawals() {
    return queryAll("SELECT * FROM withdrawals WHERE status = 'pending' ORDER BY id ASC");
  },

  async updateWithdrawal(id, status, txHash) {
    if (useMySQL) {
      await execute('UPDATE withdrawals SET status = ?, tx_hash = ?, processed_at = UNIX_TIMESTAMP() WHERE id = ?', [status, txHash, id]);
    } else {
      sqliteDb.prepare("UPDATE withdrawals SET status = ?, tx_hash = ?, processed_at = strftime('%s','now') WHERE id = ?").run(status, txHash, id);
    }
  },

  async getLedger(wallet, limit = 50) {
    return queryAll('SELECT * FROM ledger WHERE wallet = ? ORDER BY id DESC LIMIT ?', [wallet.toLowerCase(), limit]);
  },

  // ============ 事务支持 ============
  async transaction(fn) {
    if (useMySQL) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        // 创建一个事务上下文，所有操作使用同一个连接
        const txDb = createTxDb(conn);
        const result = await fn(txDb);
        await conn.commit();
        return result;
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    } else {
      // SQLite 同步事务
      const tx = sqliteDb.transaction(() => fn(this));
      return tx();
    }
  },

  // 原始查询（用于复杂SQL）
  async rawQuery(sql, params = []) {
    return queryAll(sql, params);
  },

  async rawExecute(sql, params = []) {
    return execute(sql, params);
  }
};

// 事务内的数据库操作（使用同一个连接）
function createTxDb(conn) {
  return {
    async getMember(wallet) {
      const [rows] = await conn.execute('SELECT * FROM members WHERE wallet = ?', [wallet.toLowerCase()]);
      return rows[0] || null;
    },
    async createMember(wallet, referrer) {
      const w = wallet.toLowerCase();
      const r = referrer ? referrer.toLowerCase() : null;
      await conn.execute('INSERT IGNORE INTO members (wallet, referrer) VALUES (?, ?)', [w, r]);
      await conn.execute('INSERT IGNORE INTO balances (wallet, available) VALUES (?, 0)', [w]);
      const [rows] = await conn.execute('SELECT * FROM members WHERE wallet = ?', [w]);
      return rows[0];
    },
    async setMember(wallet) {
      await conn.execute('UPDATE members SET is_member = 1, become_member_at = UNIX_TIMESTAMP() WHERE wallet = ?', [wallet.toLowerCase()]);
    },
    async upgradeV9(wallet) {
      await conn.execute('UPDATE members SET level = 1 WHERE wallet = ?', [wallet.toLowerCase()]);
    },
    async markThanksSent(wallet) {
      await conn.execute('UPDATE members SET thanks_card_sent = 1 WHERE wallet = ?', [wallet.toLowerCase()]);
    },
    async incDirectCount(wallet) {
      await conn.execute('UPDATE members SET direct_count = direct_count + 1 WHERE wallet = ?', [wallet.toLowerCase()]);
    },
    async incTeamCount(wallet) {
      await conn.execute('UPDATE members SET team_count = team_count + 1 WHERE wallet = ?', [wallet.toLowerCase()]);
    },
    async getUplinkChain(wallet, maxDepth = 64) {
      const chain = [];
      const seen = new Set();
      const [rows] = await conn.execute('SELECT * FROM members WHERE wallet = ?', [wallet.toLowerCase()]);
      let current = rows[0];
      if (!current || !current.referrer) return chain;
      let depth = 0;
      let ref = current.referrer;
      while (ref && depth < maxDepth) {
        if (seen.has(ref)) break;
        seen.add(ref);
        const [mRows] = await conn.execute('SELECT * FROM members WHERE wallet = ?', [ref]);
        const m = mRows[0];
        if (!m) break;
        chain.push(m);
        ref = m.referrer;
        depth++;
      }
      return chain;
    },
    async getBalance(wallet) {
      const [rows] = await conn.execute('SELECT available FROM balances WHERE wallet = ?', [wallet.toLowerCase()]);
      return rows[0] ? rows[0].available : 0;
    },
    async addBalance(wallet, amount, type, refId = null) {
      const w = wallet.toLowerCase();
      await conn.execute('UPDATE balances SET available = available + ?, updated_at = ? WHERE wallet = ?',
        [amount, Math.floor(Date.now() / 1000), w]);
      const [balRows] = await conn.execute('SELECT available FROM balances WHERE wallet = ?', [w]);
      const bal = balRows[0].available;
      await conn.execute('INSERT INTO ledger (wallet, type, amount, balance_after, ref_id) VALUES (?, ?, ?, ?, ?)',
        [w, type, amount, bal, refId]);
      return bal;
    },
    async subBalance(wallet, amount, type, refId = null) {
      return this.addBalance(wallet, -amount, type, refId);
    },
    async createCardPurchase(buyer, txHash, distribution) {
      const [result] = await conn.execute(
        'INSERT INTO card_purchases (buyer, tx_hash, amount, distribution, status) VALUES (?, ?, 180, ?, ?)',
        [buyer.toLowerCase(), txHash, JSON.stringify(distribution), 'confirmed']
      );
      return result.insertId;
    },
    async updateCardPurchase(id, distribution) {
      await conn.execute('UPDATE card_purchases SET distribution = ? WHERE id = ?', [JSON.stringify(distribution), id]);
    },
    async createThanksPurchase(buyer, receiver, txHash) {
      const [result] = await conn.execute(
        'INSERT INTO thanks_purchases (buyer, receiver, tx_hash, amount, status) VALUES (?, ?, ?, 300, ?)',
        [buyer.toLowerCase(), receiver.toLowerCase(), txHash, 'confirmed']
      );
      return result.insertId;
    },
    async createWithdrawal(wallet, amount) {
      const actual = amount - 1;
      const [result] = await conn.execute(
        'INSERT INTO withdrawals (wallet, amount, actual_amount, status) VALUES (?, ?, ?, ?)',
        [wallet.toLowerCase(), amount, actual, 'pending']
      );
      return result.insertId;
    }
  };
}

module.exports = dbapi;
