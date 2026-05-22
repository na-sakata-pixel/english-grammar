// ============================================================
// English Grammar サイト — 進捗記録スクリプト
// Google スプレッドシートの「拡張機能」→「Apps Script」に貼り付けてください
// ============================================================

var SHEET_LOG      = 'ログ';
var SHEET_PROGRESS = '進捗サマリー';
var SHEET_STUDENTS = '学生一覧';

// ============================================================
// ★ 初期セットアップ用（初回だけ手動で実行）
// initSheets を選択して ▶ 実行してください
// ============================================================
function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ログシート
  var log = ss.getSheetByName(SHEET_LOG);
  if (!log) {
    log = ss.insertSheet(SHEET_LOG);
    log.appendRow(['タイムスタンプ','名前','Unit','ステップ','ステップ名','スコア','総問数','所要時間(秒)','UA']);
    log.setFrozenRows(1);
  }

  // 進捗サマリーシート
  var prog = ss.getSheetByName(SHEET_PROGRESS);
  if (!prog) {
    prog = ss.insertSheet(SHEET_PROGRESS);
    var headers = ['名前'];
    for (var u = 1; u <= 20; u++) {
      var un = u < 10 ? '0' + u : String(u);
      headers.push('U'+un+'-①説明', 'U'+un+'-②クイズ', 'U'+un+'-③発話', 'U'+un+'-④ペア');
    }
    headers.push('合計完了数', '最終更新');
    prog.appendRow(headers);
    prog.setFrozenRows(1);
    prog.setFrozenColumns(1);
  }

  // 学生一覧シート
  var stu = ss.getSheetByName(SHEET_STUDENTS);
  if (!stu) {
    stu = ss.insertSheet(SHEET_STUDENTS);
    stu.appendRow(['名前','初回アクセス','最終アクセス','総アクセス数']);
    stu.setFrozenRows(1);
  }

  Logger.log('完了：3つのシートを初期化しました');
}

// ── POSTリクエストを受け取る（ウェブアプリ本体）──
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var data = JSON.parse(e.postData.contents);
    var ss   = SpreadsheetApp.getActiveSpreadsheet();
    writeLog(ss, data);
    updateProgress(ss, data);
    updateStudents(ss, data);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// GETリクエスト対応
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'English Grammar Progress API' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── ログシートに1行追記 ──
function writeLog(ss, data) {
  var sheet = ss.getSheetByName(SHEET_LOG);
  if (!sheet) return;
  sheet.appendRow([
    new Date(),
    data.name      || '',
    data.unit      || '',
    data.step      || '',
    data.stepName  || '',
    data.score     !== undefined ? data.score : '',
    data.total     !== undefined ? data.total : '',
    data.elapsed   || '',
    data.ua        || ''
  ]);
}

// ── 進捗サマリーを更新 ──
function updateProgress(ss, data) {
  var sheet = ss.getSheetByName(SHEET_PROGRESS);
  if (!sheet) return;

  var name = data.name;
  var unit = parseInt(data.unit);
  var step = parseInt(data.step);
  if (!name || !unit || !step) return;

  var colIndex = 1 + (unit - 1) * 4 + step;
  var values   = sheet.getDataRange().getValues();
  var rowIndex = -1;

  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === name) { rowIndex = i + 1; break; }
  }
  if (rowIndex === -1) {
    sheet.appendRow([name]);
    rowIndex = sheet.getLastRow();
  }

  sheet.getRange(rowIndex, colIndex).setValue('✅');
  sheet.getRange(rowIndex, colIndex).setBackground('#d4edda').setFontColor('#155724');

  // 合計更新
  var lastDataCol = 1 + 20 * 4;
  var row  = sheet.getRange(rowIndex, 2, 1, lastDataCol - 1).getValues()[0];
  var done = 0;
  for (var j = 0; j < row.length; j++) { if (row[j] === '✅') done++; }
  sheet.getRange(rowIndex, lastDataCol + 1).setValue(done);
  sheet.getRange(rowIndex, lastDataCol + 2).setValue(new Date());
}

// ── 学生一覧を更新 ──
function updateStudents(ss, data) {
  var sheet = ss.getSheetByName(SHEET_STUDENTS);
  if (!sheet) return;

  var name   = data.name;
  if (!name) return;

  var values   = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === name) { rowIndex = i + 1; break; }
  }

  var now = new Date();
  if (rowIndex === -1) {
    sheet.appendRow([name, now, now, 1]);
  } else {
    var count = (sheet.getRange(rowIndex, 4).getValue() || 0) + 1;
    sheet.getRange(rowIndex, 3).setValue(now);
    sheet.getRange(rowIndex, 4).setValue(count);
  }
}
