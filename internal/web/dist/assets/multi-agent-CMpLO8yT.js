const n="멀티 에이전트 협업",e="다른 시나리오에 다른 Agent를 사용하여 각 Agent에 독립적인 인격, 메모리, 스킬 설정 부여",t={body:`## 멀티 에이전트란?

멀티 에이전트를 통해 여러 독립적인 AI 캐릭터를 만들 수 있습니다. 각 Agent는 다음을 독자적으로 보유합니다:

- **IDENTITY.md** — 독립적인 정체성과 인격
- **SOUL.md** — 독립적인 행동 규칙
- **MEMORY/** — 독립적인 메모리 시스템
- **스킬** — 독립적인 스킬 설정

## 사용 시나리오

| 시나리오 | Agent 예시 |
|---------|------------|
| 업무 vs 일상 | 「업무 어시스턴트」가 이메일과 코드 처리, 「생활 어시스턴트」가 일정과 쇼핑 관리 |
| 한국어 vs 영어 | 하나의 Agent는 한국어, 다른 하나는 영어 |
| 다른 프로젝트 | 프로젝트마다 Agent를 분리하여 메모리와 컨텍스트 완전 격리 |
| 팀 공유 | 팀 멤버별 전용 Agent |

## 설정 방법

### 1. 새 Agent 만들기
「설정 센터 → 에이전트 → 에이전트 추가」에서 이름과 이모지 설정.

### 2. 채널 지정
각 Agent를 다른 채널에 바인딩:
- 업무 Agent → Slack
- 일상 Agent → Telegram

### 3. 독립 설정
각 Agent에 독립적인 IDENTITY.md, SOUL.md, 스킬을 설정.

## 고급: Agent 간 협업

- **공유 메모리** — 일부 메모리 파일을 Agent 간 공유
- **메시지 라우팅** — 메시지 내용에 따라 적절한 Agent에 자동 배분
- **워크플로우** — 여러 Agent가 단계별로 협업하여 복잡한 작업 완료

## 모범 사례

- 2개 Agent부터 시작 (업무 + 일상 등), 점진적으로 확장
- 각 Agent의 IDENTITY.md에 명확한 역할 구분
- HermesDeckX의 「멀티 에이전트 관리」 패널로 통합 관리`},g={name:n,description:e,content:t};export{t as content,g as default,e as description,n as name};
