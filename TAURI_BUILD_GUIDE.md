# 🚢 液货船舱容计算与数字孪生系统 - Windows 单文件免安装绿色版打包指南

本工程已配置为 **Tauri Windows 单文件免安装绿色版 (`.exe`) 自动化打包架构**。

---

## 💡 为什么之前会提示配置文件报错？

之前的配置文件使用了 Tauri v2 格式，而您的本地环境或 CI 环境中的 `tauri` CLI 为 v1 版本，导致提示 `"identifier" is a required property` 及 `unexpected 'devPath'` 错误。

**目前已修正为兼容性最佳的标准的 Tauri v1 配置格式**，无论是用 `bun run tauri build`、`npm run tauri:build` 还是在 GitHub Actions 中自动构建，都能完美兼容无错！

---

## 🚀 方式一：GitHub 自动化打包（最推荐，无须本地 Rust 环境）

只需将项目推送到 GitHub 仓库，GitHub Actions 会在 Windows 虚拟机中自动完成前端和 Rust 编译，并输出**纯绿色单文件 `.exe`**。

### 操作步骤：
1. **推送到 main 分支** 或 **手动触发构建**：
   - 代码 Push 到 `main` 分支后，GitHub 会自动运行打包。
   - 可以在 GitHub 仓库页面点击 **Actions** -> **"Windows 单文件免安装绿色版 GitHub 自动打包"** -> **"Run workflow"** 按钮进行手动构建。
2. **下载单文件成果**：
   - 编译完成后，在 Actions 记录的底部的 **Artifacts (构建成果)** 中，直接下载 `液货船舱容计算系统-单文件绿色免安装版.exe`。
   - 如果推送了版本标签 (如 `git tag v1.0.0 && git push origin v1.0.0`)，打包好的 `.exe` 会自动发布到仓库的 **Releases** 页面。

---

## 🛠️ 方式二：本地打包单文件 `.exe`

如果您在本地 Windows 电脑打包：

### 1. 运行构建命令
```bash
# 使用 Bun 或 NPM:
bun run tauri build -- --no-bundle
# 或
npm run tauri:build -- --no-bundle
# 或
npx tauri build --no-bundle
```

### 2. 绿色单文件 `.exe` 产物位置
构建完成后，绿色免安装文件将存放在以下位置：
`src-tauri/target/release/cargo-calculator.exe` 
*(或 `src-tauri/target/x86_64-pc-windows-msvc/release/cargo-calculator.exe`)*

可以将其任意重命名（例如 `液货船舱容计算系统-绿色版.exe`），直接双击运行，无须任何安装包。
