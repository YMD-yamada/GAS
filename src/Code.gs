/**
 * 家族向け：帰宅予定・食事の有無などを LINE に通知する（GAS × Messaging API）
 * 秘密情報はスクリプトのプロパティにのみ保存し、コードに直書きしないこと。
 */

/** @type {string} プロパティキー（スクリプトのプロパティ名と一致させる） */
var PROP = {
  LINE_CHANNEL_ACCESS_TOKEN: 'LINE_CHANNEL_ACCESS_TOKEN',
  LINE_TO_USER_ID: 'LINE_TO_USER_ID',
  /** 任意：Webhook の署名検証用（未設定なら検証スキップ） */
  LINE_CHANNEL_SECRET: 'LINE_CHANNEL_SECRET',
  /** 任意：スタンドアロンスクリプトで別ファイルのシートを開くとき */
  SPREADSHEET_ID: 'SPREADSHEET_ID',
  /** シートが無い／使わないときのフォールバック（テスト用） */
  FALLBACK_RETURN_TIME: 'FALLBACK_RETURN_TIME',
  FALLBACK_MEAL: 'FALLBACK_MEAL',
  FALLBACK_NOTE: 'FALLBACK_NOTE',
};

var LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

/**
 * メイン：スプレッドシート（またはフォールバック）の内容で 1 通送信する。
 * 時間トリガーはこの関数に紐づける。
 */
function sendFamilyUpdate() {
  var text = buildMessageBody_();
  pushLineText_(text);
}

/**
 * 接続テスト：固定の短い文を送る（初回の疎通確認用）
 */
function sendTestMessage() {
  pushLineText_('【テスト】GAS からの送信テストです。これが届けばトークン・送信先 ID は有効です。');
}

/**
 * 本文を組み立てる。シート優先、ダメならプロパティのフォールバック。
 */
function buildMessageBody_() {
  var data = readDailyInput_();
  var lines = [];
  lines.push('【今日の連絡】');
  lines.push('帰宅予定：' + data.returnTime);
  lines.push('食事：' + data.meal);
  if (data.note) {
    lines.push('メモ：' + data.note);
  }
  return lines.join('\n');
}

/**
 * @returns {{returnTime:string, meal:string, note:string}}
 */
function readDailyInput_() {
  try {
    var sh = getTargetSheet_();
    var returnTime = String(sh.getRange('B1').getDisplayValue() || '').trim();
    var meal = String(sh.getRange('B2').getDisplayValue() || '').trim();
    var note = String(sh.getRange('B3').getDisplayValue() || '').trim();
    if (!returnTime && !meal && !note) {
      return readFallbackFromProperties_();
    }
    return {
      returnTime: returnTime || '（未入力）',
      meal: meal || '（未入力）',
      note: note,
    };
  } catch (err) {
    return readFallbackFromProperties_();
  }
}

function readFallbackFromProperties_() {
  var p = PropertiesService.getScriptProperties();
  return {
    returnTime: p.getProperty(PROP.FALLBACK_RETURN_TIME) || '（未入力）',
    meal: p.getProperty(PROP.FALLBACK_MEAL) || '（未入力）',
    note: p.getProperty(PROP.FALLBACK_NOTE) || '',
  };
}

/**
 * スプレッドシート取得：SPREADSHEET_ID があれば ID で開く。無ければ紐づいたシート。
 */
function getTargetSheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PROP.SPREADSHEET_ID);
  if (id) {
    return SpreadsheetApp.openById(id).getSheets()[0];
  }
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

function getProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

/**
 * LINE Push API でテキストを 1 通送る。
 */
function pushLineText_(text) {
  var token = getProp_(PROP.LINE_CHANNEL_ACCESS_TOKEN);
  var to = getProp_(PROP.LINE_TO_USER_ID);
  if (!token || !to) {
    throw new Error('スクリプトのプロパティに LINE_CHANNEL_ACCESS_TOKEN と LINE_TO_USER_ID を設定してください。');
  }
  var payload = {
    to: to,
    messages: [{ type: 'text', text: text }],
  };
  var res = UrlFetchApp.fetch(LINE_PUSH_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + token,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('LINE API エラー HTTP ' + code + ' : ' + res.getContentText());
  }
}
