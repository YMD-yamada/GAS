# Cloudflare Workers 版（推奨）

Google アカウントに依存せず、**Cloudflare** 上で Web 画面・LINE Webhook・送信ログをまとめて動かせます。  
トークン類は **Wrangler のシークレット** にだけ置き、GitHub には載せません。

## 前提

- [Cloudflare](https://dash.cloudflare.com/) のアカウント
- [Node.js](https://nodejs.org/)（LTS 推奨）
- LINE Developers の Messaging API チャネル（チャネルアクセストークン、送信先 `userId` / `groupId`）

### Windows（ARM64）での注意（今回ここで詰まりやすい）

`wrangler` が依存する **workerd** は、環境によって **Windows ARM64 未対応**で落ちます。  
今回のように `npm warn cleanup` のあと進まない場合、ローカル CLI での作成は避け、**Cloudflare Dashboard + GitHub Actions** で進めるのが最短です。

## 1. D1 データベースを作る（Dashboard で実施）

- Dashboard: [Cloudflare D1](https://dash.cloudflare.com/?to=/:account/workers/d1)
- `Create database` を押し、名前を `line-notification-log` にする
- 作成後に表示される **Database ID** をコピー
- `workers/line-notification/wrangler.toml` の `database_id = "REPLACE_WITH_D1_DATABASE_ID"` を置換

## 2. GitHub Actions でデプロイする準備（推奨）

リポジトリ Settings で、次の Secrets を追加します。  
GitHub の Secrets 画面: [Actions secrets](https://github.com/YMD-yamada/GAS/settings/secrets/actions)

- `CLOUDFLARE_API_TOKEN`（Cloudflare API Token）
- `CLOUDFLARE_ACCOUNT_ID`（Cloudflare Account ID）

API Token は以下で作成:
- [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
- テンプレートは `Edit Cloudflare Workers` ベース推奨
- 権限例: Workers Scripts/D1 の編集権限（対象アカウント）

Account ID の確認:
- [Cloudflare dashboard home](https://dash.cloudflare.com/)
- 右サイドバーの `Account ID` をコピー

## 3. シークレット設定（Cloudflare 側）

Dashboard の Worker から設定します:
- [Cloudflare Workers](https://dash.cloudflare.com/?to=/:account/workers)
- 対象 Worker > `Settings` > `Variables`
- `Secrets` に次を追加
  - `LINE_CHANNEL_ACCESS_TOKEN`
  - `LINE_TO_ID`
  - （推奨）`LINE_CHANNEL_SECRET`

## 4. デプロイ

`main` に push すると GitHub Actions で自動デプロイします（workflow を同梱済み）。

## 5. 初回マイグレーション（D1 テーブル作成）

ローカル CLI を使わずに行う場合、次のいずれか:

1) 可能なら WSL2 / Linux で以下を1回だけ実行
```bash
npx wrangler@3.112.0 d1 migrations apply line-notification-log --remote
```

2) それも難しい場合は、D1 の SQL コンソールで `workers/line-notification/migrations/0001_init.sql` を実行

デプロイ後の URL（例: `https://line-notification-home.<あなた>.workers.dev`）を控えます。

## 6. LINE Developers の設定

- **Webhook URL**: `https://<Workerのホスト>/webhook`
- **Webhook の利用**: オン
- **応答メッセージ / あいさつメッセージ** は用途に合わせてオフ推奨（個別トークのコマンドと干渉しにくくなります）

個別トーク（1:1）で次のコマンドが使えます（GAS 版と同じ）。

- `最新`
- `ログ 3`（直近 3 件、最大 20）
- `夕飯` / `到着` / `予定`
- `ログ ヘルプ`

## 7. 画面から送信

ブラウザで Worker のルート（`/`）を開き、フォームから送信します。  
内部では `POST /api/send` に JSON が送られ、LINE Push と D1 ログが記録されます。

## トラブルシュート

- **401 on webhook**: `LINE_CHANNEL_SECRET` を設定しているのに、LINE 側のチャネルシークレットと不一致の可能性があります。
- **ログが空**: D1 の `database_id` 未設定・マイグレーション未適用・別 DB を見ている、のいずれかを確認してください。
- **`npx wrangler ...` が実行できない**: Windows ARM64 の `workerd` 非対応が原因のことがあります。Dashboard と GitHub Actions を使う運用に切り替えてください。
