import { getMessageBuilderClientScript } from './message-builder';
import { UI_STYLES } from './ui-styles';

const CLIENT_SCRIPT = getMessageBuilderClientScript();

export const PAGE_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#198754" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <link rel="manifest" href="/manifest.json" />
  <title>おかえり連絡</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
  <style>${UI_STYLES}</style>
</head>
<body>
  <div class="app-shell">
    <h1 class="app-title">おかえり連絡</h1>
    <p class="app-sub">家族に伝えるのは3つだけ<br />状態・到着・夕飯</p>

    <div class="preview-wrap">
      <p class="preview-caption">家族に届くメッセージ</p>
      <div class="preview-bubble" id="preview" aria-live="polite"></div>
    </div>

    <section class="section" id="situationSection" aria-labelledby="sitLabel">
      <p class="section-label" id="sitLabel"><span class="step-num">1</span>いまの状態</p>
      <p class="section-hint">メッセージの1行目（題名）になります</p>
      <div class="chip-grid five" role="group" aria-label="いまの状態">
        <button type="button" class="chip wide active" data-situation="none">そのまま帰る</button>
        <button type="button" class="chip" data-situation="overtime">残業しそう</button>
        <button type="button" class="chip" data-situation="late">遅れそう</button>
        <button type="button" class="chip" data-situation="drinking">飲み会</button>
        <button type="button" class="chip" data-situation="errand">寄り道</button>
      </div>
    </section>

    <section class="section" id="arrivalSection" aria-labelledby="arrLabel">
      <p class="section-label" id="arrLabel"><span class="step-num">2</span>家に着く時間</p>
      <p class="section-hint">メッセージの2行目になります</p>
      <div class="chip-grid" id="patternGroup" role="group" aria-label="到着時間"></div>
    </section>

    <section class="section" aria-labelledby="dinLabel">
      <p class="section-label" id="dinLabel"><span class="step-num">3</span>夕飯どうする？</p>
      <p class="section-hint">メッセージの3行目になります</p>
      <div class="segment-wrap" role="group" aria-label="夕飯">
        <input type="radio" name="dinner" id="d-home" value="home" checked />
        <label for="d-home">家で食べる</label>
        <input type="radio" name="dinner" id="d-eat" value="eatOut" />
        <label for="d-eat">食べて帰る</label>
        <input type="radio" name="dinner" id="d-none" value="none" />
        <label for="d-none">いらない</label>
      </div>
    </section>

    <section class="section" aria-labelledby="schLabel">
      <p class="section-label" id="schLabel">用事・予定がある？</p>
      <p class="section-hint">買い物・病院など。選ぶと題名が「予定：」になります</p>
      <div class="segment-wrap" role="group" aria-label="予定の有無">
        <input type="radio" name="scheduleMode" id="s-none" value="none" checked />
        <label for="s-none">なし</label>
        <input type="radio" name="scheduleMode" id="s-has" value="has" />
        <label for="s-has">あり</label>
      </div>

      <div id="scheduleFields" class="schedule-panel d-none">
        <label for="scheduleDetail" class="field-label">何の予定？</label>
        <input
          id="scheduleDetail"
          type="text"
          maxlength="60"
          class="form-control mb-2"
          placeholder="例：買い物、病院、美容院"
          autocomplete="off"
        />
        <label for="scheduleTime" class="field-label">そのあと、何時ごろ着く？</label>
        <select id="scheduleTime" class="form-select">
          <option value="">選んでください</option>
          <option value="19:00">19:00</option>
          <option value="19:30">19:30</option>
          <option value="20:00">20:00</option>
          <option value="20:30">20:30</option>
          <option value="21:00">21:00</option>
          <option value="21:30">21:30</option>
          <option value="22:00">22:00</option>
          <option value="22:30">22:30</option>
          <option value="23:00">23:00</option>
          <option value="23:30">23:30</option>
          <option value="翌日 00:00">翌日 00:00</option>
          <option value="翌日 00:30">翌日 00:30</option>
          <option value="翌日 01:00">翌日 01:00</option>
        </select>
      </div>
    </section>

    <p class="footer-links"><a href="/about">このアプリについて</a> · <a href="/privacy">プライバシー</a></p>
  </div>

  <div class="send-bar">
    <div class="app-shell" style="padding-top:0;padding-bottom:0">
      <button type="button" class="btn btn-send w-100" id="btnSend">LINEに送る</button>
    </div>
  </div>

  <div class="toast-container position-fixed bottom-0 start-50 translate-middle-x p-3" style="bottom:5.5rem!important">
    <div id="toast" class="toast align-items-center text-bg-success border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body" id="toastBody">送信しました</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    ${CLIENT_SCRIPT}

    var STORAGE_KEY = 'okaeri_prefs_v3';
    var DINNER_TEXT = { home: '家で食べます', eatOut: '食べて帰ります', none: 'いりません' };
    var patterns = [];
    var selectedIndex = 0;
    var selectedSituation = 'none';
    var patternGroup = document.getElementById('patternGroup');
    var situationSection = document.getElementById('situationSection');
    var arrivalSection = document.getElementById('arrivalSection');
    var btnSend = document.getElementById('btnSend');
    var preview = document.getElementById('preview');
    var scheduleFields = document.getElementById('scheduleFields');
    var scheduleTime = document.getElementById('scheduleTime');
    var scheduleDetail = document.getElementById('scheduleDetail');
    var situationChips = document.querySelectorAll('[data-situation]');
    var toastEl = document.getElementById('toast');
    var toastBody = document.getElementById('toastBody');
    var toast = toastEl ? new bootstrap.Toast(toastEl, { delay: 2200 }) : null;

    function showToast(msg, ok) {
      if (!toast) { alert(msg); return; }
      toastBody.textContent = msg;
      toastEl.classList.toggle('text-bg-success', ok !== false);
      toastEl.classList.toggle('text-bg-danger', ok === false);
      toast.show();
    }

    function defaultPatternIndex() {
      var h = new Date().getHours();
      if (h < 17) return 0;
      if (h < 18) return 1;
      if (h < 19) return 2;
      if (h < 20) return 3;
      return Math.min(4, Math.max(0, patterns.length - 1));
    }

    function renderPatterns() {
      patternGroup.innerHTML = '';
      patterns.forEach(function (p, i) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip';
        btn.setAttribute('data-index', String(i));
        btn.textContent = p.arrival;
        btn.addEventListener('click', function () { setPattern(i); });
        patternGroup.appendChild(btn);
      });
    }

    function setPattern(index) {
      selectedIndex = index;
      patternGroup.querySelectorAll('.chip').forEach(function (btn, i) {
        btn.classList.toggle('active', i === index);
        btn.setAttribute('aria-pressed', i === index ? 'true' : 'false');
      });
      savePrefs();
      updatePreview();
    }

    function setSituation(key) {
      selectedSituation = key || 'none';
      situationChips.forEach(function (btn) {
        var on = btn.getAttribute('data-situation') === selectedSituation;
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      savePrefs();
      updatePreview();
    }

    function getDinnerKey() {
      var r = document.querySelector('input[name="dinner"]:checked');
      return r ? r.value : 'home';
    }

    function hasSchedule() {
      var r = document.querySelector('input[name="scheduleMode"]:checked');
      return !!r && r.value === 'has';
    }

    function updateScheduleFields() {
      var show = hasSchedule();
      scheduleFields.classList.toggle('d-none', !show);
      situationSection.classList.toggle('d-none', show);
      arrivalSection.classList.toggle('d-none', show);
      if (show) {
        selectedSituation = 'none';
        setSituation('none');
      }
      savePrefs();
      updatePreview();
    }

    function updatePreview() {
      var mode = resolveMessageMode(hasSchedule());
      var p = patterns[selectedIndex] || { label: '', arrival: '' };
      var text = buildMessageText({
        messageMode: mode,
        arrival: p.arrival,
        dinnerLine: DINNER_TEXT[getDinnerKey()],
        scheduleTime: scheduleTime.value || '（未選択）',
        scheduleDetail: (scheduleDetail.value || '').trim() || '（内容未入力）',
        situationKey: selectedSituation
      });
      preview.textContent = text;
      preview.classList.toggle('empty', !text);
      btnSend.textContent = getSendButtonLabel();
    }

    function savePrefs() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          patternIndex: selectedIndex,
          dinnerKey: getDinnerKey(),
          situationKey: selectedSituation,
          scheduleMode: hasSchedule() ? 'has' : 'none',
          scheduleTime: scheduleTime.value,
          scheduleDetail: scheduleDetail.value
        }));
      } catch (e) {}
    }

    function loadPrefs() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        var p = JSON.parse(raw);
        if (p.dinnerKey) {
          var d = document.querySelector('input[name="dinner"][value="' + p.dinnerKey + '"]');
          if (d) d.checked = true;
        }
        if (p.situationKey) selectedSituation = p.situationKey;
        if (p.scheduleMode === 'has') {
          document.getElementById('s-has').checked = true;
        }
        if (p.scheduleTime) scheduleTime.value = p.scheduleTime;
        if (p.scheduleDetail) scheduleDetail.value = p.scheduleDetail;
        if (typeof p.patternIndex === 'number' && p.patternIndex < patterns.length) {
          selectedIndex = p.patternIndex;
        }
      } catch (e) {}
    }

    situationChips.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setSituation(btn.getAttribute('data-situation'));
      });
    });

    document.querySelectorAll('input[name="dinner"]').forEach(function (el) {
      el.addEventListener('change', function () { savePrefs(); updatePreview(); });
    });
    document.querySelectorAll('input[name="scheduleMode"]').forEach(function (el) {
      el.addEventListener('change', updateScheduleFields);
    });
    scheduleTime.addEventListener('change', function () { savePrefs(); updatePreview(); });
    scheduleDetail.addEventListener('input', function () { savePrefs(); updatePreview(); });

    var fallbackPatterns = [
      { label: '17時半終了', arrival: '19:00前' },
      { label: '18時前終了', arrival: '19:00すぎ' },
      { label: '18時半終了', arrival: '20:00前' },
      { label: '19時半終了', arrival: '21:00前' },
      { label: '20時半終了', arrival: '22:00前' }
    ];

    function boot(list) {
      patterns = list && list.length ? list : fallbackPatterns;
      renderPatterns();
      loadPrefs();
      setSituation(selectedSituation);
      if (!localStorage.getItem(STORAGE_KEY)) setPattern(defaultPatternIndex());
      else setPattern(selectedIndex);
      updateScheduleFields();
    }

    fetch('/api/patterns')
      .then(function (r) { return r.json(); })
      .then(function (data) { boot((data && data.patterns) || []); })
      .catch(function () { boot(fallbackPatterns); });

    btnSend.addEventListener('click', function () {
      if (btnSend.disabled) return;
      if (hasSchedule()) {
        if (!(scheduleDetail.value || '').trim()) {
          showToast('予定の内容を入力してください', false);
          scheduleDetail.focus();
          return;
        }
        if (!scheduleTime.value) {
          showToast('到着時間を選んでください', false);
          scheduleTime.focus();
          return;
        }
      }
      btnSend.disabled = true;
      var prevLabel = btnSend.textContent;
      btnSend.textContent = '送信中...';

      fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          patternIndex: selectedIndex,
          dinnerKey: getDinnerKey(),
          hasSchedule: hasSchedule(),
          scheduleTime: scheduleTime.value,
          scheduleDetail: scheduleDetail.value.trim(),
          situationKey: selectedSituation
        })
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (out) {
          btnSend.disabled = false;
          btnSend.textContent = prevLabel;
          if (out.ok && out.data && out.data.ok) {
            showToast('送りました', true);
            savePrefs();
          } else {
            showToast((out.data && out.data.error) || '送信に失敗しました', false);
          }
        })
        .catch(function (err) {
          btnSend.disabled = false;
          btnSend.textContent = prevLabel;
          showToast(err && err.message ? err.message : String(err), false);
        });
    });
  </script>
</body>
</html>`;
