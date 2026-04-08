# 川着项目文档

## 快速导航

| 类别 | 说明 | 入口 |
|------|------|------|
| 当前开发 | 需求、进度、任务 | [current/](current/INDEX.md) |
| 设计文档 | PRD、方案、流程 | [design/](design/) |
| 操作指南 | 开发、部署、配置 | [guides/](guides/) |
| 调研资料 | 技术调研、成本分析 | [research/](research/) |
| 运营文档 | 走查、会议记录 | [operations/](operations/) |
| 测试文档 | 策略、计划、报告 | [test/](test/README.md) |

## 目录结构

```
docs/
├── current/                     # 当前开发
│   ├── INDEX.md                 # 开发索引
│   ├── 功能规划.md
│   ├── 开发进度.md              # 阶段二、三合并
│   ├── 开发任务清单.md
│   ├── 需求-阶段四.md
│   ├── 菜单迁移评估.md
│   ├── 小程序管理端扩展设计.md
│   └── 阻塞记录.md
├── design/                      # 设计文档
│   ├── 系统PRD.md
│   ├── 终局产品方案.md
│   ├── 业务流转图-完整版.md
│   ├── 用户操作流程-核心场景.md
│   ├── 小程序功能设计.md
│   ├── 功能清单-v1.0.md
│   └── ui/                      # 小程序 UI 参考
├── guides/                      # 操作指南
│   ├── 开发环境指南.md
│   ├── 阿里云部署指南.md
│   └── 客服接入与企业微信方案说明.md
├── research/                    # 调研文档
│   ├── 技术可行性调研.md
│   ├── AI商品图调研.md
│   ├── 企业微信小程序卡片推送方案.md
│   ├── 成本明细核算-内部版.md
│   └── reports/                 # 调研报告
├── operations/                  # 运营文档
│   ├── 订单流程走查.md
│   ├── 后台走查.md
│   └── meetings/                # 会议记录
├── test/                        # 测试文档
│   ├── README.md
│   ├── test-strategy.md
│   ├── test-plan.md
│   └── reports/                 # 测试报告
└── _archive/                    # 归档文档
    ├── clothing-mall-design.md  # 已过时设计文档
    └── legacy-litemall/         # 原始项目文档
```

## 文档规范

### 新增文档

1. 请在对应目录创建文档
2. 使用中文命名（如 `开发进度.md`）
3. 重要决策记录在 [current/INDEX.md](current/INDEX.md)

### 文档归档

- 过时文档移入 [_archive/](_archive/)
- 命名格式：`原名称.md`

### 文档分类

| 前缀 | 说明 |
|------|------|
| `current/` | 活跃开发中的文档 |
| `design/` | 产品设计、PRD、流程图 |
| `guides/` | 操作指南、部署文档 |
| `research/` | 技术调研、方案评估 |
| `operations/` | 运营相关、走查清单 |
| `test/` | 测试策略、计划、报告 |
| `_archive/` | 历史归档 |

---

*最后更新：2026-03-25*
