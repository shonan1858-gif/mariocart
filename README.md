# mariocart core driving (MVP)

エンジン無し（TypeScript + Canvas）で作った、トップダウン2Dのマリオカート風走行コアです。

## セットアップ

```bash
npm install
```

## 起動

```bash
npm run dev
```

Vite の表示URL（通常 `http://localhost:5173`）をブラウザで開くと動作します。

## 操作

- `W`: 加速
- `S`: ブレーキ / 後退
- `A` / `D`: ステア
- `Shift`: ドリフト

## 実装済みMVP要素

- 固定更新 60Hz + `requestAnimationFrame` 描画
- Sim / Render 分離
- トップダウン2Dの楕円コース描画
- カート1台の走行（速度・加速・減速・摩擦・旋回）
- ドリフトチャージ + ミニターボ3段階（青→橙→紫）
- HUD表示（速度 / ドリフト段階 / チャージ量）

## 主要ファイル構成

- `src/data/kart_params.ts`: パラメータ定義
- `src/io/input.ts`: 入力管理
- `src/sim/kart.ts`: カート挙動シミュレーション
- `src/sim/game.ts`: 固定更新ループ管理
- `src/render/renderer.ts`: 描画処理
- `src/main.ts`: エントリーポイント
