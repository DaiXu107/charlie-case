# 连山会 · 查理苏调查档案

单文件起步的移动端互动档案页，现已增加卡面收集、线索组合、聊天式故事和本地存档。

## 移动端快捷玩法

直接用手机打开：

https://daixu107.github.io/charlie-case/

访问密码：`charlie0724`

## 版本区别

- `v1.0.0`：初始档案版本。连山会入口、密码验证、查理苏机密档案、银紫渐变与粒子特效。
- `v1.1.0`：互动玩法版本。新增记住密码、卡面收纳册、关键词聊天故事、拍照收集卡面、线索拖拽拼合、本地存档与重置进度。

历史版本选择：https://github.com/DaiXu107/charlie-case/releases

## 本地运行

在 `charlie-case` 目录启动任意静态服务器即可：

```powershell
python -m http.server 8000
```

然后打开 `http://127.0.0.1:8000/index.html`。

访问密码：`charlie0724`（配置在 `config.js`，仅前端门槛，不是真正安全措施）。

## 主要文件

- `index.html`：原档案页 + 新增页面容器
- `app.css`：新增玩法样式
- `config.js`：密码、卡面、关键词、组合规则
- `storage.js`：`localStorage` 存档模块
- `app.js`：密码跳过、聊天故事、卡面收集、线索拖拽拼合、重置进度
- `public/assets/cards/`：卡面图片目录
- `scripts/normalize-cards.mjs`：可选图片批量裁切脚本

## 卡面图片

把图片放进 `public/assets/cards/`，文件名见该目录下 `README.md`。

页面展示尺寸与档案照片 `charlie.jpg` 原始比例一致：

- 宽：`116px`
- 高：`116 * 1288 / 968 ≈ 154px`
- 图片使用 `object-fit: cover`，不会变形

批量裁切（可选，不覆盖原图）：

```powershell
npm install sharp
node scripts/normalize-cards.mjs
```

输出目录：`public/assets/cards-normalized/`

## 存档

存档键：`lianshanhui.charlie.v1`

重置进度默认保留“记住密码”。可在 `config.js` 中把 `resetKeepsPassword` 改为 `false` 一并清除。
