/**
 * 花定期配送管理システム - 設定
 * 
 * GAS APIのURLを設定してください
 */

// GAS Web AppのURL（デプロイ後に設定）
const GAS_API_URL = 'YOUR_GAS_API_URL_HERE';

// ★デプロイ後、GASのWeb App URLに変更してください★
// 例: 'https://script.google.com/macros/s/AKfycbxxxxx.../exec'

// ステータス定義
const STATUS = {
  NEW: '未処理',
  PROCESSING: '処理中',
  SHIPPED: '出荷済み',
  CANCELLED: 'キャンセル'
};
