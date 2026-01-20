/**
 * 花定期配送管理システム - 設定
 * 
 * GAS APIのURLを設定してください
 */

// GAS Web AppのURL（デプロイ後に設定）
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbzgmm68hvNPJ_dLadw20IOQy3vCQ0qUzolZ-kzyxLazxnyXeFU3Xlq8ShDa2YxnDl1y/exec';

// ★デプロイ後、GASのWeb App URLに変更してください★
// 例: 'https://script.google.com/macros/s/AKfycbxxxxx.../exec'

// ステータス定義
const STATUS = {
  NEW: '未処理',
  PROCESSING: '処理中',
  SHIPPED: '出荷済み',
  CANCELLED: 'キャンセル'
};
