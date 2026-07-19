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
    <div class="app-shell">
      <h1 class="app-title">おかえり連絡</h1>
      <p class="app-sub">家族に伝えるのは3つだけ<br />状態・到着・夕飯</p>
      <p class="text-center small mb-2" id="planBadge"></p>

      <div class="preview-wrap">
        <p class="preview-caption">家族に届くメッセージ</p>
        <div class="preview-bubble" id="preview"></div>
      </div>

      <section class="section" id="situationSection">
        <p class="section-label"><span class="step-num">1</span>いまの状態</p>
        <p class="section-hint">メッセージの1行目（題名）になります</p>
        <div class="chip-grid five" role="group">
          <button type="button" class="chip wide active" data-mode="none">そのまま帰る</button>
          <button type="button" class="chip" data-mode="overtime">残業しそう</button>
          <button type="button" class="chip" data-mode="late">遅れそう</button>
          <button type="button" class="chip" data-mode="drinking">飲み会</button>
          <button type="button" class="chip" data-mode="errand">寄り道</button>
          <button type="button" class="chip wide" data-mode="schedule">予定あり（買い物など）</button>
        </div>
        <div id="scheduleFields" class="inline-panel d-none" style="margin-top:0.75rem;padding:0.85rem 0.75rem;border-radius:0.85rem;background:#f0f7ff;border:1.5px solid #bfdbfe">
          <label for="scheduleDetail" class="field-label">何の予定？</label>
          <input id="scheduleDetail" type="text" maxlength="60" class="form-control" placeholder="例：買い物、病院" />
          <p class="field-label" style="margin-top:0.55rem">何時ごろ着く？</p>
          <div class="chip-grid" id="scheduleTimeGroup" role="group"></div>
          <input type="hidden" id="scheduleTime" value="" />
        </div>
      </section>

      <section class="section" id="arrivalSection">
        <p class="section-label"><span class="step-num" id="arrStep">2</span>家に着く時間</p>
        <div class="chip-grid" id="patternGroup" role="group"></div>
      </section>

      <section class="section">
        <p class="section-label"><span class="step-num" id="dinStep">3</span>夕飯どうする？</p>
        <div class="segment-wrap" role="group">
          <input type="radio" name="dinner" id="d-home" value="home" checked />
          <label for="d-home">家で食べる</label>
          <input type="radio" name="dinner" id="d-eat" value="eatOut" />
          <label for="d-eat">食べて帰る</label>
          <input type="radio" name="dinner" id="d-none" value="none" />
          <label for="d-none">いらない</label>
        </div>
      </section>

      <p class="footer-links"><a href="/about">このアプリについて</a> · <a href="/privacy">プライバシー</a></p>
    </div>

    <div class="send-bar">
      <div class="app-shell" style="padding-top:0;padding-bottom:0">
        <button type="button" class="btn btn-send w-100" id="btnSend">LINEに送る</button>
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

    var SCHEDULE_TIMES = ['19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00','23:30','翌日 00:00','翌日 00:30','翌日 01:00'];
    var patternGroup = document.getElementById('patternGroup');
    var scheduleTimeGroup = document.getElementById('scheduleTimeGroup');
    var btnSend = document.getElementById('btnSend');
    var preview = document.getElementById('preview');
    var scheduleFields = document.getElementById('scheduleFields');
    var arrivalSection = document.getElementById('arrivalSection');
    var arrStep = document.getElementById('arrStep');
    var dinStep = document.getElementById('dinStep');
    var modeChips = document.querySelectorAll('[data-mode]');
    var selectedMode = 'none';
    var selectedScheduleTime = '';
    var scheduleTime = document.getElementById('scheduleTime');
    var scheduleDetail = document.getElementById('scheduleDetail');
    var toastEl = document.getElementById('toast');
    var toastBody = document.getElementById('toastBody');
    var toast = new bootstrap.Toast(toastEl, { delay: 2200 });
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

    function hasSchedule() { return selectedMode === 'schedule'; }
    function situationKeyForApi() { return hasSchedule() ? 'none' : selectedMode; }

    function renderPatterns() {
      patternGroup.innerHTML = '';
      patterns.forEach(function (p, i) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip';
        btn.textContent = p.arrival;
        btn.addEventListener('click', function () { setPattern(i); });
        patternGroup.appendChild(btn);
      });
    }

    function renderScheduleTimes() {
      scheduleTimeGroup.innerHTML = '';
      SCHEDULE_TIMES.forEach(function (t) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip';
        btn.setAttribute('data-time', t);
        btn.textContent = t;
        btn.addEventListener('click', function () { setScheduleTime(t); });
        scheduleTimeGroup.appendChild(btn);
      });
    }

    function setPattern(i) {
      selectedIndex = i;
      patternGroup.querySelectorAll('.chip').forEach(function (btn, idx) {
        btn.classList.toggle('active', idx === i);
      });
      updatePreview();
    }

    function setScheduleTime(t) {
      selectedScheduleTime = t || '';
      scheduleTime.value = selectedScheduleTime;
      scheduleTimeGroup.querySelectorAll('.chip').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-time') === selectedScheduleTime);
      });
      updatePreview();
    }

    function setMode(mode) {
      selectedMode = mode || 'none';
      modeChips.forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === selectedMode);
      });
      syncLayout();
      if (hasSchedule() && !selectedScheduleTime) {
        var h = new Date().getHours();
        setScheduleTime(h < 20 ? '21:00' : h < 22 ? '23:00' : '翌日 00:00');
        setTimeout(function () { scheduleDetail.focus(); }, 50);
      } else {
        updatePreview();
      }
    }

    function syncLayout() {
      var show = hasSchedule();
      scheduleFields.classList.toggle('d-none', !show);
      arrivalSection.classList.toggle('d-none', show);
      if (arrStep) arrStep.textContent = '2';
      if (dinStep) dinStep.textContent = show ? '2' : '3';
    }

    function getDinnerKey() {
      var r = document.querySelector('input[name="dinner"]:checked');
      return r ? r.value : 'home';
    }

    function updatePreview() {
      var mode = resolveMessageMode(hasSchedule());
      var p = patterns[selectedIndex] || { label: '', arrival: '' };
      preview.textContent = buildMessageText({
        messageMode: mode,
        arrival: p.arrival,
        dinnerLine: DINNER_TEXT[getDinnerKey()],
        scheduleTime: selectedScheduleTime || '（未選択）',
        scheduleDetail: (scheduleDetail.value || '').trim() || '（内容未入力）',
        situationKey: situationKeyForApi()
      });
      btnSend.textContent = getSendButtonLabel();
    }

    function loadPatternsFromSettings() {
      patterns = (userSettings && userSettings.patterns) || [];
      renderPatterns();
      renderScheduleTimes();
      setPattern(0);
      setMode(selectedMode);
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

    modeChips.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setMode(btn.getAttribute('data-mode'));
      });
    });
    document.querySelectorAll('input[name="dinner"]').forEach(function (el) {
      el.addEventListener('change', updatePreview);
    });
    scheduleDetail.addEventListener('input', updatePreview);

    btnSend.addEventListener('click', function () {
      if (btnSend.disabled) return;
      if (hasSchedule()) {
        if (!scheduleDetail.value.trim()) { showToast('予定の内容を入力してください', false); return; }
        if (!selectedScheduleTime) { showToast('到着時間を選んでください', false); return; }
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
          scheduleTime: selectedScheduleTime,
          scheduleDetail: scheduleDetail.value.trim(),
          situationKey: situationKeyForApi()
        })
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (out) {
          btnSend.disabled = false;
          btnSend.textContent = prev;
          if (out.ok && out.data.ok) showToast('送りました', true);
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
