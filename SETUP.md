# セットアップ完全ガイド

## 📋 概要

このシステムは2つのパートで構成されています：

1. **フロントエンド**: GitHub Pages（カスタムドメイン対応）
2. **バックエンド**: Google Apps Script（API）

## ⏱️ 所要時間

- GASセットアップ: 10分
- GitHub Pagesセットアップ: 5分
- カスタムドメイン設定: 5分（オプション）

---

## パート1: GAS APIのセットアップ

### ステップ1: Googleスプレッドシート作成

1. [Google Drive](https://drive.google.com/)を開く
2. 「新規」→「Google スプレッドシート」→「空白のスプレッドシート」
3. タイトルを「花定期配送管理」に変更
4. URLからSHEET_IDをコピー:
   ```
   https://docs.google.com/spreadsheets/d/[このIDをコピー]/edit
   ```

### ステップ2: Apps Script プロジェクト作成

1. スプレッドシートで「拡張機能」→「Apps Script」をクリック
2. 新しいタブでApps Scriptエディタが開きます
3. プロジェクト名を「花定期配送API」に変更

### ステップ3: コードをコピペ

#### 3-1. Code_API.gs（最初のファイルを置き換え）

1. 左側の「コード.gs」を開く
2. すべて削除
3. `GAS/Code_API.gs`の内容を全部コピペ

#### 3-2. Config.gs

1. 「ファイル」→「新規」→「スクリプト」
2. 名前を「Config」に変更
3. `GAS/Config.gs`の内容をコピペ
4. **重要**: SHEET_IDを変更:
   ```javascript
   const SHEET_ID = 'ステップ1でコピーしたID';
   ```

#### 3-3. DataManager.gs

1. 「ファイル」→「新規」→「スクリプト」
2. 名前を「DataManager」に変更
3. `GAS/DataManager.gs`の内容をコピペ

#### 3-4. MailNotifier.gs

1. 「ファイル」→「新規」→「スクリプト」
2. 名前を「MailNotifier」に変更
3. `GAS/MailNotifier.gs`の内容をコピペ

#### 3-5. DownloadHandler.gs

1. 「ファイル」→「新規」→「スクリプト」
2. 名前を「DownloadHandler」に変更
3. `GAS/DownloadHandler.gs`の内容をコピペ

### ステップ4: デプロイ

1. 右上の「デプロイ」→「新しいデプロイ」をクリック
2. 「種類の選択」で⚙️アイコン→「ウェブアプリ」を選択
3. 設定:
   - **説明**: 「花定期配送API v1」
   - **次のユーザーとして実行**: 「自分」
   - **アクセスできるユーザー**: 「**全員**」← これ重要！
4. 「デプロイ」をクリック
5. 初回は承認が必要:
   - 「アクセスを承認」をクリック
   - アカウントを選択
   - 「詳細」→「移動」で承認
6. **ウェブアプリのURL**をコピー
   ```
   https://script.google.com/macros/s/AKfycby.../exec
   ```

### ステップ5: 動作確認

ブラウザで先ほどのURLにアクセス:
```json
{"success":true,"message":"花定期配送API"}
```
このように表示されればOK！

---

## パート2: GitHub Pagesのセットアップ

### ステップ1: GitHubアカウント作成（持っていない場合）

1. [GitHub](https://github.com/)にアクセス
2. 「Sign up」でアカウント作成

### ステップ2: リポジトリ作成

#### 方法A: GitHubのWebから作成（簡単）

1. GitHub右上の「+」→「New repository」
2. Repository name: `flower-delivery`
3. Public を選択
4. 「Create repository」

#### 方法B: コマンドラインから作成

```bash
# ディレクトリに移動
cd flower-delivery-github

# Git初期化
git init

# ファイルを追加
git add .

# コミット
git commit -m "Initial commit"

# GitHubリポジトリを追加（方法Aで作成したURL）
git remote add origin https://github.com/YOUR_USERNAME/flower-delivery.git

# プッシュ
git push -u origin main
```

### ステップ3: config.js を編集

1. `config.js`を開く
2. GAS APIのURLを設定:
   ```javascript
   const GAS_API_URL = 'パート1ステップ4でコピーしたURL';
   ```
3. 保存してGitHubにプッシュ:
   ```bash
   git add config.js
   git commit -m "Add GAS API URL"
   git push
   ```

### ステップ4: GitHub Pagesを有効化

1. GitHubリポジトリページを開く
2. 「Settings」タブをクリック
3. 左メニューから「Pages」を選択
4. Source:
   - Branch: `main`
   - Folder: `/ (root)`
5. 「Save」をクリック
6. 数分待つと、URLが表示されます:
   ```
   https://YOUR_USERNAME.github.io/flower-delivery/
   ```

### ステップ5: 動作確認

1. GitHub PagesのURLにアクセス
2. システムが表示されればOK！
3. 「新規注文」でテストデータを入力して動作確認

---

## パート3: カスタムドメイン設定（オプション）

### 前提条件

- 独自ドメインを所有していること
- DNSレコードを編集できること

### ステップ1: GitHub側の設定

1. GitHubリポジトリの「Settings」→「Pages」
2. 「Custom domain」に独自ドメインを入力:
   ```
   orders.yourcompany.com
   ```
3. 「Save」をクリック

### ステップ2: DNS設定

ドメイン管理画面（お名前.com、ムームードメインなど）で以下を設定:

```
Type: CNAME
Name: orders（またはサブドメイン名）
Value: YOUR_USERNAME.github.io
TTL: 3600（または自動）
```

### ステップ3: SSL証明書（自動）

- GitHub Pagesが自動的にSSL証明書を発行
- 数分〜24時間で有効化
- 「Enforce HTTPS」にチェックを入れる

### 完了！

`https://orders.yourcompany.com`でアクセス可能になります。

---

## 🔧 高度な設定

### メール通知のカスタマイズ

`GAS/MailNotifier.gs`を編集:

```javascript
buildNewOrderMailBody: function(data) {
  return `
    // メール本文をカスタマイズ
  `;
}
```

### 助ネコフォーマットのカスタマイズ

`GAS/DownloadHandler.gs`の`SUKENEKO_DEFAULTS`を編集:

```javascript
const SUKENEKO_DEFAULTS = {
  '受注ルート': 'JS',
  '決済方法': '銀行振込',
  '送料': '630',
  // カスタマイズ
};
```

### デザインのカスタマイズ

`style.css`を編集してブランドカラーに変更:

```css
.btn-primary {
  background-color: #YOUR_COLOR;
}
```

---

## 🆘 トラブルシューティング

### 問題1: APIエラー「Failed to fetch」

**原因**: GASが「全員」に公開されていない

**解決**:
1. GASエディタで「デプロイ」→「デプロイを管理」
2. 既存のデプロイを編集
3. 「アクセスできるユーザー: 全員」に変更
4. 「デプロイ」

### 問題2: CORS エラー

**原因**: 同上

**解決**: 問題1と同じ

### 問題3: GitHub Pagesが404エラー

**原因**: ブランチ設定が間違っている

**解決**:
1. 「Settings」→「Pages」
2. Branch が `main`（または`master`）になっているか確認
3. Folder が `/ (root)` になっているか確認

### 問題4: カスタムドメインでSSLエラー

**原因**: DNS設定の反映待ち

**解決**: 最大24時間待つ。それでもダメなら:
1. CNAMEレコードが正しいか確認
2. GitHubの「Custom domain」を一度削除して再設定

### 問題5: メールが届かない

**原因**: メールアドレスが間違っている

**解決**:
1. `GAS/Config.gs`のメールアドレスを確認
2. GASの実行ログを確認（「実行数」タブ）

---

## 📊 次のステップ

### 本番運用前のチェックリスト

- [ ] GAS APIが正しく動作する
- [ ] GitHub Pagesでシステムが表示される
- [ ] テストデータで注文登録できる
- [ ] メール通知が届く
- [ ] 助ネコCSVがダウンロードできる
- [ ] カスタムドメインが動作する（使用する場合）

### 運用開始

1. 依頼主にURLを共有
2. 使い方を説明
3. 定期的にスプレッドシートをバックアップ

---

**セットアップ完了！お疲れ様でした！** 🎉

問題があれば、ブラウザのコンソール（F12）とGASの実行ログを確認してください。
