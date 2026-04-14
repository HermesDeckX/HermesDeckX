const n="보안 강화",o="포괄적 보안 설정 — 접근 제어, 도구 제한, 네트워크 정책, 암호화",l={body:`## 보안 설정 체크리스트

### 1. 인증 활성화
「설정 센터 → 게이트웨이 → 인증」으로 이동:
- 인증 모드 선택: \`token\` (권장) 또는 \`password\`
- Token 모드: 랜덤 토큰을 생성하고 모든 요청에 Authorization 헤더 포함
- **localhost 외부 접근 시 반드시 활성화**

### 2. TLS 암호화 설정
- localhost 외부 접근 시 TLS 활성화
- 자동 생성 인증서 또는 사용자 정의 인증서 사용

### 3. 채널 접근 제한
각 채널에 설정:
- **allowFrom** — 특정 사용자 ID만 Bot 사용 가능
- **dmPolicy** — \`allowFrom\`으로 설정하여 DM 접근 제한
- **groupPolicy** — 그룹 메시지 응답 동작 제어

### 4. 도구 권한 제한
- 적절한 도구 프로필 선택 (\`full\` / \`coding\` / \`messaging\` / \`minimal\`)
- deny 리스트로 위험한 도구 차단
- exec allowlist로 실행 가능한 명령 제한

### 5. 샌드박스 활성화
- Docker 샌드박스로 코드 실행 활성화
- 워크스페이스 접근을 \`ro\` (읽기 전용)로 설정
- 컨테이너 리소스 제한

## 권장 보안 레벨

| 레벨 | 적용 시나리오 | 설정 |
|------|------------|------|
| **기본** | 개인 사용, 로컬만 | 기본 설정 |
| **표준** | LAN / Tailscale | 인증 + allowFrom |
| **높음** | 공용 네트워크 | 인증 + TLS + allowFrom + 샌드박스 + 도구 제한 |

## 설정 필드

관련 경로: \`gateway.auth\`, \`gateway.tls\`, \`channels[].allowFrom\`, \`tools.profile\`, \`agents.defaults.sandbox\``},a={name:n,description:o,content:l};export{l as content,a as default,o as description,n as name};
