const n="GitHub PR 훅 매핑",e="Webhook 매핑 스니펫: GitHub Pull Request 이벤트를 AI 코드 리뷰 지시로 변환",t={snippet:`hooks:
  - name: github-pr-review
    description: "GitHub PR 생성 시 자동 코드 리뷰"
    mapping: |
      GitHub Pull Request 이벤트 수신:

      **저장소**: {{repository.full_name}}
      **제목**: {{pull_request.title}}
      **작성자**: {{pull_request.user.login}}
      **설명**: {{pull_request.body}}
      **변경 파일 수**: {{pull_request.changed_files}}

      이 PR을 리뷰해 주세요:
      1. 코드 품질과 모범 사례 확인
      2. 잠재적 버그 및 보안 문제 찾기
      3. 개선 제안 제공
      4. 친절하고 건설적인 피드백 제공`},u={name:n,description:e,content:t};export{t as content,u as default,e as description,n as name};
