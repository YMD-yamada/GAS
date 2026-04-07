# 家族向け帰宅・食事通知（GAS × LINE）

毎日の「帰宅の目安」「食事の有無」「メモ」を、Google スプレッドシート（またはスクリプトのプロパティ）の内容に基づき **LINE にプッシュ通知**する個人利用向けのサンプルです。

## できること

- **プッシュ通知**：Messaging API で、指定したユーザー（家族の LINE）にテキストを送る  
- **入力**：1 枚目のシートの **B1〜B3**（帰宅・食事・メモ）。シートが使えない場合はプロパティのフォールバック値  
- **テスト**：`sendTestMessage` で疎通確認  
- **Webhook（任意）**：友だち追加・メッセージ受信で **ユーザー ID をログ**し、`LINE_TO_USER_ID` が空なら自動保存  

## ドキュメント（未経験者向け）

| 文書 | 内容 |
|------|------|
| [docs/setup-beginner.md](docs/setup-beginner.md) | **LINE・GAS・GitHub・note・YouTube** の初めての手順を順番に説明 |
| [docs/script-properties.md](docs/script-properties.md) | スクリプトのプロパティ名一覧（トークンはここだけに保存） |
| [docs/spreadsheet-layout.md](docs/spreadsheet-layout.md) | スプレッドシートのセル配置 |
| [docs/note-article.md](docs/note-article.md) | note 掲載用の原稿（コピーして調整可） |
| [docs/video-prompts.md](docs/video-prompts.md) | ショート／15 分動画用のプロンプト |

## リポジトリ構成

```
.
├── LICENSE
├── README.md                 # 本ファイル
├── .gitignore
├── .clasp.json.example       # clasp 利用時のサンプル（scriptId を自分用に）
├── .claspignore
├── src/
│   ├── appsscript.json       # マニフェスト（権限・タイムゾーン）
│   ├── Code.gs               # 送信・シート読み取り
│   └── Webhook.gs            # LINE Webhook（doPost / doGet）
└── docs/
    ├── setup-beginner.md
    ├── script-properties.md
    ├── spreadsheet-layout.md
    ├── note-article.md
    └── video-prompts.md
```

## クイックスタート（概要）

1. LINE Developers で **Messaging API** チャネルを作成し、**チャネルアクセストークン（長期）** を取得する。  
2. 公式アカウントを家族に **友だち追加**してもらう。  
3. Google スプレッドシートを用意し、[レイアウト](docs/spreadsheet-layout.md)どおり **B1〜B3** に入力欄を作る（スクリプトをシートから開けば `SPREADSHEET_ID` は不要）。  
4. 「拡張機能 → Apps Script」で `src/Code.gs` と `src/Webhook.gs` をコピーする。  
5. **プロジェクトの設定 → スクリプトのプロパティ** に `LINE_CHANNEL_ACCESS_TOKEN` 等を設定する（一覧は [script-properties.md](docs/script-properties.md)）。  
6. `sendTestMessage` → 成功したら `sendFamilyUpdate`。  
7. 必要なら **トリガー**で `sendFamilyUpdate` を毎日実行。  
8. ユーザー ID が分からない場合は [setup-beginner.md の Webhook 手順](docs/setup-beginner.md#d-webhook-用ウェブアプリのデプロイユーザー-id-取得署名検証) でウェブアプリ URL を LINE に登録する。

**初めての方は [docs/setup-beginner.md](docs/setup-beginner.md) を上から順に読むことをおすすめします。**

## セキュリティ（GitHub に公開する前に必読）

- **チャネルアクセストークン・チャネルシークレット・ユーザー ID をコードや README に書かない。**  
- GAS の **スクリプトのプロパティ** にのみ保存する。  
- 誤公開したら **トークン再発行** とプロパティの更新。  
- 動画・スクショではトークン・長い ID を **モザイク**する。  

`.gitignore` で `.clasp.json` を除外している場合、**scriptId** はリポジトリに含まれません（必要なら各自 `clasp clone` で取得）。

## clasp で同期する場合（上級者向け）

1. [Node.js](https://nodejs.org/) を入れ、`npm i -g @google/clasp`  
2. `clasp login`  
3. `.clasp.json.example` を `.clasp.json` にコピーし、`scriptId` を自分の GAS の ID に書き換える  
4. プロジェクトルートで `clasp push`  

`src/` 内の `appsscript.json` と `.gs` がアップロード対象です。

## ライセンス

[LICENSE](LICENSE)（MIT）に従って利用できます。

## 免責事項

本リポジトリは個人利用・学習を想定したサンプルです。LINE・Google の仕様変更や利用規約は各自で確認し、利用によって生じた損害について作者は責任を負いません。

## 参考リンク

- [LINE Messaging API](https://developers.line.biz/ja/docs/messaging-api/)  
- [Google Apps Script](https://developers.google.com/apps-script)
