const n="로깅 및 디버깅",e="로그 레벨, 출력 형식, 진단 도구를 설정하여 HermesAgent 문제를 효율적으로 해결",t={body:`## 로그 설정

HermesAgent에서 비정상 동작이 발생하면 로그가 문제 해결의 첫 번째 도구입니다.

### HermesDeckX에서 설정

「설정 센터 → 로그」로 이동:

### 로그 레벨

| 레벨 | 설명 | 적용 시나리오 |
|------|------|-------------|
| **silent** | 로그 출력 없음 | 비권장 |
| **error** | 오류만 | 프로덕션 환경 |
| **warn** | 오류 + 경고 | 프로덕션 환경 (권장) |
| **info** | 실행 정보 포함 | 일상 사용 (기본) |
| **debug** | 디버그 정보 포함 | 문제 해결 시 일시적으로 활성화 |
| **trace** | 가장 상세 | 심층 문제 해결 |

### 콘솔 출력 형식

- **pretty** — 컬러 포맷 출력 (개발 환경 권장)
- **compact** — 컴팩트 출력 (프로덕션 환경 권장)
- **json** — JSON 형식 (로그 수집 시스템 파싱에 편리)

### 파일 로그

- **file** — 로그 파일 경로
- **maxFileBytes** — 로그 파일 최대 크기 (초과 시 자동 로테이션)

## 설정 필드

해당 설정 경로: \`logging\` 및 \`diagnostics\``},o={name:n,description:e,content:t};export{t as content,o as default,e as description,n as name};
