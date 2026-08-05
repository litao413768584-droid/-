# 🚢 液货船舱容计算与数字孪生系统 - Tauri 单文件绿色版打包指南

已配置完成 **Tauri v2 桌面端架构** 与 **GitHub Actions 自动化 CI/CD 流程**。

---

## 🚀 方式一：GitHub 自动化打版（推荐，无需本地 Rust 环境）

您只需将代码提交推送至 GitHub 仓库，GitHub Actions 会自动在 Windows 虚拟机中进行 Rust + Frontend 编译，生成**单个免安装绿色 `.exe` 文件**。

### 操作步骤：
1. **推送到 main 分支** 或 **手动触发构建**：
   - 每次提交代码到 `main` 分支，GitHub Actions 会自动运行打包。
   - 也可以在 GitHub 仓库的 `Actions` 选项卡中，点击 **"Tauri 单文件绿色版 GitHub 自动打包"** -> **"Run workflow"** 手动触发。
2. **打 Tag 自动发布 Release**：
   - 在 Git 中打版本标签并推送，例如：
     ```bash
     git tag v1.0.0
     git push origin v1.0.0
     ```
   - GitHub Actions 会自动在 **Releases** 页面发布包含 `液货船舱容计算系统-单文件绿色免安装版.exe` 及安装包下载链接。

---

## 🛠️ 方式二：本地打包（需要本地配置 Rust 环境）

如果您希望在本地电脑直接打包生成 `.exe`：

### 1. 环境准备
- 安装 [Node.js (v18+)](https://nodejs.org/)
- 安装 [Rust 环境](https://www.rust-lang.org/tools/install) (选择 `x86_64-pc-windows-msvc`)
- 安装 C++ 构建工具（Visual Studio Build Tools 或 C++ 桌面开发工作集）

### 2. 执行打包命令
在项目根目录下运行：
```bash
# 安装依赖
npm install

# 本地直接打包生成桌面应用
npm run tauri:build
```

### 3. 查看打包产物
- **单文件绿色免安装版 (`.exe`)**:
  `src-tauri/target/release/cargo-calculator.exe` (或 `液货船舱容计算系统.exe`)
  *(直接双击运行，无须安装，绿色单文件)*

- **NSIS 安装包**:
  `src-tauri/target/release/bundle/nsis/液货船舱容计算系统_1.0.0_x64-setup.exe`

---

## 📂 配置文件目录结构说明
- `.github/workflows/build-green-exe.yml`: GitHub CI/CD 自动打包构建工作流
- `src-tauri/tauri.conf.json`: Tauri 窗口标题、图标及打包参数配置
- `src-tauri/Cargo.toml`: Rust 依赖与程序基本信息
- `src-tauri/src/main.rs`: 桌面端入口源码
- `src-tauri/icons/`: 软件图标集合 (.ico, .png)
- `scripts/generate-icons.js`: 软件图标生成工具
