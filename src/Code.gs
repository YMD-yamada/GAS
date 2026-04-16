/**
 * LINE Messaging API で家族へ帰宅連絡を Push 送信する Web アプリ
 *
 * 【初回セットアップ】
 * 1. LINE Developers で Messaging API チャネルを作成し、Channel access token を発行
 * 2. 送信先の userId（または groupId）を取得（Webhook または友だち追加時のイベント等）
 * 3. このスクリプトの「プロジェクトの設定」→「スクリプトのプロパティ」に以下を追加:
 *    - LINE_CHANNEL_ACCESS_TOKEN : チャネルアクセストークン
 *    - LINE_TO_ID               : 送信先の userId または groupId（groupId 取得時は自分の userId のまま）
 *    - LOG_SPREADSHEET_ID        : ログ保存先 Spreadsheet ID（任意）
 * 4. Webhook 用に Web アプリをデプロイし、その URL を LINE Developers の Webhook URL に設定
 */

var PATTERNS = [
  { id: 'p1', label: '17時半終了', arrival: '19:00前' },
  { id: 'p2', label: '18時前終了', arrival: '19:00すぎ' },
  { id: 'p3', label: '18時半終了', arrival: '20:00前' },
  { id: 'p4', label: '19時半終了', arrival: '21:00前' },
  { id: 'p5', label: '20時半終了', arrival: '22:00前' }
];

var DINNER_LABELS = {
  home: '家で食べます',
  eatOut: '食べて帰ります',
  none: 'いりません'
};

var LOG_SHEET_NAME = 'NotificationLog';
var LOG_HEADERS = [
  'timestamp',
  'status',
  'toId',
  'patternId',
  'patternLabel',
  'arrival',
  'dinnerKey',
  'dinnerLabel',
  'hasSchedule',
  'scheduleTime',
  'scheduleDetail',
  'sentText',
  'errorMessage'
];

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('帰宅連絡')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * LINE Webhook 受信。events 内の source が group のものから groupId を集め、
 * LINE_TO_ID（自分の userId 等）へ Push でオウム返しする（取得用）。
 */
function doPost(e) {
  try {
    var props = PropertiesService.getScriptProperties();
    var token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
    var toId = props.getProperty('LINE_TO_ID');

    if (!e.postData || !e.postData.contents) {
      return ContentService.createTextOutput('OK');
    }

    var data = JSON.parse(e.postData.contents);
    var events = data.events || [];
    var seen = {};
    var groupIds = [];

    for (var i = 0; i < events.length; i++) {
      handleDirectLogRequest_(events[i], token);
      var src = events[i].source;
      if (src && src.type === 'group' && src.groupId && !seen[src.groupId]) {
        seen[src.groupId] = true;
        groupIds.push(src.groupId);
      }
    }

    if (groupIds.length > 0 && token && toId) {
      var text = '取得した groupId:\n' + groupIds.join('\n');
      var payload = {
        to: toId,
        messages: [{ type: 'text', text: text }]
      };
      UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
        method: 'post',
        contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + token },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
    }
  } catch (err) {
    // パース失敗時も 200 を返し、LINE の再送ループを避ける
  }

  return ContentService.createTextOutput('OK');
}

/**
 * クライアントから呼び出し。
 * patternIndex: 0–4, dinnerKey: 'home' | 'eatOut' | 'none'
 * hasSchedule: 予定あり/なし
 * scheduleTime: 予想帰宅時間（例 21:00）
 * scheduleDetail: 予定内容
 */
function sendLineMessage(patternIndex, dinnerKey, hasSchedule, scheduleTime, scheduleDetail) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  var toId = props.getProperty('LINE_TO_ID');

  if (!token || !toId) {
    return {
      ok: false,
      error: 'スクリプトプロパティに LINE_CHANNEL_ACCESS_TOKEN と LINE_TO_ID を設定してください。'
    };
  }

  var pi = parseInt(patternIndex, 10);
  if (isNaN(pi) || pi < 0 || pi >= PATTERNS.length) {
    return { ok: false, error: '到着パターンが不正です。' };
  }

  if (!DINNER_LABELS.hasOwnProperty(dinnerKey)) {
    return { ok: false, error: '夕飯オプションが不正です。' };
  }

  var arrival = PATTERNS[pi].arrival;
  var patternId = PATTERNS[pi].id;
  var patternLabel = PATTERNS[pi].label;
  var dinnerLine = DINNER_LABELS[dinnerKey];
  var scheduleOn = hasSchedule === true || hasSchedule === 'true' || hasSchedule === 1 || hasSchedule === '1';
  var scheduleTimeText = String(scheduleTime || '').trim();
  var scheduleDetailText = String(scheduleDetail || '').trim();

  if (scheduleOn) {
    if (!scheduleTimeText) {
      return { ok: false, error: '予想帰宅時間を選択してください。' };
    }
    if (!scheduleDetailText) {
      return { ok: false, error: '予定の内容を入力してください。' };
    }
  }

  var text = '🏠 今から帰ります！\n';
  if (scheduleOn) {
    text +=
      '📌【予定】' + scheduleDetailText + '\n' +
      '🕒【到着予定（予想）】' + scheduleTimeText + '\n' +
      '🍚【夕飯】' + dinnerLine;
  } else {
    text +=
      '🕒【到着予定】' + arrival + '\n' +
      '🍚【夕飯】' + dinnerLine;
  }

  var payload = {
    to: toId,
    messages: [{ type: 'text', text: text }]
  };

  var url = 'https://api.line.me/v2/bot/message/push';
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var code = response.getResponseCode();
  var body = response.getContentText();

  if (code >= 200 && code < 300) {
    appendUsageLog_({
      status: 'SUCCESS',
      toId: toId,
      patternId: patternId,
      patternLabel: patternLabel,
      arrival: arrival,
      dinnerKey: dinnerKey,
      dinnerLabel: dinnerLine,
      hasSchedule: scheduleOn,
      scheduleTime: scheduleTimeText,
      scheduleDetail: scheduleDetailText,
      sentText: text,
      errorMessage: ''
    });
    return { ok: true };
  }

  appendUsageLog_({
    status: 'FAILED',
    toId: toId,
    patternId: patternId,
    patternLabel: patternLabel,
    arrival: arrival,
    dinnerKey: dinnerKey,
    dinnerLabel: dinnerLine,
    hasSchedule: scheduleOn,
    scheduleTime: scheduleTimeText,
    scheduleDetail: scheduleDetailText,
    sentText: text,
    errorMessage: 'LINE API エラー (' + code + '): ' + body
  });

  return {
    ok: false,
    error: 'LINE API エラー (' + code + '): ' + body
  };
}

function appendUsageLog_(entry) {
  try {
    var sheet = getOrCreateLogSheet_();
    if (!sheet) {
      return;
    }

    sheet.appendRow([
      new Date(),
      entry.status || '',
      entry.toId || '',
      entry.patternId || '',
      entry.patternLabel || '',
      entry.arrival || '',
      entry.dinnerKey || '',
      entry.dinnerLabel || '',
      entry.hasSchedule ? 'true' : 'false',
      entry.scheduleTime || '',
      entry.scheduleDetail || '',
      entry.sentText || '',
      entry.errorMessage || ''
    ]);
  } catch (err) {
    // ログ保存失敗は送信機能に影響させない
  }
}

function getOrCreateLogSheet_() {
  var props = PropertiesService.getScriptProperties();
  var spreadsheetId = props.getProperty('LOG_SPREADSHEET_ID');
  var ss = null;

  if (spreadsheetId) {
    ss = SpreadsheetApp.openById(spreadsheetId);
  } else {
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (err) {
      ss = null;
    }
  }

  if (!ss) {
    return null;
  }

  var sheet = ss.getSheetByName(LOG_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(LOG_SHEET_NAME);
    sheet.appendRow(LOG_HEADERS);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(LOG_HEADERS);
  }

  return sheet;
}

function handleDirectLogRequest_(event, token) {
  if (!token || !event || event.type !== 'message') {
    return;
  }
  if (!event.source || event.source.type !== 'user') {
    return;
  }
  if (!event.message || event.message.type !== 'text') {
    return;
  }

  var text = String(event.message.text || '').trim();
  var responseText = buildLogResponseText_(text);
  if (!responseText) {
    return;
  }

  replyText_(token, event.replyToken, responseText);
}

function buildLogResponseText_(commandText) {
  if (!commandText) {
    return '';
  }
  if (commandText === 'ログ ヘルプ' || commandText === 'help' || commandText === 'ヘルプ') {
    return [
      '📒 ログ参照コマンド',
      '・最新',
      '・ログ 3  （直近3件）',
      '・夕飯 / 到着 / 予定',
      '・ログ ヘルプ'
    ].join('\n');
  }

  if (commandText === '最新') {
    return formatLatestLog_();
  }

  if (commandText === '夕飯' || commandText === '到着' || commandText === '予定') {
    return formatLatestField_(commandText);
  }

  var match = commandText.match(/^ログ\s+(\d{1,2})$/);
  if (match) {
    return formatRecentLogs_(Math.min(20, parseInt(match[1], 10)));
  }

  return '';
}

function formatLatestLog_() {
  var rows = getRecentLogRows_(1);
  if (!rows.length) {
    return '📭 ログがまだありません。';
  }

  var row = rows[0];
  return [
    '📌 最新ログ',
    '🕒 ' + formatDate_(row[0]),
    '🚦 状態: ' + row[1],
    '🧭 到着: ' + row[5],
    '🍚 夕飯: ' + row[7],
    '📝 予定: ' + (row[10] || 'なし'),
    '⏰ 予定時刻: ' + (row[9] || 'なし')
  ].join('\n');
}

function formatLatestField_(fieldName) {
  var rows = getRecentLogRows_(1);
  if (!rows.length) {
    return '📭 ログがまだありません。';
  }
  var row = rows[0];

  if (fieldName === '夕飯') {
    return '🍚 最新の夕飯: ' + (row[7] || '未設定');
  }
  if (fieldName === '到着') {
    return '🕒 最新の到着予定: ' + (row[5] || '未設定');
  }
  return [
    '📌 最新の予定',
    '📝 内容: ' + (row[10] || 'なし'),
    '⏰ 時刻: ' + (row[9] || 'なし')
  ].join('\n');
}

function formatRecentLogs_(limit) {
  var rows = getRecentLogRows_(limit);
  if (!rows.length) {
    return '📭 ログがまだありません。';
  }

  var lines = ['📚 直近' + rows.length + '件のログ'];
  for (var i = 0; i < rows.length; i++) {
    lines.push(
      (i + 1) + '. ' +
      formatDate_(rows[i][0]) + ' / ' +
      rows[i][1] + ' / ' +
      '到着:' + rows[i][5] + ' / ' +
      '夕飯:' + rows[i][7]
    );
  }
  return lines.join('\n');
}

function getRecentLogRows_(limit) {
  try {
    var sheet = getOrCreateLogSheet_();
    if (!sheet) {
      return [];
    }

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow <= 1 || lastCol === 0) {
      return [];
    }

    var maxRows = Math.min(limit, lastRow - 1);
    var startRow = lastRow - maxRows + 1;
    var values = sheet.getRange(startRow, 1, maxRows, lastCol).getValues();
    values.reverse();
    return values;
  } catch (err) {
    return [];
  }
}

function replyText_(token, replyToken, text) {
  if (!replyToken || !text) {
    return;
  }
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({
      replyToken: replyToken,
      messages: [{ type: 'text', text: text }]
    }),
    muteHttpExceptions: true
  });
}

function formatDate_(value) {
  if (!value) {
    return '-';
  }
  try {
    var date = value instanceof Date ? value : new Date(value);
    return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm');
  } catch (err) {
    return String(value);
  }
}
