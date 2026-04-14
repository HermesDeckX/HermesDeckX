const e="Telegram Bot 설정",n="Telegram Bot을 만들고 HermesAgent 게이트웨이에 연결",t={body:`## Telegram Bot 만들기

### 1. BotFather에서 Bot 만들기
1. Telegram에서 @BotFather 검색
2. \`/newbot\` 전송
3. Bot 이름 입력 (표시 이름)
4. Bot 사용자 이름 입력 (\`bot\`으로 끝나야 함)
5. BotFather가 토큰을 반환하면 복사

### 2. HermesDeckX에서 설정
1. 「설정 센터 → 채널」로 이동
2. 「채널 추가」→ Telegram 선택
3. Bot 토큰 붙여넣기
4. 설정 저장

### 3. 연결 확인
- 대시보드에서 Telegram 채널이 🟢 표시되어야 함
- Telegram에서 Bot에 메시지 전송
- Bot이 응답해야 함

## 고급 설정

### 접근 제어
- \`allowFrom\`으로 사용 가능한 사용자 ID 제한
- \`dmPolicy\`로 DM 접근 제어

### 그룹 사용
- Bot을 그룹에 추가
- \`groupPolicy\`로 그룹 응답 동작 제어
- 기본적으로 Bot은 @멘션된 메시지에만 응답

## 설정 필드

해당 설정 경로: \`channels[].type: "telegram"\``,steps:["Telegram에서 @BotFather 찾기","/newbot을 보내 새 Bot 만들기","BotFather가 반환한 토큰 복사","HermesDeckX 설정 센터에서 Telegram 채널 추가","토큰 붙여넣기 및 저장"]},o={name:e,description:n,content:t};export{t as content,o as default,n as description,e as name};
