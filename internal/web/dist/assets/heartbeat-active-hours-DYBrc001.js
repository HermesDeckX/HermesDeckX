const n="하트비트 활성 시간대",t="AI 하트비트의 활성 시간대를 설정 — 근무 시간에만 체크하여 야간 및 주말 토큰 비용 절약",e={body:`## 활성 시간대를 설정하는 이유

하트비트 작업은 정기적으로 AI 체크를 트리거하며 매번 토큰을 소비합니다. 24시간 논스톱으로 실행하면:
- 야간과 주말에 대량의 토큰 낭비
- 심야에 알림이 전송되어 사용자 방해
- 전체 비용을 50-70% 절감 가능

## HermesDeckX에서 설정

「설정 센터 → 스케줄 → 활성 시간대」로 이동:

### 핵심 파라미터
- **activeHoursStart** — 활성 시작 시간 (예: "08:00")
- **activeHoursEnd** — 활성 종료 시간 (예: "22:00")
- **timezone** — 시간대 (예: "Asia/Seoul")

## 하트비트 간격과의 조합

| 활성 시간대 | 간격 | 일일 트리거 횟수 | 예상 비용 |
|------------|------|----------------|----------|
| 8:00-22:00 | 30분 | 28회 | 중 |
| 8:00-22:00 | 60분 | 14회 | 저 |
| 9:00-18:00 | 60분 | 9회 | 최저 |

## 설정 필드

해당 설정 경로: \`heartbeat.activeHoursStart\`, \`heartbeat.activeHoursEnd\`, \`heartbeat.timezone\``},a={name:n,description:t,content:e};export{e as content,a as default,t as description,n as name};
