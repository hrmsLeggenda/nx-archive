# 站内协作部署

当前实现是待配置的协作基础，不能当作完整第五批上线验收。

1. 在 Cloudflare 创建 KV namespace。GitHub 仓库新增 environment `collaboration`。
2. 注册 GitHub App（用户授权流程），Homepage 使用现有 Pages 地址，callback 为 Worker 的 `/auth/callback`。授予 Repository permissions：Contents 和 Pull requests 读写、Checks 只读、Metadata 只读；只安装到 nx-archive。使用 App 的 Client ID / Client secret（不是 App ID / 私钥），不需要 OAuth scope。
3. environment variables：WIKI_CLIENT_ID、COLLABORATION_CALLBACK_URL、COLLABORATION_KV_ID；secrets：CLOUDFLARE_API_TOKEN、CLOUDFLARE_ACCOUNT_ID。Cloudflare token 仅需对应账户 Worker 与 KV 部署权限。
4. 在 Worker secret 中设置 GITHUB_CLIENT_SECRET（不写入源码、不发聊天）。运行 Deploy collaboration service workflow；检查 `/health`。
5. 仓库 variable COLLABORATION_URL 设置 Worker HTTPS 地址（无末尾斜杠），重新部署 Pages。
6. 验收真实登录、注销、拒绝无写权限用户、Markdown/JSON 创建 PR、同文件并发冲突、Actions 状态和 GitHub 审阅合并。PR 由用户令牌创建，正常触发 CI。

只允许 guides、notes、maps 下 Markdown 与万缕千丝覆盖层 JSON。拒绝配置、工作流和生成目录写入。服务端校验路径和版本；详细内容/数据校验由 Actions 完成，审阅后再合入主线。当前仅供可信仓库编辑者，不开放匿名投稿。会话过期后重新登录；注销删除服务端会话，App 用户授权可在 GitHub Settings 撤销。

待完成：GitHub App 注册安装及真实部署验收。云端草稿以 Durable Object 事务进行版本比较；同路径并发写入返回冲突。草稿正文保存服务端，按账户隔离；编辑摘要仍在编辑器填写。

## 自动发布

前端“保存并发布”创建工作分支，CI 通过后 Auto publish wiki edits 校验提交者权限、同仓库分支、测试 SHA 与文件白名单，自动合并并显式触发 Pages 发布。普通文章或覆盖层修改无需人工处理 GitHub。受分支规则要求人工批准时不会绕过规则；失败或冲突保留提交。仓库 Actions 需要允许 contents/pull-requests/actions 写权限。自动发布工作流只 checkout 主线，不执行提交分支脚本。

启用仍需完成上面的 App / Worker 配置；代码部署不等于服务已可用。首次部署后用一篇真实维护说明验证保存、自动合并和上线完整链路。
