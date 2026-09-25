// 可选脚本：把 public/assets/cards/ 里的卡面图片批量裁切/缩放为统一尺寸。
// 不会覆盖原图，输出到 public/assets/cards-normalized/。
// 使用前需要先安装依赖：npm install sharp

import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.cwd());
const inputDir = path.join(root, "public", "assets", "cards");
const outputDir = path.join(root, "public", "assets", "cards-normalized");

// 与档案照片 charlie.jpg 原始宽高比一致
const TARGET_WIDTH = 968;
const TARGET_HEIGHT = 1288;

await fs.mkdir(outputDir, { recursive: true });

const files = (await fs.readdir(inputDir)).filter((file) =>
  /\.(jpe?g|png|webp)$/i.test(file)
);

if (!files.length) {
  console.log("没有找到图片，请先把卡面图片放入 public/assets/cards/。");
  process.exit(0);
}

for (const file of files) {
  const input = path.join(inputDir, file);
  const output = path.join(outputDir, file);
  await sharp(input)
    .resize(TARGET_WIDTH, TARGET_HEIGHT, { fit: "cover", position: "centre" })
    .toFile(output);
  console.log(`已生成：${path.relative(root, output)}`);
}

console.log("完成。处理后的图片位于 public/assets/cards-normalized/。");
