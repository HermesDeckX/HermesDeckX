const n="압축 튜닝",t="대화 압축 파라미터 미세 조정 — 컨텍스트 보존과 토큰 비용의 균형",e={body:`## 대화 압축이란?

대화 기록이 너무 길어지면 압축 기능이 자동으로 기록을 요약으로 축약하여 중요한 정보를 유지하면서 토큰 소비를 줄입니다.

## HermesDeckX에서 설정

「설정 센터 → 에이전트 → 압축」으로 이동:

### 핵심 파라미터

- **threshold** — 압축을 트리거하는 토큰 임계값 (기본 50000)
  - 너무 작음: 잦은 압축, 컨텍스트 손실 가능
  - 너무 큼: 높은 토큰 소비, 응답 느려짐
  - 권장 범위: 30000-80000

- **maxOutputTokens** — 압축 후 요약의 최대 길이
  - 권장: threshold의 20-30%

### 메모리 플러시

- **memoryFlush** — 압축 시 중요 정보를 MEMORY.md에 자동 기록
  - 활성화 강력 권장
  - 압축으로 인한 중요 세부사항 손실 방지

### 압축 전략

- **strategy** — 압축 알고리즘
  - \`summarize\` — 요약 생성 (기본, 가장 효과적)
  - \`truncate\` — 오래된 메시지 직접 잘라내기 (가장 빠르지만 정보 손실)

## 권장 설정

**일상 대화**: threshold=50000, memoryFlush=true
**코딩 프로젝트**: threshold=80000, memoryFlush=true
**비용 중시**: threshold=30000, memoryFlush=true

## 설정 필드

해당 설정 경로: \`agents.defaults.compaction\``},o={name:n,description:t,content:e};export{e as content,o as default,t as description,n as name};
