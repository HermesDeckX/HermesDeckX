const n="세션 관리",e="세션 범위, 자동 리셋, 유지보수 전략을 설정하여 대화 연속성 향상",s={body:`## 세션이란?

세션은 일련의 연속된 대화 컨텍스트입니다. HermesAgent은 세션 내에서 대화 기록을 유지하여 AI가 이전 메시지를 참조할 수 있게 합니다.

## 세션 범위

「설정 센터 → 세션 → 범위」로 이동:

| 범위 | 설명 |
|------|------|
| **channel** | 채널당 1 세션 (같은 채널의 모든 사용자가 컨텍스트 공유) |
| **user** | 사용자당 1 세션 (각 사용자가 독립 컨텍스트) |
| **thread** | 스레드/토픽당 1 세션 (가장 세밀한 단위) |

## 자동 리셋

「설정 센터 → 세션 → 자동 리셋」으로 이동:
- **enabled** — 자동 리셋 활성화
- **every** — 리셋 간격 (예: "24h" 매일, "7d" 매주)
- **keepMemory** — 리셋 후 MEMORY.md 내용 유지 여부

## 세션 명령

사용자가 채팅 명령으로 세션 제어 가능:
- \`/reset\` — 현재 세션 수동 리셋
- \`/compact\` — 컨텍스트 압축 트리거
- \`/session\` — 현재 세션 정보 표시

## 설정 필드

해당 설정 경로: \`session.scope\`, \`session.autoReset\`, \`session.maintenance\``},o={name:n,description:e,content:s};export{s as content,o as default,e as description,n as name};
