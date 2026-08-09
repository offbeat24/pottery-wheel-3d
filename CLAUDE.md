<!-- bass-shim: claude v0.2.1 — 얇은 참조 shim. 규칙 원문을 복사하지 마라. -->
# CLAUDE.md

이 프로젝트의 유일한 에이전트 계약은 `AGENTS.md`다. 그 파일을 먼저 읽고 그대로 따른다.

- 저장소를 처음 받은 사용자가 `작업시작`이라고 하면 `AGENTS.md`의 최초 1회 bootstrap 프로토콜을 즉시 실행한다.
- BASS CLI와 기록은 내부 관리하고 사용자에게 명령 실행이나 파일 편집을 요구하지 않는다.
- 동적 계약은 `npm run bass -- agent guide`, 역할 규칙은 `npm run bass -- compose`로 읽는다.
- 제품 방향은 `DESIGN.md`, 기계 검증은 `npm run verify`를 원천으로 삼는다.
