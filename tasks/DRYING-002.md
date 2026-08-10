---
id: DRYING-002
title: 완전건조와 초벌 공정
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

가죽경도까지의 건조는 있지만 완전건조와 초벌 없이 바로 시유·소성으로 넘어가 실제 공정이 생략된다.

## What we are shipping

- 가죽경도 이후 완전건조 단계와 수분 확인을 추가한다.
- 젖은 상태로 가마에 넣으면 뒤틀림·균열·파손 위험이 발생한다.
- 완전건조 뒤 초벌 소성을 거쳐야 시유할 수 있게 한다.
- 초벌 전후 색·거칠기·강도 차이를 보여준다.

## What we are not shipping

- 실제 며칠 단위 시간, 가마 냉각 곡선 전체, 재벌 온도 재설계

## Facts

현재 시간 압축 건조는 수분 18%의 가죽경도에서 끝난다.

## Decisions

기존 drying 상태 모델을 확장하고 완전건조·초벌을 별도 단계로 둔다.

## Assumptions

건조 시간은 게임용으로 수초 이내로 압축한다.

## Relevant context

`src/game/types.ts`, `src/game/process.ts`, `src/main.ts`

## Allowed scope

공정 상태, 건조 진행, 초벌, 단계 잠금, 관련 UI·테스트

## Forbidden scope

유약 결함 상세, 주문 시스템, 폐기 애니메이션

## Acceptance criteria

- 가죽경도와 완전건조가 구분된다.
- 수분이 높은 작품은 안전하게 초벌할 수 없다.
- 완전건조 후 초벌해야 시유가 열린다.
- 초벌 전후 재질 차이가 보인다.
- 재시작이 모든 공정 상태를 초기화한다.

## Human judgment

단계가 늘어도 제작 흐름이 지루하지 않고 이해되는가?

## Verification

상태 전이 unit 테스트, 전체 공정 E2E, 1440×900 렌더 확인

## Rollback

완전건조·초벌 단계를 제거하고 가죽경도에서 시유로 이어지는 흐름으로 복구한다.
