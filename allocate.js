/**
 * 人人帮 分配引擎（异步版，支持MySQL）
 * 180U互助卡分配逻辑：
 *   A. 直推人 20
 *   B. 从直推人开始向上找前4个V9，各40
 *   C. 剩余从直推人的上级开始向上找非V9会员，各20，到链头重复直到分完
 */

const CARD_PRICE = 180;
const DIRECT_REWARD = 20;
const V9_REWARD = 40;
const NORMAL_REWARD = 20;
const MAX_V9_COUNT = 4;
const MAX_CHAIN_DEPTH = 64;

/**
 * 执行购卡分配（异步，支持事务内调用）
 * @param {string} buyer 购买人钱包地址
 * @param {number} refId 购卡记录ID
 * @param {object} txDb 事务数据库对象（MySQL事务内传入，SQLite传null用全局db）
 * @returns {Array} 分配明细 [{wallet, type, amount}]
 */
async function distributeCard(buyer, refId, txDb) {
  const db = txDb || require('./db');
  const distribution = [];
  let remaining = CARD_PRICE;

  // 获取推荐链（从直推人向上，最多64层）
  const chain = await db.getUplinkChain(buyer, MAX_CHAIN_DEPTH);
  if (chain.length === 0) {
    // 没有推荐人（链头自己购卡），180全部归自己
    await db.addBalance(buyer, CARD_PRICE, 'income_direct', refId);
    distribution.push({ wallet: buyer, type: 'income_direct', amount: CARD_PRICE });
    return distribution;
  }

  // ===== A项：直推人20 =====
  const p1 = chain[0];
  await db.addBalance(p1.wallet, DIRECT_REWARD, 'income_direct', refId);
  distribution.push({ wallet: p1.wallet, type: 'income_direct', amount: DIRECT_REWARD });
  remaining -= DIRECT_REWARD;

  // ===== B项：前4个V9各40 =====
  let v9Count = 0;
  for (const m of chain) {
    if (m.level === 1 && v9Count < MAX_V9_COUNT) {
      await db.addBalance(m.wallet, V9_REWARD, 'income_v9', refId);
      distribution.push({ wallet: m.wallet, type: 'income_v9', amount: V9_REWARD });
      remaining -= V9_REWARD;
      v9Count++;
    }
    if (v9Count >= MAX_V9_COUNT) break;
  }

  // ===== C项：从P2开始向上找非V9会员，各20，到链头后链头继续拿直到分完 =====
  if (remaining > 0) {
    const normalMembers = chain.slice(1).filter(m => m.level === 0);

    if (normalMembers.length > 0) {
      let idx = 0;
      while (remaining >= NORMAL_REWARD && idx < normalMembers.length) {
        const target = normalMembers[idx];
        await db.addBalance(target.wallet, NORMAL_REWARD, 'income_normal', refId);
        distribution.push({ wallet: target.wallet, type: 'income_normal', amount: NORMAL_REWARD });
        remaining -= NORMAL_REWARD;
        idx++;
      }
      if (remaining >= NORMAL_REWARD) {
        const head = normalMembers[normalMembers.length - 1];
        while (remaining >= NORMAL_REWARD) {
          await db.addBalance(head.wallet, NORMAL_REWARD, 'income_normal', refId);
          distribution.push({ wallet: head.wallet, type: 'income_normal', amount: NORMAL_REWARD });
          remaining -= NORMAL_REWARD;
        }
      }
    } else {
      const head = chain[chain.length - 1];
      while (remaining >= NORMAL_REWARD) {
        await db.addBalance(head.wallet, NORMAL_REWARD, 'income_normal', refId);
        distribution.push({ wallet: head.wallet, type: 'income_normal', amount: NORMAL_REWARD });
        remaining -= NORMAL_REWARD;
      }
    }
  }

  return distribution;
}

/**
 * 检查并升级V9（异步）
 */
async function checkAndUpgradeV9(wallet, txDb) {
  const db = txDb || require('./db');
  const m = await db.getMember(wallet);
  if (!m || m.level === 1) return false;
  if (m.direct_count >= 3 && m.team_count > 80 && m.thanks_card_sent === 1) {
    await db.upgradeV9(wallet);
    return true;
  }
  return false;
}

module.exports = {
  distributeCard,
  checkAndUpgradeV9,
  CARD_PRICE,
  THANKS_PRICE: 300
};
