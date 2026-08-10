---
id: MOISTURE-001
title: 과습과 과건조 물성
status: IMPLEMENTING
type: feature
profile: web

risk:
  level: medium
  reasons: []

# models 는 생략하면 프로파일/프로젝트 설정을 따른다. 필요할 때만 override.
# models:
#   worker: auto

human:
  owner: user
  reviewer_required: true
---

## Problem

수분 숫자와 색은 변하지만 너무 마르거나 너무 젖었을 때의 실제 작업 실패가 충분히 체감되지 않는다.

## What we are shipping

- 과건조에서는 손 입력이 미끄러지고 균열 위험이 증가한다.
- 적정 수분에서는 성형 효율과 표면 안정성이 가장 높다.
- 과습에서는 벽이 처지고 원심력에 의한 붕괴 위험이 증가한다.
- 위험 전조를 표면·흔들림·소리 없는 시각 피드백으로 보여준다.

## What we are not shipping

- 정밀 유체·균열 물리, 장시간 숙성, 흙 종류별 수분 곡선

## Facts

수분은 이미 성형 효율, 위험 배수, 색과 거칠기에 사용된다.

## Decisions

기존 수분 함수를 확장하고 새 시뮬레이션 엔진은 만들지 않는다.

## Assumptions

짧은 게임 세션에 맞게 실제 현상을 시간 압축한다.

## Relevant context

`src/game/process.ts`, `src/main.ts`, `src/styles.css`, `tests/moisture-001.test.ts`, `e2e/moisture-001.spec.ts`, `e2e/quality.spec.ts`

`src/main.ts`와 `src/styles.css`는 공유 파일이므로 수분 반응 연결과 상태별 시각 전조에 필요한 최소 diff만 수정한다.
`e2e/quality.spec.ts`는 물 적시기 직후 과습 진입과 성형 종료가 자연 감소 뒤의 현재 수분을 보존하는지 확인하도록 기존 assertion만 갱신한다.
`oh-my-design`/`getdesign.md` 후보는 현재 도구에서 조회할 수 없어 `DESIGN.md`에 기록된 대체 축(테라코타 공방 색, 직접 조작 상태 가시성)을 유지한다.

## Allowed scope

수분 경계, 구조 위험, 표면 피드백, 관련 테스트

## Forbidden scope

물그릇 직접 조작, 건조·소성 단계 재설계

## Acceptance criteria

- 동일 입력이 과건조·적정·과습에서 다른 형태 변화와 위험을 만든다.
- 과건조와 과습의 전조를 숫자 없이도 구별할 수 있다.
- 적절히 물을 추가하거나 기다리면 안전 구간으로 돌아온다.
- 경계값과 붕괴 경로가 테스트된다.

## Human judgment

실패가 갑작스러운 벌점이 아니라 재료 상태의 결과처럼 느껴지는가?

## Verification

경계 테이블 unit 테스트, 물성 비교 E2E, 실제 렌더 확인

## Rollback

새 경계·피드백을 제거하고 기존 효율·위험 함수로 복구한다.
