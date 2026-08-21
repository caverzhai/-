/**
 * 人人帮 数据库层
 * 使用 SQLite，零配置，单文件存储
 */
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'renrenbang.db');
const db = new Database(DB_PATH);

// 开启WAL模式提升并发性能
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ============ 建表 ============
db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    wallet TEXT PRIMARY KEY,
    referrer TEXT,
    nickname TEXT DEFAULT '',
    avatar_id INTEGER DEFAULT 0,
    birthday TEXT DEFAULT '',
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

// ============ 会员操作 ============
const dbapi = {
  // 获取会员
  getMember(wallet) {
    return db.prepare('SELECT * FROM members WHERE wallet = ?').get(wallet.toLowerCase());
  },

  // 创建会员（绑定推荐关系）
  createMember(wallet, referrer) {
    const w = wallet.toLowerCase();
    const r = referrer ? referrer.toLowerCase() : null;
    db.prepare(`
      INSERT OR IGNORE INTO members (wallet, referrer) VALUES (?, ?)
    `).run(w, r);
    db.prepare(`
      INSERT OR IGNORE INTO balances (wallet, available) VALUES (?, 0)
    `).run(w);
    return this.getMember(w);
  },

  // 更新资料
  updateProfile(wallet, data) {
    const w = wallet.toLowerCase();
    const fields = [];
    const values = [];
    if (data.nickname !== undefined) { fields.push('nickname = ?'); values.push(data.nickname); }
    if (data.avatar_id !== undefined) { fields.push('avatar_id = ?'); values.push(data.avatar_id); }
    if (data.birthday !== undefined) { fields.push('birthday = ?'); values.push(data.birthday); }
    if (data.debt_amount !== undefined) { fields.push('debt_amount = ?'); values.push(data.debt_amount); }
    if (fields.length === 0) return;
    values.push(w);
    db.prepare(`UPDATE members SET ${fields.join(', ')} WHERE wallet = ?`).run(...values);
  },

  // 升级为正式会员（购卡后）
  setMember(wallet) {
    db.prepare(`
      UPDATE members SET is_member = 1, become_member_at = strftime('%s','now') WHERE wallet = ?
    `).run(wallet.toLowerCase());
  },

  // 升级V9
  upgradeV9(wallet) {
    db.prepare('UPDATE members SET level = 1 WHERE wallet = ?').run(wallet.toLowerCase());
  },

  // 标记感恩卡已送
  markThanksSent(wallet) {
    db.prepare('UPDATE members SET thanks_card_sent = 1 WHERE wallet = ?').run(wallet.toLowerCase());
  },

  // 获取推荐链（从直推人向上，最多64层）
  getUplinkChain(wallet, maxDepth = 64) {
    const chain = [];
    let current = this.getMember(wallet);
    if (!current || !current.referrer) return chain;
    let depth = 0;
    let ref = current.referrer;
    while (ref && depth < maxDepth) {
      const m = this.getMember(ref);
      if (!m) break;
      chain.push(m);
      ref = m.referrer;
      depth++;
    }
    return chain;
  },

  // 获取直推列表
  getDirectReferrals(wallet) {
    return db.prepare(`
      SELECT * FROM members WHERE referrer = ? ORDER BY created_at DESC
    `).all(wallet.toLowerCase());
  },

  // 获取9层团队（递归）
  getTeam9Levels(wallet) {
    const result = []; // [{level:1, members:[...]}, ...]
    let currentLevel = [wallet.toLowerCase()];
    for (let lv = 1; lv <= 9; lv++) {
      const placeholders = currentLevel.map(() => '?').join(',');
      const members = db.prepare(`
        SELECT * FROM members WHERE referrer IN (${placeholders}) ORDER BY created_at DESC
      `).all(...currentLevel);
      if (members.length === 0) break;
      result.push({ level: lv, members });
      currentLevel = members.map(m => m.wallet);
    }
    return result;
  },

  // 增加直推数
  incDirectCount(wallet) {
    db.prepare('UPDATE members SET direct_count = direct_count + 1 WHERE wallet = ?').run(wallet.toLowerCase());
  },

  // 增加团队数（向上9层）
  incTeamCountUp9(wallet) {
    const chain = this.getUplinkChain(wallet, 9);
    const upd = db.prepare('UPDATE members SET team_count = team_count + 1 WHERE wallet = ?');
    for (const m of chain) {
      upd.run(m.wallet);
    }
    return chain;
  },

  // ============ 余额操作 ============
  getBalance(wallet) {
    const row = db.prepare('SELECT available FROM balances WHERE wallet = ?').get(wallet.toLowerCase());
    return row ? row.available : 0;
  },

  // 增加余额并记流水（必须在事务内调用）
  addBalance(wallet, amount, type, refId = null) {
    const w = wallet.toLowerCase();
    db.prepare("UPDATE balances SET available = available + ?, updated_at = strftime('%s','now') WHERE wallet = ?").run(amount, w);
    const bal = this.getBalance(w);
    db.prepare('INSERT INTO ledger (wallet, type, amount, balance_after, ref_id) VALUES (?, ?, ?, ?, ?)')
      .run(w, type, amount, bal, refId);
    return bal;
  },

  // 扣减余额并记流水（必须在事务内调用）
  subBalance(wallet, amount, type, refId = null) {
    return this.addBalance(wallet, -amount, type, refId);
  },

  // ============ 购卡记录 ============
  createCardPurchase(buyer, txHash, distribution) {
    const info = db.prepare(`
      INSERT INTO card_purchases (buyer, tx_hash, amount, distribution, status)
      VALUES (?, ?, 180, ?, 'confirmed')
    `).run(buyer.toLowerCase(), txHash, JSON.stringify(distribution));
    return info.lastInsertRowid;
  },

  getCardPurchaseByTx(txHash) {
    return db.prepare('SELECT * FROM card_purchases WHERE tx_hash = ?').get(txHash);
  },

  // ============ 感恩卡记录 ============
  createThanksPurchase(buyer, receiver, txHash) {
    const info = db.prepare(`
      INSERT INTO thanks_purchases (buyer, receiver, tx_hash, amount, status)
      VALUES (?, ?, ?, 300, 'confirmed')
    `).run(buyer.toLowerCase(), receiver.toLowerCase(), txHash);
    return info.lastInsertRowid;
  },

  // ============ 提现记录 ============
  createWithdrawal(wallet, amount) {
    const actual = amount - 1;
    const info = db.prepare(`
      INSERT INTO withdrawals (wallet, amount, actual_amount, status) VALUES (?, ?, ?, 'pending')
    `).run(wallet.toLowerCase(), amount, actual);
    return info.lastInsertRowid;
  },

  getPendingWithdrawals() {
    return db.prepare("SELECT * FROM withdrawals WHERE status = 'pending' ORDER BY id ASC").all();
  },

  updateWithdrawal(id, status, txHash) {
    db.prepare(`
      UPDATE withdrawals SET status = ?, tx_hash = ?, processed_at = strftime('%s','now') WHERE id = ?
    `).run(status, txHash, id);
  },

  // 获取流水
  getLedger(wallet, limit = 50) {
    return db.prepare('SELECT * FROM ledger WHERE wallet = ? ORDER BY id DESC LIMIT ?')
      .all(wallet.toLowerCase(), limit);
  },

  // 原始db（用于事务）
  raw: db
};

module.exports = dbapi;
