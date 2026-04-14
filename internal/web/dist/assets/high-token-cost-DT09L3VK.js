const n="높은 토큰 비용",e="AI 모델의 토큰 소비를 분석하고 최적화하여 API 비용을 절감",o={question:"토큰 비용이 너무 높은 경우 어떻게 하나요? API 비용을 줄이려면?",answer:`## 비용 분석

### 1. 사용량 통계 확인
HermesDeckX 「사용량」 페이지로 이동:
- 일별/주별/월별 토큰 소비 확인
- 모델, 채널, 사용자별로 분류 확인
- 소비가 가장 많은 원인 파악

### 2. 높은 소비의 일반적인 원인

| 원인 | 영향 | 해결책 |
|------|------|--------|
| 대화 기록이 너무 긺 | 매번 대량의 기록 전송 | 압축 또는 자동 리셋 활성화 |
| 비싼 모델 사용 | GPT-4.5, Claude Opus 등 | GPT-4o-mini 등으로 전환 |
| 도구 호출이 빈번 | 각 호출마다 추가 토큰 소비 | 도구 정책 조정 |
| 서브에이전트가 너무 많음 | 각 서브에이전트가 독립적으로 소비 | 깊이와 수를 제한 |

### 3. 최적화 전략

**압축 설정**(가장 효과적):
- 「설정 센터 → 에이전트 → 압축」으로 이동
- \`threshold\`를 30000-50000으로 설정
- \`memoryFlush\`를 활성화하여 중요 정보 자동 저장

**모델 선택**:
- 일상 대화는 GPT-4o-mini 또는 Claude Haiku
- 복잡한 작업에만 GPT-4o 또는 Claude Sonnet
- 폴백 체인 설정: 비싼 모델 → 저렴한 모델

**하트비트 최적화**:
- 하트비트 모델은 가장 저렴한 모델 사용 (GPT-4o-mini 등)
- 하트비트 간격을 늘려 불필요한 체크 줄이기
- 활성 시간대를 설정하고 비근무 시간에는 하트비트 중지

**도구 제어**:
- \`minimal\` 또는 \`messaging\` 도구 프로필 사용
- 불필요한 도구 접근 제한

## 설정 필드

관련 경로: \`agents.defaults.model\`, \`agents.defaults.compaction\`, \`heartbeat\``},t={name:n,description:e,content:o};export{o as content,t as default,e as description,n as name};
