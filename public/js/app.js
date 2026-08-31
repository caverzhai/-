/**
 * 人人帮 DApp 前端逻辑（多语言版）
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

const AVATARS = ['👨','👩','👴','👵','👦','👧','👨‍🦰','👩‍🦰','👨‍🦱','👩‍🦱','👨‍🦳','👩‍🦳','👨‍🎓','👩‍🎓','👨‍💼','👩‍💼','👨‍🔧','👩‍🔧','🧑‍💻','🧑‍🎓'];
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];

// ============ 多语言应用 ============
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val && val !== key) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    const val = t(key);
    if (val && val !== key) el.placeholder = val;
  });
  // 设置语言选择器
  const sel = document.getElementById('lang-select');
  if (sel) sel.value = currentLang;
  // 设置版本号
  const ver = document.getElementById('version-text');
  if (ver) ver.textContent = t('version');
}

// ============ 初始化 ============
window.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  state.refAddress = urlParams.get('ref');

  applyI18n();
  await loadConfig();
  renderHomeAction();
  initAvatarGrid();

  if (state.refAddress) {
    showToast(t('toast.refDetected'));
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
    showToast(t('toast.connected'));
    refreshMember();
  } catch (e) {
    showToast(t('toast.connectFail') + ': ' + e.message);
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
        showToast(t('toast.bound'));
      }
    } else {
      showToast(data.msg || t('toast.buyFail'));
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
    el.innerHTML = '<button class="btn btn-primary" onclick="connectWallet()">' + t('action.connect') + '</button>';
    return;
  }
  if (!state.member || !state.member.is_member) {
    const price = state.config?.card_price || 180;
    el.innerHTML = `
      <button class="btn btn-primary" onclick="buyCard()">${t('action.buyCard').replace('{n}', price)}</button>
      <p style="text-align:center;font-size:12px;color:#999;margin-top:8px;">${t('action.buyCardHint')}</p>
    `;
  } else {
    el.innerHTML = `
      <button class="btn btn-success" onclick="navigate('share')">${t('action.genLink')}</button>
      <button class="btn btn-secondary" onclick="navigate('my')">${t('action.enterMy')}</button>
    `;
  }
}

// ============ 购买互助卡 ============
async function buyCard() {
  if (!state.wallet) { showToast(t('my.connectFirst')); return; }
  if (!state.config?.token_address || !state.config?.total_wallet) {
    showToast('系统配置未完成'); return;
  }
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const token = new ethers.Contract(state.config.token_address, ERC20_ABI, signer);
    const amount = ethers.parseUnits(String(state.config.card_price), 18);

    showToast(t('toast.processing'));
    const tx = await token.transfer(state.config.total_wallet, amount);
    showToast(t('toast.submitted'));
    await tx.wait();

    const res = await fetch('/api/buy-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: state.wallet, tx_hash: tx.hash })
    });
    const data = await res.json();
    if (data.success) {
      showToast(t('toast.buySuccess'));
      await refreshMember();
    } else {
      showToast(t('toast.buyFail') + ': ' + data.msg);
    }
  } catch (e) {
    handleTransferError(e);
  }
}

// ============ 购买感恩卡 ============
async function buyThanksCard() {
  if (!state.wallet) { showToast(t('my.connectFirst')); return; }
  if (state.member?.thanks_card_sent) { showToast(t('toast.alreadyThanks')); return; }
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const token = new ethers.Contract(state.config.token_address, ERC20_ABI, signer);
    const amount = ethers.parseUnits(String(state.config.thanks_price), 18);

    showToast(t('toast.processing'));
    const tx = await token.transfer(state.config.total_wallet, amount);
    showToast(t('toast.submitted'));
    await tx.wait();

    const res = await fetch('/api/buy-thanks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: state.wallet, tx_hash: tx.hash })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.upgraded ? t('toast.thanksUpgraded') : t('toast.thanksSuccess'));
      await refreshMember();
    } else {
      showToast(t('toast.buyFail') + ': ' + data.msg);
    }
  } catch (e) {
    handleTransferError(e);
  }
}

function handleTransferError(e) {
  const msg = e.message || '';
  if (msg.includes('user rejected') || msg.includes('User rejected')) {
    showToast(t('toast.rejected'));
  } else if (msg.includes('insufficient') || msg.includes('missing revert data') || msg.includes('CALL_EXCEPTION')) {
    showToast(t('toast.insufficient'));
  } else if (msg.includes('network') || msg.includes('timeout')) {
    showToast(t('toast.networkError'));
  } else {
    showToast(t('toast.transferFail'));
  }
}

// ============ 提现 ============
async function withdraw() {
  if (!state.wallet) { showToast(t('my.connectFirst')); return; }
  const balance = state.member?.balance || 0;
  if (balance <= 0) { showToast(t('toast.balanceZero')); return; }

  const amount = prompt(`${t('my.balance')}：${balance}U\n${t('profile.goal') ? '' : ''}每笔手续费1U\n${t('profile.goal') ? '' : ''}请输入提现数量：`, String(balance));
  if (!amount) return;
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) { showToast(t('toast.invalidAmount')); return; }
  if (num > balance) { showToast(t('toast.balanceNotEnough')); return; }

  try {
    const res = await fetch('/api/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: state.wallet, amount: num })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.msg || t('toast.withdrawSuccess'));
      await refreshMember();
    } else {
      showToast(t('toast.buyFail') + ': ' + data.msg);
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
        <p>${t('my.connectFirst')}</p>
        <button class="btn btn-primary" style="margin-top:16px;max-width:200px;" onclick="connectWallet()">${t('action.connect')}</button>
      </div>`;
    return;
  }
  if (!state.member) {
    await refreshMember();
    return;
  }
  const m = state.member;
  const avatar = AVATARS[m.avatar_id] || AVATARS[0];
  const levelText = m.level === 1 ? 'V9' : (m.is_member ? t('profile.nickname') ? '普通会员' : '普通会员' : '未入会');
  const levelBadgeText = m.level === 1 ? 'V9' : (m.is_member ? '普通会员' : '未入会');

  const directPct = Math.min(100, (m.direct_count / 3) * 100);
  const teamPct = Math.min(100, (m.team_count / 80) * 100);
  const thanksDone = m.thanks_card_sent === 1;

  const referrerDisplay = m.referrer_nickname || (m.referrer ? shortAddr(m.referrer) : t('my.noReferrer'));

  el.innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar">${avatar}</div>
      <div class="profile-info">
        <h2>${m.nickname || t('profile.nicknamePh')}</h2>
        <p>${shortAddr(m.wallet)}</p>
        <span class="level-badge">${levelBadgeText}</span>
      </div>
    </div>

    <div class="balance-card">
      <div class="balance-label">${t('my.balance')}</div>
      <div><span class="balance-amount">${m.balance || 0}</span><span class="balance-unit">U</span></div>
      <div style="margin-top:14px;display:flex;gap:10px;">
        <button class="btn btn-primary" onclick="withdraw()" ${m.balance > 0 ? '' : 'disabled'}>${t('my.withdraw')}</button>
        <button class="btn btn-secondary" onclick="openProfileModal()" style="max-width:100px;">${t('my.editProfile')}</button>
      </div>
    </div>

    <div class="card">
      <div class="info-row">
        <span class="label">${t('my.referrer')}</span>
        <span class="value">${referrerDisplay}</span>
      </div>
      <div class="info-row">
        <span class="label">${t('my.directCount')}</span>
        <span class="value">${m.direct_count} ${t('my.people')}</span>
      </div>
      <div class="info-row">
        <span class="label">${t('my.teamCount')}</span>
        <span class="value">${m.team_count} ${t('my.people')}</span>
      </div>
      <div class="info-row">
        <span class="label">${t('my.goal')}</span>
        <span class="value">${m.debt_amount || 0} U</span>
      </div>
    </div>

    ${m.is_member ? `
    <div class="card">
      <h3>${t('my.v9Progress')}</h3>
      <div class="v9-progress">
        <div class="progress-item">
          <div class="progress-header"><span>${t('my.directGoal')}</span><span>${m.direct_count}/3</span></div>
          <div class="progress-bar"><div class="progress-fill ${directPct>=100?'done':''}" style="width:${directPct}%"></div></div>
        </div>
        <div class="progress-item">
          <div class="progress-header"><span>${t('my.teamGoal')}</span><span>${m.team_count}/80</span></div>
          <div class="progress-bar"><div class="progress-fill ${teamPct>=100?'done':''}" style="width:${teamPct}%"></div></div>
        </div>
        <div class="progress-item">
          <div class="progress-header"><span>${t('my.thanksGoal')}</span><span>${thanksDone ? t('my.done') : t('my.pending')}</span></div>
          <div class="progress-bar"><div class="progress-fill ${thanksDone?'done':''}" style="width:${thanksDone?100:0}%"></div></div>
        </div>
      </div>
      ${m.level !== 1 && !thanksDone ? `
        <button class="btn btn-warning" style="margin-top:12px;" onclick="buyThanksCard()">${t('my.sendThanks')}</button>
      ` : ''}
      ${m.level === 1 ? '<p style="text-align:center;color:#11b981;font-weight:600;margin-top:8px;">🎉 ' + t('my.isV9') + '</p>' : ''}
    </div>
    ` : ''}

    <div class="card">
      <h3>${t('my.myTeam')}</h3>
      <div id="team-tree" class="team-section">
        <p style="color:#999;font-size:13px;text-align:center;padding:10px;">加载中...</p>
      </div>
    </div>

    <div class="card">
      <h3>${t('my.ledger')}</h3>
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
      el.innerHTML = '<p style="color:#999;font-size:13px;text-align:center;padding:10px;">' + t('my.noTeam') + '</p>';
      return;
    }
    el.innerHTML = data.team.map(lv => `
      <div class="team-level">
        <div class="team-level-header" onclick="this.nextElementSibling.classList.toggle('open')">
          <span>${t('my.level').replace('{n}', lv.level)}</span>
          <span>${t('my.members').replace('{n}', lv.members.length)}</span>
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
      el.innerHTML = '<p style="color:#999;font-size:13px;text-align:center;padding:10px;">' + t('my.noLedger') + '</p>';
      return;
    }
    el.innerHTML = data.ledger.map(l => `
      <div class="ledger-item">
        <span class="ledger-type">${t('ledger.' + l.type) || l.type}</span>
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
        <p>${t('my.connectFirst')}</p>
        <button class="btn btn-primary" style="margin-top:16px;max-width:200px;" onclick="connectWallet()">${t('action.connect')}</button>
      </div>`;
    return;
  }
  if (!state.member || !state.member.is_member) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="emoji">🎫</div>
        <p>${t('share.needMember')}</p>
        <button class="btn btn-primary" style="margin-top:16px;max-width:240px;" onclick="buyCard()">${t('share.buyCard')}</button>
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
      ${m.debt_amount > 0 ? `<div class="share-debt">${t('share.goalLabel').replace('{n}', m.debt_amount)}</div>` : ''}
      <div class="qrcode-box" id="qrcode"></div>
      <div class="share-link" id="share-link">${shareUrl}</div>
      <button class="btn btn-primary" onclick="copyLink()">${t('share.copyLink')}</button>
    </div>
    <div class="card">
      <h3>${t('profile.avatar')}</h3>
      <p style="font-size:13px;color:#666;line-height:1.7;">
        ${t('share.desc')}
      </p>
    </div>
  `;

  const box = document.getElementById('qrcode');
  if (box) {
    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=1&data=' + encodeURIComponent(shareUrl);
    box.innerHTML = '<img src="' + qrUrl + '" alt="分享二维码" style="width:180px;height:180px;">';
  }
}

function copyLink() {
  const link = document.getElementById('share-link').textContent;
  navigator.clipboard.writeText(link).then(() => {
    showToast(t('share.copied'));
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = link;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(t('share.copied'));
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
  document.getElementById('edit-phone').value = state.member.phone || '';
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
  const phone = document.getElementById('edit-phone').value.trim();
  const debt = parseFloat(document.getElementById('edit-debt').value) || 0;
  try {
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: state.wallet,
        nickname, avatar_id: state.selectedAvatar, phone, debt_amount: debt
      })
    });
    const data = await res.json();
    if (data.success) {
      state.member = data.member;
      showToast(t('profile.saved'));
      closeProfileModal({ target: { id: 'profile-modal' } });
      renderAll();
    } else {
      showToast(t('toast.buyFail'));
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
  const t_el = document.getElementById('toast');
  t_el.textContent = msg;
  t_el.classList.add('show');
  clearTimeout(t_el._timer);
  t_el._timer = setTimeout(() => t_el.classList.remove('show'), 2500);
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
