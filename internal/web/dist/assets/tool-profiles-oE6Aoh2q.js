const n="도구 권한 프로필",o="프로필로 AI가 사용할 수 있는 도구를 제어 — 능력과 보안의 균형",e={body:`## 도구 프로필

HermesAgent은 4가지 프리셋 도구 프로필을 제공하여 AI가 사용할 수 있는 도구를 제어합니다:

| 프로필 | 설명 | 적용 시나리오 |
|--------|------|-------------|
| **full** | 모든 도구 사용 가능 (기본) | 개인 사용, 신뢰 환경 |
| **coding** | 코드 편집, 명령 실행, 파일 조작 | 프로그래밍 어시스턴트 |
| **messaging** | 메시지 전송, 기본 대화 | 채팅 전용 시나리오 |
| **minimal** | 최소 권한, 기본 대화만 | 높은 보안 요구 |

## HermesDeckX에서 설정

1. 「설정 센터 → 도구」로 이동
2. 「도구 프로필」 드롭다운에서 적절한 프로필 선택
3. 더 세밀한 제어가 필요하면 allow/deny 리스트 사용

## 세밀한 권한 제어

- **deny** — 명시적으로 금지하는 도구 (블랙리스트)
- **allow** — 허용하는 도구만 (화이트리스트, 프로필 덮어쓰기)
- **alsoAllow** — 프로필에 추가로 허용하는 도구
- **byProvider** — 제공자별로 다른 권한 설정

## 설정 필드

해당 설정 경로: \`tools.profile\`

값: \`minimal\` | \`coding\` | \`messaging\` | \`full\``},l={name:n,description:o,content:e};export{e as content,l as default,o as description,n as name};
