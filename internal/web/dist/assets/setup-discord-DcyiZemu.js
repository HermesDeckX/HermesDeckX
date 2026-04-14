const n="Discord Bot 설정",e="Discord Bot을 만들고 HermesAgent 게이트웨이에 연결",o={body:`## Discord Bot 만들기

### 1. Discord 애플리케이션 만들기
1. discord.com/developers/applications로 이동
2. 「New Application」 클릭
3. 앱 이름 입력
4. 「Bot」 페이지로 이동
5. 「Add Bot」 클릭

### 2. 토큰 가져오기
1. Bot 페이지에서 「Reset Token」 클릭
2. 새 토큰 복사
3. 「Message Content Intent」 활성화 (중요!)

### 3. Bot을 서버에 초대
1. 「OAuth2 → URL Generator」로 이동
2. \`bot\` 권한 선택
3. 필요한 Bot 권한 선택 (Send Messages, Read Message History 등)
4. 생성된 URL을 복사하여 브라우저에서 열기
5. 추가할 서버 선택

### 4. HermesDeckX에서 설정
1. 「설정 센터 → 채널」로 이동
2. 「채널 추가」→ Discord 선택
3. Bot 토큰 붙여넣기
4. 설정 저장

## 설정 필드

해당 설정 경로: \`channels[].type: "discord"\``,steps:["Discord Developer Portal에서 애플리케이션 만들기","Bot 만들고 토큰 복사","Message Content Intent 활성화","초대 링크 생성하여 Bot을 서버에 추가","HermesDeckX 설정 센터에서 Discord 채널 추가","토큰 붙여넣기 및 저장"]},t={name:n,description:e,content:o};export{o as content,t as default,e as description,n as name};
