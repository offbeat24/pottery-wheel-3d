---
id: WATER-001
title: 물그릇과 스펀지 직접 적시기
status: CAPTURED

type: feature
profile: web

risk:
  level: medium
  reasons:
    - 3D 오브젝트와 포인터 입력을 기존 성형 조작에 연결한다.
    - 수분 변화가 성형 효율과 구조 위험에 직접 영향을 준다.

# models 는 생략하면 프로파일/프로젝트 설정을 따른다. 필요할 때만 override.
# models:
#   worker: auto

human:
  owner: user
  reviewer_required: true
---

## Problem

현재 물은 `W` 키나 HUD 버튼을 누르면 점토 전체에 즉시 추가된다. 물그릇에서 물을 묻혀
점토 표면에 직접 바르는 도예 동작처럼 느껴지지 않는다.

## What we are shipping

- 물레 옆에 실제로 보이는 물그릇과 스펀지를 둔다.
- 플레이어가 물그릇을 클릭해 스펀지를 적신 뒤, 점토 위를 마우스로 문질러 물을 바른다.
- 바른 동안 스펀지의 젖음 상태와 점토의 수분·색 변화가 즉시 보인다.
- 너무 마른 흙은 잘 움직이지 않고, 적정 수분에서는 성형이 잘 되며, 너무 젖은 흙은
  벽이 처지거나 무너질 위험이 커지는 기존 물성 모델에 직접 연결한다.
- 기존 `W`와 `물 적시기` 버튼은 직접 조작을 방해하지 않도록 제거하거나 도움용 보조
  입력으로만 남긴다.

## What we are not shipping

- 물의 유체 시뮬레이션, 튀는 물방울, 바닥에 고이는 물
- 양손 자유 조작이나 VR 손 추적
- 완전건조·초벌·재벌 공정 변경
- 물 외의 슬립·화장토 도구

## Facts

- 현재 수분은 `CraftState.moisture` 하나로 관리한다.
- 현재 `W`와 `water-action`은 `wetClay`를 호출해 전체 수분을 즉시 올린다.
- 수분은 이미 성형 효율, 구조 위험, 점토 색과 거칠기에 사용된다.

## Decisions

- 새 물 시스템을 만들지 않고 기존 수분 상태와 물성 함수를 재사용한다.
- 1차 구현은 국소 물 자국보다 직접 조작의 손맛과 전체 수분 변화에 집중한다.
- 스펀지는 물그릇에서 적셔야만 점토에 수분을 전달한다.

## Assumptions

- 데스크톱 마우스 입력을 우선한다.
- 물레 회전 중에도 스펀지로 적실 수 있지만 기존 성형 입력과 충돌하지 않아야 한다.

## Relevant context

- `src/main.ts`: 3D 공방, 포인터 입력, 수분 UI와 `wetClay`
- `src/game/process.ts`: 수분 및 성형 효율 규칙
- `src/styles.css`: HUD와 도움말
- `tests/process.test.ts`, `e2e/quality.spec.ts`: 물성 및 제작 흐름 검증

## Allowed scope

- `DESIGN.md`, `README.md`
- `src/main.ts`, `src/styles.css`
- `src/game/process.ts`, 필요한 게임 타입 파일
- 관련 unit/E2E 테스트

## Forbidden scope

- 손잡이 자유 성형판
- 유약 담금·두께 결함
- 가마 온도·소성 결과 재설계
- 실패·폐기 애니메이션

## Acceptance criteria

- 1440×900 화면에서 물그릇과 스펀지가 물레 옆에 자연스럽게 보인다.
- 물그릇을 적시지 않은 마른 스펀지는 수분을 올리지 않는다.
- 물그릇 클릭 후 스펀지를 점토에 드래그하면 수분이 연속적으로 증가한다.
- 스펀지의 남은 물이 줄고 다시 물그릇에서 적실 수 있다.
- 수분이 낮음·적정·과습일 때 같은 성형 입력의 효율 또는 위험이 다르다.
- 성형·카메라·중심 구멍 조작과 포인터 충돌이 없다.
- 재시작하면 수분과 스펀지 상태가 초기값으로 돌아간다.

## Human judgment

- 물그릇과 스펀지의 위치가 점토 조작을 가리지 않는가?
- 클릭→적시기→문지르기 흐름이 설명 없이도 이해되는가?
- 수분 변화 속도가 실제감과 짧은 플레이 세션 사이에서 자연스러운가?

## Verification

- 수분 전달량과 과습 경계 unit 테스트
- 마른 스펀지·적신 스펀지·재충전·재시작 E2E 테스트
- 실제 1440×900 WebGL 렌더와 포인터 조작 확인
- 구현 완료 후 `npm run verify`와 BASS 독립 critic을 각각 한 번 실행

## Rollback

물그릇·스펀지 3D 오브젝트와 입력 연결을 제거하고 기존 `W`/`water-action` 기반
`wetClay` 경로로 되돌린다.
