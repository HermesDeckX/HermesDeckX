const n="Webhook 훅 설정",o="Webhook을 사용하여 외부 이벤트(GitHub, 모니터링 알림 등)를 AI에 전송하여 처리",e={body:`## Hooks란?

Hooks(훅)는 외부 시스템이 HermesAgent에 이벤트를 푸시할 수 있게 합니다. AI는 이벤트를 수신하면 자동으로 처리하고 결과를 보고할 수 있습니다.

## 일반적인 사용 시나리오

| 시나리오 | 소스 | AI 처리 |
|---------|------|--------|
| 코드 리뷰 | GitHub Webhook | AI가 PR을 리뷰하고 코멘트 |
| 서버 알림 | 모니터링 시스템 | AI가 알림을 분석하고 통지 |
| 폼 제출 | 웹 폼 | AI가 처리하고 응답 |
| 스케줄 트리거 | Cron 서비스 | AI가 정기 작업 실행 |

## HermesDeckX에서 설정

「설정 센터 → 훅」으로 이동:

### 1. 훅 만들기
- 「훅 추가」 클릭
- 이름과 설명 설정
- 시스템이 고유한 Webhook URL 생성

### 2. 매핑 설정
이벤트를 AI 지시로 매핑하는 방법 정의

### 3. 외부 시스템에서 설정
생성된 Webhook URL을 외부 시스템 (GitHub → Settings → Webhooks 등)에 입력.

## 설정 필드

해당 설정 경로: \`hooks\``,steps:["「설정 센터 → 훅」으로 이동","새 훅 만들고 이름 설정","이벤트 매핑 템플릿 정의","생성된 Webhook URL 복사","외부 시스템에서 Webhook을 이 URL로 설정"]},s={name:n,description:o,content:e};export{e as content,s as default,o as description,n as name};
