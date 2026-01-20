/** ## app.js
 * 花定期配送管理システム - フロントエンド
 */

// グローバル変数
let currentOrders = [];
let editingOrderId = null;

// 初期化
window.onload = function() {
  loadOrders();
  loadStatistics();
  
  // イベントリスナー
  document.getElementById('refreshBtn').addEventListener('click', () => {
    loadOrders();
    loadStatistics();
  });
  document.getElementById('downloadBtn').addEventListener('click', downloadOrders);
  document.getElementById('newOrderBtn').addEventListener('click', openNewOrderModal);
  document.getElementById('applyFilterBtn').addEventListener('click', applyFilters);
  document.getElementById('orderForm').addEventListener('submit', handleFormSubmit);
  
  // Enterキーでフィルタ適用
  document.getElementById('searchText').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') applyFilters();
  });
};

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
        'Content-Type': 'text/plain',
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
    const result = await callGasApi('getOrders', filters);
    displayOrders(result.data);
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
 * 注文を取得
 */
async function getOrder(orderId) {
  showLoading();
  
  try {
    const result = await callGasApi('getOrder', { orderId: orderId });
    return result.data;
  } catch (error) {
    showError(error);
    return null;
  }
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
  
  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px;">データがありません</td></tr>';
    return;
  }
  
  tbody.innerHTML = orders.map(order => `
    <tr>
      <td>${escapeHtml(order.id)}</td>
      <td><span class="status-badge status-${getStatusClass(order.status)}">${escapeHtml(order.status)}</span></td>
      <td>${escapeHtml(order.orderNumber)}</td>
      <td>${formatDate(order.orderDate)}</td>
      <td>${formatDate(order.deliveryDate) || '-'}</td>
      <td>${escapeHtml(order.customerLastName)} ${escapeHtml(order.customerFirstName)}</td>
      <td>${escapeHtml(order.recipientLastName)} ${escapeHtml(order.recipientFirstName)}</td>
      <td>${escapeHtml(order.productName)}</td>
      <td>${escapeHtml(order.quantity)}</td>
      <td class="action-buttons">
        <button class="btn-icon" onclick="editOrder('${order.id}')" title="編集">✏️</button>
        <button class="btn-icon" onclick="deleteOrder('${order.id}')" title="削除">🗑️</button>
      </td>
    </tr>
  `).join('');
}

/**
 * 統計情報を表示
 */
function displayStatistics(stats) {
  document.getElementById('statTotal').textContent = stats.total;
  document.getElementById('statNew').textContent = stats.new;
  document.getElementById('statProcessing').textContent = stats.processing;
  document.getElementById('statShipped').textContent = stats.shipped;
  document.getElementById('statCancelled').textContent = stats.cancelled;
}

// ============================================================================
// モーダル・フォーム処理
// ============================================================================

/**
 * 新規注文モーダルを開く
 */
function openNewOrderModal() {
  editingOrderId = null;
  document.getElementById('modalTitle').textContent = '新規注文登録';
  document.getElementById('orderForm').reset();
  document.getElementById('orderId').value = '';
  document.getElementById('orderModal').style.display = 'block';
}

/**
 * 編集モーダルを開く
 */
async function editOrder(orderId) {
  editingOrderId = orderId;
  document.getElementById('modalTitle').textContent = '注文編集';
  
  const order = await getOrder(orderId);
  if (order) {
    fillFormWithOrder(order);
    document.getElementById('orderModal').style.display = 'block';
  }
}

/**
 * フォームにデータを埋める
 */
function fillFormWithOrder(order) {
  hideLoading();
  
  document.getElementById('orderId').value = order.id;
  document.getElementById('orderNumber').value = order.orderNumber || '';
  document.getElementById('orderDate').value = formatDateForInput(order.orderDate);
  document.getElementById('deliveryDate').value = formatDateForInput(order.deliveryDate);
  
  document.getElementById('customerLastName').value = order.customerLastName || '';
  document.getElementById('customerFirstName').value = order.customerFirstName || '';
  document.getElementById('customerLastNameKana').value = order.customerLastNameKana || '';
  document.getElementById('customerFirstNameKana').value = order.customerFirstNameKana || '';
  document.getElementById('customerZipCode').value = order.customerZipCode || '';
  document.getElementById('customerPrefecture').value = order.customerPrefecture || '';
  document.getElementById('customerCity').value = order.customerCity || '';
  document.getElementById('customerAddress').value = order.customerAddress || '';
  document.getElementById('customerBuilding').value = order.customerBuilding || '';
  document.getElementById('customerPhone').value = order.customerPhone || '';
  document.getElementById('customerEmail').value = order.customerEmail || '';
  
  document.getElementById('recipientLastName').value = order.recipientLastName || '';
  document.getElementById('recipientFirstName').value = order.recipientFirstName || '';
  document.getElementById('recipientLastNameKana').value = order.recipientLastNameKana || '';
  document.getElementById('recipientFirstNameKana').value = order.recipientFirstNameKana || '';
  document.getElementById('recipientZipCode').value = order.recipientZipCode || '';
  document.getElementById('recipientPrefecture').value = order.recipientPrefecture || '';
  document.getElementById('recipientCity').value = order.recipientCity || '';
  document.getElementById('recipientAddress').value = order.recipientAddress || '';
  document.getElementById('recipientBuilding').value = order.recipientBuilding || '';
  document.getElementById('recipientPhone').value = order.recipientPhone || '';
  document.getElementById('deliveryTime').value = order.deliveryTime || '';
  
  document.getElementById('productCode').value = order.productCode || '';
  document.getElementById('productName').value = order.productName || '';
  document.getElementById('quantity').value = order.quantity || 1;
  document.getElementById('unitPrice').value = order.unitPrice || '';
  document.getElementById('remarks').value = order.remarks || '';
}

/**
 * フォーム送信処理
 */
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const orderData = {
    orderNumber: document.getElementById('orderNumber').value,
    orderDate: document.getElementById('orderDate').value,
    deliveryDate: document.getElementById('deliveryDate').value,
    customerLastName: document.getElementById('customerLastName').value,
    customerFirstName: document.getElementById('customerFirstName').value,
    customerLastNameKana: document.getElementById('customerLastNameKana').value,
    customerFirstNameKana: document.getElementById('customerFirstNameKana').value,
    customerZipCode: document.getElementById('customerZipCode').value,
    customerPrefecture: document.getElementById('customerPrefecture').value,
    customerCity: document.getElementById('customerCity').value,
    customerAddress: document.getElementById('customerAddress').value,
    customerBuilding: document.getElementById('customerBuilding').value,
    customerPhone: document.getElementById('customerPhone').value,
    customerEmail: document.getElementById('customerEmail').value,
    recipientLastName: document.getElementById('recipientLastName').value,
    recipientFirstName: document.getElementById('recipientFirstName').value,
    recipientLastNameKana: document.getElementById('recipientLastNameKana').value,
    recipientFirstNameKana: document.getElementById('recipientFirstNameKana').value,
    recipientZipCode: document.getElementById('recipientZipCode').value,
    recipientPrefecture: document.getElementById('recipientPrefecture').value,
    recipientCity: document.getElementById('recipientCity').value,
    recipientAddress: document.getElementById('recipientAddress').value,
    recipientBuilding: document.getElementById('recipientBuilding').value,
    recipientPhone: document.getElementById('recipientPhone').value,
    deliveryTime: document.getElementById('deliveryTime').value,
    productCode: document.getElementById('productCode').value,
    productName: document.getElementById('productName').value,
    quantity: parseInt(document.getElementById('quantity').value),
    unitPrice: parseInt(document.getElementById('unitPrice').value),
    remarks: document.getElementById('remarks').value
  };
  
  showLoading();
  
  try {
    if (editingOrderId) {
      // 更新
      await callGasApi('updateOrder', { 
        orderId: editingOrderId, 
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
 * 注文を削除
 */
async function deleteOrder(orderId) {
  if (!confirm('この注文を削除してもよろしいですか?')) {
    return;
  }
  
  showLoading();
  
  try {
    await callGasApi('deleteOrder', { orderId: orderId });
    showMessage('注文を削除しました', 'success');
    loadOrders();
    loadStatistics();
  } catch (error) {
    showError(error);
  }
}

/**
 * ダウンロード
 */
async function downloadOrders() {
  showLoading();
  
  try {
    const result = await callGasApi('downloadSukenekoFormat');
    const data = result.data;
    
    // Shift-JISに変換してダウンロード
    const blob = new Blob([data.content], { type: 'text/csv;charset=shift_jis' });
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
  const filters = {
    status: document.getElementById('statusFilter').value,
    searchText: document.getElementById('searchText').value
  };
  
  loadOrders(filters);
}

/**
 * 注文者情報をお届け先にコピー
 */
function copyCustomerInfo() {
  document.getElementById('recipientLastName').value = document.getElementById('customerLastName').value;
  document.getElementById('recipientFirstName').value = document.getElementById('customerFirstName').value;
  document.getElementById('recipientLastNameKana').value = document.getElementById('customerLastNameKana').value;
  document.getElementById('recipientFirstNameKana').value = document.getElementById('customerFirstNameKana').value;
  document.getElementById('recipientZipCode').value = document.getElementById('customerZipCode').value;
  document.getElementById('recipientPrefecture').value = document.getElementById('customerPrefecture').value;
  document.getElementById('recipientCity').value = document.getElementById('customerCity').value;
  document.getElementById('recipientAddress').value = document.getElementById('customerAddress').value;
  document.getElementById('recipientBuilding').value = document.getElementById('customerBuilding').value;
  document.getElementById('recipientPhone').value = document.getElementById('customerPhone').value;
}

/**
 * モーダルを閉じる
 */
function closeModal() {
  document.getElementById('orderModal').style.display = 'none';
  document.getElementById('orderForm').reset();
  editingOrderId = null;
}

// ============================================================================
// UI制御関数
// ============================================================================

/**
 * ローディング表示
 */
function showLoading() {
  document.getElementById('loading').style.display = 'flex';
}

/**
 * ローディング非表示
 */
function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

/**
 * メッセージ表示
 */
function showMessage(text, type = 'info') {
  const messageEl = document.getElementById('message');
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
  const date = new Date(dateStr);
  return date.toLocaleDateString('ja-JP');
}

/**
 * 日付をinput用にフォーマット
 */
function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
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
  return map[status] || '';
}

// モーダル外クリックで閉じる
window.onclick = function(event) {
  const modal = document.getElementById('orderModal');
  if (event.target === modal) {
    closeModal();
  }
};
