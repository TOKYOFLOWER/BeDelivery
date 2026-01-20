/** ## config.js
 * 花定期配送管理システム - 設定
 */

// GAS Web AppのURL（デプロイ後に設定）
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbzgmm68hvNPJ_dLadw20IOQy3vCQ0qUzolZ-kzyxLazxnyXeFU3Xlq8ShDa2YxnDl1y/exec';
// ★デプロイ後、GASのWeb App URLに変更してください★

// ステータス定義
const STATUS = {
  NEW: '未処理',
  PROCESSING: '処理中',
  SHIPPED: '出荷済み',
  CANCELLED: 'キャンセル'
};

// ステータスの色定義
const STATUS_COLORS = {
  '未処理': { bg: '#fff3cd', text: '#856404', border: '#ffc107' },
  '処理中': { bg: '#cce5ff', text: '#004085', border: '#007bff' },
  '出荷済み': { bg: '#d4edda', text: '#155724', border: '#28a745' },
  'キャンセル': { bg: '#f8d7da', text: '#721c24', border: '#dc3545' }
};

// デフォルトの受注ルート
const DEFAULT_ORDER_ROUTE = 'BD';

// 配送時間帯オプション
const DELIVERY_TIME_OPTIONS = [
  { value: '', label: '指定なし' },
  { value: '午前中', label: '午前中' },
  { value: '14時-16時', label: '14時-16時' },
  { value: '16時-18時', label: '16時-18時' },
  { value: '18時-20時', label: '18時-20時' },
  { value: '19時-21時', label: '19時-21時' }
];

// 決済方法オプション
const PAYMENT_METHOD_OPTIONS = [
  { value: '店頭払い', label: '店頭払い' },
  { value: 'クレジットカード', label: 'クレジットカード' },
  { value: '銀行振込', label: '銀行振込' },
  { value: '代金引換', label: '代金引換' },
  { value: '請求書払い', label: '請求書払い' }
];
