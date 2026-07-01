# Cloudflare Workers 版（推奨）

Google アカウントに依存せず、**Cloudflare** 上で Web 画面・LINE Webhook・送信ログをまとめて動かせます。  
トークン類は **Wrangler のシークレット** にだけ置き、GitHub には載せません。

## 個人利用で公開する（いまやること）

すでに Worker がデプロイ済みの場合は、`main` へ push するだけで更新されます。

### チェックリスト

1. **Cloudflare シークレット**（[Workers 設定](https://dash.cloudflare.com/?to=/:account/workers) → `line-notification-home` → Settings → Variables）
   - `LINE_CHANNEL_ACCESS_TOKEN` — Messaging API トークン
   - `LINE_TO_ID` — 送信先の userId または groupId
   - （推奨）`LINE_CHANNEL_SECRET` — Webhook 署名検証用

2. **D1 マイグレーション** — GitHub Actions が push 時に自動適用します。手動の場合は `0002_add_message_mode.sql` まで実行（個人利用に必須）。

3. **LINE Developers**
   - Webhook URL: `https://line-notification-home.ymd-hude.workers.dev/webhook`
   - Webhook の利用: オン

4. **スマホで使う** — https://line-notification-home.ymd-hude.workers.dev/ を開き、ホーム画面に追加（PWA）

### 送信画面の使い方

| 連絡の種類 | いつ使うか |
|-----------|-----------|
| **仕事終了** | まだ帰らないが、終了予定・到着目安を伝える（デフォルト） |
| **今から帰る** | 退勤・出発した瞬間 |
| **予定あり** | 帰宅前の用事（見出しは自動で「予定の連絡」に） |

---

## 前提

- [Cloudflare](https://dash.cloudflare.com/) のアカウント
- [Node.js](https://nodejs.org/)（LTS 推奨）
- LINE Developers の Messaging API チャネル（チャネルアクセストークン、送信先 `userId` / `groupId`）

### Windows（ARM64）での注意

`wrangler` が依存する **workerd** は、環境によって **Windows ARM64 未対応**で落ちます。  
ローカル CLI が使えない場合は **Cloudflare Dashboard + GitHub Actions** で進めてください。

## 1. D1 データベースを作る（初回のみ）

- Dashboard: [Cloudflare D1](https://dash.cloudflare.com/?to=/:account/workers/d1)
- `Create database` → 名前 `line-notification-log`
- `workers/line-notification/wrangler.toml` の `database_id` を置換

## 2. GitHub Actions でデプロイ

リポジトリ Settings → [Actions secrets](https://github.com/YMD-yamada/GAS/settings/secrets/actions)

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

`main` に push すると自動デプロイされます。

## 3. マイグレーション

GitHub Actions が `d1 migrations apply --remote` を実行します。

手動の場合（D1 SQL コンソール）:

- `migrations/0001_init.sql`
- `migrations/0002_add_message_mode.sql`（個人利用で必須）

`0003_multi_tenant.sql` は第三者向け機能を使うときだけ必要です。

## 4. LINE ログコマンド（1:1 トーク）

- `最新` / `ログ 3` / `夕飯` / `到着` / `予定` / `ログ ヘルプ`

## トラブルシュート

- **401 on webhook**: `LINE_CHANNEL_SECRET` と LINE 側のチャネルシークレットの不一致
- **ログが空**: D1 の `database_id` 未設定・マイグレーション未適用
- **`npx wrangler` が動かない**: GitHub Actions 経由でデプロイ

---

## 将来: 第三者向け（LIFF・課金）

公開を広げる段階で以下を追加します（個人利用では不要）。

| 設定 | 用途 |
|------|------|
| `LIFF_ID` | `/liff` ミニアプリ |
| `STRIPE_*` | プレミアム課金 |
| `0003_multi_tenant.sql` | ユーザー別設定・グループ連携 |

詳細はコード内 `src/liff-html.ts`, `src/tenant.ts` を参照。
