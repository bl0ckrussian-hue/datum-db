// 3단계에서 복사한 Google Apps Script 웹 앱 URL을 아래에 붙여넣습니다.
const GAS_WEB_APP_URL = '여기에_구글_앱스_스크립트_웹앱_URL_입력';

// 탭 전환 함수 (반응형 단일 페이지 전환)
function switchTab(tabName) {
  ['crm', 'order', 'register', 'as'].forEach(t => {
    document.getElementById('tab-' + t).classList.add('hidden');
  });
  document.getElementById('tab-' + tabName).classList.remove('hidden');
}

// DB 구매금액 자동 계산기
function calcPrice() {
  const typeSelect = document.getElementById('ord-type');
  const unitPrice = Number(typeSelect.options[typeSelect.selectedIndex].dataset.price);
  const qty = Number(document.getElementById('ord-qty').value);
  const total = unitPrice * qty;
  document.getElementById('ord-total-price').innerText = total.toLocaleString() + '원';
}

// [별도엔진] 실시간 배분 현황 롤링 티커 (커넥트앤/모홈 벤치마킹)
const tickerMessages = [
  "[서울/강남] 보장분석 퍼미션 DB 5건 자동배분 완료 (방금 전)",
  "[경기/수원] 프리미엄 대면약속 DB 10건 신청 접수 (1분 전)",
  "[부산/해운대] 보장분석 퍼미션 DB 10건 자동배분 완료 (3분 전)",
  "[대전/충청] 법인/CEO 특화 DB 5건 자동배분 완료 (5분 전)"
];
let tickerIdx = 0;
setInterval(() => {
  tickerIdx = (tickerIdx + 1) % tickerMessages.length;
  document.getElementById('live-ticker').innerText = tickerMessages[tickerIdx];
}, 3500);

// 1. 회원가입 요청 (전용 구글 드라이브 시트 생성)
async function submitRegister(e) {
  e.preventDefault();
  const payload = {
    action: 'REGISTER',
    name: document.getElementById('reg-name').value,
    phone: document.getElementById('reg-phone').value,
    company: document.getElementById('reg-company').value,
    region: document.getElementById('reg-region').value,
    password: document.getElementById('reg-password').value
  };

  const res = await fetch(GAS_WEB_APP_URL, { method: 'POST', body: JSON.stringify(payload) });
  const result = await res.json();
  if (result.status === 'success') {
    alert(`가입 완료!\n발급된 회원코드: ${result.memberId}\n(이 코드를 꼭 기억해주세요)`);
    switchTab('crm');
  } else {
    alert('오류: ' + result.message);
  }
}

// 2. DB 구매신청 요청
async function submitOrder(e) {
  e.preventDefault();
  const typeSelect = document.getElementById('ord-type');
  const unitPrice = Number(typeSelect.options[typeSelect.selectedIndex].dataset.price);
  const qty = Number(document.getElementById('ord-qty').value);

  const payload = {
    action: 'ORDER_DB',
    memberId: document.getElementById('ord-memberId').value,
    name: document.getElementById('ord-name').value,
    dbType: typeSelect.value,
    region: document.getElementById('ord-region').value,
    quantity: qty,
    price: unitPrice * qty
  };

  const res = await fetch(GAS_WEB_APP_URL, { method: 'POST', body: JSON.stringify(payload) });
  const result = await res.json();
  if (result.status === 'success') {
    alert(`DB 구매신청이 완료되었습니다. (주문번호: ${result.orderId})`);
    switchTab('crm');
  }
}

// 3. 내 배분 DB 조회 (고객정보관리)
async function loadMyDB() {
  const memberId = document.getElementById('crm-memberId').value;
  const password = document.getElementById('crm-password').value;
  if (!memberId || !password) return alert('회원코드와 비밀번호를 입력하세요.');

  const tbody = document.getElementById('crm-table-body');
  tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center">구글 시트에서 데이터를 불러오는 중입니다...</td></tr>`;

  const res = await fetch(GAS_WEB_APP_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'GET_MY_DB', memberId, password })
  });
  const result = await res.json();

  if (result.status !== 'success') {
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-red-500">${result.message}</td></tr>`;
    return;
  }

  document.getElementById('stat-remain').innerText = `${result.remainQty} 건`;
  document.getElementById('stat-total').innerText = `${result.data.length} 건`;
  const newCount = result.data.filter(r => r[7] === '신규배분').length;
  document.getElementById('stat-new').innerText = `${newCount} 건`;

  if (result.data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">아직 배분된 DB가 없습니다.</td></tr>`;
    return;
  }

  tbody.innerHTML = result.data.map(row => `
    <tr class="hover:bg-slate-50">
      <td class="py-3 px-3 text-xs text-slate-500">${new Date(row[0]).toLocaleDateString()}</td>
      <td class="py-3 px-3 font-bold">${row[2]}</td>
      <td class="py-3 px-3"><a href="tel:${row[3]}" class="text-blue-600 font-semibold underline">${row[3]}</a></td>
      <td class="py-3 px-3">${row[4]} / ${row[5]}세</td>
      <td class="py-3 px-3 text-xs">${row[6]}</td>
      <td class="py-3 px-3"><span class="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold">${row[7]}</span></td>
      <td class="py-3 px-3 text-xs text-slate-600">${row[8] || '-'}</td>
    </tr>
  `).join('');
}
