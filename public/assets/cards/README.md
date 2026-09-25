# 卡面图片目录

请把卡面图片放进这个目录，并按 `config.js` 中 `window.CARDS` 的 `image` 字段命名。

默认需要的文件（已从桌面“卡面”文件夹复制进来）：

- 共犯.jpg
- 火焰宣言.jpg
- 满愿之火.jpg
- 片羽樊笼.jpg
- 我心降落.jpg
- 醉梦金乡.jpg

如果图片尚未准备，页面会使用 `charlie.jpg` 作为临时回退图，不会白屏。

图片比例不要求一致，页面展示时统一使用：

- 宽度：116px
- 高度：`116 * 1288 / 968 ≈ 154px`（与档案照片 `charlie.jpg` 原始比例一致）
- 显示方式：`object-fit: cover` + `object-position: center`

如果要批量裁切成统一尺寸，请使用仓库根目录下的脚本：

```bash
npm install sharp
node scripts/normalize-cards.mjs
```

脚本不会覆盖原图，输出到 `public/assets/cards-normalized/`。
