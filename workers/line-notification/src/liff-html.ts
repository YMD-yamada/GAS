import { getMessageBuilderClientScript, PATTERN_PRESETS } from './message-builder';
import { UI_STYLES } from './ui-styles';

const CLIENT_SCRIPT = getMessageBuilderClientScript();
const presetKeys = Object.keys(PATTERN_PRESETS);

export function buildLiffHtml(liffId: string): string {
  const presetButtons = presetKeys
    .map(
      (key) =>
        `<button type="button" class="btn btn-outline-primary btn-sm preset-btn" data-preset="${key}">${PATTERN_PRESETS[key].label}</button>`
    )
    .join('\n        ');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>おかえり連絡</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
  <style>
    ${UI_STYLES}
    .wizard-step { display: none; }
    .wizard-step.active { display: block; }
    .step-dots span { width: 10px; height: 10px; border-radius: 50%; background: #dee2e6; display: inline-block; margin: 0 4px; }
    .step-dots span.on { background: #0d6efd; }
  </style>
</head>
<body>
  <div id="loading" class="container py-5 text-center">
    <div class="spinner-border text-primary" role="status"></div>
    <p class="mt-2 text-muted small">LINEに接続中...</p>
  </div>

  <div id="wizard" class="container py-3 px-3 d-none">
    <h1 class="h5 text-center fw-bold mb-1">はじめかた</h1>
    <p class="text-center text-muted small mb-3 step-dots"><span class="on" id="dot1"></span><span id="dot2"></span></p>

    <div class="wizard-step active" id="step1">
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body">
          <h2 class="h6 fw-bold">① 家族グループにボットを招待</h2>
          <ol class="small mb-0 ps-3">
            <li>家族のLINEグループを開く</li>
            <li>「招待」→ このボット（公式アカウント）を選ぶ</li>
            <li>グループで何かメッセージを送ると自動で連携されます</li>
          </ol>
          <p class="small text-muted mt-2 mb-0">グループではメンバー全員が通知を見られます。</p>
        </div>
      </div>
      <button type="button" class="btn btn-primary w-100" id="btnWizard1">招待した → 次へ</button>
      <button type="button" class="btn btn-link w-100 btn-sm mt-2" id="btnSkipWizard">あとで設定する</button>
    </div>

    <div class="wizard-step" id="step2">
      <p class="small fw-semibold text-secondary mb-2">② 到着時間のパターンを選ぶ</p>
      <div class="d-flex flex-wrap gap-2 mb-3">
        ${presetButtons}
      </div>
      <p class="small text-muted">あとから変更できます</p>
      <button type="button" class="btn btn-success w-100" id="btnWizardDone">はじめる</button>
    </div>
  </div>

  <div id="app" class="d-none">
    <div class="container py-3 px-3">
      <h1 class="h5 text-center mb-1 fw-bold">おかえり連絡</h1>
      <p class="text-center text-muted small mb-2">仕事終了予定・帰宅時間を家族にLINEで送る</p>
      <p class="text-center small mb-3" id="planBadge"></p>

      <p class="small fw-semibold text-secondary mb-2">何ごろ帰る？</p>
      <div class="d-grid gap-2 mb-4" id="patternGroup"></div>

      <p class="small fw-semibold text-secondary mb-2">夕飯</p>
      <div class="segment-wrap mb-3" role="group">
        <input type="radio" name="dinner" id="d-home" value="home" checked />
        <label for="d-home">家で食べる</label>
        <input type="radio" name="dinner" id="d-eat" value="eatOut" />
        <label for="d-eat">食べて帰る</label>
        <input type="radio" name="dinner" id="d-none" value="none" />
        <label for="d-none">いらない</label>
      </div>

      <div id="situationWrap">
        <p class="small fw-semibold text-secondary mb-2">題名（どんな感じ？）</p>
        <select id="situationKey" class="form-select mb-3">
          <option value="none">そのまま帰る</option>
          <option value="overtime">残業しそう</option>
          <option value="drinking">飲み会</option>
          <option value="late">遅れそう</option>
          <option value="errand">寄り道</option>
        </select>
      </div>

      <p class="small fw-semibold text-secondary mb-2">予定</p>
      <div class="segment-wrap mb-3" role="group">
        <input type="radio" name="scheduleMode" id="s-none" value="none" checked />
        <label for="s-none">予定なし</label>
        <input type="radio" name="scheduleMode" id="s-has" value="has" />
        <label for="s-has">予定あり</label>
      </div>

      <div id="scheduleFields" class="border rounded-3 p-3 mb-3 d-none bg-white">
        <label for="scheduleTime" class="form-label small fw-semibold mb-1">予想帰宅時間</label>
        <select id="scheduleTime" class="form-select mb-2">
          <option value="">選択してください</option>
          <option value="19:00">19:00</option><option value="20:00">20:00</option>
          <option value="21:00">21:00</option><option value="22:00">22:00</option>
          <option value="23:00">23:00</option>
        </select>
        <label for="scheduleDetail" class="form-label small fw-semibold mb-1">予定の内容</label>
        <input id="scheduleDetail" type="text" maxlength="60" class="form-control" placeholder="例：買い物" />
      </div>

      <p class="small fw-semibold text-secondary mb-2">プレビュー</p>
      <div class="preview-card rounded-3 p-3 mb-2" id="preview"></div>
      <p class="text-center small"><a href="/about">このアプリについて</a> · <a href="/privacy">プライバシー</a></p>
    </div>

    <div class="send-bar">
      <div class="container px-3">
        <button type="button" class="btn btn-send w-100 rounded-3 shadow-sm" id="btnSend">LINEに送る</button>
      </div>
    </div>
  </div>

  <div class="toast-container position-fixed bottom-0 start-50 translate-middle-x p-3" style="bottom:5.5rem!important">
    <div id="toast" class="toast align-items-center text-bg-success border-0">
      <div class="d-flex">
        <div class="toast-body" id="toastBody"></div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  </div>

  <script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    ${CLIENT_SCRIPT}

    var LIFF_ID = ${JSON.stringify(liffId)};
    var idToken = '';
    var userSettings = null;
    var patterns = [];
    var selectedIndex = 0;
    var selectedPreset = 'regular';

    var patternGroup = document.getElementById('patternGroup');
    var btnSend = document.getElementById('btnSend');
    var preview = document.getElementById('preview');
    var scheduleFields = document.getElementById('scheduleFields');
    var situationWrap = document.getElementById('situationWrap');
    var situationKey = document.getElementById('situationKey');
    var scheduleTime = document.getElementById('scheduleTime');
    var scheduleDetail = document.getElementById('scheduleDetail');
    var toastEl = document.getElementById('toast');
    var toastBody = document.getElementById('toastBody');
    var toast = new bootstrap.Toast(toastEl, { delay: 2500 });
    var DINNER_TEXT = { home: '家で食べます', eatOut: '食べて帰ります', none: 'いりません' };

    function showToast(msg, ok) {
      toastBody.textContent = msg;
      toastEl.classList.toggle('text-bg-success', ok !== false);
      toastEl.classList.toggle('text-bg-danger', ok === false);
      toast.show();
    }

    function authHeaders() {
      return { Authorization: 'Bearer ' + idToken, 'Content-Type': 'application/json', Accept: 'application/json' };
    }

    function showWizard() {
      document.getElementById('loading').classList.add('d-none');
      document.getElementById('wizard').classList.remove('d-none');
    }

    function showApp() {
      document.getElementById('loading').classList.add('d-none');
      document.getElementById('wizard').classList.add('d-none');
      document.getElementById('app').classList.remove('d-none');
      var plan = (userSettings && userSettings.user && userSettings.user.plan) || 'free';
      document.getElementById('planBadge').textContent =
        plan === 'premium'
          ? 'プレミアム'
          : '無料プラン（月30通・パターン3つまで）';
    }

    function renderPatterns() {
      patternGroup.innerHTML = '';
      patterns.forEach(function (p, i) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn pattern-btn';
        btn.innerHTML = '到着 ' + p.arrival;
        btn.addEventListener('click', function () { setPattern(i); });
        patternGroup.appendChild(btn);
      });
    }

    function setPattern(i) {
      selectedIndex = i;
      patternGroup.querySelectorAll('.pattern-btn').forEach(function (btn, idx) {
        btn.classList.toggle('active', idx === i);
      });
      updatePreview();
    }

    function getSituationKey() {
      return situationKey ? situationKey.value : 'none';
    }
    function getDinnerKey() {
      var r = document.querySelector('input[name="dinner"]:checked');
      return r ? r.value : 'home';
    }
    function hasSchedule() {
      var r = document.querySelector('input[name="scheduleMode"]:checked');
      return !!r && r.value === 'has';
    }
    function effectiveMessageMode() {
      return resolveMessageMode(hasSchedule());
    }

    function updateScheduleFields() {
      var show = hasSchedule();
      scheduleFields.classList.toggle('d-none', !show);
      situationWrap.classList.toggle('d-none', show);
      if (show && situationKey) situationKey.value = 'none';
      updatePreview();
    }

    function updatePreview() {
      var mode = effectiveMessageMode();
      var p = patterns[selectedIndex] || { label: '', arrival: '' };
      preview.textContent = buildMessageText({
        messageMode: mode,
        arrival: p.arrival,
        dinnerLine: DINNER_TEXT[getDinnerKey()],
        scheduleTime: scheduleTime.value || '（未選択）',
        scheduleDetail: (scheduleDetail.value || '').trim() || '（内容未入力）',
        situationKey: getSituationKey()
      });
      btnSend.textContent = getSendButtonLabel();
    }

    function loadPatternsFromSettings() {
      patterns = (userSettings && userSettings.patterns) || [];
      renderPatterns();
      setPattern(0);
      updateScheduleFields();
    }

    function initLiff() {
      if (!LIFF_ID) {
        showToast('LIFF_ID が未設定です。管理者に連絡してください', false);
        return;
      }
      liff.init({ liffId: LIFF_ID })
        .then(function () {
          if (!liff.isLoggedIn()) {
            liff.login({ redirectUri: window.location.href.split('?')[0] });
            return;
          }
          idToken = liff.getIDToken();
          sessionStorage.setItem('liff_id_token', idToken);
          return fetch('/api/auth/liff', { method: 'POST', headers: authHeaders() });
        })
        .then(function (res) { return res && res.json(); })
        .then(function (data) {
          if (!data || !data.ok) throw new Error((data && data.error) || '認証に失敗しました');
          userSettings = data;
          if (data.needsOnboarding) {
            showWizard();
          } else {
            showApp();
            loadPatternsFromSettings();
          }
          var params = new URLSearchParams(window.location.search);
          if (params.get('next') === 'premium') {
            window.location.href = '/about';
          }
        })
        .catch(function (err) {
          document.getElementById('loading').innerHTML = '<p class="text-danger">' + (err.message || err) + '</p>';
        });
    }

    document.getElementById('btnWizard1').addEventListener('click', function () {
      document.getElementById('step1').classList.remove('active');
      document.getElementById('step2').classList.add('active');
      document.getElementById('dot1').classList.remove('on');
      document.getElementById('dot2').classList.add('on');
    });

    document.querySelectorAll('.preset-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedPreset = btn.getAttribute('data-preset');
        document.querySelectorAll('.preset-btn').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
      });
    });

    function finishOnboarding() {
      fetch('/api/settings', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ preset: selectedPreset, completeOnboarding: true })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.ok) throw new Error(data.error || '設定の保存に失敗');
          userSettings = data;
          showApp();
          loadPatternsFromSettings();
        })
        .catch(function (err) { showToast(err.message || String(err), false); });
    }

    document.getElementById('btnWizardDone').addEventListener('click', finishOnboarding);
    document.getElementById('btnSkipWizard').addEventListener('click', function () {
      selectedPreset = 'regular';
      finishOnboarding();
    });

    document.querySelectorAll('input[name="dinner"]').forEach(function (el) {
      el.addEventListener('change', updatePreview);
    });
    if (situationKey) {
      situationKey.addEventListener('change', updatePreview);
    }
    document.querySelectorAll('input[name="scheduleMode"]').forEach(function (el) {
      el.addEventListener('change', updateScheduleFields);
    });
    scheduleTime.addEventListener('change', updatePreview);
    scheduleDetail.addEventListener('input', updatePreview);

    btnSend.addEventListener('click', function () {
      if (btnSend.disabled) return;
      if (hasSchedule()) {
        if (!scheduleTime.value) { showToast('予想帰宅時間を選択してください', false); return; }
        if (!scheduleDetail.value.trim()) { showToast('予定の内容を入力してください', false); return; }
      }
      btnSend.disabled = true;
      var prev = btnSend.textContent;
      btnSend.textContent = '送信中...';
      fetch('/api/send', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          patternIndex: selectedIndex,
          dinnerKey: getDinnerKey(),
          hasSchedule: hasSchedule(),
          scheduleTime: scheduleTime.value,
          scheduleDetail: scheduleDetail.value.trim(),
          situationKey: getSituationKey()
        })
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (out) {
          btnSend.disabled = false;
          btnSend.textContent = prev;
          if (out.ok && out.data.ok) showToast('送信しました', true);
          else showToast((out.data && out.data.error) || '送信失敗', false);
        })
        .catch(function (err) {
          btnSend.disabled = false;
          btnSend.textContent = prev;
          showToast(String(err), false);
        });
    });

    initLiff();
  </script>
</body>
</html>`;
}
