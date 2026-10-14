# 气口剪辑

**[打开网页直接使用](https://ouweikang000910.github.io/breath-cut/)**

可分享的口播视频剪辑网页。导入视频 → 根据低音量检测停顿 → 试听、勾选 → 预览 → 导出并下载 MP4。

视频、音频和成片全部在浏览器内存里处理，不上传服务器。网页只下载静态代码与约 32 MB 的 FFmpeg WebAssembly 引擎，不需要登录、API Key 或付费模型。关闭或刷新网页后当前素材会丢失。

## 使用

- 支持 MP4 / MOV / M4V / WebM / MKV，最长 5 分钟、最大 200 MB。不同容器内的编码可能需要转换后才能预览。
- 提供自然、适中、紧凑三档，支持调节最短停顿、句子两端保护时间和音量阈值。
- 每个停顿可以试听、取消剪除；剪辑预览跳过选中的停顿。原生播放器进度条仍显示原视频时间，右侧显示剪辑后的播放时间。
- 导出 H.264 + AAC MP4，保持画幅比例；支持最长边 1920 / 1280 px 或原分辨率。不放大小尺寸视频。
- 音频按采样点剪切并在接缝处做 4 ms 淡入淡出；视频按实际时间戳删除相同区间，支持变帧率源视频。
- 检测依据是音量，并非语义或专门的呼吸识别模型。较响的呼吸、背景音乐和噪声可能导致漏剪；轻声讲话可能导致误剪，请使用逐段复核和保护时间。
- 建议电脑端 Chrome / Edge。大视频和高分辨率在手机上可能内存不足；导出速度取决于设备性能。

## 本地开发

```sh
npm ci
npm run build
npm run preview
```

开发模式也需要先运行一次 `node scripts/prepare-core.mjs`，再运行 `npm run dev`。静态发布目录为 `dist/`。

## GitHub Pages 自动部署

本仓库通过 `.github/workflows/deploy-pages.yml` 自动测试、构建并发布。仓库 **Settings → Pages → Source** 选择 **GitHub Actions**，之后推送 `main` 分支即可自动更新网页。无需额外密钥或服务器。

工作流使用 Node.js 24，并设置 `VITE_BASE_PATH=/breath-cut/`，以兼容 GitHub Pages 的项目子路径。浏览器视频引擎随构建发布，避免依赖第三方 CDN。

本地验证相同的子路径部署：

```sh
VITE_BASE_PATH=/breath-cut/ npm run build
npm run preview
# 打开 http://127.0.0.1:5176/breath-cut/
```

```sh
npm test
```

检测、手动保留和音频采样精度有自动化测试；完整的上传、识别、取消、导出与下载通过浏览器测试。

引擎基于 [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm)，依赖许可证随 npm 包提供。部署前请遵守 FFmpeg 与各编解码器的许可要求。
