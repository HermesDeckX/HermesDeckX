const n="도구 권한 정책",e="도구 권한 설정 스니펫: 시나리오에 따라 AI가 사용할 수 있는 도구 범위와 접근 레벨 제어",o={snippet:`## 도구 정책 예시

### 최소 권한 (채팅만)
\`\`\`json
{ "tools": { "profile": "minimal" } }
\`\`\`

### 코딩 어시스턴트
\`\`\`json
{
  "tools": {
    "profile": "coding",
    "deny": ["exec.rm", "exec.sudo"],
    "exec": { "allowlist": ["node", "npm", "git", "python"] }
  }
}
\`\`\`

### 전체 접근 + 사용자 정의 제한
\`\`\`json
{
  "tools": {
    "profile": "full",
    "deny": ["browser"],
    "web": { "search": { "enabled": true }, "fetch": { "enabled": false } }
  }
}
\`\`\``},t={name:n,description:e,content:o};export{o as content,t as default,e as description,n as name};
