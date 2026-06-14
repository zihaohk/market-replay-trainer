# 案例内容生产流程

这份文档说明怎么把一个真实或虚构的市场事件，做成可以导入训练器的盲测案例包。目标不是堆新闻和行情，而是做一套能训练纪律、仓位、证据和复盘的课程。

盲测防剧透规则见 `docs/BLIND_TRAINING_POLICY.md`。正式案例库要先满足防剧透规则，再谈训练质量。

## 核心原则

- 先训练决策过程，再讨论收益结果。
- 训练前隐藏真实代码、真实日期、真实事件名称和复盘来源。
- 每个案例必须有明确训练目标，不要只做“某股票涨跌回放”。
- 新闻只写摘要和来源链接，不复制长篇原文。
- 行情、新闻、事件日和课程要互相对齐，不能只是各放各的。
- 经典案例库要覆盖不同市场环境，避免只练自己熟悉的牛市或热门股。

## 标准流程

1. 选择训练主题

   先确定这关训练什么能力。不要从“我想放某只股票”开始，而要从“我要训练新手在什么压力下不乱来”开始。

   常见主题包括：

   - ETF 系统性下跌：训练不要以为 ETF 一定稳。
   - 单股事件冲击：训练仓位上限和事件风险。
   - 财报预期差：训练利好/利空新闻和价格反应分开判断。
   - 宏观利率和通胀：训练估值、久期和行业轮动。
   - 流动性危机：训练下跌中不要乱补仓。
   - 热门股泡沫：训练追高、止盈和退出计划。
   - 防御配置失效：训练分散不是绝对保护。
   - 心理纪律：训练亏损、盈利回吐和过度自信。
   - 交易机制：训练 T+1、分红、拆股、滑点和流动性。

2. 生成配置骨架

   用脚手架先生成一份配置。这里不会直接生成完整案例，只是创建结构，提醒你需要补哪些内容。

   ```bash
   node tools/scaffold-case-config.mjs --type earnings-expectation --symbols META,SPY --start 2022-01-25 --end 2022-02-10 --out configs/meta-earnings.json
   ```

   可用主题列表：

   ```bash
   node tools/scaffold-case-config.mjs --list
   ```

3. 补齐人工内容

   打开生成的 JSON 配置，重点补这些字段：

   - `title`：内部可读标题，可以包含真实名称。
   - `maskedTitle`：训练前显示的匿名标题。
   - `maskedBrief`：训练前提示，只描述环境，不泄露答案。
   - `revealTitle`：复盘后揭晓的真实事件名称。
   - `assets`：标的列表，至少要有一个主标的，最好有一个基准 ETF。
   - `news`：训练中逐步出现的新闻摘要。
   - `scheduledEvents`：财报、宏观数据、监管、流动性等已知风险窗口。
   - `learning`：本关课程、术语和课前检查题。
   - `mission`：本关通过条件和硬限制。
   - `sourcePack`：复盘后才看的来源资料。

   如果是严肃历史案例，`sourcePack.items[].url` 不能保留 `example.com` 占位链接。要换成公司 IR、SEC、FOMC、BLS、BEA、FDIC、交易所、ETF 发行商等一手或接近一手来源。

4. 构建案例包

   配置补完后，用构建器拉取历史日线并生成训练器可导入的案例包。

   ```bash
   node tools/build-case-package.mjs --config configs/meta-earnings.json --out cases/meta-earnings.package.json
   ```

   如果配置里直接写了 `assets[].rows`，或用 `assets[].series.closes` 写紧凑收盘价路径，构建器可以离线运行；如果只写了 symbol/start/end，则会调用 Yahoo Finance Chart API 拉取历史 OHLCV。

5. 离线质检

   用校验器检查案例包质量。

   ```bash
   node tools/validate-case-package.mjs cases/meta-earnings.package.json --strict
   ```

   严格模式重点检查：

   - 行情样本是否太短。
   - OHLC 是否不合理。
   - 是否有重复日期。
   - 单日异常波动是否需要解释。
   - 成交量是否长期为 0。
   - 是否缺少新闻、事件日、课程、任务或来源。
   - 是否缺少基准或横向比较标的。
   - 训练前可见字段或文件名是否泄露真实代码、真实年份、来源链接或结果暗示。

6. 加入案例库

   单个案例没问题后，把它加入案例库 manifest。

   ```json
   {
     "outputDir": "cases",
     "cases": [
       {
         "id": "meta-earnings-2022",
         "configFile": "configs/meta-earnings.json",
         "out": "meta-earnings.package.json"
       }
     ]
   }
   ```

   然后批量构建：

   ```bash
   node tools/build-case-library.mjs --manifest tools/example-case-library.json --strict
   ```

   当前项目内置了一套更完整的匿名课程库样板：

   ```bash
   npm run check:starter
   npm run build:starter
   node tools/build-case-library.mjs --manifest cases/starter-classic-library.json --dry-run --strict
   node tools/bundle-case-library.mjs --manifest cases/starter-classic-library.json --dir packages/starter-classic --out packages/case-c-bundle.json --strict
   ```

   这套 starter library 用 11 个匿名案例覆盖 ETF 系统性风险、单股事件、财报预期差、宏观利率、银行流动性、行业轮动、追高泡沫、防御配置、心理纪律、订单执行、T+1 结算和公司行动。它适合当作正式案例库的结构参考。打包输出文件应使用 `packages/case-c-bundle.json` 这类匿名文件名，不要把真实事件、年份、代码或结果写进文件名。

   如果要把这一批单个案例包做成一个可分享、可一次导入网页的课程包，再运行：

   ```bash
   node tools/bundle-case-library.mjs --manifest tools/example-case-library.json --dir cases --out cases/starter-library.bundle.json --strict
   ```

   这个 bundle 只包含案例内容，不包含个人训练记录、账户状态、长期画像或当前进度。

7. 审计覆盖面

   案例库不是越多越好，而是要覆盖不同市场压力。用覆盖审计检查偏科。

   ```bash
   node tools/audit-case-coverage.mjs --manifest tools/example-case-library.json --strict
   node tools/audit-case-coverage.mjs --manifest cases/starter-classic-library.json --strict
   ```

   目标是长期覆盖这些维度：

   - ETF 系统性风险
   - 单股事件
   - 财报预期差
   - 宏观利率/通胀
   - 流动性危机
   - 行业轮动
   - 动量泡沫
   - 防御配置
   - 心理纪律
   - 交易机制/结算/公司行动

8. 导入训练器测试

   打开 `index.html`，把生成的 JSON 案例包粘贴到“JSON 案例包”导入区域，或点击“选择案例包文件”直接选择一个或多个 `.json` 案例包。重复案例包会按内容指纹跳过，不会重复加入案例列表。导入后至少手工检查一次：

   - 训练前是否隐藏真实代码和真实事件。
   - 图表是否有行情。
   - 新闻是否按时间出现。
   - 事件日是否不提前泄露答案。
   - 课程题是否能通过和拦截。
   - 复盘后是否揭晓真实背景和来源资料。
   - 任务评分是否能识别核心错误。

   如果你在网页里已经积累了一批自定义案例，可以用顶部“导出案例库”生成一个 `market-replay-case-library` bundle。它只包含案例内容，不包含你的训练记录；后续可以把这个 bundle 当作一个 `.json` 文件重新导入，系统会逐个恢复案例。

   如果你在命令行维护正式案例库，可以用 `tools/bundle-case-library.mjs` 生成同样格式的 bundle：

   ```bash
   node tools/bundle-case-library.mjs --dir cases --out cases/library.bundle.json --strict
   ```

   打包器会先跑训练完整度、盲测防剧透和重复内容检查；严格模式下有 warning 也不会写出正式 bundle。

9. 运行全项目自检

   每次改工具、示例或主应用后运行：

   ```bash
   npm test
   ```

   这个命令会检查工具语法、案例构建、案例校验、案例库构建、覆盖审计、脚手架和主应用 smoke test。

   如果改动涉及 UI、导入导出、案例库或发布前验收，再跑：

   ```bash
   npm run browser:smoke
   ```

   它会打开真实 Chromium，检查首屏、案例列表、案例库体检、价格图、随机盲测、JSON 案例包导入、案例包文件选择导入、starter bundle 导入和重复跳过、完整备份导出和恢复、课程检查题、真实观望记录、真实买入/卖出成交、限价单挂起/成交/过期/取消、持仓归零、资金和结算历史、案例包导出、案例库导出、揭晓复盘、复盘 Markdown 下载和移动端横向溢出，并在 `output/playwright/` 留下 QA 截图和下载样本。

## 一个好案例应该长什么样

好案例不一定要很复杂，但应该满足这些条件：

- 至少 40 个交易日，最好 60-180 个交易日。
- 至少一个主标的和一个基准标的。
- 有 3-8 条训练中逐步出现的新闻摘要。
- 有 1-4 个已知风险窗口，例如财报、CPI、FOMC、监管公告。
- 有一个明确训练目标，例如“不要在事件日前无计划追高”。
- 有可计算的任务规则，例如最大交易次数、最大仓位、至少几次新闻判断。
- 复盘来源能解释事件背景，但不在训练前暴露。
- 价格变化和新闻节奏之间有教学价值，不只是随机涨跌。

## 什么时候可以虚构

虚构案例适合训练心理和机制，不适合替代真实历史学习。

适合虚构的内容：

- 分红、拆股、T+1、滑点、流动性冲击。
- 连续小亏后的冲动补仓。
- 盈利后不止盈导致回吐。
- 横盘震荡里频繁交易被摩擦成本侵蚀。

不适合虚构替代的内容：

- 宏观危机。
- 财报预期差。
- 银行流动性风险。
- 监管冲击。
- 真实 ETF 和行业轮动。

这些场景最好使用真实历史数据和可核对来源，因为它们的教学价值来自真实市场当时的复杂性。

## 新手训练顺序

建议案例库按这个顺序开放：

1. 机制入门：市价单、限价单、T+1、滑点、分红、拆股。
2. ETF 基础：宽基 ETF、行业 ETF、回撤和分散边界。
3. 单股事件：财报、指引、监管、产品事件。
4. 宏观环境：利率、通胀、美元、流动性。
5. 危机环境：快速下跌、反弹、二次下跌和风险冷却。
6. 泡沫环境：追高、止盈、仓位膨胀和叙事过热。
7. 综合考试：随机盲测，不提前知道主题。

## 内容质量红线

这些情况不应该进入正式训练库：

- 案例标题或提示提前泄露真实事件。
- 只有行情，没有新闻、任务和复盘来源。
- 只有新闻，没有可交易的价格路径。
- 来源链接是占位符或不可核对。
- 把收益最大化当作唯一通过标准。
- 鼓励猜底、猜顶、满仓、杠杆或短线频繁交易。
- 没有基准，导致无法判断相对表现。
- 没有事件日，导致新手误以为风险是随机出现的。

## 当前工具链速查

```bash
node tools/scaffold-case-config.mjs --list
node tools/scaffold-case-config.mjs --type macro-rates-inflation --symbols QQQ,SPY,TLT --start 2022-01-01 --end 2022-06-30 --out configs/rates-2022.json
node tools/build-case-package.mjs --config configs/rates-2022.json --out cases/rates-2022.package.json
node tools/validate-case-package.mjs cases/rates-2022.package.json --strict
node tools/build-case-library.mjs --manifest cases/library.json --strict
node tools/bundle-case-library.mjs --manifest cases/library.json --dir cases --out cases/library.bundle.json --strict
node tools/audit-case-coverage.mjs --manifest cases/library.json --strict
npm test
npm run browser:smoke
```
