const n="정기 작업 설정",e="하트비트 정기 작업을 사용하여 AI에게 자동 확인, 요약 전송, 유지보수 작업 수행",t={body:`## 하트비트 작업이란?

하트비트(Heartbeat)는 HermesAgent의 정기 작업 시스템입니다. AI 어시스턴트에게 정기 작업을 수행하도록 할 수 있습니다:
- 매일 아침 뉴스 요약 전송
- 매시간 이메일 확인
- 주간 보고서 생성
- 만료된 데이터 정기 정리

## HermesDeckX에서 설정

「설정 센터 → 스케줄」로 이동:

### 기본 설정
- **enabled** — 하트비트 활성화
- **intervalMinutes** — 실행 간격 (분)
- **model** — 하트비트에 사용할 모델 (GPT-4o-mini 같은 저렴한 모델 권장)

### 활성 시간대
- **activeHoursStart/End** — 활성 시간대 (예: 8:00-22:00)
- **timezone** — 시간대
- 비활성 시간대에는 하트비트가 발동하지 않아 비용 절약

## 설정 필드

해당 설정 경로: \`heartbeat\``,steps:["「설정 센터 → 스케줄」로 이동","하트비트 기능 활성화","실행 간격과 활성 시간대 설정","하트비트 모델 선택 (저렴한 모델 권장)","하트비트 지시 작성하여 작업 정의","설정 저장"]},o={name:n,description:e,content:t};export{t as content,o as default,e as description,n as name};
