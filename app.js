/** ## app.js
 * 花定期配送管理システム - フロントエンド
 */

// グローバル変数
let currentOrders = [];
let editingOrderKey = null;
let isAdminMode = false;

// 初期化
window.onload = function() {
  // 管理者モード判定
  isAdminMode = window.location.pathname.includes('admin');
  
  // 初期データ読み込み
  loadOrders();
  loadStatistics();
  
  // イベントリスナー設定
  setupEventListeners();
};

/**
 * イベントリスナーを設定
 */
function setupEventListeners() {
  // 更新ボタン
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadOrders();
      loadStatistics();
    });
  }
  
  // 新規注文ボタン
  const newOrderBtn = document.getElementById('newOrderBtn');
  if (newOrderBtn) {
    newOrderBtn.addEventListener('click', openNewOrderModal);
  }
  
  // フィルタ適用ボタン
  const applyFilterBtn = document.getElementById('applyFilterBtn');
  if (applyFilterBtn) {
    applyFilterBtn.addEventListener('click', applyFilters);
  }
  
  // 検索テキストでEnterキー
  const searchText = document.getElementById('searchText');
  if (searchText) {
    searchText.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') applyFilters();
    });
  }
  
  // 注文フォーム
  const orderForm = document.getElementById('orderForm');
  if (orderForm) {
    orderForm.addEventListener('submit', handleFormSubmit);
  }
  
  // ダウンロードボタン（管理者のみ）
  const downloadActiveBtn = document.getElementById('downloadActiveBtn');
  if (downloadActiveBtn) {
    downloadActiveBtn.addEventListener('click', () => downloadOrders('active'));
  }
  
  const downloadAllBtn = document.getElementById('downloadAllBtn');
  if (downloadAllBtn) {
    downloadAllBtn.addEventListener('click', () => downloadOrders('all'));
  }
  
  const downloadFilteredBtn = document.getElementById('downloadFilteredBtn');
  if (downloadFilteredBtn) {
    downloadFilteredBtn.addEventListener('click', () => downloadOrders('filtered'));
  }
  
  // 郵便番号自動入力
  setupZipCodeAutoFill();
}

// ============================================================================
// API呼び出し関数
// ============================================================================

/**
 * GAS APIを呼び出す
 */
async function callGasApi(action, data = {}) {
  try {
    const response = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',  // CORSエラー回避
      },
      body: JSON.stringify({
        action: action,
        data: data
      })
    });
    
    if (!response.ok) {
      throw new Error('API呼び出しに失敗しました: ' + response.statusText);
    }
    
    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ============================================================================
// データ取得関数
// ============================================================================

/**
 * 注文一覧を読み込み
 */
async function loadOrders(filters) {
  showLoading();
  
  try {
    const result = await callGasApi('getOrders', filters || getCurrentFilters());
    currentOrders = result.data;
    displayOrders(currentOrders);
  } catch (error) {
    showError(error);
  }
}

/**
 * 統計情報を読み込み
 */
async function loadStatistics() {
  try {
    const result = await callGasApi('getStatistics');
    displayStatistics(result.data);
  } catch (error) {
    console.error('統計情報読み込みエラー:', error);
  }
}

/**
 * 現在のフィルタ条件を取得
 */
function getCurrentFilters() {
  const filters = {};
  
  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter && statusFilter.value) {
    filters.status = statusFilter.value;
  }
  
  const searchText = document.getElementById('searchText');
  if (searchText && searchText.value) {
    filters.searchText = searchText.value;
  }
  
  const fromDate = document.getElementById('fromDate');
  if (fromDate && fromDate.value) {
    filters.fromDate = fromDate.value;
  }
  
  const toDate = document.getElementById('toDate');
  if (toDate && toDate.value) {
    filters.toDate = toDate.value;
  }
  
  return filters;
}

// ============================================================================
// 表示関数
// ============================================================================

/**
 * 注文一覧を表示
 */
function displayOrders(orders) {
  hideLoading();
  currentOrders = orders;
  
  const tbody = document.getElementById('orderTableBody');
  if (!tbody) return;
  
  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="empty-message">データがありません</td></tr>';
    return;
  }
  
  tbody.innerHTML = orders.map(order => {
    const statusClass = getStatusClass(order.status);
    const statusColor = STATUS_COLORS[order.status] || STATUS_COLORS['未処理'];
    
    return `
      <tr>
        <td class="col-status">
          <span class="status-badge status-${statusClass}" 
                style="background-color: ${statusColor.bg}; color: ${statusColor.text}; border-color: ${statusColor.border};">
            ${escapeHtml(order.status || '未処理')}
          </span>
        </td>
        <td class="col-order-number">${escapeHtml(order.orderNumber)}</td>
        <td class="col-date">${formatDate(order.orderDate)}</td>
        <td class="col-date">${formatDate(order.deliveryDate) || '-'}</td>
        <td class="col-name">${escapeHtml(order.customerLastName || '')} ${escapeHtml(order.customerFirstName || '')}</td>
        <td class="col-name">${escapeHtml(order.recipientLastName || '')} ${escapeHtml(order.recipientFirstName || '')}</td>
        <td class="col-product">${escapeHtml(order.productName || '')}</td>
        <td class="col-quantity">${escapeHtml(order.quantity || '')}</td>
        <td class="col-price">¥${(order.unitPrice || 0).toLocaleString()}</td>
        <td class="col-actions">
          <div class="action-buttons">
            <button class="btn-icon btn-edit" onclick="editOrder('${order.orderKey}')" title="編集">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            ${isAdminMode ? `
            <button class="btn-icon btn-status" onclick="openStatusModal('${order.orderKey}')" title="ステータス変更">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
            </button>
            <button class="btn-icon btn-delete" onclick="deleteOrder('${order.orderKey}')" title="削除">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * 統計情報を表示
 */
function displayStatistics(stats) {
  const elements = {
    statTotal: stats.total,
    statNew: stats.new,
    statProcessing: stats.processing,
    statShipped: stats.shipped,
    statCancelled: stats.cancelled
  };
  
  Object.entries(elements).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });
}

// ============================================================================
// モーダル・フォーム処理
// ============================================================================

/**
 * 新規注文モーダルを開く
 */
function openNewOrderModal() {
  editingOrderKey = null;
  
  const modalTitle = document.getElementById('modalTitle');
  if (modalTitle) modalTitle.textContent = '新規注文登録';
  
  const orderForm = document.getElementById('orderForm');
  if (orderForm) orderForm.reset();
  
  // デフォルト値設定
  const orderDate = document.getElementById('orderDate');
  if (orderDate) orderDate.value = new Date().toISOString().split('T')[0];
  
  const orderModal = document.getElementById('orderModal');
  if (orderModal) orderModal.style.display = 'block';
}

/**
 * 編集モーダルを開く
 */
async function editOrder(orderKey) {
  editingOrderKey = orderKey;
  
  const modalTitle = document.getElementById('modalTitle');
  if (modalTitle) modalTitle.textContent = '注文編集';
  
  showLoading();
  
  try {
    const result = await callGasApi('getOrder', { orderKey: orderKey });
    fillFormWithOrder(result.data);
    
    const orderModal = document.getElementById('orderModal');
    if (orderModal) orderModal.style.display = 'block';
  } catch (error) {
    showError(error);
  }
}

/**
 * フォームにデータを埋める
 */
function fillFormWithOrder(order) {
  hideLoading();
  
  const fields = [
    'orderNumber', 'orderDate', 'deliveryDate',
    'customerLastName', 'customerFirstName', 'customerLastNameKana', 'customerFirstNameKana',
    'customerZipCode', 'customerPrefecture', 'customerCity', 'customerAddress', 'customerBuilding',
    'customerPhone', 'customerEmail', 'customerCompany',
    'recipientLastName', 'recipientFirstName', 'recipientLastNameKana', 'recipientFirstNameKana',
    'recipientZipCode', 'recipientPrefecture', 'recipientCity', 'recipientAddress', 'recipientBuilding',
    'recipientPhone', 'deliveryTime',
    'productCode', 'productName', 'quantity', 'unitPrice',
    'orderRemarks', 'paymentMethod'
  ];
  
  fields.forEach(field => {
    const el = document.getElementById(field);
    if (el) {
      let value = order[field] || '';
      
      // 日付の場合はフォーマット
      if ((field === 'orderDate' || field === 'deliveryDate') && value) {
        value = formatDateForInput(value);
      }
      
      el.value = value;
    }
  });
}

/**
 * フォーム送信処理
 */
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const orderData = collectFormData();
  
  showLoading();
  
  try {
    if (editingOrderKey) {
      // 更新
      await callGasApi('updateOrder', { 
        orderKey: editingOrderKey, 
        orderData: orderData 
      });
      showMessage('注文を更新しました', 'success');
    } else {
      // 新規作成
      await callGasApi('createOrder', { orderData: orderData });
      showMessage('注文を登録しました', 'success');
    }
    
    closeModal();
    loadOrders();
    loadStatistics();
  } catch (error) {
    showError(error);
  }
}

/**
 * フォームデータを収集
 */
function collectFormData() {
  return {
    orderDate: document.getElementById('orderDate')?.value || '',
    deliveryDate: document.getElementById('deliveryDate')?.value || '',
    customerLastName: document.getElementById('customerLastName')?.value || '',
    customerFirstName: document.getElementById('customerFirstName')?.value || '',
    customerLastNameKana: document.getElementById('customerLastNameKana')?.value || '',
    customerFirstNameKana: document.getElementById('customerFirstNameKana')?.value || '',
    customerZipCode: document.getElementById('customerZipCode')?.value || '',
    customerPrefecture: document.getElementById('customerPrefecture')?.value || '',
    customerCity: document.getElementById('customerCity')?.value || '',
    customerAddress: document.getElementById('customerAddress')?.value || '',
    customerBuilding: document.getElementById('customerBuilding')?.value || '',
    customerPhone: document.getElementById('customerPhone')?.value || '',
    customerEmail: document.getElementById('customerEmail')?.value || '',
    customerCompany: document.getElementById('customerCompany')?.value || '',
    recipientLastName: document.getElementById('recipientLastName')?.value || '',
    recipientFirstName: document.getElementById('recipientFirstName')?.value || '',
    recipientLastNameKana: document.getElementById('recipientLastNameKana')?.value || '',
    recipientFirstNameKana: document.getElementById('recipientFirstNameKana')?.value || '',
    recipientZipCode: document.getElementById('recipientZipCode')?.value || '',
    recipientPrefecture: document.getElementById('recipientPrefecture')?.value || '',
    recipientCity: document.getElementById('recipientCity')?.value || '',
    recipientAddress: document.getElementById('recipientAddress')?.value || '',
    recipientBuilding: document.getElementById('recipientBuilding')?.value || '',
    recipientPhone: document.getElementById('recipientPhone')?.value || '',
    deliveryTime: document.getElementById('deliveryTime')?.value || '',
    productCode: document.getElementById('productCode')?.value || '',
    productName: document.getElementById('productName')?.value || '',
    quantity: parseInt(document.getElementById('quantity')?.value) || 1,
    unitPrice: parseInt(document.getElementById('unitPrice')?.value) || 0,
    orderRemarks: document.getElementById('orderRemarks')?.value || '',
    paymentMethod: document.getElementById('paymentMethod')?.value || '店頭払い'
  };
}

/**
 * ステータス変更モーダルを開く（管理者のみ）
 */
async function openStatusModal(orderKey) {
  const order = currentOrders.find(o => o.orderKey === orderKey);
  if (!order) return;
  
  const modal = document.getElementById('statusModal');
  if (!modal) return;
  
  document.getElementById('statusOrderKey').value = orderKey;
  document.getElementById('statusOrderNumber').textContent = order.orderNumber;
  document.getElementById('currentStatus').textContent = order.status || '未処理';
  document.getElementById('newStatus').value = order.status || STATUS.NEW;
  document.getElementById('statusMemo').value = order.statusMemo || '';
  
  modal.style.display = 'block';
}

/**
 * ステータスを更新（管理者のみ）
 */
async function updateStatus() {
  const orderKey = document.getElementById('statusOrderKey').value;
  const newStatus = document.getElementById('newStatus').value;
  const memo = document.getElementById('statusMemo').value;
  
  showLoading();
  
  try {
    await callGasApi('updateStatus', {
      orderKey: orderKey,
      status: newStatus,
      memo: memo
    });
    
    showMessage('ステータスを更新しました', 'success');
    closeStatusModal();
    loadOrders();
    loadStatistics();
  } catch (error) {
    showError(error);
  }
}

/**
 * 注文を削除（管理者のみ）
 */
async function deleteOrder(orderKey) {
  if (!confirm('この注文を削除してもよろしいですか？\nこの操作は取り消せません。')) {
    return;
  }
  
  showLoading();
  
  try {
    await callGasApi('deleteOrder', { orderKey: orderKey });
    showMessage('注文を削除しました', 'success');
    loadOrders();
    loadStatistics();
  } catch (error) {
    showError(error);
  }
}

/**
 * ダウンロード（管理者のみ）
 */
async function downloadOrders(type) {
  showLoading();
  
  try {
    let filters = {};
    
    if (type === 'active') {
      filters.activeOnly = true;
    } else if (type === 'filtered') {
      filters = getCurrentFilters();
    }
    // type === 'all' の場合は空のフィルタ
    
    const result = await callGasApi('downloadSukenekoFormat', { filters: filters });
    const data = result.data;
    
    if (data.orderCount === 0) {
      hideLoading();
      showMessage('ダウンロード対象の注文がありません', 'warning');
      return;
    }
    
    // BOMを追加してUTF-8でダウンロード
    const bom = '\uFEFF';
    const blob = new Blob([bom + data.content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    hideLoading();
    showMessage(`${data.orderCount}件の注文をダウンロードしました`, 'success');
  } catch (error) {
    showError(error);
  }
}

/**
 * フィルタを適用
 */
function applyFilters() {
  loadOrders(getCurrentFilters());
}

/**
 * 注文者情報をお届け先にコピー
 */
function copyCustomerInfo() {
  const fields = [
    ['customerLastName', 'recipientLastName'],
    ['customerFirstName', 'recipientFirstName'],
    ['customerLastNameKana', 'recipientLastNameKana'],
    ['customerFirstNameKana', 'recipientFirstNameKana'],
    ['customerZipCode', 'recipientZipCode'],
    ['customerPrefecture', 'recipientPrefecture'],
    ['customerCity', 'recipientCity'],
    ['customerAddress', 'recipientAddress'],
    ['customerBuilding', 'recipientBuilding'],
    ['customerPhone', 'recipientPhone']
  ];
  
  fields.forEach(([from, to]) => {
    const fromEl = document.getElementById(from);
    const toEl = document.getElementById(to);
    if (fromEl && toEl) {
      toEl.value = fromEl.value;
    }
  });
}

/**
 * モーダルを閉じる
 */
function closeModal() {
  const modal = document.getElementById('orderModal');
  if (modal) modal.style.display = 'none';
  
  const form = document.getElementById('orderForm');
  if (form) form.reset();
  
  editingOrderKey = null;
}

/**
 * ステータスモーダルを閉じる
 */
function closeStatusModal() {
  const modal = document.getElementById('statusModal');
  if (modal) modal.style.display = 'none';
}

// ============================================================================
// 郵便番号自動入力
// ============================================================================

/**
 * 郵便番号から住所を自動入力
 */
function setupZipCodeAutoFill() {
  const zipFields = [
    { zip: 'customerZipCode', pref: 'customerPrefecture', city: 'customerCity', addr: 'customerAddress' },
    { zip: 'recipientZipCode', pref: 'recipientPrefecture', city: 'recipientCity', addr: 'recipientAddress' }
  ];
  
  zipFields.forEach(fields => {
    const zipInput = document.getElementById(fields.zip);
    if (zipInput) {
      zipInput.addEventListener('blur', async () => {
        const zipCode = zipInput.value.replace(/[^0-9]/g, '');
        if (zipCode.length === 7) {
          try {
            const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipCode}`);
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
              const result = data.results[0];
              const prefEl = document.getElementById(fields.pref);
              const cityEl = document.getElementById(fields.city);
              const addrEl = document.getElementById(fields.addr);
              
              if (prefEl) prefEl.value = result.address1;
              if (cityEl) cityEl.value = result.address2;
              if (addrEl && !addrEl.value) addrEl.value = result.address3;
            }
          } catch (error) {
            console.error('郵便番号検索エラー:', error);
          }
        }
      });
    }
  });
}

// ============================================================================
// UI制御関数
// ============================================================================

/**
 * ローディング表示
 */
function showLoading() {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';
}

/**
 * ローディング非表示
 */
function hideLoading() {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
}

/**
 * メッセージ表示
 */
function showMessage(text, type = 'info') {
  const messageEl = document.getElementById('message');
  if (!messageEl) return;
  
  messageEl.textContent = text;
  messageEl.className = 'message message-' + type;
  messageEl.style.display = 'block';
  
  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 5000);
}

/**
 * エラー表示
 */
function showError(error) {
  hideLoading();
  console.error('エラー:', error);
  showMessage('エラーが発生しました: ' + error.message, 'error');
}

// ============================================================================
// ユーティリティ関数
// ============================================================================

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * 日付フォーマット
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('ja-JP');
  } catch {
    return dateStr;
  }
}

/**
 * 日付をinput用にフォーマット
 */
function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

/**
 * ステータスのCSSクラスを取得
 */
function getStatusClass(status) {
  const map = {
    '未処理': 'new',
    '処理中': 'processing',
    '出荷済み': 'shipped',
    'キャンセル': 'cancelled'
  };
  return map[status] || 'new';
}

// モーダル外クリックで閉じる
window.onclick = function(event) {
  const orderModal = document.getElementById('orderModal');
  if (event.target === orderModal) {
    closeModal();
  }
  
  const statusModal = document.getElementById('statusModal');
  if (event.target === statusModal) {
    closeStatusModal();
  }
};
