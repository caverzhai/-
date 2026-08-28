/**
 * 人人帮 DApp 前端逻辑
 */

// ============ 全局状态 ============
const state = {
  wallet: null,
  member: null,
  config: null,
  currentPage: 'home',
  selectedAvatar: 0,
  refAddress: null
};

const AVATARS = ['👤', '😀', '😎', '🤠', '🦊', '🐱', '🐶', '🦁', '🐯', '🐸', '🦄', '🐲'];
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];

// ============ 初始化 ============
window.addEventListener('DOMContentLoaded', async () => {
  // 读取URL中的ref参数
  const urlParams = new URLSearchParams(window.location.search);
  state.refAddress = urlParams.get('ref');

  await loadConfig();
  renderHomeAction();
  initAvatarGrid();

  // 如果有ref参数，提示用户连接钱包绑定
  if (state.refAddress) {
    showToast('检测到推荐链接，连接钱包即可绑定推荐关系');
  }
});

// ============ 配置 ============
async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    state.config = data;
  } catch (e) {
    console.error('加载配置失败', e);
  }
}

// ============ 钱包连接 ============
async function connectWallet() {
  if (!window.ethereum) {
    showToast('请在TP钱包或支持Web3的浏览器中打开');
    return;
  }
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    state.wallet = accounts[0];
    await bindMember();
    showToast('钱包已连接');
    refreshMember();
  } catch (e) {
    showToast('连接失败: ' + e.message);
  }
}

async function bindMember() {
  try {
    const res = await fetch('/api/bind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: state.wallet, referrer: state.refAddress })
    });
    const data = await res.json();
    if (data.success) {
      state.member = data.member;
      if (data.isNew && state.refAddress) {
        showToast('推荐关系已绑定');
      }
    }
  } catch (e) {
    console.error('绑定失败', e);
  }
}

async function refreshMember() {
  if (!state.wallet) return;
  try {
    const res = await fetch('/api/member/' + state.wallet);
    const data = await res.json();
    if (data.success) {
      state.member = data.member;
      renderAll();
    }
  } catch (e) {
    console.error('刷新会员信息失败', e);
  }
}

// ============ 导航 ============
function navigate(page) {
  state.currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.nav === page);
  });
  if (page === 'my') renderMyPage();
  if (page === 'share') renderSharePage();
  if (page === 'home') renderHomeAction();
}

// ============ 首页动作区 ============
function renderHomeAction() {
  const el = document.getElementById('home-action');
  if (!state.wallet) {
    el.innerHTML = '<button class="btn btn-primary" onclick="connectWallet()">连接钱包</button>';
    return;
  }
  if (!state.member || !state.member.is_member) {
    el.innerHTML = `
      <button class="btn btn-primary" onclick="buyCard()">购买互助卡（${state.config?.card_price || 180}枚）成为会员</button>
      <p style="text-align:center;font-size:12px;color:#999;margin-top:8px;">购买后即可生成专属分享链接</p>
    `;
  } else {
    el.innerHTML = `
      <button class="btn btn-success" onclick="navigate('share')">生成分享链接</button>
      <button class="btn btn-secondary" onclick="navigate('my')">进入我的后台</button>
    `;
  }
}

// ============ 购买互助卡 ============
async function buyCard() {
  if (!state.wallet) { showToast('请先连接钱包'); return; }
  if (!state.config?.token_address || !state.config?.total_wallet) {
    showToast('系统配置未完成'); return;
  }
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const token = new ethers.Contract(state.config.token_address, ERC20_ABI, signer);
    const amount = ethers.parseUnits(String(state.config.card_price), 18);

    showToast('正在发起转账，请在钱包中确认...');
    const tx = await token.transfer(state.config.total_wallet, amount);
    showToast('交易已提交，等待链上确认...');
    await tx.wait();

    // 通知后端验证并分配
    const res = await fetch('/api/buy-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: state.wallet, tx_hash: tx.hash })
    });
    const data = await res.json();
    if (data.success) {
      showToast('购卡成功！已成为会员');
      await refreshMember();
    } else {
      showToast('失败: ' + data.msg);
    }
  } catch (e) {
    showToast('操作失败: ' + e.message);
  }
}

// ============ 购买感恩卡 ============
async function buyThanksCard() {
  if (!state.wallet) { showToast('请先连接钱包'); return; }
  if (state.member?.thanks_card_sent) { showToast('已送过感恩卡'); return; }
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const token = new ethers.Contract(state.config.token_address, ERC20_ABI, signer);
    const amount = ethers.parseUnits(String(state.config.thanks_price), 18);

    showToast('正在发起转账，请在钱包中确认...');
    const tx = await token.transfer(state.config.total_wallet, amount);
    showToast('交易已提交，等待确认...');
    await tx.wait();

    const res = await fetch('/api/buy-thanks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: state.wallet, tx_hash: tx.hash })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.upgraded ? '感恩卡已送出，恭喜升级V9！' : '感恩卡已送出');
      await refreshMember();
    } else {
      showToast('失败: ' + data.msg);
    }
  } catch (e) {
    showToast('操作失败: ' + e.message);
  }
}

// ============ 提现 ============
async function withdraw() {
  if (!state.wallet) { showToast('请先连接钱包'); return; }
  const balance = state.member?.balance || 0;
  if (balance <= 0) { showToast('余额为0'); return; }

  const amount = prompt(`可提现余额：${balance}枚\n每笔手续费1枚\n请输入提现数量：`, String(balance));
  if (!amount) return;
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) { showToast('金额无效'); return; }
  if (num > balance) { showToast('余额不足'); return; }

  try {
    const res = await fetch('/api/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: state.wallet, amount: num })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.msg);
      await refreshMember();
    } else {
      showToast('失败: ' + data.msg);
    }
  } catch (e) {
    showToast('操作失败: ' + e.message);
  }
}

// ============ 我的页面 ============
async function renderMyPage() {
  const el = document.getElementById('my-content');
  if (!state.wallet) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="emoji">👛</div>
        <p>请先连接钱包</p>
        <button class="btn btn-primary" style="margin-top:16px;max-width:200px;" onclick="connectWallet()">连接钱包</button>
      </div>`;
    return;
  }
  if (!state.member) {
    await refreshMember();
    return;
  }
  const m = state.member;
  const avatar = AVATARS[m.avatar_id] || AVATARS[0];
  const levelText = m.level === 1 ? 'V9会员' : (m.is_member ? '普通会员' : '未入会');
  const levelClass = m.level === 1 ? 'v9' : '';

  // V9进度
  const directPct = Math.min(100, (m.direct_count / 3) * 100);
  const teamPct = Math.min(100, (m.team_count / 80) * 100);
  const thanksDone = m.thanks_card_sent === 1;

  el.innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar">${avatar}</div>
      <div class="profile-info">
        <h2>${m.nickname || '未设置昵称'}</h2>
        <p>${shortAddr(m.wallet)}</p>
        <span class="level-badge">${levelText}</span>
      </div>
    </div>

    <div class="balance-card">
      <div class="balance-label">可提现余额</div>
      <div><span class="balance-amount">${m.balance || 0}</span><span class="balance-unit">枚</span></div>
      <div style="margin-top:14px;display:flex;gap:10px;">
        <button class="btn btn-primary" onclick="withdraw()" ${m.balance > 0 ? '' : 'disabled'}>提现</button>
        <button class="btn btn-secondary" onclick="openProfileModal()" style="max-width:100px;">编辑资料</button>
      </div>
    </div>

    <div class="card">
      <div class="info-row">
        <span class="label">推荐人</span>
        <span class="value">${m.referrer_nickname || '无（链头）'}</span>
      </div>
      <div class="info-row">
        <span class="label">直推人数</span>
        <span class="value">${m.direct_count} 人</span>
      </div>
      <div class="info-row">
        <span class="label">团队人数（9层）</span>
        <span class="value">${m.team_count} 人</span>
      </div>
      <div class="info-row">
        <span class="label">需要帮助</span>
        <span class="value">${m.debt_amount || 0} 枚</span>
      </div>
    </div>

    ${m.is_member ? `
    <div class="card">
      <h3>V9升级进度</h3>
      <div class="v9-progress">
        <div class="progress-item">
          <div class="progress-header"><span>直推会员 ≥ 3人</span><span>${m.direct_count}/3</span></div>
          <div class="progress-bar"><div class="progress-fill ${directPct>=100?'done':''}" style="width:${directPct}%"></div></div>
        </div>
        <div class="progress-item">
          <div class="progress-header"><span>团队总人数 > 80人</span><span>${m.team_count}/80</span></div>
          <div class="progress-bar"><div class="progress-fill ${teamPct>=100?'done':''}" style="width:${teamPct}%"></div></div>
        </div>
        <div class="progress-item">
          <div class="progress-header"><span>送出感恩卡（300枚）</span><span>${thanksDone ? '已完成' : '未完成'}</span></div>
          <div class="progress-bar"><div class="progress-fill ${thanksDone?'done':''}" style="width:${thanksDone?100:0}%"></div></div>
        </div>
      </div>
      ${m.level !== 1 && !thanksDone ? `
        <button class="btn btn-warning" style="margin-top:12px;" onclick="buyThanksCard()">送出感恩卡（300枚）</button>
      ` : ''}
      ${m.level === 1 ? '<p style="text-align:center;color:#11b981;font-weight:600;margin-top:8px;">🎉 您已是V9会员</p>' : ''}
    </div>
    ` : ''}

    <div class="card">
      <h3>我的团队（九层可见）</h3>
      <div id="team-tree" class="team-section">
        <p style="color:#999;font-size:13px;text-align:center;padding:10px;">加载中...</p>
      </div>
    </div>

    <div class="card">
      <h3>资金流水</h3>
      <div id="ledger-list" class="ledger-list">
        <p style="color:#999;font-size:13px;text-align:center;padding:10px;">加载中...</p>
      </div>
    </div>
  `;

  loadTeamTree();
  loadLedger();
}

// ============ 团队树 ============
async function loadTeamTree() {
  try {
    const res = await fetch('/api/team/' + state.wallet);
    const data = await res.json();
    const el = document.getElementById('team-tree');
    if (!data.success || data.team.length === 0) {
      el.innerHTML = '<p style="color:#999;font-size:13px;text-align:center;padding:10px;">暂无团队成员</p>';
      return;
    }
    el.innerHTML = data.team.map(lv => `
      <div class="team-level">
        <div class="team-level-header" onclick="this.nextElementSibling.classList.toggle('open')">
          <span>第 ${lv.level} 层</span>
          <span>${lv.members.length} 人</span>
        </div>
        <div class="team-level-body">
          ${lv.members.map(m => `
            <div class="team-member">
              <span class="tm-avatar">${AVATARS[m.avatar_id] || '👤'}</span>
              <span>${m.nickname || shortAddr(m.wallet)}</span>
              ${m.level === 1 ? '<span class="tm-level v9">V9</span>' : (m.is_member ? '<span class="tm-level">会员</span>' : '')}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.error('加载团队失败', e);
  }
}

// ============ 流水 ============
async function loadLedger() {
  try {
    const res = await fetch('/api/ledger/' + state.wallet);
    const data = await res.json();
    const el = document.getElementById('ledger-list');
    if (!data.success || data.ledger.length === 0) {
      el.innerHTML = '<p style="color:#999;font-size:13px;text-align:center;padding:10px;">暂无流水</p>';
      return;
    }
    const typeMap = {
      income_direct: '直推奖励',
      income_v9: 'V9奖励',
      income_normal: '互助分配',
      income_thanks: '感恩卡收入',
      withdraw: '提现',
      fee: '手续费',
      withdraw_refund: '提现退回'
    };
    el.innerHTML = data.ledger.map(l => `
      <div class="ledger-item">
        <span class="ledger-type">${typeMap[l.type] || l.type}</span>
        <span class="ledger-amount ${l.amount >= 0 ? 'positive' : 'negative'}">${l.amount >= 0 ? '+' : ''}${l.amount}</span>
      </div>
    `).join('');
  } catch (e) {
    console.error('加载流水失败', e);
  }
}

// ============ 分享页 ============
async function renderSharePage() {
  const el = document.getElementById('share-content');
  if (!state.wallet) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="emoji">🔗</div>
        <p>请先连接钱包</p>
        <button class="btn btn-primary" style="margin-top:16px;max-width:200px;" onclick="connectWallet()">连接钱包</button>
      </div>`;
    return;
  }
  if (!state.member || !state.member.is_member) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="emoji">🎫</div>
        <p>购买互助卡成为会员后即可生成分享链接</p>
        <button class="btn btn-primary" style="margin-top:16px;max-width:240px;" onclick="buyCard()">购买互助卡</button>
      </div>`;
    return;
  }
  const m = state.member;
  const avatar = AVATARS[m.avatar_id] || AVATARS[0];
  const shareUrl = window.location.origin + window.location.pathname + '?ref=' + m.wallet;

  el.innerHTML = `
    <div class="share-card">
      <div class="share-avatar">${avatar}</div>
      <div class="share-name">${m.nickname || '人人帮会员'}</div>
      ${m.debt_amount > 0 ? `<div class="share-debt">需要帮助 ${m.debt_amount} 枚</div>` : ''}
      <div class="qrcode-box" id="qrcode"></div>
      <div class="share-link" id="share-link">${shareUrl}</div>
      <button class="btn btn-primary" onclick="copyLink()">复制分享链接</button>
    </div>
    <div class="card">
      <h3>分享说明</h3>
      <p style="font-size:13px;color:#666;line-height:1.7;">
        好友通过你的链接在TP钱包中打开并连接钱包，即可绑定推荐关系。好友购买互助卡后，你将获得直推奖励20枚，并有机会获得V9奖励40枚。
      </p>
    </div>
  `;

// 生成二维码
  if (window.QRCode) {
    const box = document.getElementById('qrcode');
    if (box) {
      const canvas = document.createElement('canvas');
      QRCode.toCanvas(canvas, shareUrl, { width: 180, margin: 1 }, (err) => {
        if (!err) {
          box.innerHTML = '';
          box.appendChild(canvas);
        } else {
          console.error('二维码生成失败:', err);
        }
      });
    }
  }

} 
function copyLink() {
  const link = document.getElementById('share-link').textContent;
  navigator.clipboard.writeText(link).then(() => {
    showToast('链接已复制');
  }).catch(() => {
    // 兼容方案
    const ta = document.createElement('textarea');
    ta.value = link;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('链接已复制');
  });
}

// ============ 资料编辑 ============
function initAvatarGrid() {
  const grid = document.getElementById('avatar-grid');
  if (!grid) return;
  grid.innerHTML = AVATARS.map((a, i) =>
    `<div class="avatar-option ${i === 0 ? 'selected' : ''}" data-id="${i}" onclick="selectAvatar(${i})">${a}</div>`
  ).join('');
}

function selectAvatar(id) {
  state.selectedAvatar = id;
  document.querySelectorAll('.avatar-option').forEach(el => {
    el.classList.toggle('selected', parseInt(el.dataset.id) === id);
  });
}

function openProfileModal() {
  if (!state.member) return;
  document.getElementById('edit-nickname').value = state.member.nickname || '';
  document.getElementById('edit-birthday').value = state.member.birthday || '';
  document.getElementById('edit-debt').value = state.member.debt_amount || 0;
  selectAvatar(state.member.avatar_id || 0);
  document.getElementById('profile-modal').classList.add('show');
}

function closeProfileModal(e) {
  if (e && e.target.id !== 'profile-modal') return;
  document.getElementById('profile-modal').classList.remove('show');
}

async function saveProfile() {
  const nickname = document.getElementById('edit-nickname').value.trim();
  const birthday = document.getElementById('edit-birthday').value;
  const debt = parseFloat(document.getElementById('edit-debt').value) || 0;
  try {
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: state.wallet,
        nickname, avatar_id: state.selectedAvatar, birthday, debt_amount: debt
      })
    });
    const data = await res.json();
    if (data.success) {
      state.member = data.member;
      showToast('资料已保存');
      closeProfileModal({ target: { id: 'profile-modal' } });
      renderAll();
    } else {
      showToast('保存失败');
    }
  } catch (e) {
    showToast('保存失败: ' + e.message);
  }
}

// ============ 工具 ============
function shortAddr(addr) {
  if (!addr) return '';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

function renderAll() {
  renderHomeAction();
  if (state.currentPage === 'my') renderMyPage();
  if (state.currentPage === 'share') renderSharePage();
}

// 监听钱包账号变化
if (window.ethereum) {
  window.ethereum.on('accountsChanged', (accounts) => {
    if (accounts.length > 0) {
      state.wallet = accounts[0];
      bindMember().then(() => refreshMember());
    } else {
      state.wallet = null;
      state.member = null;
      renderAll();
    }
  });
}
