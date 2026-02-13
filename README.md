# mariocart core driving (MVP)

エンジン無し（TypeScript + Canvas / WebGL2）で作った、マリオカート風走行コアです。

## セットアップ

```bash
npm install
```

## 起動

```bash
npm run dev
```

Vite の表示URL（通常 `http://localhost:5173`）をブラウザで開くと動作します。

## 2D版 / 3D版 切り替え

- 3D（WebGL2）: `http://localhost:5173/`（デフォルト）
- 2D（Canvas2D）: `http://localhost:5173/?renderer=2d`

## 操作

- `W`: 加速
- `S`: ブレーキ / 後退
- `A` / `D`: ステア
- `Shift`: ドリフト

## 実装済みMVP要素

- 固定更新 60Hz + `requestAnimationFrame` 描画
- Sim / Render 分離
- 2D版: トップダウン楕円コース
- 3D版: WebGL2 直書きレンダラー
  - 中心線点列 + 幅 からリボンメッシュを生成
  - 中心線に起伏（z）を持たせた立体コース
  - カートは cuboid メッシュ
  - 三人称追従カメラ（後方・上方）
- 走行コア（速度・加速・減速・摩擦・旋回）
- ドリフトチャージ + ミニターボ3段階（青→橙→紫）
- HUD表示（速度 / ドリフト段階 / チャージ量）

## 主要ファイル構成

- `src/data/kart_params.ts`: 走行パラメータ
- `src/data/track01.ts`: 3Dトラック中心線点列（起伏付き）
- `src/io/input.ts`: 入力管理
- `src/sim/kart.ts`: カート挙動シミュレーション
- `src/sim/game.ts`: 固定更新ループ管理
- `src/render/renderer.ts`: Canvas2D 描画
- `src/render_webgl/renderer_webgl.ts`: WebGL2 描画
- `src/main.ts`: レンダラー切り替えと起動
