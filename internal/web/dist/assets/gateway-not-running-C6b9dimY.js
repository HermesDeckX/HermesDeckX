const n="게이트웨이 미실행",e="HermesAgent 게이트웨이가 시작되지 않거나 비정상 동작하는 문제 해결",s={question:"게이트웨이가 시작되지 않거나 비정상 동작하는 경우 어떻게 하나요?",answer:`## 문제 해결 단계

### 1. 게이트웨이 상태 확인
HermesDeckX 대시보드 상단에서 게이트웨이 상태 표시등을 확인합니다:
- 🟢 실행 중 — 정상
- 🔴 중지됨 — 시작 필요
- 🟡 시작 중 — 준비 대기

### 2. 포트 사용 확인
게이트웨이는 기본적으로 포트 18789를 사용합니다. 포트가 사용 중인 경우:
- **Windows**: \`netstat -ano | findstr 18789\`
- **macOS/Linux**: \`lsof -i :18789\`
- 사용 중인 프로세스를 종료하거나 설정에서 게이트웨이 포트를 변경하세요

### 3. 설정 파일 확인
- \`~/.hermesdeckx/config.yaml\`이 존재하고 올바른 형식인지 확인
- 일반적인 오류: YAML 들여쓰기 오류, 유효하지 않은 JSON 값
- 백업 후 설정을 삭제하고 게이트웨이가 기본 설정을 생성하도록 시도

### 4. Node.js 버전 확인
- HermesAgent은 Node.js 18+ 이 필요합니다
- \`node --version\`으로 버전 확인
- Node.js 22 LTS 사용 권장

### 5. 로그 확인
- 로그 위치: \`~/.hermesdeckx/logs/\`
- 최근 오류 메시지 확인
- 로그 레벨을 \`debug\`로 설정하여 더 자세한 정보 획득

### 6. 재설치
위 단계로 해결되지 않는 경우:
- \`npm install -g hermesagent@latest\`
- 게이트웨이 재시작

## 빠른 수정

HermesDeckX에서 「게이트웨이 시작」 버튼을 클릭하거나 터미널에서 \`hermesagent gateway run\`을 실행합니다.`},t={name:n,description:e,content:s};export{s as content,t as default,e as description,n as name};
