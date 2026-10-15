# ASTRAL BARRAGE — 耐久型ドット絵弾幕

攻撃ボタンはありません。弾幕を避け続け、全フェーズを耐久すればクリアです。

## 遊び方
```
pnpm install
pnpm --filter @gds/game build   # 本番ビルド
# 開発: packages/game で npx vite --host 0.0.0.0 --port 5173
```
操作: 矢印/WASD 移動 · Shift 低速+当たり判定表示 · X ボム(弾消し, ステージ3個) · P ポーズ · R フェイズやり直し · M ミュート · F 全画面 · モバイルはドラッグ移動

## ステージ / フェーズ構成（各25秒 / ボス20秒、右上に全体残り時間）
- STAGE 1 星屑の導入: Ring Prelude → Aimed Fan → Spiral Garden（操作と視認性の学習）
- STAGE 2 軌道の万華鏡: Twin Walls → Verdant Spiral → Golden Barrage → Dense Finale
- STAGE 3 幻奏ボス連戦: Boss I Overture → II Fanfare → III Bloom → IV Crossfire → FINAL Astral Requiem
- フェーズ終了ごとに弾は消去され、次フェーズ名が表示されます。全12フェーズ耐久で ALL CLEAR。

## 難易度
| | 弾速 | 発射頻度 | 残機 | 無敵 | 当たり判定 |
|---|---|---|---|---|---|
| EASY | ×0.75 | ×0.85間隔 | 5 | 2.5s | 2px |
| NORMAL | ×1.0 | ×1.0 | 3 | 2.0s | 2.5px |
| HARD | ×1.25 | ×1.2 | 2 | 1.6s | 2.5px |

## ボス
フェーズごとにパレット・翼・角・周回シャード数・オーラが変化し、上下浮遊+左右移動します。弾幕テーマはリング拡散／螺旋／自機狙い扇／交差密度の順に統合され、最終フェーズで全要素が重なります。

## 検証済み
- `pnpm test`（エンジン・テスト全件）, `pnpm --filter @gds/game typecheck`, `vite build` 成功、開発サーバー起動確認。
- 未確認: ブラウザでの通しクリア手動プレイ（制約は CREDITS.md 参照）。
