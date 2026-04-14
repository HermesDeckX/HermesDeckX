const n="세션 자동 리셋",e="일별/주별 자동 세션 리셋을 설정하여 컨텍스트 무한 증가로 인한 비용 상승 방지",s={body:`## 세션을 자동 리셋하는 이유

리셋하지 않으면:
- 컨텍스트가 무한히 증가하여 매 요청마다 더 많은 토큰 전송
- 오래된 무관한 정보가 응답 품질 저하
- API 비용이 시간이 지남에 따라 계속 상승

## HermesDeckX에서 설정

「설정 센터 → 세션 → 자동 리셋」으로 이동:

### 핵심 파라미터
- **enabled** — 자동 리셋 활성화
- **every** — 리셋 간격
  - \`24h\` — 매일 리셋 (대부분의 사용자에게 권장)
  - \`12h\` — 하루 2회 리셋
  - \`7d\` — 매주 리셋 (장기 프로젝트용)
- **at** — 리셋 시각 (예: "04:00" 새벽 4시)
- **timezone** — 리셋 시각의 시간대

### 중요 정보 유지
- **keepMemory** — 활성화 시 MEMORY.md 내용이 리셋 후에도 유지
- 압축 설정에서 \`memoryFlush\`를 활성화하여 리셋 전 중요 정보를 MEMORY.md에 자동 저장

## 설정 필드

해당 설정 경로: \`session.autoReset\``},o={name:n,description:e,content:s};export{s as content,o as default,e as description,n as name};
