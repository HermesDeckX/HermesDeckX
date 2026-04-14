const n="게이트웨이 TLS 암호화",e="게이트웨이에 HTTPS/TLS 암호화를 활성화 — 원격 접근 및 API 통신 보안 보호",t={body:`## TLS가 필요한 경우

- 게이트웨이가 localhost 외부에서 접근되는 경우 (LAN, 공용 네트워크 등)
- Tailscale / VPN을 통한 접근 시 (권장이나 필수는 아님)
- Webhook 엔드포인트를 제공하는 경우

## HermesDeckX에서 설정

「설정 센터 → 게이트웨이 → TLS」로 이동:

### 방법 1: 자동 생성 인증서 (가장 간단)
- 「자동 TLS」 스위치 켜기
- 시스템이 자체 서명 인증서를 자동 생성
- 개인 사용 및 내부 네트워크용

### 방법 2: 사용자 정의 인증서
- 자체 인증서 파일 경로 제공
- **cert** — 인증서 파일 (.pem)
- **key** — 개인 키 파일 (.pem)
- 프로덕션 환경 및 공용 접근용

### 방법 3: 리버스 프록시
- Nginx / Caddy 등의 리버스 프록시로 TLS 처리
- 게이트웨이 자체는 HTTP 사용
- 가장 유연, 기존 웹 서버가 있는 환경용

## 설정 필드

해당 설정 경로: \`gateway.tls\``},o={name:n,description:e,content:t};export{t as content,o as default,e as description,n as name};
