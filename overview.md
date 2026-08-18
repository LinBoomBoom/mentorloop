# electron:build 修复与 NSIS 安装包落地

## 问题
`npm run electron:build` 卡死、无进展、`release/` 不生成。两个连续根因：

1. **electron-builder 配置 schema 错误**：`electron-builder.yml` 含非法字段 `electronRebuild`（25.1.8 无此字段），启动即报 `unknown property 'electronRebuild'`。
2. **winCodeSign 软链接死结（致命卡死）**：electron-builder 内部 `app-builder` 下载 `winCodeSign-2.6.0.7z` 并用 `7za x -snld` 解包；该包内含两条 macOS 软链接。本机/沙箱**未开开发者模式、非管理员**，无符号链接权限 → 解包失败 → 缓存目录（随机临时名）永不转正 → 每次重下载随机目录、无限重试、`release/` 永不生成。

## 修复
- **`electron-builder.yml`**：删除 `electronRebuild`，保留 `npmRebuild:false`（系统 Node 架构下禁止为 electron ABI 重建 better-sqlite3）。
- **`scripts/prep-winCodeSign.mjs`（新增）**：在 electron-builder 启动**前**下载并以 `7za x -y` 跳过软链接的方式预置 `winCodeSign-2.6.0` 缓存目录（命中即复用、不再下载解包），并把两条 `.dylib` 占位补成真实目标拷贝。完全绕开符号链接权限要求，**免开发者模式 / 免管理员**。
- **`scripts/electron-build.mjs`**：构建前自动调用 `prepWinCodeSign()`，并注入 npmmirror 镜像（避免 GitHub 下载墙）。
- **`scripts/electron-build-all.mjs`**：串联 `make:icon → nuxt build(产物大小稳定检测+taskkill 兜底) → bundle-node → electron-build`。

## 验证（沙箱实测，端到端跑通）
清缓存后 `node scripts/electron-build.mjs`：
- prep-winCodeSign 下载 + 解包成功
- electron-builder 复用 `winCodeSign-2.6.0`
- 产出 **`release/MentorLoop Setup 1.0.0.exe`（~174 MB）** + `.blockmap` + `latest.yml`

## 已知非致命告警
打包期 `rcedit-x64.exe` 偶发 `Fatal error: Unable to commit changes`（给 `MentorLoop.exe` 写版本信息/图标时）。原因：Windows Defender 实时扫描刚解包的 188 MB exe 持锁。electron-builder 记 ⨯ 但**继续打包，安装包有效**。要让 exe 稳定带上图标/版本信息，给项目目录加 Defender 排除项即可。

## 用户侧运行
```
npm run electron:build
```
（需本机联网，从 npmmirror 拉 electron 运行时 + NSIS 工具链；winCodeSign 由 prep 脚本自动处理。）
