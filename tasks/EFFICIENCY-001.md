---
id: EFFICIENCY-001
title: 최고 효율 회전 구간 확장
status: HUMAN_REVIEW
type: feature
profile: web

risk:
  level: medium
  reasons:
    - 점토 변형 속도와 구조 한계 도달 시간을 직접 바꾼다.

# models 는 생략하면 프로파일/프로젝트 설정을 따른다. 필요할 때만 override.
# models:
#   worker: auto

human:
  owner: user
  reviewer_required: true
---

## Problem

회전 속도가 72%를 넘으면 성형 효율이 감소해 85% 부근에서 기대보다 둔하게 반응한다.

## What we are shipping

- 적정 수분에서 효율 100%가 유지되는 회전 구간을 34~72%에서 34~85%로 확장한다.
- 85%를 넘으면 기존 기울기로 효율이 감소한다.

## What we are not shipping

- 수분 소모, 구조 붕괴, 실 절단 규칙 변경

## Facts

- 기존 `shapingEfficiency`는 회전 속도 72%부터 효율을 낮췄다.
- 외벽·중심 구멍·끌어올리기가 같은 효율 값을 사용한다.

## Decisions

- 최고 효율 회전 상단을 명시적 상수 `0.85`로 둔다.

## Assumptions

- 85% 회전에서 정확히 효율 100%가 나와야 한다.

## Relevant context

- `src/game/process.ts`, `src/main.ts`, `tests/process.test.ts`, `DESIGN.md`

## Allowed scope

- 회전 속도에 따른 성형 효율 구간과 관련 문서·테스트

## Forbidden scope

- 주문 점수, 점토 형상 한계, 공정 기능

## Acceptance criteria

- 적정 수분에서 회전 속도 85%의 효율이 정확히 100%다.
- 85%를 넘으면 효율이 100%보다 낮아진다.
- 저속·건조·과습의 상대 감쇠는 유지된다.
- 기존 성형·수분·실 절단 검증이 통과한다.

## Human judgment

- 85% 회전에서도 중속과 같은 반응으로 조작되는지 판단한다.

## Verification

- `npm run verify`
- 관련 unit과 1440×900 성형 E2E

## Rollback

- 최고 효율 회전 상단을 0.72로 되돌린다.
