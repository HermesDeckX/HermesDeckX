const e="백업 및 복원",n="HermesAgent 설정, 메모리, 대화 기록을 백업하고 새 기기로 마이그레이션 지원",s={body:`## 백업해야 할 내용

| 항목 | 경로 | 중요도 |
|------|------|--------|
| 설정 파일 | \`~/.hermesdeckx/config.yaml\` | 필수 |
| 에이전트 설정 | \`~/.hermesdeckx/agents/\` | 필수 |
| 메모리 파일 | \`~/.hermesdeckx/memory/\` | 중요 |
| 세션 기록 | \`~/.hermesdeckx/sessions/\` | 선택 |
| 자격 증명 | \`~/.hermesdeckx/credentials/\` | 중요 |

## 백업 방법

### 방법 1: 수동 백업
\`\`\`bash
cp -r ~/.hermesdeckx ~/hermesdeckx-backup-$(date +%Y%m%d)
\`\`\`

### 방법 2: CLI 사용
\`\`\`bash
hermesagent config export > my-config-backup.yaml
\`\`\`

### 방법 3: HermesDeckX UI
「설정 센터」 하단의 「설정 내보내기」 버튼 클릭.

## 복원 방법

### 새 기기로 복원
1. HermesAgent 설치: \`npm install -g hermesagent@latest\`
2. 백업 파일을 \`~/.hermesdeckx/\`에 복사
3. 게이트웨이 시작: \`hermesagent gateway run\`

## 설정 필드

관련 경로: \`~/.hermesdeckx/\``,steps:["백업 범위 확인 (설정, 메모리, 기록)","cp, CLI 또는 UI로 백업 실행","백업 파일을 안전한 곳에 저장","복원 시 파일을 ~/.hermesdeckx/에 복사하고 게이트웨이 재시작"]},c={name:e,description:n,content:s};export{s as content,c as default,n as description,e as name};
