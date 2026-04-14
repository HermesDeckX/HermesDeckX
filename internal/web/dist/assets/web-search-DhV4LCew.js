const n="웹 검색 강화",e="웹 검색을 활성화하여 AI 어시스턴트가 실시간으로 최신 정보를 검색 가능. Brave, Perplexity, Gemini, Grok, Kimi 지원",o={body:`## 웹 검색을 활성화하는 이유

AI 모델의 훈련 데이터에는 컷오프 날짜가 있어 최신 정보를 얻을 수 없습니다. 웹 검색을 활성화하면 AI 어시스턴트가:
- 최신 뉴스, 날씨, 주가 등 실시간 정보 검색
- 기술 문서 및 API 레퍼런스 검색
- 자체 지식의 정확성 검증

## 지원되는 검색 제공자

| 제공자 | 특징 | API 키 |
|--------|------|--------|
| **Brave** | 프라이버시 우선, 무료 할당량 | 필요 |
| **Perplexity** | AI 강화 검색 결과 | 필요 |
| **Gemini** | Google 검색 능력 | 필요 (Google 제공자와 공유) |
| **Grok** | X 플랫폼 통합, 높은 실시간성 | 필요 |
| **Kimi** | 중국어 검색 최적화 | 필요 |

## HermesDeckX에서 설정

1. 「설정 센터 → 도구」로 이동
2. 「웹 검색」 영역 찾기
3. 「웹 검색 활성화」 스위치 켜기
4. 검색 제공자 선택
5. 해당 API 키 입력

## 조정 가능한 파라미터

- **maxResults** — 검색당 최대 결과 수 (기본 5)
- **timeoutSeconds** — 검색 타임아웃
- **cacheTtlMinutes** — 검색 결과 캐시 시간

## 설정 필드

해당 설정 경로: \`tools.web.search.enabled\` 및 \`tools.web.search.provider\``},t={name:n,description:e,content:o};export{o as content,t as default,e as description,n as name};
