# crate-ai — 曲リストインポート 引き継ぎ

作業日: 2026-07-10

## やりたいこと
DJアプリ「crate-ai」を今日実際に使うために、レコードの写真から曲情報を抽出し、
アプリにすぐ取り込めるJSONファイルを作る。アプリ側にはまだJSONインポート機能が
なかったので、それも合わせて実装した。

## 今回のセッションでやったこと

1. `C:\Projects\crate-ai` を発見し、データ構造を調査
   - `src/lib/db.js` … IndexedDBスキーマ (tracks / albums / settings ストア)
   - `src/components/AddRecord.jsx` … 既存のDiscogs検索→Spotify補完→保存フロー
   - `src/lib/spotify.js`, `src/lib/discogs.js`, `src/lib/camelot.js` … 外部API連携とキー変換ロジック
2. **JSONインポート機能を新規追加**(これまで存在しなかった)
   - `src/lib/importExport.js` … `importLibraryFromJson()` / `importLibraryFromFile()` を追加。バリデーション込み
   - `src/components/Settings.jsx` … 「Import Library」カードを追加。JSONファイルを選ぶとそのままライブラリに保存される
   - `src/App.jsx` … `Settings` に `onImportComplete` を渡すよう配線(インポート後にライブラリ一覧が更新される)
   - esbuildで3ファイルとも構文チェック済み(ビルド環境がWindows/Linuxで食い違うため `vite build` 自体は今回のセッションでは実行不可。実機 or 開発中のdevサーバーで最終確認推奨)

## インポート用JSONの形式

`Settings → Import Library → JSONファイルを選択` で読み込めるフォーマット:

```json
{
  "albums": [
    {
      "id": "optional-stable-id",
      "title": "Album Title",
      "artist": "Album Artist",
      "year": 1975,
      "cover": "https://... (任意)",
      "genre": "Funk (任意、トラック側で上書き可)",
      "tracks": [
        {
          "position": "A1",
          "title": "Track Title",
          "artist": "Track Artist (省略時はアルバムartist)",
          "duration": "3:45",
          "bpm": 120,
          "key": 5,
          "mode": 1,
          "genre": "Funk"
        }
      ]
    }
  ]
}
```

- `key` は Spotifyのkey番号(0=C, 1=C#/Db, … 11=B)、`mode` は 1=major / 0=minor
- ジャンルの選択肢: `R&B, Korean Indie, Japanese City Pop, Funk, Hip-Hop, Pop, Jazz, Disco, House, Lo-fi Hip-Hop`
- `id` を省略すると `artist_title` から自動生成される

## 未完了・次にやること

- [ ] ユーザーがレコードの写真をアップロード
- [ ] 写真からアーティスト/アルバム/曲名を読み取り
- [ ] Web検索(Discogs等)で曲名・トラックリスト・年代などを裏取り
- [ ] 上記フォーマットのJSONファイルを実際に作成
- [ ] `npm run dev` などアプリ実機でImport Libraryボタンから読み込みテスト

## 引き継ぎメモ

- このチャット(会話)自体をCowork「Project」に変換する機能はない。Projectを作るには
  Cowork左ナビの「Projects」→「+」→「Use an existing folder」で `C:\Projects\crate-ai` を
  選ぶと、このフォルダに紐づいた新しいCowork Projectが作れる(メモリや指示もフォルダ単位で管理される)。
  過去チャットの内容は自動では引き継がれないため、この引き継ぎ資料を新Projectの
  instructions/contextとして渡すと良い。
