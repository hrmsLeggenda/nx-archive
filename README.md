# NX Archive

Switch / Switch 2 中文攻略 Wiki，使用 VitePress 1.6.4（MIT）和 Vue。源码、来源锁定和内容均在仓库持久化；测试、构建和部署通过 GitHub Actions。

## 游戏 Wiki

游戏目录 → 独立游戏 Wiki → 攻略、客制化分类、数据库、互动地图。导航维护于 `docs/data/wikis.json`。游戏全文检索与全站检索均可使用。

《火焰纹章·万缕千丝》新增固定 SQLite 快照导入、62 人物与58职业成长表、技能与法术条件检索、成长期望模拟器、阶段资源查询、章节时间轴和阶段地图索引。

首批资源54条（4地牢、2阶段），时间轴13条；不是全地图或逐章完整数据库。坐标尚未取得，不将索引布局标作实际地图。

## 云端验证与部署

PR 与 `work/**` 分支自动验证。Actions 使用 Node 22、Python 3，运行 `npm ci`、`npm test`、`npm run build`；CI 额外用 Chromium 验证筛选、阶段资源、地图进度隔离及移动端页面。预览产物与页面截图保存在 Actions artifacts。

合并 main 后，既有 GitHub Pages 工作流发布到 https://hrmsLeggenda.github.io/nx-archive/ 。Pages Source 设为 GitHub Actions，无部署密钥。

## 数据导入

`scripts/import-fwe.py` 下载 `sources/fire-emblem-fw/upstream.json` 指定提交的 SQLite，验证 Git blob 校验值；仅导出数值和短条件，不导出抓取正文、图片或全文索引。构建时生成数据库 JSON 和供检索的 Markdown 总表，不提交产物。上游未检测到仓库许可证，来源锁定不代表转载许可。

`sources/fire-emblem-fw/crosscheck.json` 为4主角和Mu的Serenes Forest核对记录；差异在页面显示。缺失成长率保留null，不取默认零值。

资源与时间轴在游戏子 Wiki 的 `data/resources.json` 和 `data/timeline.json`；固定、随机池、条件事件分开存储，来源、核对日期、未知刷新和坐标均保留。新增数据需核对事实和来源。

## 可重建命令

```sh
npm ci
npm test
npm run build
npm run preview
```

构建需要下载固定上游快照。Node22+、Python3。产物为 `docs/.vitepress/dist`。直接开发前先运行 `npm run data:import`。

本站非 Nintendo 官方网站。无账户、评论或跨设备进度同步；进度保存在浏览器，内容通过 PR 维护。
