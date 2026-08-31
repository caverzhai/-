/**
 * 人人帮 DApp 后端主服务（异步版，支持MySQL）
 */
process.on('unhandledRejection', (reason) => {
  console.error('[全局] 未处理的Promise拒绝:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('[全局] 未捕获的异常:', err?.message || err);
});

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

const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function balanceOf(address account) external view returns (uint256)"
];

// ============ 链上验证 ============
async function verifyTransfer(txHash, from, amount) {
  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || !receipt.status) return false;
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
      } catch (e) { /* skip */ }
    }
    return false;
  } catch (e) {
    console.error('链上验证失败:', e.message);
    return false;
  }
}

// ============ API 路由 ============

// 绑定推荐关系
app.post('/api/bind', async (req, res) => {
  try {
    const { wallet, referrer } = req.body;
    if (!wallet || !ethers.isAddress(wallet)) {
      return res.json({ success: false, msg: '无效的钱包地址' });
    }
    const w = wallet.toLowerCase();
    if (referrer && referrer.toLowerCase() === w) {
      return res.json({ success: false, msg: '不能自己推荐自己' });
    }
    let member = await db.getMember(w);

    if (member) {
      if (!member.referrer && referrer && ethers.isAddress(referrer)) {
        const refMember = await db.getMember(referrer.toLowerCase());
        if (refMember) {
          await db.rawExecute('UPDATE members SET referrer = ? WHERE wallet = ?', [referrer.toLowerCase(), w]);
          member = await db.getMember(w);
          return res.json({ success: true, member, isNew: false, referrerUpdated: true });
        }
      }
      return res.json({ success: true, member, isNew: false });
    }

    // 系统第一个人除外
    const countResult = await db.rawQuery('SELECT COUNT(*) as cnt FROM members');
    const memberCount = countResult[0]?.cnt || 0;
    if (memberCount === 0) {
      member = await db.createMember(w, null);
      return res.json({ success: true, member, isNew: true, isGenesis: true });
    }

    if (!referrer || !ethers.isAddress(referrer)) {
      return res.json({ success: false, msg: '请通过推荐人分享链接注册' });
    }
    const ref = referrer.toLowerCase();
    const refMember = await db.getMember(ref);
    if (!refMember) {
      return res.json({ success: false, msg: '推荐人不存在' });
    }
    member = await db.createMember(w, ref);
    res.json({ success: true, member, isNew: true });
  } catch (e) {
    console.error('绑定失败:', e);
    res.json({ success: false, msg: '服务器错误' });
  }
});

// 获取会员信息
app.get('/api/member/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    const member = await db.getMember(wallet);
    if (!member) return res.json({ success: false, msg: '会员不存在' });
    const balance = await db.getBalance(wallet);
    const referrerInfo = member.referrer ? await db.getMember(member.referrer) : null;
    res.json({
      success: true,
      member: {
        ...member,
        balance: balance,
        referrer_nickname: referrerInfo ? referrerInfo.nickname : '',
        referrer_avatar: referrerInfo ? referrerInfo.avatar_id : 0
      }
    });
  } catch (e) {
    console.error('获取会员失败:', e);
    res.json({ success: false, msg: '服务器错误' });
  }
});

// 更新资料
app.post('/api/profile', async (req, res) => {
  try {
    const { wallet, nickname, avatar_id, phone, debt_amount } = req.body;
    if (!wallet) return res.json({ success: false, msg: '缺少钱包地址' });
    const member = await db.getMember(wallet);
    if (!member) return res.json({ success: false, msg: '会员不存在' });
    await db.updateProfile(wallet, { nickname, avatar_id, phone, debt_amount });
    res.json({ success: true, member: await db.getMember(wallet) });
  } catch (e) {
    console.error('更新资料失败:', e);
    res.json({ success: false, msg: '服务器错误' });
  }
});

// 购买互助卡
app.post('/api/buy-card', async (req, res) => {
  try {
    const { wallet, tx_hash } = req.body;
    if (!wallet || !tx_hash) {
      return res.json({ success: false, msg: '参数不全' });
    }
    const member = await db.getMember(wallet);
    if (!member) return res.json({ success: false, msg: '请先绑定推荐关系' });
    if (member.is_member) return res.json({ success: false, msg: '已是会员' });

    if (await db.getCardPurchaseByTx(tx_hash)) {
      return res.json({ success: false, msg: '该交易已处理' });
    }

    const valid = await verifyTransfer(tx_hash, wallet, CARD_PRICE);
    if (!valid) {
      return res.json({ success: false, msg: '链上转账验证失败，请确认交易已确认且金额正确' });
    }

    const result = await db.transaction(async (txDb) => {
      const purchaseId = await txDb.createCardPurchase(wallet, tx_hash, []);
      const distribution = await distributeCard(wallet, purchaseId, txDb);
      await txDb.updateCardPurchase(purchaseId, distribution);
      await txDb.setMember(wallet);
      if (member.referrer) {
        await txDb.incDirectCount(member.referrer);
      }
      const uplink = await txDb.getUplinkChain(wallet, 9);
      for (const m of uplink) {
        await txDb.incTeamCount(m.wallet);
      }
      let upgraded = [];
      if (member.referrer) {
        if (await checkAndUpgradeV9(member.referrer, txDb)) {
          upgraded.push(member.referrer);
        }
      }
      for (const m of uplink) {
        if (await checkAndUpgradeV9(m.wallet, txDb)) {
          upgraded.push(m.wallet);
        }
      }
      return { distribution, upgraded };
    });

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

// 购买感恩卡
app.post('/api/buy-thanks', async (req, res) => {
  try {
    const { wallet, tx_hash } = req.body;
    if (!wallet || !tx_hash) {
      return res.json({ success: false, msg: '参数不全' });
    }
    const member = await db.getMember(wallet);
    if (!member || !member.is_member) {
      return res.json({ success: false, msg: '仅会员可购买感恩卡' });
    }
    if (!member.referrer) {
      return res.json({ success: false, msg: '没有推荐人，无法送感恩卡' });
    }
    if (member.thanks_card_sent) {
      return res.json({ success: false, msg: '已送过感恩卡' });
    }

    const valid = await verifyTransfer(tx_hash, wallet, THANKS_PRICE);
    if (!valid) {
      return res.json({ success: false, msg: '链上转账验证失败' });
    }

    const result = await db.transaction(async (txDb) => {
      const purchaseId = await txDb.createThanksPurchase(wallet, member.referrer, tx_hash);
      await txDb.addBalance(member.referrer, THANKS_PRICE, 'income_thanks', purchaseId);
      await txDb.markThanksSent(wallet);
      const upgraded = await checkAndUpgradeV9(wallet, txDb);
      return { upgraded };
    });

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
app.post('/api/withdraw', async (req, res) => {
  try {
    const { wallet, amount } = req.body;
    if (!wallet || !amount || amount <= 0) {
      return res.json({ success: false, msg: '参数错误' });
    }
    const member = await db.getMember(wallet);
    if (!member || !member.is_member) {
      return res.json({ success: false, msg: '仅会员可提现' });
    }
    const balance = await db.getBalance(wallet);
    if (balance < amount) {
      return res.json({ success: false, msg: '余额不足' });
    }

    const wId = await db.transaction(async (txDb) => {
      await txDb.subBalance(wallet, amount, 'withdraw', null);
      return await txDb.createWithdrawal(wallet, amount);
    });

    res.json({
      success: true,
      msg: `提现申请已提交，实际到账 ${amount - 1} U，处理中`,
      withdrawal_id: wId
    });
  } catch (e) {
    console.error('提现申请失败:', e);
    res.json({ success: false, msg: '处理失败: ' + e.message });
  }
});

// 获取9层团队
app.get('/api/team/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    const team = await db.getTeam9Levels(wallet);
    const total = team.reduce((sum, lv) => sum + lv.members.length, 0);
    res.json({ success: true, team, total });
  } catch (e) {
    console.error('获取团队失败:', e);
    res.json({ success: false, msg: '服务器错误' });
  }
});

// 获取流水
app.get('/api/ledger/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const ledger = await db.getLedger(wallet, limit);
    res.json({ success: true, ledger });
  } catch (e) {
    console.error('获取流水失败:', e);
    res.json({ success: false, msg: '服务器错误' });
  }
});

// 获取提现记录
app.get('/api/withdrawals/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    const records = await db.rawQuery(
      'SELECT * FROM withdrawals WHERE wallet = ? ORDER BY id DESC LIMIT 50',
      [wallet.toLowerCase()]
    );
    res.json({ success: true, withdrawals: records });
  } catch (e) {
    console.error('获取提现记录失败:', e);
    res.json({ success: false, msg: '服务器错误' });
  }
});

// 导出数据
app.get('/api/export', async (req, res) => {
  try {
    const members = await db.rawQuery('SELECT * FROM members');
    const balances = await db.rawQuery('SELECT * FROM balances');
    const ledger = await db.rawQuery('SELECT * FROM ledger');
    const cardPurchases = await db.rawQuery('SELECT * FROM card_purchases');
    const thanksPurchases = await db.rawQuery('SELECT * FROM thanks_purchases');
    const withdrawals = await db.rawQuery('SELECT * FROM withdrawals');

    const data = {
      exported_at: new Date().toISOString(),
      members, balances, ledger,
      card_purchases: cardPurchases,
      thanks_purchases: thanksPurchases,
      withdrawals
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=renrenbang-backup.json');
    res.json(data);
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 调试接口
app.get('/api/debug', (req, res) => {
  res.json({
    success: true,
    db_type: db.isMySQL() ? 'MySQL' : 'SQLite',
    token_address_set: !!process.env.TOKEN_ADDRESS,
    total_wallet_set: !!process.env.TOTAL_WALLET,
    private_key_set: !!process.env.PRIVATE_KEY,
    mysql_url_set: !!(process.env.MYSQL_URL || process.env.DATABASE_URL),
    port: process.env.PORT || '(default)'
  });
});

// 获取配置
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    token_address: TOKEN_ADDRESS,
    total_wallet: TOTAL_WALLET,
    card_price: CARD_PRICE,
    thanks_price: THANKS_PRICE,
    withdraw_fee: 1,
    version: '2.1.3'
  });
});

// ============ 启动 ============
async function startServer() {
  // 初始化数据库（MySQL优先，失败回退SQLite）
  await db.init();

  // 启动时修复错误数据
  try {
    const fixed = await db.rawExecute("UPDATE members SET referrer = NULL WHERE referrer = wallet");
    if (fixed.changes > 0) {
      console.log(`[修复] 已清理 ${fixed.changes} 条自己推荐自己的错误数据`);
    }
  } catch (e) {
    console.error('[修复] 清理错误数据失败:', e.message);
  }

  app.listen(PORT, () => {
    console.log(`人人帮 DApp v2.1.3 后端已启动: http://localhost:${PORT}`);
    console.log(`数据库类型: ${db.isMySQL() ? 'MySQL' : 'SQLite'}`);

    if (process.env.PRIVATE_KEY && TOKEN_ADDRESS && TOTAL_WALLET) {
      try {
        withdrawEngine.init(RPC_URL, process.env.PRIVATE_KEY, TOKEN_ADDRESS);
        withdrawEngine.start();
        console.log('[提现引擎] 启动成功');
      } catch (e) {
        console.error('[提现引擎] 启动失败:', e.message);
      }
    } else {
      console.log('[警告] 未配置 PRIVATE_KEY / TOKEN_ADDRESS / TOTAL_WALLET，提现引擎未启动');
    }
  });
}

startServer();
