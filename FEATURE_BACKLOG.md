# 도예 현실성 기능 백로그

각 항목은 하나씩 구현·검증·검토할 수 있도록 독립 BASS 작업으로 분리했다.

## 병렬 작업 원칙

- 팀원 한 명이 항목 하나를 맡아 최신 `codex/realism-001`에서 독립 branch/worktree로 작업한다.
- 기능 branch는 자기 `tasks/<TASK-ID>.md`, 기능 코드와 전용 테스트만 갱신하고 다른 항목의 상태를 바꾸지 않는다.
- 새 unit/E2E 시나리오는 작업별 파일로 분리하며, `src/main.ts`와 `src/styles.css` 연결부는 최소화한다.
- 이 문서의 순서·완료 상태·다음 추천 작업은 feature branch에서 수정하지 않고 `codex/realism-001` 통합 담당자가 merge 직후 갱신한다.
- 상세 branch, 공유 파일, rebase·통합 규칙은 `AGENTS.md`의 **Feature Backlog 병렬 작업 계약**을 따른다.

## 다음 추천 순서

1. [SCORING-001 — 점수·판매가 정책](tasks/SCORING-001.md)
2. [WATER-001 — 물그릇과 스펀지 직접 적시기](tasks/WATER-001.md)
3. [MOISTURE-001 — 과습과 과건조 물성](tasks/MOISTURE-001.md)
4. [WHEEL-002 — 물레 속도 물성 체감 강화](tasks/WHEEL-002.md)
5. [CLAYATTACH-001 — 아래에 예비 흙덩이 붙이기](tasks/CLAYATTACH-001.md)
6. [OPENING-002 — 선택형 중심 구멍 마우스 조작 개선](tasks/OPENING-002.md)
7. [HANDLE-001 — 손잡이 성형판 직접 조작](tasks/HANDLE-001.md)
8. [TRIMMING-001 — 실제 방식의 절단과 굽깎기](tasks/TRIMMING-001.md)
9. [DRYING-002 — 완전건조와 초벌 공정](tasks/DRYING-002.md)
10. [GLAZE-001 — 직접 시유와 불완전 도포 결함](tasks/GLAZE-001.md)
11. [KILN-001 — 온도와 열작업 기반 소성](tasks/KILN-001.md)
12. [ORDER-001 — 색상과 마감이 포함된 주문](tasks/ORDER-001.md)
13. [RESULT-002 — 소성 결과 전체 검사 개선](tasks/RESULT-002.md)
14. [DISCARD-001 — 성형 중 젖은 작품 폐기](tasks/DISCARD-001.md)
15. [BREAK-001 — 낮은 점수 결과물 깨기](tasks/BREAK-001.md)
16. [TERMS-001 — 도예 용어와 상황별 도움말](tasks/TERMS-001.md)
17. [HANDS-001 — 양손과 소매 시각 통일](tasks/HANDS-001.md)

## 현재 기본 구현이 있는 항목

- 흙 부피 보존과 벽 두께
- 구멍 없이 성형·완성하기와 중심 마우스 조작
- RPM·수분 기반 성형 효율과 위험
- 본체 아래 별도 예비 흙덩이
- 가죽경도까지의 시간 압축 건조
- 직접 유약 칠하기, 온도별 결과색, 3D 결과 보기

해당 기본 구현은 완료로 끝내지 않고 위의 개선 작업에서 실제 조작감·시각 연결·경계 테스트를 강화한다.
