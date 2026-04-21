# 家族向け帰宅・食事通知（Cloudflare Workers 推奨 / GAS も可）

**GitHub**: [https://github.com/YMD-yamada/GAS](https://github.com/YMD-yamada/GAS)

終了時刻・夕飯・予定（任意）を選んで、家族へ **LINE にプッシュ通知**する個人利用向け Web アプリです。

## おすすめの構成（Cloudflare Workers）

Google アカウントの切り替えに悩まず、**Git から `wrangler deploy` だけ**で更新できます。

- **Web 画面**: Worker が `/` で HTML を返す  
- **送信 API**: `POST /api/send`（画面から呼び出し）  
- **ログ**: Cloudflare **D1**（SQLite）に保存  
- **LINE Webhook**: `POST /webhook`（グループ ID 取得補助・個別トークからログ参照）  

セットアップ手順は [docs/workers-setup.md](docs/workers-setup.md) を参照してください。実装は [workers/line-notification/](workers/line-notification/) にあります。
`main` へ push 時に Cloudflare へ自動デプロイする workflow は `.github/workflows/deploy-worker.yml` です。

## 従来の構成（Google Apps Script）

既存の GAS 版は `src/Code.gs` と `src/index.html` のまま利用できます。

## できること（機能面は Workers / GAS で同等の意図）

- **プッシュ通知**：Messaging API で、指定したユーザー（家族の LINE）にテキストを送る  
- **入力**：終了時刻 5 パターン、夕飯、予定あり/なし、予定内容、予想帰宅時間  
- **送信**：絵文字付きの帰宅メッセージを送信  
- **ログ**：送信内容を保存（Workers は D1、GAS はスプレッドシート `NotificationLog`）  
- **個別トーク参照**：LINE の 1:1 トークで `最新` / `ログ 3` などのコマンドでログ確認  
- **Webhook（任意）**：グループイベントから `groupId` を取得し、`LINE_TO_ID` 宛に通知（取得補助）  

## ドキュメント

| 文書 | 内容 |
|------|------|
| [docs/workers-setup.md](docs/workers-setup.md) | **Cloudflare Workers** のセットアップ（D1・シークレット・デプロイ） |
| [docs/setup-beginner.md](docs/setup-beginner.md) | **LINE・GAS** の初めての手順（従来版） |
| [docs/script-properties.md](docs/script-properties.md) | GAS のスクリプトのプロパティ名一覧 |
| [docs/spreadsheet-layout.md](docs/spreadsheet-layout.md) | スプレッドシートのセル配置（旧／参考） |
| [docs/note-article.md](docs/note-article.md) | note 掲載用の原稿 |
| [docs/video-prompts.md](docs/video-prompts.md) | ショート／15 分動画用のプロンプト |

## リポジトリ構成（抜粋）

```
.
├── README.md
├── workers/
│   └── line-notification/     # Cloudflare Workers（推奨）
│       ├── wrangler.toml
│       ├── migrations/
│       └── src/
├── src/                        # Google Apps Script 版
│   ├── Code.gs
│   └── index.html
└── docs/
```

## セキュリティ（GitHub に公開する前に必読）

- **チャネルアクセストークン・チャネルシークレット・ユーザー ID をコードや README に書かない。**  
- Workers では **Wrangler のシークレット**、GAS では **スクリプトのプロパティ** にのみ保存する。  
- 誤公開したら **トークン再発行** とシークレット／プロパティの更新。  
- 動画・スクショではトークン・長い ID を **モザイク**する。  

## clasp で GAS を同期する場合（上級者向け）

1. [Node.js](https://nodejs.org/) を入れ、`npm i -g @google/clasp`  
2. `clasp login`  
3. `.clasp.json.example` を `.clasp.json` にコピーし、`scriptId` を自分の GAS の ID に書き換える  
4. プロジェクトルートで `clasp push`  

## ライセンス

[LICENSE](LICENSE)（MIT）に従って利用できます。

## 免責事項

本リポジトリは個人利用・学習を想定したサンプルです。LINE・Google・Cloudflare の仕様変更や利用規約は各自で確認し、利用によって生じた損害について作者は責任を負いません。

## 参考リンク

- [LINE Messaging API](https://developers.line.biz/ja/docs/messaging-api/)  
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)  
- [Google Apps Script](https://developers.google.com/apps-script)
