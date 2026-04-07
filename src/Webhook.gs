/**
 * LINE Webhook 用（ユーザー ID の取得ログ・任意で自動保存）
 * ウェブアプリとしてデプロイし、LINE Developers の Webhook URL に設定する。
 */

/**
 * ブラウザで URL を開いたときの疎通確認
 */
function doGet() {
  return ContentService.createTextOutput('OK (LINE Webhook endpoint)');
}

/**
 * LINE からのコールバック
 */
function doPost(e) {
  var body = e.postData && e.postData.contents ? e.postData.contents : '';
  var secret = PropertiesService.getScriptProperties().getProperty(PROP.LINE_CHANNEL_SECRET);

  if (secret && e.headers) {
    var sig =
      e.headers['X-Line-Signature'] ||
      e.headers['x-line-signature'] ||
      e.headers['X-line-signature'];
    if (sig && !verifyLineSignature_(body, sig, secret)) {
      return ContentService.createTextOutput('Forbidden').setHttpStatusCode(403);
    }
  }

  try {
    var json = JSON.parse(body);
    var events = json.events || [];
    for (var i = 0; i < events.length; i++) {
      handleEvent_(events[i]);
    }
  } catch (err) {
    console.error(err);
  }

  return ContentService.createTextOutput('OK');
}

/**
 * follow / message から userId をログし、LINE_TO_USER_ID が空なら保存（家族用の簡易運用）
 */
function handleEvent_(event) {
  var type = event.type;
  var source = event.source || {};
  var userId = source.userId;
  if (!userId) {
    return;
  }

  console.log('検出した userId（この値をスクリプトのプロパティ LINE_TO_USER_ID にコピーできます）: ' + userId);

  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty(PROP.LINE_TO_USER_ID)) {
    props.setProperty(PROP.LINE_TO_USER_ID, userId);
    console.log('LINE_TO_USER_ID が空だったため、自動で保存しました。意図しない ID の場合はプロパティを修正し、トークン再発行も検討してください。');
  }
}

/**
 * @param {string} body 生の POST ボディ
 * @param {string} signatureHeader X-Line-Signature
 * @param {string} channelSecret チャネルシークレット
 */
function verifyLineSignature_(body, signatureHeader, channelSecret) {
  var hmac = Utilities.computeHmacSha256Signature(body, channelSecret);
  var expected = Utilities.base64Encode(hmac);
  return expected === signatureHeader;
}
