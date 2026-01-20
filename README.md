# 花定期配送管理システム（GitHub Pages版）

## 🌸 システム概要

依頼主がWebブラウザから注文データを入力・管理し、助ネコ標準フォーマットでダウンロードできるシステムです。

**特徴:**
- ✅ **カスタムドメイン対応**（GitHub Pages）
- ✅ ビジネス用途に最適
- ✅ モダンなUI/UX
- ✅ 助ネコ標準フォーマット出力
- ✅ メール自動通知

## 🏗️ システム構成

```
┌──────────────────────┐
│  GitHub Pages        │ ← カスタムドメイン
│  https://yourdomain  │    (依頼主がアクセス)
│  - index.html        │
│  - style.css         │
│  - app.js            │
│  - config.js         │
└──────────┬───────────┘
           │ fetch API
┌──────────▼───────────┐
│  GAS Web API         │ ← CORS対応
│  (バックエンド)       │
│  - Code_API.gs       │
│  - Config.gs         │
│  - DataManager.gs    │
│  - MailNotifier.gs   │
│  - DownloadHandler.gs│
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│  Google Sheet        │
└──────────────────────┘
```

## 📁 ファイル構成

```
flower-delivery-github/
├── index.html           # メインHTML
├── style.css            # スタイルシート
├── app.js               # フロントエンドロジック
├── config.js            # 設定ファイル（要編集）
├── README.md            # このファイル
├── SETUP.md             # セットアップ手順
└── GAS/                 # Google Apps Script
    ├── Code_API.gs      # APIエントリーポイント
    ├── Config.gs        # GAS設定（要編集）
    ├── DataManager.gs   # データ操作
    ├── MailNotifier.gs  # メール通知
    └── DownloadHandler.gs # ダウンロード処理
```

## 🚀 セットアップ（2つのステップ）

### ステップ1: GAS APIのデプロイ

#### 1-1. スプレッドシート作成

1. Google Driveで新しいスプレッドシートを作成
2. URLから`SHEET_ID`をコピー

#### 1-2. GASプロジェクト作成

1. スプレッドシートで「拡張機能」→「Apps Script」
2. `GAS/`フォルダ内の各ファイルをコピペ:
   - Code_API.gs
   - Config.gs（★SHEET_IDを設定★）
   - DataManager.gs
   - MailNotifier.gs
   - DownloadHandler.gs

#### 1-3. デプロイ

1. 「デプロイ」→「新しいデプロイ」
2. 種類: 「ウェブアプリ」
3. 設定:
   - 次のユーザーとして実行: 「自分」
   - アクセスできるユーザー: 「**全員**」（重要！）
4. デプロイして**URLをコピー**

### ステップ2: GitHub Pagesへデプロイ

#### 2-1. GitHubリポジトリ作成

```bash
# ローカルで初期化
git init
git add .
git commit -m "Initial commit"

# GitHubにプッシュ
git remote add origin https://github.com/YOUR_USERNAME/flower-delivery.git
git push -u origin main
```

#### 2-2. config.js編集

```javascript
const GAS_API_URL = 'YOUR_GAS_API_URL_HERE'; // ★ステップ1-3でコピーしたURLに変更★
```

#### 2-3. GitHub Pagesを有効化

1. GitHubリポジトリの「Settings」→「Pages」
2. Source: `main` ブランチ
3. 「Save」をクリック
4. 数分後、`https://YOUR_USERNAME.github.io/flower-delivery/`でアクセス可能

#### 2-4. カスタムドメイン設定（オプション）

1. GitHubの「Settings」→「Pages」→「Custom domain」
2. ドメイン（例: `orders.yourcompany.com`）を入力
3. DNSで以下を設定:
   ```
   Type: CNAME
   Name: orders
   Value: YOUR_USERNAME.github.io
   ```

## ⚙️ 設定

### config.js（フロントエンド）

```javascript
const GAS_API_URL = 'https://script.google.com/macros/s/xxxxx/exec';
```

### GAS/Config.gs（バックエンド）

```javascript
const SHEET_ID = 'YOUR_SHEET_ID_HERE';
const NOTIFICATION_EMAILS = {
  admin: 'tokyoflowerco.ltd@gmail.com'
};
```

## 🔐 セキュリティ

- GAS APIは「全員」に公開（GitHub Pagesからアクセスするため）
- データはGoogle Sheetに保存（Googleアカウントで保護）
- HTTPS通信（GitHub Pages標準）
- カスタムドメインでSSL証明書自動発行

## 🔄 更新フロー

### フロントエンドの更新

```bash
# コードを編集
vim app.js

# GitHubにプッシュ
git add .
git commit -m "Update: xxxxx"
git push

# GitHub Pagesが自動的に更新される
```

### バックエンド（GAS）の更新

1. GASエディタでコードを編集
2. 「デプロイ」→「デプロイを管理」
3. 既存のデプロイを編集→「新バージョン」
4. 「デプロイ」

## 📱 対応環境

- ✅ PC（Chrome, Firefox, Safari, Edge）
- ✅ スマートフォン（iOS, Android）
- ✅ タブレット

## 🆘 トラブルシューティング

### エラー: 「API呼び出しに失敗しました」

1. `config.js`のGAS_API_URLが正しいか確認
2. GASが「全員」に公開されているか確認
3. ブラウザのコンソール（F12）でエラー確認

### CORS エラー

GASのデプロイ設定で「アクセスできるユーザー: 全員」になっているか確認

### メールが届かない

GAS/Config.gsのメールアドレスを確認

## 📊 機能一覧

- ✅ 注文の新規登録・編集・削除
- ✅ ステータス管理（未処理/処理中/出荷済み/キャンセル）
- ✅ 検索・フィルタ機能
- ✅ 助ネコ標準フォーマットダウンロード
- ✅ メール自動通知（新規・更新時）
- ✅ レスポンシブデザイン

## 📝 助ネコ連携

1. システムで注文データ管理
2. 「ダウンロード」ボタンでCSV取得
3. 助ネコに取り込み
4. クロネコ送状発行・出荷案内

## 📞 サポート

問題が発生した場合:
1. ブラウザのコンソール（F12）でエラー確認
2. GASの実行ログ確認

---

**バージョン**: 2.0.0 (GitHub Pages版)  
**作成日**: 2025年1月20日  
**連絡先**: tokyoflowerco.ltd@gmail.com
