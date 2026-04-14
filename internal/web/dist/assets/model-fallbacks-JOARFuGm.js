const n="모델 폴백 체인",e="폴백 모델을 설정하여 메인 모델이 사용 불가능할 때 자동 전환, AI 어시스턴트의 지속 가동 보장",o={body:`## 폴백 모델이 필요한 이유

AI 제공자는 속도 제한, 서비스 중단, 계정 잔액 부족 등의 이유로 일시적으로 사용 불가능할 수 있습니다. 폴백 체인을 설정하면 메인 모델 실패 시 HermesAgent이 자동으로 다음 모델을 시도하여 AI 어시스턴트의 지속 가동을 보장합니다.

## HermesDeckX에서 설정

1. 「설정 센터 → 모델」로 이동
2. 「폴백 모델」 영역에서 「폴백 모델 추가」 클릭
3. 드롭다운에서 설정된 제공자와 모델 선택
4. 여러 폴백 모델을 우선순위 순으로 추가 가능

## 권장 조합 전략

| 메인 모델 | 폴백 1 | 폴백 2 |
|----------|--------|--------|
| claude-sonnet | gpt-4o | gemini-pro |
| gpt-4o | claude-sonnet | deepseek-chat |
| gemini-pro | gpt-4o-mini | claude-haiku |

**모범 사례:**
- 메인과 폴백에 **다른 제공자** 사용
- 폴백 모델은 더 저렴한 등급 가능 (gpt-4o-mini 등)
- 최소 1개 폴백 권장, 2개 이상이 이상적

## 설정 필드

해당 설정 경로: \`agents.defaults.model.fallbacks\`

값은 모델 이름 배열:
\`\`\`json
"fallbacks": ["gpt-4o", "gemini-pro"]
\`\`\``},t={name:n,description:e,content:o};export{o as content,t as default,e as description,n as name};
