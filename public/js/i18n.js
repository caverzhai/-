/**
 * 人人帮 多语言包
 * 顺序：English / 한국어 / 日本語 / 繁體中文 / 简体中文
 */
const I18N = {
  en: {
    nav: { home: 'Home', my: 'Mine', share: 'Share' },
    hero: { title: 'RenRenBang', sub: 'Mutual Aid · Fair Distribution · Global' },
    intro: {
      title: 'About Us',
      text: 'Founded in 2019, launched a new mutual aid model in 2026. Through paid donations and fair distribution, we help more people reduce pressure and live better lives.',
      f1: 'No regional limits, global sync',
      f2: 'Transparent rules, open distribution',
      f3: 'Platform takes nothing, full distribution'
    },
    rules: {
      title: 'Card Distribution Rules',
      a: 'Direct referrer gets',
      b: 'Up to 4 V9 members above, each gets',
      c: 'Remaining distributed upward to normal members, each gets'
    },
    v9: {
      title: 'V9 Member Requirements',
      c1: 'Direct referrals ≥ 3',
      c2: 'Total team > 80',
      c3: 'Send Thanks Card (300U) to direct referrer'
    },
    action: {
      connect: 'Connect Wallet',
      buyCard: 'Buy Mutual Aid Card ({n}U) to Become Member',
      buyCardHint: 'Generate your share link after purchase',
      genLink: 'Generate Share Link',
      enterMy: 'Enter My Dashboard'
    },
    my: {
      balance: 'Available Balance',
      withdraw: 'Withdraw',
      editProfile: 'Edit Profile',
      referrer: 'Referrer',
      noReferrer: 'None (Chain Head)',
      directCount: 'Direct Referrals',
      teamCount: 'Team (9 levels)',
      people: 'people',
      goal: 'My Performance Goal',
      v9Progress: 'V9 Upgrade Progress',
      directGoal: 'Direct members ≥ 3',
      teamGoal: 'Total team > 80',
      thanksGoal: 'Send Thanks Card (300U)',
      done: 'Done',
      pending: 'Pending',
      sendThanks: 'Send Thanks Card (300U)',
      isV9: 'You are a V9 member',
      myTeam: 'My Team (9 levels visible)',
      level: 'Level {n}',
      members: '{n} people',
      noTeam: 'No team members yet',
      ledger: 'Transaction History',
      noLedger: 'No transactions yet',
      notMember: 'Buy a card to become a member and generate share links',
      connectFirst: 'Please connect wallet first'
    },
    share: {
      needMember: 'Buy Mutual Aid Card to generate share link',
      buyCard: 'Buy Mutual Aid Card',
      goalLabel: 'My Performance Goal {n} U',
      copyLink: 'Copy Share Link',
      copied: 'Link copied',
      desc: 'Friends open your link in TP Wallet and connect wallet to bind referral. After they buy a card, you get 20U direct reward and chance for 40U V9 reward.'
    },
    profile: {
      title: 'Edit Profile',
      nickname: 'Nickname',
      nicknamePh: 'Enter nickname',
      avatar: 'Avatar',
      phone: 'Phone (optional)',
      phonePh: 'Enter phone number',
      goal: 'My Performance Goal (U)',
      cancel: 'Cancel',
      save: 'Save',
      saved: 'Profile saved'
    },
    toast: {
      connected: 'Wallet connected',
      connectFail: 'Connection failed',
      refDetected: 'Referral link detected, connect wallet to bind',
      bound: 'Referral bound',
      buySuccess: 'Card purchased! You are now a member',
      buyFail: 'Failed',
      thanksSuccess: 'Thanks Card sent!',
      thanksUpgraded: 'Thanks Card sent, upgraded to V9!',
      withdrawSuccess: 'Withdrawal submitted',
      insufficient: 'Insufficient wallet balance, please confirm you have enough USDT',
      rejected: 'Transfer cancelled',
      networkError: 'Network error, please retry',
      transferFail: 'Transfer failed, please check wallet balance',
      balanceZero: 'Balance is zero',
      invalidAmount: 'Invalid amount',
      balanceNotEnough: 'Insufficient balance',
      noRef: 'Please register through a referrer share link',
      refNotExist: 'Referrer does not exist',
      selfRef: 'Cannot refer yourself',
      alreadyMember: 'Already a member',
      needBind: 'Please bind referral first',
      txProcessed: 'This transaction has been processed',
      verifyFail: 'On-chain verification failed',
      onlyMember: 'Members only',
      noReferrer: 'No referrer, cannot send Thanks Card',
      alreadyThanks: 'Thanks Card already sent',
      processing: 'Processing transfer, please confirm in wallet...',
      submitted: 'Transaction submitted, waiting for confirmation...'
    },
    ledger: {
      income_direct: 'Direct Reward',
      income_v9: 'V9 Reward',
      income_normal: 'Mutual Distribution',
      income_thanks: 'Thanks Card Income',
      withdraw: 'Withdraw',
      fee: 'Fee',
      withdraw_refund: 'Withdraw Refund'
    },
    version: 'v2.1.1',
    language: 'Language'
  },

  ko: {
    nav: { home: '홈', my: '나의', share: '공유' },
    hero: { title: '人人帮', sub: '상호부조 · 공정분배 · 글로벌' },
    intro: {
      title: '플랫폼 소개',
      text: '2019년 시작, 2026년 새로운 상호부조 모델 출시. 유료 기부와 공정한 제도 분배를 통해 더 많은 사람이 부담을 줄이고 더 나은 삶을 살도록 돕습니다.',
      f1: '지역 제한 없음, 글로벌 동시',
      f2: '제도 공개, 분배 투명',
      f3: '플랫폼 수수료 없음, 전액 분배'
    },
    rules: {
      title: '상조카드 분배 규칙',
      a: '직접 추천인 받기',
      b: '상위 최대 4명 V9 회원, 각',
      c: '잔액은 일반 회원에게 상향 분배, 각'
    },
    v9: {
      title: 'V9 회원 조건',
      c1: '직접 추천 ≥ 3명',
      c2: '총 팀원 > 80명',
      c3: '직접 추천인에게 감사카드(300U) 전송'
    },
    action: {
      connect: '지갑 연결',
      buyCard: '상조카드 구매 ({n}U) 후 회원 되기',
      buyCardHint: '구매 후 공유 링크 생성 가능',
      genLink: '공유 링크 생성',
      enterMy: '나의 대시보드'
    },
    my: {
      balance: '출금 가능 잔액',
      withdraw: '출금',
      editProfile: '프로필 수정',
      referrer: '추천인',
      noReferrer: '없음 (체인 헤드)',
      directCount: '직접 추천',
      teamCount: '팀 (9단계)',
      people: '명',
      goal: '나의 목표 실적',
      v9Progress: 'V9 업그레이드 진행률',
      directGoal: '직접 회원 ≥ 3명',
      teamGoal: '총 팀원 > 80명',
      thanksGoal: '감사카드 전송 (300U)',
      done: '완료',
      pending: '미완료',
      sendThanks: '감사카드 전송 (300U)',
      isV9: 'V9 회원입니다',
      myTeam: '나의 팀 (9단계 표시)',
      level: '{n}단계',
      members: '{n}명',
      noTeam: '팀원 없음',
      ledger: '거래 내역',
      noLedger: '거래 내역 없음',
      notMember: '카드를 구매하여 회원이 되면 공유 링크를 생성할 수 있습니다',
      connectFirst: '먼저 지갑을 연결하세요'
    },
    share: {
      needMember: '상조카드를 구매해야 공유 링크를 생성할 수 있습니다',
      buyCard: '상조카드 구매',
      goalLabel: '나의 목표 실적 {n} U',
      copyLink: '공유 링크 복사',
      copied: '링크가 복사되었습니다',
      desc: '친구가 TP지갑에서 링크를 열고 지갑을 연결하면 추천 관계가 설정됩니다. 친구가 카드를 구매하면 직접 보상 20U와 V9 보상 40U를 받을 수 있습니다.'
    },
    profile: {
      title: '프로필 수정',
      nickname: '닉네임',
      nicknamePh: '닉네임 입력',
      avatar: '아바타',
      phone: '전화번호 (선택)',
      phonePh: '전화번호 입력',
      goal: '나의 목표 실적 (U)',
      cancel: '취소',
      save: '저장',
      saved: '프로필이 저장되었습니다'
    },
    toast: {
      connected: '지갑이 연결되었습니다',
      connectFail: '연결 실패',
      refDetected: '추천 링크가 감지되었습니다, 지갑을 연결하여 바인딩하세요',
      bound: '추천 관계가 설정되었습니다',
      buySuccess: '카드 구매 성공! 회원이 되었습니다',
      buyFail: '실패',
      thanksSuccess: '감사카드가 전송되었습니다!',
      thanksUpgraded: '감사카드 전송, V9로 업그레이드!',
      withdrawSuccess: '출금 신청이 접수되었습니다',
      insufficient: '지갑 잔액이 부족합니다, USDT를 확인하세요',
      rejected: '전송이 취소되었습니다',
      networkError: '네트워크 오류, 다시 시도하세요',
      transferFail: '전송 실패, 지갑 잔액을 확인하세요',
      balanceZero: '잔액이 0입니다',
      invalidAmount: '잘못된 금액',
      balanceNotEnough: '잔액 부족',
      noRef: '추천인 공유 링크를 통해 가입하세요',
      refNotExist: '추천인이 존재하지 않습니다',
      selfRef: '자신을 추천할 수 없습니다',
      alreadyMember: '이미 회원입니다',
      needBind: '먼저 추천 관계를 설정하세요',
      txProcessed: '이미 처리된 거래입니다',
      verifyFail: '체인 검증 실패',
      onlyMember: '회원만 가능합니다',
      noReferrer: '추천인이 없어 감사카드를 보낼 수 없습니다',
      alreadyThanks: '이미 감사카드를 보냈습니다',
      processing: '전송 중, 지갑에서 확인하세요...',
      submitted: '거래가 제출되었습니다, 확인 대기 중...'
    },
    ledger: {
      income_direct: '직접 보상',
      income_v9: 'V9 보상',
      income_normal: '상조 분배',
      income_thanks: '감사카드 수입',
      withdraw: '출금',
      fee: '수수료',
      withdraw_refund: '출금 환불'
    },
    version: 'v2.1.1',
    language: '언어'
  },

  ja: {
    nav: { home: 'ホーム', my: 'マイページ', share: 'シェア' },
    hero: { title: '人人帮', sub: '相互扶助 · 公平分配 · グローバル' },
    intro: {
      title: 'プラットフォーム紹介',
      text: '2019年に設立、2026年に新しい相互扶助モデルを開始。有料寄付と公平な制度分配により、より多くの人が負担を減らし、より良い生活を送れるよう支援します。',
      f1: '地域制限なし、グローバル同期',
      f2: '制度公開、分配透明',
      f3: 'プラットフォームは利益なし、全額分配'
    },
    rules: {
      title: '互助カード分配ルール',
      a: '直接紹介者が獲得',
      b: '上位最大4名のV9会員、各',
      c: '残額は一般会員に上向き分配、各'
    },
    v9: {
      title: 'V9会員条件',
      c1: '直接紹介 ≥ 3名',
      c2: 'チーム合計 > 80名',
      c3: '直接紹介者に感謝カード(300U)を送信'
    },
    action: {
      connect: 'ウォレット接続',
      buyCard: '互助カード購入（{n}U）で会員に',
      buyCardHint: '購入後にシェアリンクを生成できます',
      genLink: 'シェアリンク生成',
      enterMy: 'マイダッシュボード'
    },
    my: {
      balance: '出金可能残高',
      withdraw: '出金',
      editProfile: 'プロフィール編集',
      referrer: '紹介者',
      noReferrer: 'なし（チェーンヘッド）',
      directCount: '直接紹介',
      teamCount: 'チーム（9階層）',
      people: '名',
      goal: 'マイ目標実績',
      v9Progress: 'V9アップグレード進捗',
      directGoal: '直接会員 ≥ 3名',
      teamGoal: 'チーム合計 > 80名',
      thanksGoal: '感謝カード送信（300U）',
      done: '完了',
      pending: '未完了',
      sendThanks: '感謝カード送信（300U）',
      isV9: 'V9会員です',
      myTeam: 'マイチーム（9階層表示）',
      level: '{n}階層',
      members: '{n}名',
      noTeam: 'チームメンバーなし',
      ledger: '取引履歴',
      noLedger: '取引なし',
      notMember: 'カードを購入して会員になるとシェアリンクを生成できます',
      connectFirst: '先にウォレットを接続してください'
    },
    share: {
      needMember: '互助カードを購入するとシェアリンクを生成できます',
      buyCard: '互助カード購入',
      goalLabel: 'マイ目標実績 {n} U',
      copyLink: 'シェアリンクコピー',
      copied: 'リンクをコピーしました',
      desc: '友達がTPウォレットでリンクを開き、ウォレットを接続すると紹介関係が設定されます。友達がカードを購入すると、直接報酬20UとV9報酬40Uを獲得できます。'
    },
    profile: {
      title: 'プロフィール編集',
      nickname: 'ニックネーム',
      nicknamePh: 'ニックネーム入力',
      avatar: 'アバター',
      phone: '電話番号（任意）',
      phonePh: '電話番号入力',
      goal: 'マイ目標実績（U）',
      cancel: 'キャンセル',
      save: '保存',
      saved: 'プロフィールを保存しました'
    },
    toast: {
      connected: 'ウォレット接続完了',
      connectFail: '接続失敗',
      refDetected: '紹介リンクを検出、ウォレットを接続してバインド',
      bound: '紹介関係を設定しました',
      buySuccess: 'カード購入成功！会員になりました',
      buyFail: '失敗',
      thanksSuccess: '感謝カードを送信しました！',
      thanksUpgraded: '感謝カード送信、V9にアップグレード！',
      withdrawSuccess: '出金申請を受け付けました',
      insufficient: 'ウォレット残高不足、USDTを確認してください',
      rejected: '送信をキャンセルしました',
      networkError: 'ネットワークエラー、再試行してください',
      transferFail: '送信失敗、ウォレット残高を確認してください',
      balanceZero: '残高が0です',
      invalidAmount: '無効な金額',
      balanceNotEnough: '残高不足',
      noRef: '紹介者のシェアリンクから登録してください',
      refNotExist: '紹介者が存在しません',
      selfRef: '自分自身を紹介できません',
      alreadyMember: '既に会員です',
      needBind: '先に紹介関係を設定してください',
      txProcessed: 'この取引は既に処理されています',
      verifyFail: 'チェーン検証失敗',
      onlyMember: '会員のみ可能です',
      noReferrer: '紹介者がいないため感謝カードを送信できません',
      alreadyThanks: '既に感謝カードを送信しています',
      processing: '送信中、ウォレットで確認してください...',
      submitted: '取引を送信しました、確認待ち...'
    },
    ledger: {
      income_direct: '直接報酬',
      income_v9: 'V9報酬',
      income_normal: '互助分配',
      income_thanks: '感謝カード収入',
      withdraw: '出金',
      fee: '手数料',
      withdraw_refund: '出金返金'
    },
    version: 'v2.1.1',
    language: '言語'
  },

  tw: {
    nav: { home: '首頁', my: '我的', share: '分享' },
    hero: { title: '人人幫', sub: '互助社交 · 公平分配 · 全球互聯' },
    intro: {
      title: '平台簡介',
      text: '人人幫起始於2019年，2026年推出全新互助模式。透過有償捐助與制度公平分配，幫助更多人減輕壓力，獲得美好生活。',
      f1: '無區域限制，全球同步',
      f2: '制度公開，分配透明',
      f3: '平台不賺錢，全額分配'
    },
    rules: {
      title: '互助卡分配規則',
      a: '直推人獲得',
      b: '向上最多4個V9會員，各',
      c: '剩餘金額向上分配給普通會員，各'
    },
    v9: {
      title: 'V9會員條件',
      c1: '直推會員 ≥ 3人',
      c2: '團隊總人數 > 80人',
      c3: '送出感恩卡（300U）給直推人'
    },
    action: {
      connect: '連接錢包',
      buyCard: '購買互助卡（{n}U）成為會員',
      buyCardHint: '購買後即可生成專屬分享連結',
      genLink: '生成分享連結',
      enterMy: '進入我的後台'
    },
    my: {
      balance: '可提現餘額',
      withdraw: '提現',
      editProfile: '編輯資料',
      referrer: '推薦人',
      noReferrer: '無（鏈頭）',
      directCount: '直推人數',
      teamCount: '團隊人數（9層）',
      people: '人',
      goal: '我的業績目標',
      v9Progress: 'V9升級進度',
      directGoal: '直推會員 ≥ 3人',
      teamGoal: '團隊總人數 > 80人',
      thanksGoal: '送出感恩卡（300U）',
      done: '已完成',
      pending: '未完成',
      sendThanks: '送出感恩卡（300U）',
      isV9: '您已是V9會員',
      myTeam: '我的團隊（九層可見）',
      level: '第 {n} 層',
      members: '{n} 人',
      noTeam: '暫無團隊成員',
      ledger: '資金流水',
      noLedger: '暫無流水',
      notMember: '購買互助卡成為會員後即可生成分享連結',
      connectFirst: '請先連接錢包'
    },
    share: {
      needMember: '購買互助卡成為會員後即可生成分享連結',
      buyCard: '購買互助卡',
      goalLabel: '我的業績目標 {n} U',
      copyLink: '複製分享連結',
      copied: '連結已複製',
      desc: '好友透過你的連結在TP錢包中打開並連接錢包，即可綁定推薦關係。好友購買互助卡後，你將獲得直推獎勵20U，並有機會獲得V9獎勵40U。'
    },
    profile: {
      title: '編輯資料',
      nickname: '暱稱',
      nicknamePh: '輸入暱稱',
      avatar: '頭像',
      phone: '手機號碼（選填）',
      phonePh: '輸入手機號碼',
      goal: '我的業績目標（U）',
      cancel: '取消',
      save: '保存',
      saved: '資料已保存'
    },
    toast: {
      connected: '錢包已連接',
      connectFail: '連接失敗',
      refDetected: '檢測到推薦連結，連接錢包即可綁定推薦關係',
      bound: '推薦關係已綁定',
      buySuccess: '購卡成功！已成為會員',
      buyFail: '失敗',
      thanksSuccess: '感恩卡已送出！',
      thanksUpgraded: '感恩卡已送出，恭喜升級V9！',
      withdrawSuccess: '提現申請已提交',
      insufficient: '錢包餘額不足，請確認有足夠的USDT',
      rejected: '已取消轉賬',
      networkError: '網絡錯誤，請重試',
      transferFail: '轉賬失敗，請檢查錢包餘額',
      balanceZero: '餘額為0',
      invalidAmount: '金額無效',
      balanceNotEnough: '餘額不足',
      noRef: '請透過推薦人分享連結註冊',
      refNotExist: '推薦人不存在',
      selfRef: '不能自己推薦自己',
      alreadyMember: '已是會員',
      needBind: '請先綁定推薦關係',
      txProcessed: '該交易已處理',
      verifyFail: '鏈上轉賬驗證失敗',
      onlyMember: '僅會員可操作',
      noReferrer: '沒有推薦人，無法送感恩卡',
      alreadyThanks: '已送過感恩卡',
      processing: '正在發起轉賬，請在錢包中確認...',
      submitted: '交易已提交，等待鏈上確認...'
    },
    ledger: {
      income_direct: '直推獎勵',
      income_v9: 'V9獎勵',
      income_normal: '互助分配',
      income_thanks: '感恩卡收入',
      withdraw: '提現',
      fee: '手續費',
      withdraw_refund: '提現退回'
    },
    version: 'v2.1.1',
    language: '語言'
  },

  cn: {
    nav: { home: '首页', my: '我的', share: '分享' },
    hero: { title: '人人帮', sub: '互助社交 · 公平分配 · 全球互联' },
    intro: {
      title: '平台简介',
      text: '人人帮起始于2019年，2026年推出全新互助模式。通过有偿捐助与制度公平分配，帮助更多人减轻压力，获得美好生活。',
      f1: '无区域限制，全球同步',
      f2: '制度公开，分配透明',
      f3: '平台不赚钱，全额分配'
    },
    rules: {
      title: '互助卡分配规则',
      a: '直推人获得',
      b: '向上最多4个V9会员，各',
      c: '剩余金额向上分配给普通会员，各'
    },
    v9: {
      title: 'V9会员条件',
      c1: '直推会员 ≥ 3人',
      c2: '团队总人数 > 80人',
      c3: '送出感恩卡（300U）给直推人'
    },
    action: {
      connect: '连接钱包',
      buyCard: '购买互助卡（{n}U）成为会员',
      buyCardHint: '购买后即可生成专属分享链接',
      genLink: '生成分享链接',
      enterMy: '进入我的后台'
    },
    my: {
      balance: '可提现余额',
      withdraw: '提现',
      editProfile: '编辑资料',
      referrer: '推荐人',
      noReferrer: '无（链头）',
      directCount: '直推人数',
      teamCount: '团队人数（9层）',
      people: '人',
      goal: '我的业绩目标',
      v9Progress: 'V9升级进度',
      directGoal: '直推会员 ≥ 3人',
      teamGoal: '团队总人数 > 80人',
      thanksGoal: '送出感恩卡（300U）',
      done: '已完成',
      pending: '未完成',
      sendThanks: '送出感恩卡（300U）',
      isV9: '您已是V9会员',
      myTeam: '我的团队（九层可见）',
      level: '第 {n} 层',
      members: '{n} 人',
      noTeam: '暂无团队成员',
      ledger: '资金流水',
      noLedger: '暂无流水',
      notMember: '购买互助卡成为会员后即可生成分享链接',
      connectFirst: '请先连接钱包'
    },
    share: {
      needMember: '购买互助卡成为会员后即可生成分享链接',
      buyCard: '购买互助卡',
      goalLabel: '我的业绩目标 {n} U',
      copyLink: '复制分享链接',
      copied: '链接已复制',
      desc: '好友通过你的链接在TP钱包中打开并连接钱包，即可绑定推荐关系。好友购买互助卡后，你将获得直推奖励20U，并有机会获得V9奖励40U。'
    },
    profile: {
      title: '编辑资料',
      nickname: '昵称',
      nicknamePh: '输入昵称',
      avatar: '头像',
      phone: '手机号码（选填）',
      phonePh: '输入手机号码',
      goal: '我的业绩目标（U）',
      cancel: '取消',
      save: '保存',
      saved: '资料已保存'
    },
    toast: {
      connected: '钱包已连接',
      connectFail: '连接失败',
      refDetected: '检测到推荐链接，连接钱包即可绑定推荐关系',
      bound: '推荐关系已绑定',
      buySuccess: '购卡成功！已成为会员',
      buyFail: '失败',
      thanksSuccess: '感恩卡已送出！',
      thanksUpgraded: '感恩卡已送出，恭喜升级V9！',
      withdrawSuccess: '提现申请已提交',
      insufficient: '钱包余额不足，请确认有足够的USDT',
      rejected: '已取消转账',
      networkError: '网络错误，请重试',
      transferFail: '转账失败，请检查钱包余额',
      balanceZero: '余额为0',
      invalidAmount: '金额无效',
      balanceNotEnough: '余额不足',
      noRef: '请通过推荐人分享链接注册',
      refNotExist: '推荐人不存在',
      selfRef: '不能自己推荐自己',
      alreadyMember: '已是会员',
      needBind: '请先绑定推荐关系',
      txProcessed: '该交易已处理',
      verifyFail: '链上转账验证失败',
      onlyMember: '仅会员可操作',
      noReferrer: '没有推荐人，无法送感恩卡',
      alreadyThanks: '已送过感恩卡',
      processing: '正在发起转账，请在钱包中确认...',
      submitted: '交易已提交，等待链上确认...'
    },
    ledger: {
      income_direct: '直推奖励',
      income_v9: 'V9奖励',
      income_normal: '互助分配',
      income_thanks: '感恩卡收入',
      withdraw: '提现',
      fee: '手续费',
      withdraw_refund: '提现退回'
    },
    version: 'v2.1.1',
    language: '语言'
  }
};

// 语言顺序：英文、韩文、日文、繁体中文、简体中文
const LANG_LIST = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
  { code: 'tw', label: '繁體中文' },
  { code: 'cn', label: '简体中文' }
];

let currentLang = localStorage.getItem('rrb_lang') || 'cn';

function t(key) {
  const keys = key.split('.');
  let val = I18N[currentLang];
  for (const k of keys) {
    if (val && val[k] !== undefined) val = val[k];
    else return key;
  }
  return val;
}

function setLang(code) {
  currentLang = code;
  localStorage.setItem('rrb_lang', code);
  location.reload();
}
