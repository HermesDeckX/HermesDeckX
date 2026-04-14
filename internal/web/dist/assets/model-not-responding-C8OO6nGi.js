const n="모델 무응답",o="AI 모델이 응답하지 않거나 타임아웃되는 문제 해결 — API 키, 할당량, 네트워크 확인",e={question:"AI 모델이 응답하지 않거나 타임아웃되는 경우 어떻게 하나요?",answer:`## 문제 해결 단계

### 1. API 키 확인
「설정 센터 → 모델 제공자」로 이동:
- API 키가 입력되어 있고 올바른지 확인
- API 키가 만료되거나 취소되지 않았는지 확인
- 제공자 콘솔에서 키 재생성 시도

### 2. 할당량 및 잔액 확인
- **OpenAI** — platform.openai.com의 사용량 페이지 확인
- **Anthropic** — console.anthropic.com의 사용량 확인
- **Google** — Cloud Console의 API 할당량 확인
- 계정에 충분한 잔액이 있는지 확인

### 3. 모델 가용성 확인
- 선택한 모델 이름의 철자가 올바른지 확인
- 일부 모델은 특별한 접근 권한이 필요할 수 있음 (GPT-4.5 등)
- 다른 모델로 전환하여 테스트

### 4. 네트워크 연결 확인
- 제공자의 API 엔드포인트에 접근 가능한지 확인
- 프록시 사용 시 프록시 설정이 올바른지 확인
- API를 직접 호출하여 테스트: \`curl https://api.openai.com/v1/models\`

### 5. 타임아웃 설정 확인
- 기본 타임아웃은 보통 30-60초
- 복잡한 작업은 더 긴 시간이 필요할 수 있음
- 방화벽이나 보안 소프트웨어가 차단하고 있지 않은지 확인

### 6. 폴백 모델 사용
- 폴백 모델 체인을 설정하여 고가용성 보장
- 메인 모델 실패 시 자동으로 폴백 모델로 전환

## 빠른 수정

「헬스 센터」에서 진단 실행 → model.reachable 항목 확인.`},t={name:n,description:o,content:e};export{e as content,t as default,o as description,n as name};
