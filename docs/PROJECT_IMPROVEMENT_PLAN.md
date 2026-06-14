# 项目修缮方案

更新时间：2026-06-14

这份文档记录本项目从“可用 MVP”走向“公开仓库、长期维护、可安全分享案例包”的修缮路线。执行顺序按优先级推进，不用一次性重构全部代码。

## 当前判断

项目已经可以作为本地美股历史盲测训练器使用，并且已有完整自检、真实浏览器 smoke、案例包工具链和 v1.0 验收标准。当前主要问题不是核心功能缺失，而是公开维护后会逐渐暴露的工程风险：

- `app.js` 仍然过大，后续维护成本高。
- 多处 UI 使用 `innerHTML` 拼接内容，导入第三方案例包后需要更严格的转义和 URL 白名单。
- 训练数据依赖浏览器本地存储，长期使用需要更强备份策略。
- 案例库扩充后，需要更严格的数据质量、盲测防剧透和来源核对流程。
- 测试以 smoke 为主，后续要补坏输入和安全回归。

## P0：公开仓库基线

状态：已完成。

要求：

- GitHub 公开仓库。
- 默认分支 `main`。
- 忽略 `node_modules/` 和 Playwright 输出产物。
- 添加许可证、贡献说明、CI。
- GitHub Actions 同时运行 `npm test` 和 `npm run browser:smoke`。

验收：

- 本地 `git status` 干净。
- 最新 GitHub Actions 通过。

## P1：动态 HTML 和 URL 安全

目标：任何来自案例包、CSV、备份、用户输入或未来外部来源的文字，都不能直接进入 HTML。

要求：

- 所有进入 `innerHTML` 的动态文本必须走 `escapeHtml`。
- 所有进入 HTML attribute 的动态文本必须走同一套 HTML 转义。
- 复盘来源链接必须经过 URL 白名单，只允许 `http:` 和 `https:`。
- 禁止 `javascript:`、`data:` 等危险链接出现在可点击链接里。
- 新增恶意案例包 smoke test，验证恶意标题、标的名和来源链接只作为文本显示，不会成为 HTML 或可执行链接。

优先处理位置：

- `renderCaseList`
- `renderCaseBrief`
- `renderWatchlist`
- `renderRelativeStrengthPanel`
- `renderRiskDashboard`
- `renderCheckpointLogPanel`
- `ui/review-summary.js` 的 `renderSourcePack`

验收：

- `npm test` 通过。
- `npm run browser:smoke` 通过。

## P1：继续拆分大主文件

目标：降低 `app.js` 的维护风险，不再把新功能继续塞进主文件。

建议顺序：

1. `ui/case-list.js`
   - 迁出案例列表、案例简介、观察列表、相对强弱面板。
2. `ui/risk-dashboard.js`
   - 迁出风险仪表盘和相关 row renderer。
3. `ui/trade-form.js`
   - 迁出交易表单、订单预览、仓位计算器和下单教练 UI。
4. `ui/import-export.js`
   - 迁出 CSV、JSON 案例包、备份和导出相关 UI。

规则：

- 每拆一个模块，必须新增对应 smoke test。
- 不改变业务行为，只做可验证的搬迁。
- 每一步都运行 `npm test`。

## P1：训练记录保护

目标：降低浏览器清缓存导致长期画像丢失的风险。

建议：

- 保留 `localStorage` 作为 MVP 默认方案。
- 在完成训练和复盘保存后更醒目地提示导出完整备份。
- 后续 v1.1 评估 IndexedDB 或本地文件备份。
- 暂不做云端账号、登录、多用户同步。

## P2：案例包质量和内容生产

目标：以后扩充案例库时，不因为数量增加而降低训练价值。

所有正式案例必须满足：

- 至少一个主标的和一个基准标的。
- 有训练新闻或事件日。
- 有课程讲义和检查题。
- 有任务规则和通关条件。
- 有复盘来源。
- 严格模式下通过盲测防剧透检查。

推荐流程：

```bash
node tools/validate-case-package.mjs path/to/case.json --strict
node tools/audit-case-coverage.mjs --manifest path/to/library.json --strict
npm test
```

## P2：坏输入测试

目标：让项目不只“正常路径能跑”，也能扛住错误输入。

建议新增测试：

- 恶意 JSON 案例包。
- 超长 CSV 或 JSON 文本。
- 重复日期、错误日期、OHLC 不合理。
- `javascript:` 复盘来源链接。
- 旧版本 localStorage 迁移。
- 导入失败后 UI 不崩溃。

## P2：新手体验降复杂度

目标：新手打开后知道先练什么，而不是被功能量吓住。

建议：

- 首屏突出“今日建议训练”。
- 默认推荐 Level 1 第一关。
- 导入导出、案例库体检和高级画像可以逐步折叠。
- 复盘页优先展示“三个最该改的问题”。

## P2：边界和合规提醒

目标：避免把训练工具误解成投资建议或实盘系统。

建议：

- 页面内明确写：本工具只训练纪律，不提供投资建议。
- 股息税、汇率、滑点都标为训练假设。
- “实盘前准备度”继续表达为纪律训练门槛，不表达为实盘许可。

## P3：长期架构

当前不建议立即引入复杂框架或云架构。后续如果案例库和 UI 继续膨胀，再考虑：

- Vite + ES Modules。
- IndexedDB。
- 可选的静态站点部署。
- 案例库分包加载。

不建议现在做：

- 真实券商下单。
- 实时行情系统。
- 登录、多用户和云同步。
- 微服务。
- 期权、融资、做空和高频策略。

## 当前执行批次

当前继续执行 P1：

- 已完成公开仓库基线。
- 已完成第一批动态 HTML 转义和 URL 白名单。
- 已拆分 `ui/case-list.js`，把案例列表、案例简介、观察列表和相对强弱面板的 HTML 渲染从 `app.js` 迁出。
- 已拆分 `ui/risk-dashboard.js`，把风险仪表盘和相关 row renderer 从 `app.js` 迁出。
- 已补页面内投资建议边界和训练假设提示。
- 已补 CSV/JSON 案例包导入大小上限，避免超大坏输入卡住页面。
- 正在补复盘后导出完整备份提醒，降低浏览器本地记录丢失风险。
- 保持现有本地运行方式和业务逻辑不变。
