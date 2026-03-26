# AgentCine Agent Pipeline 升级设计

> 将固定的人工 5 阶段流程改造为多 Agent 协作的端到端自动化流水线。

## 背景与目标

### 现状痛点

AgentCine 当前采用 5 阶段顺序流程（Config → Assets → Storyboard → Videos → Voice），每个阶段都需要人工参与：粘贴剧本、确认角色、编辑 Prompt、逐个生成图片/视频等。整个流程繁琐，耗时长。

### 目标

- 用户操作简化为 2 步：输入剧本 → 审核结果
- Agent 全自动完成剧本分析、角色/场景资产生成、分镜板生成
- 人只做最终审核者（70% 直接可用，30% 需调整）
- 保留原有手动模式，Agent 模式为平行路径

### 第一期范围

覆盖 Config → Assets → Storyboard 三个阶段的自动化。Video 和 Voice 的自动化留到第二期。

### 行业参考

参考了 360 纳米（4 层架构 + 万级 Agent 群体智能）、巨日禄（动画师 Agent，6 人团队月产 5 部）、Elser AI（4-Agent 管道）、水母智能（跨模态 MAS）等平台的架构模式。

## 整体架构：4 层分离

在现有系统上方叠加 Agent Layer 和 Asset Layer，形成 4 层架构：

### ① User Layer（用户层）

- 保留现有 Stage 逐步编辑 UI（手动模式）
- 新增"一键生成"入口按钮，启动 Agent 流水线
- 新增审核面板，查看/修改/重试/通过各阶段产出
- 通过 `pipelineMode` 字段区分手动模式和 Agent 模式

### ② Agent Layer（Agent 层）— 新增

基于现有 LangGraph 基础设施扩展，构建一个 SuperGraph：

**制片人 Agent（ProducerAgent）** — 总调度节点：
- 接收用户输入，启动流水线
- 监控各 Agent 进度，处理异常
- 在 Agent 间传递上下文（通过 LangGraph Shared State）
- 质量关卡：检查每阶段输出，决定通过/重试/标记人工审核
- 汇总最终结果，推送审核面板

**编剧 Agent（ScriptAgent）** — Phase 1：
- 输入：原始剧本文本
- 步骤：剧本理解 → 角色提取 → 场景提取 → 分集拆分 → 剧本转写（Clips）
- 输出：角色列表 + 场景列表 + Episodes[Clips[]] → 写入 Asset Layer
- 复用现有 text.worker handlers（analyze, story-to-script）

**美术 Agent（ArtDirectorAgent）** — Phase 2：
- 输入：Asset Layer 中的角色/场景描述
- 步骤：风格定义 → 角色形象生成 → 场景概念图 → VLM 自洽检查 → 不合格重试
- 输出：角色参考图 + 场景参考图 → 锁定到 Asset Layer
- 复用现有 image.worker handlers（character, location）

**分镜导演 Agent（StoryboardAgent）** — Phase 3：
- 输入：Clips[] + Asset Layer（锁定的角色/场景资产）
- 步骤：分镜规划 → Prompt 合成 → 批量生图 → 一致性校验 → 不合格重试
- 输出：完整分镜板（Panels[] with images）
- 复用现有 text.worker（script-to-storyboard）+ image.worker（panel image generation）

**Agent 间通信**：所有 Agent 通过 LangGraph Shared State 共享数据，不需要额外消息队列。

**关键设计原则**：Agent 是决策者，不直接调用 AI API。而是通过现有的 Task Submitter → BullMQ → Worker 链路执行具体生成任务。

### ③ Asset Layer（资产层）— 新增

在现有 Asset Hub 基础上增加自动化能力，不替代现有功能。

**Asset Registry（资产注册表）**：

CharacterAsset 扩展：
- `promptFragment`: 自动合成的 Prompt 片段（如 "a tall man with blue eyes, short black hair, wearing a leather jacket"）
- `assetStatus`: `draft | locked`，locked 后 Agent 不可自动修改
- 现有字段（name, aliases, appearance, personality, referenceImages, voiceId）保持不变

LocationAsset 扩展：
- `promptFragment`: 自动合成的场景 Prompt 片段
- `assetStatus`: `draft | locked`
- 现有字段保持不变

StyleProfile（新增）：
- `artStyle`: 用户选择的画风
- `stylePrefix`: 所有图片 Prompt 的统一前缀
- `negativePrompt`: 统一负面提示词
- `colorPalette`: 可选色调约束

**Prompt Composer（Prompt 合成引擎）**：

生成 Panel 图片时自动组装完整 Prompt：

```
finalPrompt = stylePrefix + character.promptFragment + location.promptFragment + panel.shotDescription + panel.actionDescription
```

一致性规则：
- 角色 promptFragment 一旦 locked，所有 Panel 必须使用
- 场景 promptFragment 在同一场景的所有 Panel 中保持一致
- stylePrefix 全局统一，不允许单 Panel 覆盖
- 如果模型支持 image reference，自动注入参考图

**Consistency Checker（一致性校验器）**：

生成图片后用 VLM 自动校验：
1. 角色匹配 — 生成图中的角色是否匹配参考图
2. 场景匹配 — 背景环境是否匹配场景描述
3. 风格一致 — 画风是否与全局风格一致
4. 评分决策：score ≥ 阈值 → 通过；score < 阈值 且 retries < max → 调整 Prompt 重试；retries ≥ max → 标记待人工审核

### ④ Generation Layer（生成层）≈ 现有系统

现有 BullMQ Task Queues + Workers + Generators 基本不动：
- Text Worker: LLM 分析任务
- Image Worker: 图片生成任务
- Video Worker: 视频生成任务（第二期）
- Voice Worker: 语音生成任务（第二期）
- 多模型调度（现有 factory）：OpenAI、Gemini、FAL、Ark、Bailian 等

少量改动：部分 worker handler 增加返回 quality metadata，供 Agent 做质量判断。

## 审核系统

### 用户操作流程

1. **输入**：粘贴/导入剧本文本，选择画风和比例，点击"一键生成"
2. **等待**：Agent 全自动执行，通过 SSE 实时推送进度，用户可离开
3. **审核**：在审核面板查看每阶段产出，对每项标记：通过 / 修改 / 重试

### 审核面板

- 按阶段（编剧/美术/分镜）分 tab 展示
- 每个产出项（角色、场景、Panel）有状态标记：
  - ✅ 自动通过（一致性评分超过阈值）
  - ⚠️ 待审核（评分低于阈值但未耗尽重试）
  - ❌ 需人工处理（重试耗尽）
- 待审项操作：接受、重新生成、编辑 Prompt
- 支持整个阶段重跑

### 审核模式

- **宽松模式**：只展示失败项（重试耗尽的），适合批量生产
- **标准模式**：展示失败项 + 低分项，自动通过高分 Panel
- **严格模式**：所有 Panel 都需人工确认，最高质量但最耗时

## 集成方案

### 新增模块

```
src/lib/agent-pipeline/
├── graph/
│   ├── super-graph.ts            # LangGraph 超级图定义
│   ├── state.ts                  # PipelineState 类型定义
│   └── nodes/
│       ├── producer.ts           # 制片人 Agent 节点
│       ├── script-agent.ts       # 编剧 Agent 节点
│       ├── art-director.ts       # 美术 Agent 节点
│       └── storyboard-agent.ts   # 分镜导演 Agent 节点
├── asset-layer/
│   ├── registry.ts               # 资产注册表 CRUD + 锁定
│   ├── prompt-composer.ts        # Prompt 自动合成引擎
│   ├── consistency-checker.ts    # VLM 一致性校验
│   └── types.ts                  # AssetRef, StyleProfile 类型
├── quality/
│   ├── quality-gate.ts           # 质量关卡检查逻辑
│   └── scoring.ts                # 评分算法
├── review/
│   ├── review-service.ts         # 审核状态管理
│   └── types.ts                  # ReviewItem, ReviewStatus
└── index.ts                      # Pipeline 启动入口
```

### 数据库改动

现有表扩展：
- `Character` 表：+ `promptFragment` (String?)、+ `assetStatus` (Enum: draft/locked, 默认 draft)
- `Location` 表：+ `promptFragment` (String?)、+ `assetStatus` (Enum: draft/locked, 默认 draft)
- `Project` 表：+ `pipelineMode` (Enum: manual/agent, 默认 manual)

新增表：

```prisma
model PipelineRun {
  id            String        @id @default(cuid())
  projectId     String
  project       Project       @relation(fields: [projectId], references: [id])
  status        PipelineStatus // running | paused | review | completed | failed
  currentPhase  String         // script | art | storyboard
  stateSnapshot Json           // LangGraph state 快照，支持断点续跑
  config        Json           // 审核模式、重试上限等配置
  reviewItems   ReviewItem[]
  startedAt     DateTime       @default(now())
  completedAt   DateTime?
}

model ReviewItem {
  id             String       @id @default(cuid())
  pipelineRunId  String
  pipelineRun    PipelineRun  @relation(fields: [pipelineRunId], references: [id])
  phase          String       // script | art | storyboard
  targetType     String       // character | location | panel
  targetId       String
  status         ReviewStatus // auto_passed | pending | approved | rejected | retrying
  score          Float?       // 一致性评分
  feedback       String?      // VLM/人工反馈
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}

model StyleProfile {
  id             String  @id @default(cuid())
  projectId      String  @unique
  project        Project @relation(fields: [projectId], references: [id])
  artStyle       String
  stylePrefix    String  @db.Text
  negativePrompt String  @db.Text
  colorPalette   String?
}
```

### API 路由新增

- `POST /api/novel-promotion/[projectId]/pipeline/start` — 启动 Agent 流水线
- `GET /api/novel-promotion/[projectId]/pipeline/status` — 查询运行状态（SSE）
- `POST /api/novel-promotion/[projectId]/pipeline/review` — 审核操作（通过/重试/修改）

### UI 改动

- `NovelPromotionWorkspace.tsx`：增加手动/Agent 模式切换
- 新增 `components/AgentModeEntry.tsx`：一键生成入口
- 新增 `components/PipelineProgress.tsx`：实时进度条
- 新增 `components/ReviewPanel.tsx`：审核面板

### 完全不动

- `src/lib/generators/` — 所有 AI 模型适配器
- `src/lib/storage/` — 存储层
- `src/lib/task/` — BullMQ 任务系统
- `src/lib/billing/` — 计费系统
- `src/lib/model-capabilities/` — 模型能力
- `src/lib/model-gateway/` — 模型网关
- `src/components/` — 通用 UI 组件
- `src/app/api/`（现有 routes）— 现有 API
- `scripts/` — 运维脚本

## LangGraph Shared State

```typescript
interface PipelineState {
  // 输入
  script: string;
  style: ArtStyle;
  aspectRatio: string;

  // 编剧 Agent 输出
  characters: Character[];
  locations: Location[];
  episodes: Episode[];

  // 美术 Agent 输出
  characterAssets: Map<characterId, AssetRef>;
  locationAssets: Map<locationId, AssetRef>;
  stylePrefix: string;

  // 分镜导演 Agent 输出
  storyboards: Storyboard[];

  // 制片人 Agent 控制
  currentPhase: 'script' | 'art' | 'storyboard' | 'review';
  qualityGates: QualityCheckResult[];
  retryCount: Record<string, number>;
}
```

## 第二期扩展方向

- **视频 Agent**：自动生成 Panel 视频、唇形同步
- **声优 Agent**：自动语音分析、配音生成、音频设计
- **剪辑 Agent**：自动粗剪、转场、配乐
- **分发 Agent**：自动导出多平台适配格式（类似泡漫的自动投放 Agent）
