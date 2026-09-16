---
spec_id: SPEC-DARK-MODE-001
title: 夜间模式（Dark Mode）
status: confirmed
template_id: requirement-spec-v1
schema_version: 1
product_area: 沸点火锅点单演示 / 全局 UI
baseline_spec: 无（首次需求）
depends_on_specs: []
supersedes_specs: []
source_documents:
  - docs/需求澄清.md
  - AGENTS.md
  - src/hooks/useElderlyMode.ts
  - src/index.css
  - tailwind.config.js
  - src/components/TopBar.tsx
  - src/App.tsx
  - src/i18n.ts
  - index.html
created_at: "2026-09-16"
updated_at: "2026-09-16"
---

# Spec: 夜间模式（Dark Mode）

# 0. 文档元信息

## 0.1 基本信息

- **文档类型**: ☑ 新增需求
- **适用产品范围**: 沸点火锅点单演示应用全部页面与组件
- **版本基线说明**: 基于 `main` 分支 `aa31b84` 初始提交，当前为单一浅色主题

## 0.2 证据来源

| 来源 | 用途 | 可信度 | 备注 |
|------|------|--------|------|
| AGENTS.md | 技术约定、样式规范、验证方式 | 高 | 含禁止暗色模式条款，已确认移除 |
| src/hooks/useElderlyMode.ts | Hook 模式参考（localStorage + classList） | 高 | 夜间模式 Hook 将参照此模式 |
| src/index.css | 全局样式、老人模式 CSS、过渡动画 | 高 | 需在此基础上扩展夜间模式样式 |
| tailwind.config.js | 色板定义、Tailwind 配置 | 高 | 需新增 darkMode 配置 |
| src/components/TopBar.tsx | 工具栏布局与切换按钮 | 高 | 夜间模式切换按钮入口 |
| src/App.tsx | 应用入口、状态管理、TopBar 调用 | 高 | 需接入夜间模式 Hook |
| src/i18n.ts | 中英文文案 | 高 | 需新增夜间模式相关文案 |
| index.html | 挂载前初始化脚本 | 高 | 需扩展初始化逻辑防止 FOUC |

---

# 1. 需求背景

- **需求类型**: ☑ 用户反馈
- **背景 / 驱动**: 当前应用仅提供暖白浅色主题（背景 `#fbf5ea`），在夜间或低光环境下背景过亮、刺眼，影响用户长时间使用体验。用户需要一种深色配色方案以降低屏幕亮度对眼睛的刺激。
- **用户价值**: 所有进入点单应用的用户在低光环境下获得更舒适的视觉体验。
- **关联重点特性**: 老人模式（`useElderlyMode`）、语言切换、TopBar 工具栏

| 用户角色 | 核心场景 | 痛点 | 相关 SA |
|----------|----------|------|---------|
| 门店顾客 | 夜间/低光环境点餐 | 浅色背景刺眼，长时间使用眼睛疲劳 | 无 |

---

# 2. 目标与边界

## 2.1 目标

| 目标 ID | 类目 | 目标描述 | 可度量指标 | 目标值 |
|---------|------|----------|------------|--------|
| GOAL-001 | 用户体验 | 用户可一键切换夜间模式，全站视觉立即生效 | 切换后 250ms 内完成过渡 | ≤ 250ms |
| GOAL-002 | 用户体验 | 夜间模式偏好持久化 | localStorage 保存后刷新仍保持 | 100% 保持 |
| GOAL-003 | 用户体验 | 夜间模式覆盖全部页面和组件 | 覆盖页面/组件数 | 全部（绑定/欢迎/菜单/订单/结账/服务/控制台） |
| GOAL-004 | 兼容性 | 夜间模式与老人模式可叠加使用 | 叠加后功能正常 | 通过 |

## 2.2 非目标

| 非目标 ID | 不做的内容 | 原因 / 后续规划 |
|-----------|------------|------------------|
| NG-001 | 不跟随系统 prefers-color-scheme 自动切换 | 已确认默认浅色模式，手动切换；后续可作为增强 |
| NG-002 | 不引入额外 UI 库或设计系统框架 | 沿用现有技术栈约定 |
| NG-003 | 不修改 server/ 目录 | 不影响健康检查服务 |
| NG-004 | 不引入后端 API 调用 | 保持前端内存态 |
| NG-005 | 不修改业务逻辑、状态机、订单流程 | 仅视觉层面变更 |
| NG-006 | 不引入三态切换（浅色/夜间/跟随系统） | 已确认仅支持浅色/夜间二态切换 |

---

# 3. 核心概念

| 概念 / 术语 | 描述 | 备注 |
|-------------|------|------|
| 夜间模式（Dark Mode） | 深色背景 + 浅色文字的界面配色方案 | 与现有浅色模式互斥 |
| FOUC（Flash of Unstyled Content） | 首次加载时配色闪烁 | 需在 React 挂载前应用样式避免 |
| dark class | 添加到 `document.documentElement` 的 CSS class | 参照 `elderly` class 模式 |
| dark: 变体 | Tailwind CSS 的暗色模式类名前缀 | 需在 tailwind.config.js 中配置 `darkMode: 'class'` |

---

# 4. 页面与信息架构

## 4.1 入口路径

| 入口 ID | 入口位置 | 目标页面 | 权限 / 前置条件 | 备注 |
|---------|----------|----------|------------------|------|
| ENTRY-001 | TopBar 工具栏（header 内） | 当前页面（无页面跳转） | 用户已绑定餐桌并进入主流程 | 与老人模式、语言切换按钮同排 |

> 绑定餐桌页（BindTable）和欢迎页（WelcomeView）当前不展示 TopBar。推断仅在主流程视图中提供切换入口，这两个视图的夜间模式仍通过 `dark` class 全局生效。

## 4.2 页面清单

| 页面 ID | 页面名称 | 页面用途 | 主要操作 | 关联 REQ |
|---------|----------|----------|----------|----------|
| PAGE-001 | 绑定餐桌页（BindTable） | 桌台绑定 | 选择桌台并绑定 | REQ-002 |
| PAGE-002 | 欢迎页（WelcomeView） | 欢迎进入 | 点击进入菜单 | REQ-002 |
| PAGE-003 | 菜单点餐页（MenuView） | 浏览并选择菜品 | 搜索、选择菜品、加入购物车 | REQ-001, REQ-002 |
| PAGE-004 | 订单履约页（OrderView） | 查看订单进度 | 查看制作进度、加菜、结账 | REQ-002 |
| PAGE-005 | 结账页（CheckoutView） | 支付结账 | 模拟支付 | REQ-002 |
| PAGE-COMP | 通用组件 | TopBar / CartPanel / ServiceSheet / DemoConsole / 移动端导航 / Toast | - | REQ-002 |

## 4.3 页面关系

| 起点 | 用户动作 | 终点 | 说明 |
|------|----------|------|------|
| 任意页面 | 点击 TopBar 夜间模式切换按钮 | 同页面（配色切换） | 无页面跳转，仅视觉切换 |

---

# 5. 功能需求

## REQ-001: 夜间模式切换

**User Story**
> As a 门店顾客, I want 在低光环境下切换到夜间模式, so that 减少屏幕亮度对眼睛的刺激.

**Priority**: P0

**需求描述**
用户在 TopBar 工具栏看到夜间模式切换按钮，点击后全站界面在 250ms 内平滑过渡到深色配色方案。切换状态通过 localStorage 持久化，刷新后保持。切换时显示 Toast 提示当前模式。首次使用默认浅色模式。

**Acceptance Requirements**
- **REQ-001.1**: The system **shall** 在 TopBar 工具栏中显示夜间模式切换按钮，使用 Moon 图标（浅色模式下）/ Sun 图标（夜间模式下）表示当前状态。
- **REQ-001.2**: **When** 用户点击夜间模式切换按钮, the system **shall** 在 250ms 内将全站界面从当前配色方案平滑过渡到目标配色方案。
- **REQ-001.3**: **When** 用户切换夜间模式, the system **shall** 通过 Toast 显示当前模式提示文案（中文"已切换为夜间模式"/"已切换为日间模式"，英文"Switched to dark mode"/"Switched to light mode"）。
- **REQ-001.4**: The system **shall** 将夜间模式状态持久化到 localStorage（key: `dark-mode`，值: `true`/`false`）。
- **REQ-001.5**: **If** localStorage 不可用, the system **shall** 降级为内存态切换，不报错不阻塞。
- **REQ-001.6**: **When** 页面首次加载且 localStorage 中已保存夜间模式为开启, the system **shall** 在 React 挂载前应用深色样式（通过 index.html 内联脚本设置 dark class），避免 FOUC。
- **REQ-001.7**: The system **shall** 在首次使用（localStorage 无记录）时默认使用浅色模式。

**用户交互**

| 步骤 | 用户动作 | 产品响应 |
|------|----------|----------|
| 1 | 进入应用任意主流程页面 | TopBar 工具栏显示夜间模式切换按钮（Moon 图标） |
| 2 | 点击夜间模式切换按钮 | 界面在 250ms 内过渡到深色配色，图标变为 Sun，Toast 提示"已切换为夜间模式" |
| 3 | 再次点击切换按钮 | 界面过渡回浅色配色，图标变为 Moon，Toast 提示"已切换为日间模式" |
| 4 | 刷新页面 | 界面保持上次选择的模式 |

**关联埋点**: 无（概念演示项目，无埋点）
**实现映射**: Design §夜间模式配色方案, Tasks T-001 ~ T-010

## REQ-002: 全站夜间模式视觉覆盖

**User Story**
> As a 门店顾客, I want 夜间模式下所有页面和组件都有协调的深色样式, so that 切换后没有视觉不一致的区域.

**Priority**: P0

**需求描述**
夜间模式需覆盖应用全部页面和组件，包括但不限于：TopBar、Banner、BindTable、WelcomeView、MenuView（含分类导航、菜品卡片、规格弹窗、超级辣风险提示弹窗）、CartPanel（桌面侧栏+移动端弹窗）、OrderView、CheckoutView、ServiceSheet、DemoConsole、移动端底部导航、悬浮 Toast 提示。所有文字在深色背景上保持可读性（WCAG AA 对比度 ≥ 4.5:1）。

**Acceptance Requirements**
- **REQ-002.1**: The system **shall** 在夜间模式下将所有页面背景从浅色（rice 色系）转为深色（charcoal 色系）。
- **REQ-002.2**: The system **shall** 在夜间模式下将所有文字从深色转为浅色，确保 WCAG AA 对比度。
- **REQ-002.3**: The system **shall** 在夜间模式下保持 chili 品牌红色的可辨识度，适当调亮以适配深色背景。
- **REQ-002.4**: The system **shall** 确保 Radix Dialog 弹窗（规格选择、超级辣风险提示、会员弹窗、购物车弹窗）在夜间模式下有对应深色样式。
- **REQ-002.5**: The system **shall** 确保夜间模式与老人模式叠加时，老人模式的高对比度增强规则仍有效或已适配。

**用户交互**

| 步骤 | 用户动作 | 产品响应 |
|------|----------|----------|
| 1 | 开启夜间模式 | 全部页面和组件显示深色配色 |
| 2 | 浏览各页面（菜单/订单/结账） | 各页面均有深色样式，无视觉断裂 |
| 3 | 打开弹窗（规格选择/服务面板/控制台） | 弹窗内容也有深色样式 |
| 4 | 同时开启老人模式 | 界面深色配色 + 放大字号，两者叠加正常 |

**关联埋点**: 无
**实现映射**: Design §夜间模式配色方案

---

# 6. 字段与校验

| 字段 ID | 字段名称 | 类型 | 必填 | 默认值 | 约束 / 校验 | 使用页面 / 展示位置 | 关联 REQ |
|---------|----------|------|------|--------|-------------|----------------------|----------|
| FIELD-001 | dark-mode（localStorage） | string | 否 | `"false"` | 值为 `"true"` 或 `"false"` | localStorage | REQ-001 |
| FIELD-002 | dark class（html element） | boolean | 否 | 不存在 | class 存在/不存在 | document.documentElement.classList | REQ-001 |

---

# 7. 状态与流转

## 7.1 状态定义

| 状态 ID | 状态名称 | 含义 | 进入条件 | 退出条件 |
|---------|------|------|----------|----------|
| STATE-001 | 日间模式（light） | 浅色配色方案 | 默认 / 用户切换至日间 | 用户切换至夜间 |
| STATE-002 | 夜间模式（dark） | 深色配色方案 | 用户切换至夜间 | 用户切换至日间 |

## 7.2 操作流转

| 操作 ID | 用户动作 | 前置状态 | 目标状态 | 生效时机 | 失败处理 | 关联 REQ |
|---------|----------|----------|----------|----------|----------|----------|
| ACTION-001 | 点击夜间模式切换按钮 | 日间模式 | 夜间模式 | 立即 | localStorage 失败时降级为内存态 | REQ-001 |
| ACTION-002 | 点击夜间模式切换按钮 | 夜间模式 | 日间模式 | 立即 | localStorage 失败时降级为内存态 | REQ-001 |
| ACTION-003 | 页面加载 | - | 上次保存的模式 | React 挂载前 | localStorage 不可用时默认日间模式 | REQ-001 |

---

# 8. API 设计

> 本次无 API 变更。应用为前端内存态，不依赖后端 API。

---

# 9. 非功能性需求

| NFR ID | 类别 | 要求 | 验收方法 |
|--------|------|------|----------|
| NFR-001 | 性能 | 夜间模式切换不引入额外渲染开销，过渡利用现有 250ms 全局 CSS transition | 切换后观察过渡流畅无卡顿 |
| NFR-002 | 性能 | 首屏加载无 FOUC，深色样式在 React 挂载前应用 | 刷新页面观察无浅色闪烁 |
| NFR-003 | 兼容 | 夜间模式不影响现有 E2E 测试断言（基于 class 和文案） | `npx playwright test` 通过 |
| NFR-004 | 可访问性 | 夜间模式下文字对比度 ≥ 4.5:1（WCAG AA） | 检查主要文字与背景对比度 |
| NFR-005 | 兼容 | 夜间模式与老人模式叠加时功能正常 | 手动验证叠加状态 |
| NFR-006 | 稳定性 | localStorage 异常时静默降级，不报错不阻塞 | 模拟 localStorage 不可用场景 |

---

# 10. 追溯矩阵

| REQ / NFR ID | 设计章节 | Task ID | QA 用例 | API / 埋点 / 迁移 | 证据来源 |
|--------------|----------|---------|---------|-------------------|----------|
| REQ-001 | §夜间模式切换实现 | T-001~T-005 | QA-001（切换主流程） | localStorage: dark-mode | useElderlyMode.ts |
| REQ-002 | §夜间模式配色方案 | T-006~T-008 | QA-002（全站覆盖） | - | index.css, tailwind.config.js |
| NFR-001 | §全局过渡 | - | QA-003（过渡流畅） | - | index.css |
| NFR-002 | §FOUC 防护 | T-004 | QA-004（无闪烁） | - | index.html |
| NFR-003 | §E2E 回归 | T-009 | super-spicy.spec.ts | - | e2e/ |
| NFR-004 | §对比度 | - | QA-005（对比度检查） | - | WCAG AA |
| NFR-005 | §老人模式叠加 | - | QA-006（叠加验证） | - | useElderlyMode.ts |
| NFR-006 | §异常降级 | T-003 | QA-007（异常降级） | - | useElderlyMode.ts |

---

# 11. 技术实现方案概要（供开发节点参考）

> 本节为需求澄清阶段的技术方向建议，非最终实现方案。最终实现以代码开发节点为准。

## 11.1 实现方式：方案 A（已确认）—— Tailwind `darkMode: 'class'` + `dark:` 变体

已确认采用方案 A。需更新 AGENTS.md 移除"不引入暗色模式或 `dark:` 变体"和"仅需浅色样式"的禁止条款。

- 在 `tailwind.config.js` 中新增 `darkMode: 'class'`。
- 新增 `useDarkMode` hook，参照 `useElderlyMode`，通过 `localStorage` + `document.documentElement.classList` 管理 `dark` class。
- 在各组件 JSX 中的 Tailwind 类名旁添加 `dark:` 变体（如 `bg-rice-100 dark:bg-charcoal-900`）。
- 优点：Tailwind 原生支持，CSS 体积可控（purge），与现有代码风格一致。

## 11.2 夜间模式配色方向

| 元素 | 浅色模式 | 夜间模式（dark:） |
|------|----------|-------------------|
| 页面背景 | `bg-rice-100` (#fbf5ea) | `dark:bg-charcoal-900` (#211f1c) |
| 卡片/面板背景 | `bg-rice-50` / `bg-white` | `dark:bg-charcoal-700` (#34312d) |
| 主要文字 | `text-charcoal-900` (#211f1c) | `dark:text-rice-100` (#fbf5ea) |
| 次要文字 | `text-charcoal-500` (#5f5b55) | `dark:text-rice-200` (#f3e6d0) |
| 品牌红 | `chili-500` (#e13b2b) | `dark:chili-500` 或适当调亮 |
| 次强调黄 | `amber-400` (#f5b83f) | `dark:amber-400` 或适当调亮 |
| 边框 | `border-charcoal-900/5` | `dark:border-rice-200/10` |

> 具体色值由开发节点根据视觉效果微调，但需保证 WCAG AA 对比度。

## 11.3 关键改动清单

| 编号 | 改动项 | 影响文件 | 说明 |
|------|--------|----------|------|
| T-001 | 新增 `useDarkMode` hook | `src/hooks/useDarkMode.ts` | 参照 `useElderlyMode` 模式（useState + useEffect + localStorage + classList） |
| T-002 | TopBar 新增切换按钮 | `src/components/TopBar.tsx` | Moon/Sun 图标 + aria-label |
| T-003 | App.tsx 接入夜间模式 | `src/App.tsx` | 调用 `useDarkMode`，传递给 TopBar，切换 Toast |
| T-004 | index.html 初始化脚本 | `index.html` | 挂载前读取 localStorage 设置 dark class，防 FOUC |
| T-005 | i18n 新增文案 | `src/i18n.ts` | 中英文切换提示、aria-label（"已切换为夜间模式"/"已切换为日间模式"、"Switched to dark mode"/"Switched to light mode"） |
| T-006 | tailwind.config.js | `tailwind.config.js` | 新增 `darkMode: 'class'` |
| T-007 | 各组件添加 dark: 变体 | `src/components/*.tsx` | 全站组件深色样式（BindTable, WelcomeView, MenuView, CartPanel, OrderView, CheckoutView, ServiceSheet, DemoConsole, TopBar, App.tsx 布局） |
| T-008 | index.css 适配 | `src/index.css` | `:root` 背景色 dark 适配、老人模式叠加规则适配 |
| T-009 | E2E 回归验证 | `e2e/super-spicy.spec.ts` | 确认现有用例不受影响 |
| T-010 | 更新 AGENTS.md | `AGENTS.md` | 移除暗色模式禁止条款，更新样式约定描述 |
