const n="沙箱安全执行",o="启用 Docker 沙箱隔离 AI 的命令执行和代码运行，防止意外操作损坏系统",e={body:`## 为什么需要沙箱？

当 AI 助手执行命令或运行代码时，默认在宿主机上直接运行。如果 AI 产生错误操作（如误删文件），可能造成不可逆的损害。沙箱通过 Docker 容器隔离执行环境，确保安全。

## 沙箱模式

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| **off** | 不使用沙箱（默认） | 个人设备，信任环境 |
| **non-main** | 仅非主代理使用沙箱 | 多代理场景，主代理需要直接操作 |
| **all** | 所有代理都在沙箱中运行 | 生产环境，最高安全级别 |

## 在 HermesDeckX 中配置

1. 前往「配置中心 → 代理 → 沙箱」
2. 在「沙箱模式」下拉列表中选择模式
3. 选择工作区访问级别：
   - **none** — 沙箱内无法访问工作区文件
   - **ro** — 只读访问（推荐）
   - **rw** — 读写访问

## Docker 容器配置

在「Docker 设置」中可以精细控制容器资源：
- **image** — 使用的 Docker 镜像
- **memory** — 容器内存限制（如 512m、1g）
- **cpus** — CPU 核心数限制
- **pidsLimit** — 进程数限制（防止 fork 炸弹）
- **network** — 网络模式（bridge/none，禁止使用 host）
- **capDrop** — 要移除的 Linux Capabilities

## 前提条件

- 需要安装 Docker 并确保 Docker 服务正在运行
- HermesAgent 进程需要有权限访问 Docker API
- Windows 用户需要 Docker Desktop 或 WSL2 中的 Docker

## 配置字段

对应配置路径：\`agents.defaults.sandbox.mode\`

值为 \`off\` | \`non-main\` | \`all\``},r={name:n,description:o,content:e};export{e as content,r as default,o as description,n as name};
