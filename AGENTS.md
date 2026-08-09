<!-- bass-shim: agents v0.2.1 — 얇은 프로젝트 진입점. 규칙 전문을 복사하지 마라. -->
# AGENTS.md — pottery-wheel-3d

사용자는 자연어로 협업한다. BASS 명령, task, 상태, critic과 record는 에이전트가 내부 관리한다.

## `작업시작`

`작업시작`은 저장소를 처음 pull/clone한 뒤 한 번 사용하는 초기 세팅 명령이다. 사용자가 입력하면 다른 질문이나 제품 수정 전에 다음을 수행한다.

1. `npm run setup:agent`를 실행한다.
2. 같은 fingerprint로 완료한 로컬 세팅은 즉시 재사용한다. lockfile·하네스가 바뀌었거나 설치가 없을 때만 전체 세팅을 다시 수행한다.
3. 출력된 BASS guide, `DESIGN.md`, Git 상태, 코드·테스트 구조를 읽는다.
4. 세팅 결과, contract fingerprint, 검증 결과, 충돌 가능 파일과 추천 첫 작업을 한 번에 제시한다.

bootstrap 자체로 제품 코드나 tracked file을 바꾸지 마라. 사용자가 실제 목표를 말한 뒤 구현을 시작한다.
평소 작업 세션마다 `작업시작`을 요구하지 마라. 초기 세팅 이후에는 사용자의 자연어 목표로 바로 협업한다.

## 제품 계약

- Product Seed는 “브라우저에서 점토를 직접 빚는 감각의 3D 도예 게임”이다.
- `DESIGN.md`의 Current Hypothesis와 기존 기능·비주얼·구조는 사람의 새 아이디어로 교체할 수 있다.
- 백엔드, API, 데이터베이스, 인증, 저장·동기화, 멀티플레이 기능을 필요에 따라 추가하거나 교체할 수 있다. 현재 클라이언트 구조를 제품 경계로 취급하지 마라.
- 방향을 바꾸면 `DESIGN.md`의 플레이 루프·성공 조건과 관련 unit/E2E 테스트를 같은 작업에서 갱신한다.
- 확인되지 않은 렌더링, 조작, build를 완료됐다고 표현하지 마라.

## 백엔드와 데이터 계약

- `server` profile은 항상 사용할 수 있다. 서버·DB 작업 전 API 계약, 데이터 모델·마이그레이션 이력, 인증·권한 경계, 로깅·관측 수단을 조사한다.
- 서버나 DB를 추가하면 실행·typecheck·unit·integration·migration 검증을 `npm run verify`와 CI에 같은 변경으로 연결한다.
- 마이그레이션은 forward/rollback 전략과 기존 데이터 보존을 검증하고, 테스트는 격리된 DB와 재현 가능한 seed를 사용한다.
- 실제 운영 데이터 변경, 배포, 비밀정보, 외부 서비스 생성은 BASS 정책에 따라 사람의 명시적 승인 전에는 실행하지 않는다.

## 실행과 협업

1. 작업 시작 시 `npm run bass -- agent guide [task-id]`를 읽고 필요한 역할만 compose한다.
2. 큰 방향의 숨은 가정은 Discovery/Ouroboros 경계에서, 구현 최소화는 Worker/Ponytail 경계에서 처리한다.
3. 동료의 변경과 프로젝트 고유 이력을 보존한다. 작업별 branch/worktree를 사용하고 공유 파일 소유가 겹치면 먼저 알린다.
4. task·검증·critic·record는 내부 관리하며 사람에게 상태 전환 승인을 반복해서 묻지 않는다.
5. UI 작업은 실제 1440×900 렌더링과 독립 Design/Test/Simplicity critic을 거친다. 서버·DB 작업은 Test/Simplicity와 보안·데이터 위험 검토를 거친다.
6. 검토 전 `npm run verify`와 `npm run bass -- gate pre-review <task-id>`를 실행한다.

## 원천

- 동적 계약: `npm run bass -- agent guide --json`
- 역할·critic: `npm run bass -- compose --role <role>` / `--critic <critic>`
- 설정: `bass.yaml` / `npm run bass -- config explain`
- 제품 방향: `DESIGN.md`
