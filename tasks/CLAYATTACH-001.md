---
id: CLAYATTACH-001
title: 아래에 예비 흙덩이 붙이기
status: CAPTURED

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

현재 예비 흙을 추가하면 실제 덩어리를 붙이는 느낌보다 완성물 전체가 커진 것처럼 보일 수 있다.

## What we are shipping

- 물레가 멈춘 상태에서 현재 작품 아래에 180g 흙덩이를 별도 3D 덩어리로 놓는다.
- 접합 전에는 본체 부피와 실루엣이 변하지 않는다.
- 다시 성형할 때만 덩어리가 본체에 점진적으로 합쳐지고 총질량이 증가한다.

## What we are not shipping

- 자유 위치 접합, 슬립 표현, 물리 기반 메시 합성

## Facts

기본 예비 흙 상태와 별도 덩어리 렌더링이 일부 구현되어 있다.

## Decisions

기존 질량·부피 모델을 유지하고 별도 덩어리의 접합 진행만 추가한다.

## Assumptions

첫 단계에서는 작품 바닥 한 위치에만 붙인다.

## Relevant context

`src/main.ts`, `src/game/clay.ts`, `e2e/quality.spec.ts`

## Allowed scope

점토 상태, 별도 메시, 접합 입력, 관련 UI·테스트

## Forbidden scope

손잡이 성형, 슬립 시뮬레이션, 자유 메시 불리언

## Acceptance criteria

- 추가 직후 본체 크기는 유지되고 아래에 별도 덩어리가 보인다.
- 총질량은 정확히 180g 증가한다.
- 회전 중에는 추가할 수 없다.
- 성형 입력으로만 덩어리가 본체에 합쳐진다.
- 예비 흙 소진과 재시작 초기화가 동작한다.

## Human judgment

덩어리가 “전체 확대”가 아니라 실제로 아래에 붙인 흙처럼 보이는가?

## Verification

질량 unit 테스트, 메시·상태 E2E, 1440×900 렌더 확인

## Rollback

접합 진행을 제거하고 현재 예비 흙 추가 동작으로 복구한다.
