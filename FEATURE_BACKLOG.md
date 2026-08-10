# 도예 현실성 기능 백로그

각 항목은 하나씩 구현·검증·검토할 수 있도록 독립 BASS 작업으로 분리했다.

## 병렬 작업 원칙

- 팀원 한 명이 항목 하나를 맡아 최신 `codex/realism-001`에서 독립 branch/worktree로 작업한다.
- 기능 branch는 자기 `tasks/<TASK-ID>.md`, 기능 코드와 전용 테스트만 갱신하고 다른 항목의 상태를 바꾸지 않는다.
- 새 unit/E2E 시나리오는 작업별 파일로 분리하며, `src/main.ts`와 `src/styles.css` 연결부는 최소화한다.
- 이 문서의 순서·완료 상태·다음 추천 작업은 feature branch에서 수정하지 않고 `codex/realism-001` 통합 담당자가 merge 직후 갱신한다.
- 상세 branch, 공유 파일, rebase·통합 규칙은 `AGENTS.md`의 **Feature Backlog 병렬 작업 계약**을 따른다.

## 다음 추천 순서

2. [WATER-001 — 물그릇과 스펀지 직접 적시기](tasks/WATER-001.md)
3. [MOISTURE-001 — 과습과 과건조 물성](tasks/MOISTURE-001.md)
8. [TRIMMING-001 — 실제 방식의 절단](tasks/TRIMMING-001.md)
14. [DISCARD-001 — 성형 중 젖은 작품 폐기](tasks/DISCARD-001.md)

## 현재 기본 구현이 있는 항목

- 흙 부피 보존과 벽 두께
- 구멍 없이 성형·완성하기와 중심 마우스 조작
- RPM·수분 기반 성형 효율과 위험
- 본체 아래 별도 예비 흙덩이
- 가죽경도까지의 시간 압축 건조
- 직접 유약 칠하기, 온도별 결과색, 3D 결과 보기

해당 기본 구현은 완료로 끝내지 않고 위의 개선 작업에서 실제 조작감·시각 연결·경계 테스트를 강화한다.
