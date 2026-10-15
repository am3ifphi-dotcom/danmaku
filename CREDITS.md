# CREDITS — 常夜桜 -TOKOYO-ZAKURA-

本作の素材一覧・出典・作者・ライセンス。**取得検証に基づく正確な記載**です。

## 外部アセット（実際に取得・検証・同梱）

### 1. DotGothic16（ドット絵フォント）
- **作者**: The DotGothic16 Project Authors (Fontworks Inc.)
- **出典**: https://github.com/fontworks-fonts/DotGothic16
- **ライセンス**: SIL Open Font License, Version 1.1（商業利用可・埋め込み可）
- **ライセンス全文**: `assets/fonts/OFL-DotGothic16.txt`（原本を同梱）
- **使用箇所**: ゲーム内全テキスト（タイトル/HUD/メニュー/リザルト）
- **加工**: ゲームが使用する文字コードのみを機械抽出して `pyftsubset` でサブセット化し woff2 化（`assets/fonts/dotgothic16-subset.woff2`, 71KB）。OFLに基づくサブセット＝「変更版」のため、フォント名の Reserved Font Name は使用せず、二次配布物ではなく本ゲーム同梱物として自動生成。
- **取得検証**: 制作環境内でリポジトリをクローン、fonts/ttf/DotGothic16-Regular.ttf の存在とライセンス条文を実際に確認

### 2. Pixel Art Icons（UIアイコン 9点）
- **作者**: halfmage
- **出典**: https://github.com/halfmage/pixelarticons
- **ライセンス**: MIT License
- **使用箇所**: `js/icons.js` に heart/moon/star/play/pause/volume(3)/flag/trophy のSVGパス(24x24グリッド)をインライン化して使用（タイトル・リザルトの装飾）
- **取得検証**: リポジトリをクローンして実SVGを確認・選定
- **MIT License 条文**:
  ```
  MIT License
  Copyright (c) 2021 halfmage
  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:
  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.
  ```

## 自作アセット（本プロジェクト内で作成・コード生成）

以下はすべて本作品のためにコードで生成した自作素材であり、外部画像・外部音源ファイルは使用していません。

- **ドット絵スプライト**: 自機「折鶴」、弾10種×8色（丸/小粒/菱/星/環/狐火/花弁/苦無/鬼火/お札）、レーザー、パーティクル
- **ボス「ツクヨミ」**: 46x62ピクセルパーツ群（後髪/体/頭/御幣腕）×8形態パレット、光環ハロー、式神紙人形、狐面
- **背景**: 常夜の空・満月・遠山・鳥居・桜の杜・石灯籠・霧・水面（480x640、多層）
- **音声**: BGM「常夜想」（タイトル）「月詠」（ボス戦・8フェーズで楽器増殖、都節旋法ベース）、SFX全般（被弾/かすり/警告/転生/ファンファーレ等）は WebAudio API によるリアルタイム合成
- **フォントサブセット作成・QAハーネス**: tools/qa 配下のコード

これら自作部分は、本リポジトリ内のコード・生成物として **MIT License** で提供します（別ライセンス指定がない限り）。

## 取得しなかったもの（正直な記載）

制作環境のネットワーク到達先が GitHub / npm registry / PyPI に限定されており、OpenGameArt・itch.io・Kenney・Freesound 等からは**素材を一切取得できませんでした**。そのため本作のビジュアル/音声は上記2点を除き自作で構成しています。取得を試みていない素材について「使用」「取得済み」とは記載しません。

## 非商用での利用について

出発点の要件で「非商用利用可・非商用限定ライセンス利用可」との指定を受けていますが、採用した外部ライセンス（OFL 1.1 / MIT）はいずれも商用利用を妨げないものです。各ライセンス条件（OFL のライセンス表示・MIT の著作権表示）は本ファイルならびに同梱ライセンス文で表示しています。
