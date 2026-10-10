# NX Archive

Switch / Switch 2 中文攻略 Wiki，以 VitePress 1.6.4（MIT）和 Vue 构建。
使用上游发布的框架依赖，不复制框架仓库；lockfile 固定实际依赖。
上游：https://github.com/vuejs/vitepress

## 已实现

- Markdown 攻略、游戏目录、平台筛选、游戏关键词检索。
- VitePress 本地全文检索、暗色模式、移动端布局与 GitHub 编辑入口。
- 原创虚构地图：拖动、缩放、分类与文字筛选、详情、浏览器本地进度。
- PR 测试与构建；main 合并后 GitHub Pages 发布流水线。

游戏目录页为待编写的板块，示例地图不是实际游戏地图。当前没有账号、在线直接编辑、评论或跨设备同步；内容通过 PR 审核维护。

## 可重建环境

Node 22 或以上：

```sh
npm ci
npm test
npm run build
npm run dev
```

产物目录：`docs/.vitepress/dist`。预览：`npm run preview`。

## GitHub Actions / Pages

1. PR 自动运行 CI，执行测试和完整构建，保存静态产物供审阅。
2. 仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。
3. 合并 main 后运行部署，也可在 main 使用 workflow_dispatch。
4. 默认目标：https://hrmsLeggenda.github.io/nx-archive/ （首次部署成功后才能访问）。

后续自定义域名或其他部署目标需修改 `docs/.vitepress/config.mts` 的 base。
无需部署密钥；流水线使用 GitHub 的 GITHUB_TOKEN / OIDC。

## 目录

- docs/data/games.json：游戏目录。
- docs/games/：每款游戏的 Markdown 板块。
- docs/data/demo-map.json：示例点位。
- docs/.vitepress/theme/components/：游戏筛选与互动地图组件。
- tests/：地图过滤、存储解析及数据一致性验证。

## 下一步

选定首个游戏，编写真实攻略；取得地图授权后替换底图和点位；按规模扩展多层地图、点位深链接和收集数据导入导出。在线协作编辑与账号同步需要新增后端。

本站并非 Nintendo 官方网站。商标和游戏素材版权归各自权利人所有。
