# NX Archive · 游戏攻略导航

NX Archive 现为**纯静态游戏攻略导航门户**，桌面端优先，展示 Nintendo Switch / Switch 2 游戏，并将访客直接引导到外部游戏攻略或 Wiki。本站不托管游戏条目、不提供账号/编辑器/用户内容存储，也不宣称外部网站属于 NX Archive。

## 运行

需要 Node.js 22+，不需要 npm 第三方依赖。

```bash
npm ci
npm test
npm run build
npm run dev
```

浏览器打开本地服务提示的 URL（默认 http://localhost:4173/）。构建产物位于 `docs/.vitepress/dist`，保留这一历史路径是为了兼容已经配置好的 Cloudflare Pages 构建输出目录和 GitHub Pages 工作流。

## 目录与维护

- `site/index.html`：门户页面语义骨架。
- `site/styles.css`：桌面布局、推荐卡片与游戏图标卡片。
- `site/app.js`：搜索、分类、平台筛选与本地收藏。
- `site/games.json`：唯一游戏来源；新增游戏时填写 id/title/genre/platform/url 等字段。
- `scripts/build-site.mjs`：将静态站复制到发布目录。
- `scripts/serve-site.mjs`：本地预览服务器。
- `tests/portal.test.mjs`：校验所有入口为 HTTPS、ID 唯一、字段完整。

## 外部攻略

页面的“进入攻略”将打开新的浏览器标签。入口分别来自外部社区 Wiki / 攻略站，数据文件包含来源站名。不要把未部署的 Akashic 或已移除的旧站内 Wiki 当作有效链接。如果后续 Akashic 正式上线，只需更新 `site/games.json` 中《火焰纹章·万缕千丝》的 `url` 和 `source`。

封面为本站原创的抽象装饰/字符配色，不转载第三方游戏美术。游戏名称与商标属于各权利人。

## 部署

PR 运行 CI（`npm ci && npm test && npm run build`）；main 自动部署至 GitHub Pages：
https://hrmsLeggenda.github.io/nx-archive/

Cloudflare Pages：构建命令 `npm run build`，输出目录 `docs/.vitepress/dist`。页面使用相对资源路径，因此既可发布到 GitHub Pages 的 `/nx-archive/`，也可发布到 Cloudflare 的根路径。旧 Wiki 服务与自动发布工作流从当前树移除；历史代码仍保留在 Git 提交中。
