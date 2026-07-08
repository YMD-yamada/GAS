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

| 項目 | 内容 |
|------|------|
| **題名** | そのまま帰る / 残業・飲み会など（1行目になる） |
| **何ごろ帰る？** | 到着の目安（2行目） |
| **夕飯** | 食事の有無（3行目） |
| **予定あり** | 題名が「予定：〇〇」になる（内容を入力） |

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

GitHub Actions が `d1 migrations apply --remote` を実行します（失敗してもデプロイは続行）。

手動の場合（D1 SQL コンソール）:

```sql
-- 0002（個人利用で推奨）
ALTER TABLE notification_log ADD COLUMN message_mode TEXT;
```

`0003_multi_tenant.sql` は第三者向け機能を使うときだけ必要です。

## 4. LINE ログコマンド

個別トーク（1:1）および家族グループ内で次が使えます。

- `最新` / `ログ 3` / `夕飯` / `到着` / `予定` / `ログ ヘルプ`

## 第三者向けパス（コード済み）

| URL | 用途 |
|-----|------|
| `/liff` | LIFF 送信 UI + 2ステップウィザード |
| `/about` | ランディング・料金・広告枠 |
| `/privacy` | プライバシーポリシー・利用規約 |

第三者公開時は `LIFF_ID`・Stripe シークレット・`0003_multi_tenant.sql` を適用してください。

無料プラン制限（LIFF 認証ユーザー）: 月30通・到着パターン最大3つ。

## トラブルシュート

- **401 on webhook**: `LINE_CHANNEL_SECRET` と LINE 側のチャネルシークレットの不一致
- **ログが空**: D1 の `database_id` 未設定・マイグレーション未適用
- **`npx wrangler` が動かない**: GitHub Actions 経由でデプロイ

---

## 将来メモ

個人利用だけで十分な場合は `LINE_*` シークレットのみで運用できます。LIFF / Stripe は設定しなければ経路は休眠します。
