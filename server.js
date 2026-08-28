/**
 * 人人帮 DApp 后端主服务
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { ethers } = require('ethers');
const db = require('./db');
const { distributeCard, checkAndUpgradeV9, CARD_PRICE, THANKS_PRICE } = require('./allocate');
const withdrawEngine = require('./withdraw');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============ 配置 ============
const PORT = process.env.PORT || 3000;
const RPC_URL = process.env.RPC_URL || 'https://bsc-dataseed.binance.org';
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || '';
const TOTAL_WALLET = process.env.TOTAL_WALLET || '';
const TOKEN_DECIMALS = 18;

const provider = new ethers.JsonRpcProvider(RPC_URL);

// ERC20 ABI（需要Transfer事件和balanceOf）
const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function balanceOf(address account) external view returns (uint256)"
];

// ============ 链上验证 ============
/**
 * 验证一笔转账是否真实：从from转了amount代币到总钱包
 */
async function verifyTransfer(txHash, from, amount) {
  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || !receipt.status) return false;

    // 解析Transfer事件
    const iface = new ethers.Interface(ERC20_ABI);
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === 'Transfer') {
          const logFrom = parsed.args.from.toLowerCase();
          const logTo = parsed.args.to.toLowerCase();
          const logValue = Number(parsed.args.value) / 10 ** TOKEN_DECIMALS;
          if (logFrom === from.toLowerCase() &&
              logTo === TOTAL_WALLET.toLowerCase() &&
              Math.abs(logValue - amount) < 0.001) {
            return true;
          }
        }
      } catch (e) { /* 不是我们合约的日志，跳过 */ }
    }
    return false;
  } catch (e) {
    console.error('链上验证失败:', e.message);
    return false;
  }
}

// ============ API 路由 ============

// 绑定推荐关系
app.post('/api/bind', (req, res) => {
  const { wallet, referrer } = req.body;
  if (!wallet || !ethers.isAddress(wallet)) {
    return res.json({ success: false, msg: '无效的钱包地址' });
  }
  const w = wallet.toLowerCase();
  let member = db.getMember(w);

  // 已存在会员
  if (member) {
    // 如果当前没有推荐人，且提供了有效推荐人，允许补绑定
    if (!member.referrer && referrer && ethers.isAddress(referrer)) {
      const refMember = db.getMember(referrer.toLowerCase());
      if (refMember) {
        db.raw.prepare('UPDATE members SET referrer = ? WHERE wallet = ?')
          .run(referrer.toLowerCase(), w);
        member = db.getMember(w);
        return res.json({ success: true, member, isNew: false, referrerUpdated: true });
      }
    }
    return res.json({ success: true, member, isNew: false });
  }

// 新会员必须有推荐人（但系统第一个人除外）
  const memberCount = db.raw.prepare('SELECT COUNT(*) as cnt FROM members').get().cnt;
  if (memberCount === 0) {
    // 系统第一个人，允许无推荐人注册，成为链头
    member = db.createMember(w, null);
    return res.json({ success: true, member, isNew: true, isGenesis: true });
  }

  if (!referrer || !ethers.isAddress(referrer)) {
    return res.json({ success: false, msg: '请通过推荐人分享链接注册' });
  }
  const ref = referrer.toLowerCase();
  const refMember = db.getMember(ref);
  if (!refMember) {
    return res.json({ success: false, msg: '推荐人不存在' });
  }
  member = db.createMember(w, ref);
  res.json({ success: true, member, isNew: true });
});

// 获取会员信息
app.get('/api/member/:wallet', (req, res) => {
  const { wallet } = req.params;
  const member = db.getMember(wallet);
  if (!member) return res.json({ success: false, msg: '会员不存在' });
  const balance = db.getBalance(wallet);
  const referrerInfo = member.referrer ? db.getMember(member.referrer) : null;
  res.json({
    success: true,
    member: {
      ...member,
      balance: balance,
      referrer_nickname: referrerInfo ? referrerInfo.nickname : '',
      referrer_avatar: referrerInfo ? referrerInfo.avatar_id : 0
    }
  });
});

// 更新资料
app.post('/api/profile', (req, res) => {
  const { wallet, nickname, avatar_id, birthday, debt_amount } = req.body;
  if (!wallet) return res.json({ success: false, msg: '缺少钱包地址' });
  const member = db.getMember(wallet);
  if (!member) return res.json({ success: false, msg: '会员不存在' });
  db.updateProfile(wallet, { nickname, avatar_id, birthday, debt_amount });
  res.json({ success: true, member: db.getMember(wallet) });
});

// 购买互助卡（验证链上转账后执行分配）
app.post('/api/buy-card', async (req, res) => {
  const { wallet, tx_hash } = req.body;
  if (!wallet || !tx_hash) {
    return res.json({ success: false, msg: '参数不全' });
  }
  const member = db.getMember(wallet);
  if (!member) return res.json({ success: false, msg: '请先绑定推荐关系' });
  if (member.is_member) return res.json({ success: false, msg: '已是会员' });

  // 防重复
  if (db.getCardPurchaseByTx(tx_hash)) {
    return res.json({ success: false, msg: '该交易已处理' });
  }

  // 链上验证
  const valid = await verifyTransfer(tx_hash, wallet, CARD_PRICE);
  if (!valid) {
    return res.json({ success: false, msg: '链上转账验证失败，请确认交易已确认且金额正确' });
  }

  // 事务内执行分配
  try {
    const result = db.raw.transaction(() => {
      // 1. 创建购卡记录（先拿ID）
      const purchaseId = db.createCardPurchase(wallet, tx_hash, []);
      // 2. 执行分配
      const distribution = distributeCard(wallet, purchaseId);
      // 3. 更新购卡记录的分配明细
      db.raw.prepare('UPDATE card_purchases SET distribution = ? WHERE id = ?')
        .run(JSON.stringify(distribution), purchaseId);
      // 4. 标记为正式会员
      db.setMember(wallet);
      // 5. 直推人 direct_count + 1
      if (member.referrer) {
        db.incDirectCount(member.referrer);
      }
      // 6. 向上9层 team_count + 1
      const uplink = db.incTeamCountUp9(wallet);
      // 7. 检查直推人是否升级V9
      let upgraded = [];
      if (member.referrer) {
        if (checkAndUpgradeV9(member.referrer)) {
          upgraded.push(member.referrer);
        }
      }
      // 8. 检查所有刚增加team_count的上级是否升级V9（主要是直推人，其他人team_count增加也可能过80）
      for (const m of uplink) {
        if (checkAndUpgradeV9(m.wallet)) {
          upgraded.push(m.wallet);
        }
      }
      return { distribution, upgraded };
    })();

    res.json({
      success: true,
      msg: '购卡成功，已成为会员',
      distribution: result.distribution,
      upgraded: result.upgraded
    });
  } catch (e) {
    console.error('购卡处理失败:', e);
    res.json({ success: false, msg: '处理失败: ' + e.message });
  }
});

// 购买感恩卡（300代币，给直推人）
app.post('/api/buy-thanks', async (req, res) => {
  const { wallet, tx_hash } = req.body;
  if (!wallet || !tx_hash) {
    return res.json({ success: false, msg: '参数不全' });
  }
  const member = db.getMember(wallet);
  if (!member || !member.is_member) {
    return res.json({ success: false, msg: '仅会员可购买感恩卡' });
  }
  if (!member.referrer) {
    return res.json({ success: false, msg: '没有推荐人，无法送感恩卡' });
  }
  if (member.thanks_card_sent) {
    return res.json({ success: false, msg: '已送过感恩卡' });
  }

  // 链上验证
  const valid = await verifyTransfer(tx_hash, wallet, THANKS_PRICE);
  if (!valid) {
    return res.json({ success: false, msg: '链上转账验证失败' });
  }

  try {
    const result = db.raw.transaction(() => {
      const purchaseId = db.createThanksPurchase(wallet, member.referrer, tx_hash);
      // 推荐人收到300可提现余额
      db.addBalance(member.referrer, THANKS_PRICE, 'income_thanks', purchaseId);
      // 标记已送
      db.markThanksSent(wallet);
      // 检查自己是否升级V9
      const upgraded = checkAndUpgradeV9(wallet);
      return { upgraded };
    })();
    res.json({
      success: true,
      msg: '感恩卡已送出，推荐人获得300可提现余额',
      upgraded: result.upgraded
    });
  } catch (e) {
    console.error('感恩卡处理失败:', e);
    res.json({ success: false, msg: '处理失败: ' + e.message });
  }
});

// 申请提现
app.post('/api/withdraw', (req, res) => {
  const { wallet, amount } = req.body;
  if (!wallet || !amount || amount <= 0) {
    return res.json({ success: false, msg: '参数错误' });
  }
  const member = db.getMember(wallet);
  if (!member || !member.is_member) {
    return res.json({ success: false, msg: '仅会员可提现' });
  }
  const balance = db.getBalance(wallet);
  if (balance < amount) {
    return res.json({ success: false, msg: '余额不足' });
  }

  try {
    const result = db.raw.transaction(() => {
      // 立即扣减余额
      db.subBalance(wallet, amount, 'withdraw', null);
      // 创建提现订单（实际到账=amount-1）
      const wId = db.createWithdrawal(wallet, amount);
      return wId;
    })();
    res.json({
      success: true,
      msg: `提现申请已提交，实际到账 ${amount - 1} 代币，处理中`,
      withdrawal_id: result
    });
  } catch (e) {
    console.error('提现申请失败:', e);
    res.json({ success: false, msg: '处理失败: ' + e.message });
  }
});

// 获取9层团队
app.get('/api/team/:wallet', (req, res) => {
  const { wallet } = req.params;
  const team = db.getTeam9Levels(wallet);
  const total = team.reduce((sum, lv) => sum + lv.members.length, 0);
  res.json({ success: true, team, total });
});

// 获取流水
app.get('/api/ledger/:wallet', (req, res) => {
  const { wallet } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const ledger = db.getLedger(wallet, limit);
  res.json({ success: true, ledger });
});

// 获取提现记录
app.get('/api/withdrawals/:wallet', (req, res) => {
  const { wallet } = req.params;
  const records = db.raw.prepare(
    'SELECT * FROM withdrawals WHERE wallet = ? ORDER BY id DESC LIMIT 50'
  ).all(wallet.toLowerCase());
  res.json({ success: true, withdrawals: records });
});

// 获取配置（前端用）
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    token_address: TOKEN_ADDRESS,
    total_wallet: TOTAL_WALLET,
    card_price: CARD_PRICE,
    thanks_price: THANKS_PRICE,
    withdraw_fee: 1
  });
});

// ============ 数据导出/导入（备份用） ============
app.get('/api/export', (req, res) => {
  try {
    const members = db.raw.prepare('SELECT * FROM members').all();
    const balances = db.raw.prepare('SELECT * FROM balances').all();
    const ledger = db.raw.prepare('SELECT * FROM ledger').all();
    const cardPurchases = db.raw.prepare('SELECT * FROM card_purchases').all();
    const thanksPurchases = db.raw.prepare('SELECT * FROM thanks_purchases').all();
    const withdrawals = db.raw.prepare('SELECT * FROM withdrawals').all();
    const data = { exported_at: new Date().toISOString(), members, balances, ledger, card_purchases: cardPurchases, thanks_purchases: thanksPurchases, withdrawals };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=renrenbang-backup.json');
    res.json(data);
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

app.post('/api/import', (req, res) => {
  const { password, data } = req.body;
  if (!process.env.ADMIN_PASSWORD) return res.json({ success: false, msg: '未配置管理员密码' });
  if (password !== process.env.ADMIN_PASSWORD) return res.json({ success: false, msg: '密码错误' });
  if (!data || !data.members) return res.json({ success: false, msg: '数据格式错误' });
  try {
    db.raw.transaction(() => {
      db.raw.prepare('DELETE FROM ledger').run();
      db.raw.prepare('DELETE FROM withdrawals').run();
      db.raw.prepare('DELETE FROM thanks_purchases').run();
      db.raw.prepare('DELETE FROM card_purchases').run();
      db.raw.prepare('DELETE FROM balances').run();
      db.raw.prepare('DELETE FROM members').run();
      const m = db.raw.prepare('INSERT OR REPLACE INTO members (wallet, referrer, nickname, avatar_id, birthday, debt_amount, is_member, level, direct_count, team_count, thanks_card_sent, created_at, become_member_at) VALUES (@wallet, @referrer, @nickname, @avatar_id, @birthday, @debt_amount, @is_member, @level, @direct_count, @team_count, @thanks_card_sent, @created_at, @become_member_at)');
      for (const r of data.members) m.run(r);
      const b = db.raw.prepare('INSERT OR REPLACE INTO balances (wallet, available, updated_at) VALUES (@wallet, @available, @updated_at)');
      for (const r of (data.balances || [])) b.run(r);
      const l = db.raw.prepare('INSERT OR REPLACE INTO ledger (id, wallet, type, amount, balance_after, ref_id, created_at) VALUES (@id, @wallet, @type, @amount, @balance_after, @ref_id, @created_at)');
      for (const r of (data.ledger || [])) l.run(r);
      const c = db.raw.prepare('INSERT OR REPLACE INTO card_purchases (id, buyer, tx_hash, amount, distribution, status, created_at) VALUES (@id, @buyer, @tx_hash, @amount, @distribution, @status, @created_at)');
      for (const r of (data.card_purchases || [])) c.run(r);
      const t = db.raw.prepare('INSERT OR REPLACE INTO thanks_purchases (id, buyer, receiver, tx_hash, amount, status, created_at) VALUES (@id, @buyer, @receiver, @tx_hash, @amount, @status, @created_at)');
      for (const r of (data.thanks_purchases || [])) t.run(r);
      const w = db.raw.prepare('INSERT OR REPLACE INTO withdrawals (id, wallet, amount, actual_amount, tx_hash, status, created_at, processed_at) VALUES (@id, @wallet, @amount, @actual_amount, @tx_hash, @status, @created_at, @processed_at)');
      for (const r of (data.withdrawals || [])) w.run(r);
    })();
    res.json({ success: true, msg: '导入成功' });
  } catch (e) { res.json({ success: false, msg: '导入失败: ' + e.message }); }
});

// ============ 启动 ============
app.listen(PORT, () => {
  console.log(`人人帮 DApp 后端已启动: http://localhost:${PORT}`);
  if (process.env.PRIVATE_KEY && TOKEN_ADDRESS && TOTAL_WALLET) {
    try {
      withdrawEngine.init(RPC_URL, process.env.PRIVATE_KEY, TOKEN_ADDRESS);
      withdrawEngine.start();
      console.log('[提现引擎] 启动成功');
    } catch (e) {
      console.error('[提现引擎] 启动失败:', e.message);
    }
  } else {
    console.log('[警告] 未配置提现引擎');
  }
});
