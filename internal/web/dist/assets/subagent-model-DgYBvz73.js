const n="서브에이전트 모델 선택",t="서브에이전트에 더 저렴한 모델을 사용하여 메인 에이전트 품질을 유지하면서 비용 대폭 절감",e={body:`## 서브에이전트란?

메인 AI 에이전트가 복잡한 작업을 만나면 서브에이전트를 생성하여 하위 작업을 병렬 처리할 수 있습니다. 각 서브에이전트는 독립적인 AI 호출이며 개별적으로 토큰을 소비합니다.

## 비용 문제

서브에이전트가 메인과 같은 비싼 모델을 사용하면:
- 복잡한 작업에서 3-5개의 서브에이전트가 생성될 수 있음
- 각 서브에이전트가 정가로 토큰 소비
- 총 비용이 급속히 배증

## 해결책: 서브에이전트에 더 저렴한 모델 사용

「설정 센터 → 에이전트 → 서브에이전트」로 이동:
- **model** — 더 저렴한 모델 설정 (gpt-4o-mini, claude-haiku, gemini-flash 등)
- **maxSpawnDepth** — 중첩 깊이 제한 (권장: 1-2)
- **maxConcurrent** — 최대 동시 서브에이전트 수

## 권장 모델 조합

| 메인 모델 | 서브에이전트 모델 | 비용 절감 |
|----------|-----------------|----------|
| claude-opus | claude-haiku | ~90% |
| gpt-4.5 | gpt-4o-mini | ~95% |
| gpt-4o | gpt-4o-mini | ~80% |
| gemini-pro | gemini-flash | ~85% |

## 설정 필드

해당 설정 경로: \`agents.defaults.subagents\``},a={name:n,description:t,content:e};export{e as content,a as default,t as description,n as name};
