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

## Wiki 门户与分类

游戏 Wiki 使用独立导航、分类目录与全部页面。页面分类优先读取 frontmatter 的 categories 数组（分类ID），兼容旧栏目路径；同一页面可属于多个分类。栏目配置提供分类名称、父分类和入口，成员由内容索引自动生成。近期更新读取完整Git历史中的页面提交时间，不伪造浏览量或更新时间。

第一批提供门户与布局、分类筛选、按游戏分组搜索、编辑和历史链接；页面创建向导和站内写入属于后续批次。

## 独立条目与关联关系

第二批构建生成62人物、58职业、4地点、13任务节点及已录入资源物品的独立条目。人物／职业以来源页面编号标识，地点与任务保留既有ID，物品按原名生成固定ID；别名只做检索，不复制页面。未核实的不同语言物品名称不自动合并。

条目内容来自固定快照或仓库内已核对记录，未添加无来源的推荐与数值。人物页含成长、擅长、法术及路线节点；职业页分列成长和属性加值；地点页按阶段分列资源；物品页反向列出获取地点。地图深链接按location筛选已知地点。

生成条目的源码为构建器和结构化数据，页面不提供无效的直接编辑链接。后续编辑器及勘误覆盖层另行实现；人工补充应保留在独立来源文件中，勿改生成目录。

## 第三批：创建与编辑

每个游戏 Wiki 有 edit 页面与导航入口。WikiEditor 提供四种模板、结构化字段、完整 Markdown、常用 Markdown 安全预览、线性差异、摘要与校验。本地草稿按游戏与目标分开保存；支持显式恢复、旧基线提醒、下载与导入，存储失败可导出保留。

编辑源码索引在构建时生成，保存 Git blob SHA。用户点击冲突检查时只读 GitHub Contents API，以主线文件 SHA 检查旧版本/重复路径；网络或限额失败明确提示，交给 GitHub 核对。不保存凭据、不在静态站点登录或写仓库。前往 GitHub 提交需复制全文、粘贴文件、建立分支与 PR；Actions 与主线 Pages 工作流保持一致。

自动生成条目的补充以 notes/<entityId>.md 独立持久化，原条目在构建时添加回链；数值勘误仍需更新来源数据。历史恢复与重命名在 GitHub 完成。新增维护操作页并修改来源说明作为创建/编辑的实际发布验收。

CI 增加编辑模型测试与浏览器验收：新建、已有编辑、字段同步、预览与安全性、草稿隔离及恢复、重复路径、主线冲突、API失败、存储失败、条目补充和移动端布局。
