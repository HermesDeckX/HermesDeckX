const n="沙箱权限错误",e="排查 Docker 沙箱容器无法启动、权限不足或文件访问失败的问题",o={question:"沙箱容器无法启动或出现权限错误怎么办？",answer:`## 排查步骤

### 1. 确认 Docker 已安装且正在运行
- Windows：确认 Docker Desktop 已启动（系统托盘有 Docker 图标）
- macOS：确认 Docker Desktop 已启动
- Linux：运行 \`docker info\` 确认 Docker 服务正在运行

### 2. 检查 Docker 权限
- Linux 用户需要将当前用户添加到 docker 组：\`sudo usermod -aG docker $USER\`
- 或确认 HermesAgent 进程有权限访问 Docker socket（/var/run/docker.sock）

### 3. 检查镜像
前往「配置中心 → 代理 → 沙箱 → Docker 设置」：
- 确认 image 字段的镜像名称正确
- 运行 \`docker pull <image>\` 手动拉取镜像
- 如果在国内，可能需要配置 Docker 镜像加速器

### 4. 工作区访问问题
如果 AI 报告「无法访问文件」或「权限拒绝」：
- 检查 \`workspaceAccess\` 设置：none / ro / rw
- ro（只读）模式下 AI 无法修改文件
- 确认 workspace 路径存在且 Docker 有权限挂载

### 5. 网络问题
- 默认使用 bridge 网络模式
- 如果 AI 需要访问网络（如安装包、网络搜索），确认 network 不是 none
- **不要使用 host 模式**（会被安全策略拒绝）

### 6. 资源限制
如果容器频繁被 OOM Kill：
- 增大 memory 限制（如 "1g"）
- 增大 pidsLimit（如 256）
- 检查 cpus 限制是否过低

### 7. WSL2 特殊情况（Windows）
- 确认 Docker Desktop 使用 WSL2 后端（Settings → General → Use WSL 2）
- 文件路径使用 Linux 格式（/mnt/c/Users/...）
- 如果沙箱内运行命令报「exec format error」，检查镜像架构是否匹配

## 配置字段

对应配置路径：\`agents.defaults.sandbox\``},r={name:n,description:e,content:o};export{o as content,r as default,e as description,n as name};
