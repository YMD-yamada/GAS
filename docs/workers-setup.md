# Cloudflare Workers 版（推奨）

Google アカウントに依存せず、**Cloudflare** 上で Web 画面・LINE Webhook・送信ログをまとめて動かせます。  
トークン類は **Wrangler のシークレット** にだけ置き、GitHub には載せません。

## 前提

- [Cloudflare](https://dash.cloudflare.com/) のアカウント
- [Node.js](https://nodejs.org/)（LTS 推奨）
- LINE Developers の Messaging API チャネル（チャネルアクセストークン、送信先 `userId` / `groupId`）

### Windows（ARM64）での注意

`wrangler dev` が依存する **workerd** は、環境によっては **Windows ARM64 未対応**のことがあります。  
その場合は **WSL2（Linux 上の Node）** で同じ手順を実行するか、CI（GitHub Actions など）から `wrangler deploy` する運用を検討してください。

## 1. D1 データベースを作る

リポジトリの `workers/line-notification` で実行します。

```bash
cd workers/line-notification
npm install
npx wrangler d1 create line-notification-log
```

表示された `database_id` を `wrangler.toml` の `database_id = "..."` に貼り付けます。

## 2. マイグレーション（テーブル作成）

```bash
npx wrangler d1 migrations apply line-notification-log --local
npx wrangler d1 migrations apply line-notification-log --remote
```

## 3. シークレット設定

```bash
npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
npx wrangler secret put LINE_TO_ID
```

Webhook の署名検証を有効にする場合（推奨）:

```bash
npx wrangler secret put LINE_CHANNEL_SECRET
```

## 4. デプロイ

```bash
npx wrangler deploy
```

デプロイ後の URL（例: `https://line-notification-home.<あなた>.workers.dev`）を控えます。

## 5. LINE Developers の設定

- **Webhook URL**: `https://<Workerのホスト>/webhook`
- **Webhook の利用**: オン
- **応答メッセージ / あいさつメッセージ** は用途に合わせてオフ推奨（個別トークのコマンドと干渉しにくくなります）

個別トーク（1:1）で次のコマンドが使えます（GAS 版と同じ）。

- `最新`
- `ログ 3`（直近 3 件、最大 20）
- `夕飯` / `到着` / `予定`
- `ログ ヘルプ`

## 6. 画面から送信

ブラウザで Worker のルート（`/`）を開き、フォームから送信します。  
内部では `POST /api/send` に JSON が送られ、LINE Push と D1 ログが記録されます。

## トラブルシュート

- **401 on webhook**: `LINE_CHANNEL_SECRET` を設定しているのに、LINE 側のチャネルシークレットと不一致の可能性があります。
- **ログが空**: D1 の `database_id` 未設定・マイグレーション未適用・別 DB を見ている、のいずれかを確認してください。
