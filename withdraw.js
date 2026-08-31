/**
 * 人人帮 自动提现引擎（异步版）
 */
const { ethers } = require('ethers');
const db = require('./db');

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];

class WithdrawalEngine {
  constructor() {
    this.running = false;
    this.provider = null;
    this.wallet = null;
    this.token = null;
    this.tokenDecimals = 18;
  }

  init(rpcUrl, privateKey, tokenAddress) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.token = new ethers.Contract(tokenAddress, ERC20_ABI, this.wallet);
    console.log(`[提现引擎] 已初始化，总钱包: ${this.wallet.address}`);
  }

  start(intervalMs = 3000) {
    if (this.running) return;
    this.running = true;
    console.log(`[提现引擎] 启动，轮询间隔 ${intervalMs}ms`);
    this.loop(intervalMs);
  }

  async loop(intervalMs) {
    while (this.running) {
      try {
        await this.processPending();
      } catch (e) {
        console.error('[提现引擎] 处理异常:', e.message);
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }

  async processPending() {
    const pending = await db.getPendingWithdrawals();
    for (const w of pending) {
      await this.processOne(w);
    }
  }

  async processOne(withdrawal) {
    const { id, wallet: toAddress, actual_amount } = withdrawal;
    try {
      const balance = await this.token.balanceOf(this.wallet.address);
      const amountWei = BigInt(Math.floor(actual_amount * 10 ** this.tokenDecimals));
      if (balance < amountWei) {
        console.error(`[提现引擎] 订单#${id} 总钱包余额不足，跳过`);
        return;
      }

      console.log(`[提现引擎] 处理订单#${id}: 向 ${toAddress} 转 ${actual_amount} U`);

      const tx = await this.token.transfer(toAddress, amountWei);
      await tx.wait();

      await db.updateWithdrawal(id, 'success', tx.hash);
      console.log(`[提现引擎] 订单#${id} 成功 tx=${tx.hash}`);
    } catch (e) {
      console.error(`[提现引擎] 订单#${id} 失败:`, e.message);
      try {
        await db.transaction(async (txDb) => {
          await txDb.addBalance(withdrawal.wallet, withdrawal.amount, 'withdraw_refund', id);
        });
      } catch (refundErr) {
        console.error(`[提现引擎] 订单#${id} 退款失败:`, refundErr.message);
      }
      await db.updateWithdrawal(id, 'failed', null);
    }
  }
}

module.exports = new WithdrawalEngine();
