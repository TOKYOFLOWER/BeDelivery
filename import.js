/**
 * import.js - Excelインポート機能
 * 
 * xlsxファイルを読み込み、既存データと照合して差分プレビューを表示。
 * 管理者が確認後、一括で追加/更新/削除を実行する。
 * 
 * 依存: SheetJS (xlsx.full.min.js), app.js (callGasApi, showMessage等)
 */

// ============================================================================
// 定数・設定
// ============================================================================

/** Excelの列名 → 内部キー マッピング */
const EXCEL_COLUMN_MAP = {
  'No': 'no',
  'No.': 'no',
  '誕生日': 'birthday',
  '宛名': 'recipientName',
  '年齢': 'age',
  '住所': 'fullAddress',
  '連絡先': 'phone',
  'メッセージ': 'message',
  '変更': 'changeFlag',
  '変更フラグ': 'changeFlag'
};

/** 固定の注文者情報（前回チャットで決定済み） */
const DEFAULT_ORDERER = {
  customerLastName: '一般社団法人',
  customerFirstName: 'BeDelivery',
  customerCompany: '',
  customerEmail: 'tokyoflowerco.ltd@gmail.com',
  customerPhone: '',
  customerZipCode: '',
  customerPrefecture: '',
  customerCity: '',
  customerAddress: '',
  customerBuilding: ''
};

/** 固定の商品情報 */
const DEFAULT_PRODUCT = {
  productCode: 'ar5500',
  productName: 'おまかせ生花アレンジ',
  unitPrice: 5500,
  quantity: 1,
  paymentMethod: '店頭払い'
};

/** メッセージ末尾に付与する署名 */
const DEFAULT_SIGNATURE = 'フリーランス連盟／BeDelivery';

/** 差分タイプの定義 */
const DIFF_TYPE = {
  ADD: '追加',
  UPDATE: '変更',
  DELETE: '削除',
  UNCHANGED: '変更なし'
};

/** 差分タイプに対応する色 */
const DIFF_COLORS = {
  [DIFF_TYPE.ADD]:       { bg: '#e8f5e9', text: '#2e7d32', border: '#81c784' },
  [DIFF_TYPE.UPDATE]:    { bg: '#fff8e1', text: '#f57f17', border: '#ffd54f' },
  [DIFF_TYPE.DELETE]:    { bg: '#ffebee', text: '#c62828', border: '#ef9a9a' },
  [DIFF_TYPE.UNCHANGED]: { bg: '#f5f5f5', text: '#757575', border: '#e0e0e0' }
};


// ============================================================================
// 初期化
// ============================================================================

/** インポートUI のイベントリスナーを設定 */
function setupImportListeners() {
  const importBtn = document.getElementById('importBtn');
  if (importBtn) {
    importBtn.addEventListener('click', openImportModal);
  }

  const importFileInput = document.getElementById('importFile');
  if (importFileInput) {
    importFileInput.addEventListener('change', handleFileSelect);
  }

  const importConfirmBtn = document.getElementById('importConfirmBtn');
  if (importConfirmBtn) {
    importConfirmBtn.addEventListener('click', executeImport);
  }

  // ドラッグ&ドロップ
  const dropZone = document.getElementById('importDropZone');
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    });
  }
}


// ============================================================================
// ファイル読み込み・パース
// ============================================================================

/** importされたデータを一時保管 */
let importDiffData = [];

/** ファイル選択ハンドラ */
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) processFile(file);
}

/** ファイルを読み込んでパースする */
async function processFile(file) {
  if (!file.name.match(/\.xlsx?$/i)) {
    showMessage('xlsxファイルを選択してください', 'error');
    return;
  }

  // ファイル名を表示
  const fileNameEl = document.getElementById('importFileName');
  if (fileNameEl) fileNameEl.textContent = file.name;

  showImportLoading(true);

  try {
    const data = await readFileAsArrayBuffer(file);
    const workbook = XLSX.read(data, { type: 'array' });

    // データシートを探す（「お花リスト」「リスト」「Sheet1」の順で優先）
    const sheetName = findDataSheet(workbook);
    if (!sheetName) {
      throw new Error('データシートが見つかりません');
    }

    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    const parsed = parseExcelRows(rawRows);

    if (parsed.length === 0) {
      throw new Error('有効なデータが見つかりません');
    }

    // 既存データと照合
    const existingOrders = await fetchExistingOrders();
    const diff = compareData(parsed, existingOrders);
    importDiffData = diff;

    // プレビュー表示
    displayDiffPreview(diff);
    showImportLoading(false);

  } catch (error) {
    showImportLoading(false);
    showMessage('ファイルの読み込みに失敗しました: ' + error.message, 'error');
    console.error('Import error:', error);
  }
}

/** FileをArrayBufferとして読む */
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('ファイル読み込みエラー'));
    reader.readAsArrayBuffer(file);
  });
}

/** ワークブックからデータシートを特定 */
function findDataSheet(workbook) {
  const priority = ['お花リスト', 'リスト', 'Sheet1'];
  for (const name of priority) {
    if (workbook.SheetNames.includes(name)) return name;
  }
  // 移籍組情報以外の最初のシート
  return workbook.SheetNames.find(n => n !== '移籍組情報') || null;
}


// ============================================================================
// データ変換
// ============================================================================

/** Excel行データを内部フォーマットに変換 */
function parseExcelRows(rawRows) {
  return rawRows
    .map(row => normalizeRow(row))
    .filter(row => row && row.recipientName && row.recipientName.trim());
}

/** 1行のデータを正規化 */
function normalizeRow(row) {
  // 列名をマッピング
  const mapped = {};
  for (const [excelCol, internalKey] of Object.entries(EXCEL_COLUMN_MAP)) {
    if (row[excelCol] !== undefined) {
      mapped[internalKey] = String(row[excelCol]).trim();
    }
  }

  // 列名が完全一致しない場合のフォールバック
  if (!mapped.recipientName) {
    for (const key of Object.keys(row)) {
      if (key.includes('宛名') || key.includes('名前')) {
        mapped.recipientName = String(row[key]).trim();
        break;
      }
    }
  }

  if (!mapped.recipientName) return null;

  // 住所パース
  const address = parseAddress(mapped.fullAddress || '');

  // 電話番号フォーマット
  const phone = formatPhoneNumber(mapped.phone || '');

  // 誕生日 → 配送日
  const deliveryDate = parseBirthday(mapped.birthday || '');

  // 宛名 → 姓名分離
  const { lastName, firstName } = splitName(mapped.recipientName);

  // メッセージ（署名の処理はそのまま保持）
  const message = mapped.message || '';

  return {
    // 照合キー
    recipientName: mapped.recipientName,
    no: mapped.no || '',
    changeFlag: mapped.changeFlag || '',

    // お届け先
    recipientLastName: lastName,
    recipientFirstName: firstName,
    recipientZipCode: address.zipCode,
    recipientPrefecture: address.prefecture,
    recipientCity: address.city,
    recipientAddress: address.address,
    recipientBuilding: address.building,
    recipientPhone: phone,

    // 配送日
    deliveryDate: deliveryDate,

    // メッセージ
    orderRemarks: message,

    // メタデータ
    age: mapped.age || '',
    birthday: mapped.birthday || '',

    // 固定値
    ...DEFAULT_ORDERER,
    ...DEFAULT_PRODUCT,
    orderDate: new Date().toISOString().split('T')[0]
  };
}

/** 住所文字列をパース (例: 〒123-4567 東京都渋谷区...) */
function parseAddress(fullAddress) {
  const result = {
    zipCode: '', prefecture: '', city: '', address: '', building: ''
  };

  if (!fullAddress) return result;

  let addr = fullAddress;

  // 郵便番号を抽出
  const zipMatch = addr.match(/〒?\s*(\d{3}[-ー]?\d{4})/);
  if (zipMatch) {
    result.zipCode = zipMatch[1].replace(/[-ー]/g, '');
    addr = addr.replace(zipMatch[0], '').trim();
  }

  // 都道府県を抽出
  const prefMatch = addr.match(/^(東京都|北海道|(?:京都|大阪)府|.{2,3}県)/);
  if (prefMatch) {
    result.prefecture = prefMatch[1];
    addr = addr.substring(prefMatch[1].length).trim();
  }

  // 市区町村を抽出（市・区・町・村・郡まで）
  const cityMatch = addr.match(/^(.+?[市区町村郡])/);
  if (cityMatch) {
    result.city = cityMatch[1];
    addr = addr.substring(cityMatch[1].length).trim();
  }

  // 残りを住所詳細とビル名に分割
  // マンション名等は全角スペースや半角スペースで区切られていることが多い
  const buildingMatch = addr.match(/\s+([\S]*(?:ビル|マンション|ハイツ|コーポ|アパート|荘|号室|階|棟|レジデンス|タワー|パレス|ハウス|メゾン|コート)[\S]*)/);
  if (buildingMatch) {
    result.building = buildingMatch[1];
    result.address = addr.replace(buildingMatch[0], '').trim();
  } else {
    result.address = addr;
  }

  return result;
}

/** 電話番号にハイフンを付与 (先頭ゼロ消失対策) */
function formatPhoneNumber(phone) {
  if (!phone) return '';

  // 数字のみに
  let digits = String(phone).replace(/[^0-9]/g, '');

  // 先頭の0が消えている場合の補完
  if (digits.length === 10 && !digits.startsWith('0')) {
    digits = '0' + digits;
  }

  // 携帯電話 (090, 080, 070, 050)
  if (digits.match(/^0[5789]0/)) {
    return digits.replace(/^(\d{3})(\d{4})(\d{4})$/, '$1-$2-$3');
  }

  // 固定電話 (03, 06 等の2桁市外局番)
  if (digits.match(/^0[3-6]/)) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '$1-$2-$3');
  }

  // その他（4桁市外局番）
  if (digits.length === 10) {
    return digits.replace(/^(\d{4})(\d{2})(\d{4})$/, '$1-$2-$3');
  }

  // フォーマットできなければそのまま返す
  return phone;
}

/** 誕生日文字列を配送日に変換 (例: "2/19" → "2026/02/19") */
function parseBirthday(birthday) {
  if (!birthday) return '';

  let month, day;

  // "2月19日" 形式
  const jpMatch = String(birthday).match(/(\d{1,2})月(\d{1,2})日/);
  if (jpMatch) {
    month = parseInt(jpMatch[1]);
    day = parseInt(jpMatch[2]);
  }

  // "2/19" 形式
  if (!month) {
    const slashMatch = String(birthday).match(/(\d{1,2})[\/\-](\d{1,2})/);
    if (slashMatch) {
      month = parseInt(slashMatch[1]);
      day = parseInt(slashMatch[2]);
    }
  }

  // Excel日付（シリアル値）
  if (!month && !isNaN(birthday)) {
    const serial = Number(birthday);
    if (serial > 40000 && serial < 50000) {
      const date = new Date((serial - 25569) * 86400 * 1000);
      month = date.getMonth() + 1;
      day = date.getDate();
    }
  }

  if (!month || !day) return '';

  // 今年の日付を生成（過去なら来年に）
  const now = new Date();
  let year = now.getFullYear();
  const target = new Date(year, month - 1, day);
  if (target < now) {
    year++;
  }

  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

/** 宛名を姓名に分離 */
function splitName(name) {
  if (!name) return { lastName: '', firstName: '' };

  // スペース区切り
  const parts = name.split(/\s+/);
  if (parts.length >= 2) {
    return { lastName: parts[0], firstName: parts.slice(1).join('') };
  }

  // 2文字以上なら最初の1文字を姓、残りを名とする
  // （日本語名は簡易的に2/残りで分割）
  if (name.length >= 2) {
    return { lastName: name.substring(0, name.length > 3 ? 2 : 1), firstName: name.substring(name.length > 3 ? 2 : 1) };
  }

  return { lastName: name, firstName: '' };
}


// ============================================================================
// 既存データ照合 (Diff)
// ============================================================================

/** 既存注文を取得 */
async function fetchExistingOrders() {
  try {
    const result = await callGasApi('getOrders', {});
    return result.data || [];
  } catch (error) {
    console.error('既存データ取得エラー:', error);
    return [];
  }
}

/** Excelデータと既存データを比較して差分を生成 */
function compareData(excelRows, existingOrders) {
  const results = [];

  // 既存データをお届け先名でインデックス化
  const existingMap = new Map();
  existingOrders.forEach(order => {
    const name = (order.recipientLastName || '') + (order.recipientFirstName || '');
    if (name) {
      existingMap.set(name, order);
    }
  });

  // Excelの各行を照合
  const processedNames = new Set();

  excelRows.forEach(row => {
    const name = row.recipientName;
    processedNames.add(name);

    // 変更フラグが「削除」の場合
    if (row.changeFlag === '削除') {
      const existing = existingMap.get(name);
      results.push({
        type: DIFF_TYPE.DELETE,
        name: name,
        excelData: row,
        existingData: existing || null,
        orderKey: existing?.orderKey || null,
        checked: true
      });
      return;
    }

    const existing = existingMap.get(name);

    if (!existing) {
      // 新規追加
      results.push({
        type: DIFF_TYPE.ADD,
        name: name,
        excelData: row,
        existingData: null,
        orderKey: null,
        checked: true
      });
    } else {
      // 既存データとの差分チェック
      const changes = detectChanges(row, existing);
      if (changes.length > 0 || row.changeFlag) {
        results.push({
          type: DIFF_TYPE.UPDATE,
          name: name,
          excelData: row,
          existingData: existing,
          orderKey: existing.orderKey,
          changes: changes,
          checked: true
        });
      } else {
        results.push({
          type: DIFF_TYPE.UNCHANGED,
          name: name,
          excelData: row,
          existingData: existing,
          orderKey: existing.orderKey,
          checked: false
        });
      }
    }
  });

  // ソート: 追加 → 変更 → 削除 → 変更なし
  const typeOrder = {
    [DIFF_TYPE.ADD]: 0,
    [DIFF_TYPE.UPDATE]: 1,
    [DIFF_TYPE.DELETE]: 2,
    [DIFF_TYPE.UNCHANGED]: 3
  };
  results.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

  return results;
}

/** 2つのレコード間で変更点を検出 */
function detectChanges(excelRow, existing) {
  const changes = [];
  const fields = [
    { key: 'recipientPhone',      label: '連絡先' },
    { key: 'recipientZipCode',    label: '郵便番号' },
    { key: 'recipientPrefecture', label: '都道府県' },
    { key: 'recipientCity',       label: '市区町村' },
    { key: 'recipientAddress',    label: '住所' },
    { key: 'recipientBuilding',   label: '建物名' },
    { key: 'deliveryDate',        label: '配送日' },
    { key: 'orderRemarks',        label: 'メッセージ' }
  ];

  fields.forEach(({ key, label }) => {
    const newVal = (excelRow[key] || '').trim();
    const oldVal = (existing[key] || '').trim();
    if (newVal && newVal !== oldVal) {
      changes.push({ field: label, oldValue: oldVal, newValue: newVal });
    }
  });

  // 変更フラグがある場合は変更理由として記録
  if (excelRow.changeFlag && excelRow.changeFlag !== '削除') {
    const alreadyNoted = changes.some(c => c.field === '変更フラグ');
    if (!alreadyNoted) {
      changes.push({ field: '変更フラグ', oldValue: '', newValue: excelRow.changeFlag });
    }
  }

  return changes;
}


// ============================================================================
// プレビュー表示
// ============================================================================

/** 差分プレビューをモーダル内に表示 */
function displayDiffPreview(diffData) {
  const container = document.getElementById('importPreviewBody');
  if (!container) return;

  // 集計
  const counts = {
    [DIFF_TYPE.ADD]: 0,
    [DIFF_TYPE.UPDATE]: 0,
    [DIFF_TYPE.DELETE]: 0,
    [DIFF_TYPE.UNCHANGED]: 0
  };
  diffData.forEach(d => counts[d.type]++);

  // サマリー表示
  const summaryEl = document.getElementById('importSummary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <span class="import-count import-count-add">追加 <strong>${counts[DIFF_TYPE.ADD]}</strong>件</span>
      <span class="import-count import-count-update">変更 <strong>${counts[DIFF_TYPE.UPDATE]}</strong>件</span>
      <span class="import-count import-count-delete">削除 <strong>${counts[DIFF_TYPE.DELETE]}</strong>件</span>
      <span class="import-count import-count-unchanged">変更なし <strong>${counts[DIFF_TYPE.UNCHANGED]}</strong>件</span>
    `;
  }

  // テーブル生成
  container.innerHTML = diffData.map((item, idx) => {
    const color = DIFF_COLORS[item.type];
    const checkedAttr = item.checked ? 'checked' : '';
    const isUnchanged = item.type === DIFF_TYPE.UNCHANGED;

    let detailHtml = '';
    if (item.type === DIFF_TYPE.ADD) {
      detailHtml = `
        <div class="diff-detail">
          <span class="diff-field">誕生日:</span> ${escapeHtml(item.excelData.birthday || '-')}
          <span class="diff-field">住所:</span> ${escapeHtml(item.excelData.fullAddress || '-')}
          <span class="diff-field">連絡先:</span> ${escapeHtml(item.excelData.recipientPhone || '-')}
        </div>`;
    } else if (item.type === DIFF_TYPE.UPDATE && item.changes) {
      detailHtml = item.changes.map(c =>
        `<div class="diff-change">
          <span class="diff-field">${escapeHtml(c.field)}:</span>
          ${c.oldValue ? `<span class="diff-old">${escapeHtml(truncateStr(c.oldValue, 40))}</span> → ` : ''}
          <span class="diff-new">${escapeHtml(truncateStr(c.newValue, 40))}</span>
        </div>`
      ).join('');
    } else if (item.type === DIFF_TYPE.DELETE) {
      detailHtml = `<div class="diff-detail diff-detail-delete">この宛先を注文リストから削除します</div>`;
    }

    return `
      <tr style="background-color: ${color.bg};" class="diff-row ${isUnchanged ? 'diff-row-unchanged' : ''}">
        <td class="diff-checkbox-cell">
          <input type="checkbox" class="import-check" data-index="${idx}" ${checkedAttr}
                 ${isUnchanged ? '' : ''}>
        </td>
        <td>
          <span class="diff-badge" style="background:${color.border}; color:${color.text};">
            ${item.type}
          </span>
        </td>
        <td class="diff-name-cell">
          <strong>${escapeHtml(item.name)}</strong>
          ${item.excelData.changeFlag ? `<span class="diff-flag">${escapeHtml(item.excelData.changeFlag)}</span>` : ''}
        </td>
        <td class="diff-detail-cell">${detailHtml}</td>
      </tr>`;
  }).join('');

  // 確認ボタンの有効化
  const confirmBtn = document.getElementById('importConfirmBtn');
  if (confirmBtn) {
    const actionCount = counts[DIFF_TYPE.ADD] + counts[DIFF_TYPE.UPDATE] + counts[DIFF_TYPE.DELETE];
    confirmBtn.disabled = actionCount === 0;
    confirmBtn.textContent = actionCount > 0
      ? `選択した ${actionCount} 件をインポート`
      : 'インポート対象がありません';
  }

  // チェックボックスイベント
  container.querySelectorAll('.import-check').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.index);
      if (importDiffData[idx]) {
        importDiffData[idx].checked = e.target.checked;
      }
      updateImportButtonCount();
    });
  });

  // プレビューセクションを表示
  const previewSection = document.getElementById('importPreviewSection');
  if (previewSection) previewSection.style.display = 'block';
}

/** インポートボタンの件数を更新 */
function updateImportButtonCount() {
  const checkedCount = importDiffData.filter(d =>
    d.checked && d.type !== DIFF_TYPE.UNCHANGED
  ).length;
  const confirmBtn = document.getElementById('importConfirmBtn');
  if (confirmBtn) {
    confirmBtn.disabled = checkedCount === 0;
    confirmBtn.textContent = checkedCount > 0
      ? `選択した ${checkedCount} 件をインポート`
      : 'インポート対象を選択してください';
  }
}

/** 文字列を指定長で切り詰め */
function truncateStr(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '…' : str;
}


// ============================================================================
// インポート実行
// ============================================================================

/** 確認後、選択した差分を一括インポート */
async function executeImport() {
  const selected = importDiffData.filter(d =>
    d.checked && d.type !== DIFF_TYPE.UNCHANGED
  );

  if (selected.length === 0) {
    showMessage('インポート対象がありません', 'warning');
    return;
  }

  // 確認ダイアログ
  const addCount = selected.filter(d => d.type === DIFF_TYPE.ADD).length;
  const updateCount = selected.filter(d => d.type === DIFF_TYPE.UPDATE).length;
  const deleteCount = selected.filter(d => d.type === DIFF_TYPE.DELETE).length;

  const msg = [
    addCount > 0 ? `追加: ${addCount}件` : '',
    updateCount > 0 ? `変更: ${updateCount}件` : '',
    deleteCount > 0 ? `削除: ${deleteCount}件` : ''
  ].filter(Boolean).join('、');

  if (!confirm(`以下の内容でインポートを実行します。\n\n${msg}\n\nよろしいですか？`)) {
    return;
  }

  showImportLoading(true);

  try {
    // バッチ処理用のデータを構築
    const batch = {
      additions: [],
      updates: [],
      deletions: []
    };

    selected.forEach(item => {
      const orderData = buildOrderData(item.excelData);

      switch (item.type) {
        case DIFF_TYPE.ADD:
          batch.additions.push(orderData);
          break;
        case DIFF_TYPE.UPDATE:
          batch.updates.push({
            orderKey: item.orderKey,
            orderData: orderData
          });
          break;
        case DIFF_TYPE.DELETE:
          if (item.orderKey) {
            batch.deletions.push(item.orderKey);
          }
          break;
      }
    });

    // GASに送信
    const result = await callGasApi('batchImport', batch);

    showImportLoading(false);
    closeImportModal();

    const resultMsg = [];
    if (result.data?.added > 0) resultMsg.push(`${result.data.added}件追加`);
    if (result.data?.updated > 0) resultMsg.push(`${result.data.updated}件更新`);
    if (result.data?.deleted > 0) resultMsg.push(`${result.data.deleted}件削除`);

    showMessage(`インポート完了: ${resultMsg.join('、')}`, 'success');

    // 一覧を再読み込み
    loadOrders();
    loadStatistics();

  } catch (error) {
    showImportLoading(false);
    showMessage('インポートに失敗しました: ' + error.message, 'error');
    console.error('Import execution error:', error);
  }
}

/** ExcelパースデータをGAS送信用の注文データに変換 */
function buildOrderData(excelRow) {
  return {
    orderDate: excelRow.orderDate || new Date().toISOString().split('T')[0],
    deliveryDate: excelRow.deliveryDate || '',
    customerLastName: excelRow.customerLastName,
    customerFirstName: excelRow.customerFirstName,
    customerCompany: excelRow.customerCompany,
    customerEmail: excelRow.customerEmail,
    customerPhone: excelRow.customerPhone,
    customerZipCode: excelRow.customerZipCode,
    customerPrefecture: excelRow.customerPrefecture,
    customerCity: excelRow.customerCity,
    customerAddress: excelRow.customerAddress,
    customerBuilding: excelRow.customerBuilding,
    recipientLastName: excelRow.recipientLastName,
    recipientFirstName: excelRow.recipientFirstName,
    recipientZipCode: excelRow.recipientZipCode,
    recipientPrefecture: excelRow.recipientPrefecture,
    recipientCity: excelRow.recipientCity,
    recipientAddress: excelRow.recipientAddress,
    recipientBuilding: excelRow.recipientBuilding,
    recipientPhone: excelRow.recipientPhone,
    deliveryTime: '',
    productCode: excelRow.productCode,
    productName: excelRow.productName,
    quantity: excelRow.quantity,
    unitPrice: excelRow.unitPrice,
    orderRemarks: excelRow.orderRemarks,
    paymentMethod: excelRow.paymentMethod,
    recipientLastNameKana: '',
    recipientFirstNameKana: '',
    customerLastNameKana: '',
    customerFirstNameKana: ''
  };
}


// ============================================================================
// モーダル制御
// ============================================================================

/** インポートモーダルを開く */
function openImportModal() {
  importDiffData = [];
  const modal = document.getElementById('importModal');
  if (modal) modal.style.display = 'block';

  // リセット
  const fileInput = document.getElementById('importFile');
  if (fileInput) fileInput.value = '';
  const fileNameEl = document.getElementById('importFileName');
  if (fileNameEl) fileNameEl.textContent = '';
  const previewSection = document.getElementById('importPreviewSection');
  if (previewSection) previewSection.style.display = 'none';
  const previewBody = document.getElementById('importPreviewBody');
  if (previewBody) previewBody.innerHTML = '';
  const summaryEl = document.getElementById('importSummary');
  if (summaryEl) summaryEl.innerHTML = '';
}

/** インポートモーダルを閉じる */
function closeImportModal() {
  const modal = document.getElementById('importModal');
  if (modal) modal.style.display = 'none';
  importDiffData = [];
}

/** インポートローディング表示 */
function showImportLoading(show) {
  const loader = document.getElementById('importLoading');
  if (loader) loader.style.display = show ? 'flex' : 'none';
}
