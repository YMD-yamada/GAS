/**
 * LINE Messaging API で家族へ帰宅連絡を Push 送信する Web アプリ
 *
 * 【初回セットアップ】
 * 1. LINE Developers で Messaging API チャネルを作成し、Channel access token を発行
 * 2. 送信先の userId（または groupId）を取得（Webhook または友だち追加時のイベント等）
 * 3. このスクリプトの「プロジェクトの設定」→「スクリプトのプロパティ」に以下を追加:
 *    - LINE_CHANNEL_ACCESS_TOKEN : チャネルアクセストークン
 *    - LINE_TO_ID               : 送信先の userId または groupId（groupId 取得時は自分の userId のまま）
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

  var text =
    '今から帰ります！\n' +
    '【到着予定】' + arrival + '\n' +
    '【夕飯】' + dinnerLine;

  if (scheduleOn) {
    text += '\n【予定】' + scheduleDetailText + '\n【予想帰宅】' + scheduleTimeText;
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
    return { ok: true };
  }

  return {
    ok: false,
    error: 'LINE API エラー (' + code + '): ' + body
  };
}
