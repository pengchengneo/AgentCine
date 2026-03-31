# AgentCine

<p align="center">
  <img src="public/agentcine-logo.svg" alt="AgentCine logo" width="720">
</p>

<p align="center">
  一个面向 AI 影视创作流程的工作台：从文本分析、角色与场景资产管理，到分镜生成、配音与视频任务编排，统一在同一个项目工作区内完成。
</p>

<p align="center">
  <a href="README_en.md">English</a>
</p>

---

## 预览

![Agent Pipeline Dashboard](docs/images/agent-pipeline-dashboard.png)

---

## 项目简介

AgentCine 是一个基于 Next.js 15 + React 19 构建的 AI 影视制作平台。当前仓库已经包含：

- 文本到项目的创作工作区
- 全局素材库与项目内素材复用
- 角色、场景、分镜、台词、配音、视频等多类任务流
- API 配置中心，可接入多种模型与媒体服务
- BullMQ Worker + Watchdog 的异步任务执行体系
- 基于 Prisma 的数据层，以及 MinIO/S3 兼容媒体存储

从当前代码结构看，项目核心围绕以下模块展开：

- `workspace`：项目工作区与创作主流程
- `asset-hub`：全局角色、场景、声音等素材管理
- `profile/api-config`：模型与服务商配置中心
- `api/novel-promotion/*`：项目内分析、分镜、图片、语音、视频等接口
- `src/lib/workers`：后台任务消费

---

## 主要能力

- AI 文本分析：将文本内容拆解为角色、场景、镜头与创作素材
- 角色与场景资产管理：支持项目内资产与全局资产协同
- 分镜生成与编辑：围绕 storyboard / shot / panel 组织创作流程
- 配音与角色声音绑定：支持语音分析、角色配音、台词音频生成
- 视频任务编排：支持视频生成、下载、代理访问与媒体引用管理
- 媒体统一存储：图片、音频、视频通过 MinIO / S3 兼容存储统一管理
- 配置中心：支持 OpenAI Compatible 等模型接入配置
- 后台队列执行：通过 Redis + BullMQ 处理高耗时生成任务

---

## 技术栈

- 前端框架：Next.js 15、React 19
- 语言与运行时：TypeScript、Node.js 18+
- 数据库：MySQL + Prisma
- 队列系统：Redis + BullMQ
- 媒体与视频：Remotion、Sharp
- 认证：NextAuth.js
- 样式：Tailwind CSS v4
- 对象存储：MinIO / S3 兼容接口

---

## 目录概览

```text
src/app/[locale]/workspace         项目工作区
src/app/[locale]/workspace/asset-hub  全局素材库
src/app/api/novel-promotion        创作主流程 API
src/app/api/asset-hub              素材库 API
src/app/api/user/api-config        配置中心 API
src/lib/workers                    队列消费者
prisma/                            数据模型
scripts/                           守护、迁移、检查脚本
```

---

## 快速开始

### 环境要求

- Node.js `>= 18.18.0`
- npm `>= 9.0.0`
- Docker / Docker Compose

### 方式一：Docker 一键启动

项目根目录已提供 `docker-compose.yml`，默认启动以下服务：

- MySQL
- Redis
- MinIO
- AgentCine 应用

执行：

```bash
docker compose up -d
```

启动后访问：

- 应用：`http://localhost:13000`
- Bull Board：`http://localhost:13010/admin/queues`
- MinIO Console：`http://localhost:19001`

首次启动时容器会自动执行：

- `prisma db push`
- 应用服务启动
- Worker / Watchdog / Bull Board 并行运行

### 方式二：本地开发

1. 安装依赖

```bash
npm install
```

2. 启动基础设施

```bash
docker compose up mysql redis minio -d
```

3. 准备环境变量

```bash
cp .env.example .env
```

4. 同步数据库

```bash
npx prisma db push
```

5. 启动开发环境

```bash
npm run dev
```

本地开发默认访问：

- 应用：`http://localhost:3000`
- 队列面板：`http://localhost:3010/admin/queues`

---

## 环境变量说明

可参考仓库中的 [`.env.example`](/Users/niu/AgentCine/.env.example)。

重点配置项包括：

- `DATABASE_URL`：MySQL 连接串
- `REDIS_HOST` / `REDIS_PORT`：队列与任务状态依赖
- `STORAGE_TYPE`：默认 `minio`
- `MINIO_*`：对象存储配置
- `NEXTAUTH_URL` / `NEXTAUTH_SECRET`：认证配置
- `CRON_SECRET` / `INTERNAL_TASK_TOKEN` / `API_ENCRYPTION_KEY`：内部安全配置
- `BULL_BOARD_*`：任务管理面板配置

应用启动后，还可以在站内的 API 配置中心补充模型提供商、接口地址与密钥。

---

## 开发脚本

常用命令：

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test:unit:all
npm run test:integration:api
npm run test:integration:chain
npm run test:behavior:full
```

项目还内置了大量守护与一致性检查脚本，例如：

- 模型配置契约检查
- 媒体引用一致性检查
- API 路由与测试覆盖检查
- Prompt / i18n 回归检查

---

## 运行架构

项目默认不是单纯的前端站点，而是一个包含多进程协作的应用：

- Next.js 负责页面与 API 路由
- Worker 负责消费图片、视频、语音、文本任务
- Watchdog 负责任务心跳与异常处理
- Bull Board 提供队列可视化管理页面
- MySQL 持久化项目、任务、配置与媒体引用
- Redis 负责队列与任务状态流转
- MinIO 负责媒体对象存储

因此无论是 Docker 部署还是本地开发，都建议把应用、数据库、Redis、对象存储一起启动。

---

## 说明

本 README 已按当前仓库实际结构重写，并将项目统一命名为 `AgentCine`。

项目在实现与产品思路上参考了：

- https://github.com/saturndec/waoowaoo
