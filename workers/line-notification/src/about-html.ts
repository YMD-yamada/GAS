export const ABOUT_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>おかえり連絡 - 家族への帰宅・夕飯連絡をLINEで</title>
  <meta name="description" content="毎日の「何時に帰る」「夕飯どうする」をボタン一つで家族のLINEに送れる無料アプリ。仕事終了予定・今から帰る・予定ありに対応。" />
  <meta property="og:title" content="おかえり連絡" />
  <meta property="og:description" content="家族への帰宅・夕飯連絡をLINEでかんたん送信" />
  <meta property="og:type" content="website" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
  <style>
    body { background: linear-gradient(180deg, #f0f7ff 0%, #fff 40%); min-height: 100vh; }
    .hero { padding: 2.5rem 0 1.5rem; }
    .feature-icon { font-size: 1.75rem; }
    .ad-slot {
      min-height: 90px;
      background: #f8f9fa;
      border: 1px dashed #ced4da;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6c757d;
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <div class="container hero px-3">
    <h1 class="display-6 fw-bold text-center mb-2">おかえり連絡</h1>
    <p class="lead text-center text-muted mb-4">
      毎日の「何時ごろ帰る」「夕飯どうする」を<br />ボタン一つで家族のLINEに送れます
    </p>

    <div class="d-grid gap-2 col-md-8 mx-auto mb-4">
      <a href="/liff" class="btn btn-success btn-lg">LINEで使う（おすすめ）</a>
      <a href="/" class="btn btn-outline-primary">ブラウザで使う</a>
    </div>

    <div class="row g-3 col-lg-10 mx-auto mb-4">
      <div class="col-md-4">
        <div class="card h-100 border-0 shadow-sm">
          <div class="card-body text-center">
            <div class="feature-icon mb-2">📢</div>
            <h2 class="h6 fw-bold">題名で状態が分かる</h2>
            <p class="small text-muted mb-0">そのまま帰る／残業／飲み会などを1行目で伝えます</p>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card h-100 border-0 shadow-sm">
          <div class="card-body text-center">
            <div class="feature-icon mb-2">🕒</div>
            <h2 class="h6 fw-bold">到着の目安</h2>
            <p class="small text-muted mb-0">何時ごろ家に着くかをボタンで選べます</p>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card h-100 border-0 shadow-sm">
          <div class="card-body text-center">
            <div class="feature-icon mb-2">🍚</div>
            <h2 class="h6 fw-bold">夕飯の連絡</h2>
            <p class="small text-muted mb-0">家で食べる／食べて帰る／いらないをまとめて送信</p>
          </div>
        </div>
      </div>
    </div>

  <div class="col-lg-8 mx-auto mb-4">
      <div class="card border-0 shadow-sm">
        <div class="card-body">
          <h2 class="h6 fw-bold">料金</h2>
          <ul class="small mb-3">
            <li><strong>無料</strong> — 月30通まで、到着パターン3つまで</li>
            <li><strong>プレミアム（月390円）</strong> — 送信無制限・パターン無制限・ログ保存・広告なし</li>
          </ul>
          <button type="button" class="btn btn-warning btn-sm" id="btnPremium">プレミアムに申し込む</button>
          <p class="small text-muted mt-2 mb-0" id="premiumHint">LINEでログイン後にお申し込みいただけます</p>
        </div>
      </div>
    </div>

    <div class="col-lg-8 mx-auto mb-4 ad-slot" id="adSlot">
      <!-- AdSense: 審査通過後に script / data-ad-client を設定。無料ユーザー向け。送信画面には出さない -->
      広告枠（プレミアムユーザーには表示しません）
    </div>

    <p class="text-center small text-muted mb-2">
      初回は家族グループにボットを招待するだけ。技術的な設定は不要です。
    </p>
    <p class="text-center small text-muted">
      <a href="/">アプリを開く</a> ·
      <a href="/liff">LINEで開く</a> ·
      <a href="/privacy">プライバシー・利用規約</a>
    </p>
  </div>

  <script>
    document.getElementById('btnPremium').addEventListener('click', function () {
      var token = sessionStorage.getItem('liff_id_token');
      if (!token) {
        window.location.href = '/liff?next=premium';
        return;
      }
      fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.url) window.location.href = data.url;
          else alert(data.error || '決済ページを開けませんでした');
        })
        .catch(function () { alert('エラーが発生しました'); });
    });
  </script>
</body>
</html>`;
