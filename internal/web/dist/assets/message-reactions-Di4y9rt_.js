const n="메시지 상태 이모지",s="상태 이모지 반응을 활성화하여 사용자가 AI 처리 단계를 실시간으로 파악",e={body:`## 상태 이모지란?

상태 반응(Status Reactions)은 HermesAgent이 메시지를 처리할 때 사용자의 메시지에 자동으로 붙이는 이모지 반응입니다. 다른 이모지가 다른 처리 단계를 나타내어 사용자가 기다리지 않고 AI가 무엇을 하고 있는지 알 수 있습니다.

## 기본 상태 이모지

| 단계 | 기본 이모지 | 의미 |
|------|-----------|------|
| thinking | 🤔 | AI가 생각 중 |
| tool | 🔧 | AI가 도구 사용 중 |
| coding | 💻 | AI가 코드 작성 중 |
| web | 🌐 | AI가 웹 검색 중 |
| done | ✅ | 처리 완료 |
| error | ❌ | 처리 오류 |

## HermesDeckX에서 설정

「설정 센터 → 메시지」→ 「상태 이모지」 영역 찾기:

1. 「상태 이모지 활성화」 스위치 켜기
2. 각 단계의 이모지 커스터마이징 (선택사항)
3. 시간 파라미터 조정 (선택사항)

## 시간 파라미터

- **debounceMs** — 디바운스 지연, 빈번한 이모지 전환 방지 (기본 500ms)
- **stallSoftMs** — 「처리 느림」 이모지 표시까지의 시간 (기본 30000ms = 30초)
- **stallHardMs** — 「처리 멈춤」 이모지 표시까지의 시간 (기본 120000ms = 2분)

## 설정 필드

해당 설정 경로: \`messages.statusReactions\``},t={name:n,description:s,content:e};export{e as content,t as default,s as description,n as name};
