# 持久化勘误

文件路径为 数据集/记录ID.json，游戏固定为 fire-emblem-fw。数据集与字段白名单见 docs/data/structured-schema.json。站内“结构化数据编辑与勘误”可生成完整文件，通过 GitHub 分支与 PR 提交。

人工修正不得写入 data/generated。changes 记录 field、baseValue、value；evidence 保存来源、核对日期、版本、原因。重导后继续覆盖相同稳定身份的字段；上游变化产生待复核状态，原始人工文件不改动。记录失效会阻止构建，须人工核实身份迁移。

取消某字段覆盖即从 changes 删除该项；空 changes 恢复全部上游值，但保留文件和 Git 历史。已与上游一致的人工值仍保留，便于今后复核。重新核对后才更新 baseValue，不应只为消除提示改动原值。

首批四个文件仅迁移此前发布的主角中文显示名，来源锁定原导入器提交；未提交测试成长数值或未经核实的新游戏结论。
