---
id: ORDER-001
title: 색상과 마감이 포함된 주문
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

주문에 형태만 있고 색·마감 요구가 없어 유약과 소성 온도를 선택할 이유가 약하다.

## What we are shipping

- 주문에 용도, 형태, 색상, 광택, 유약 또는 무유약 요구를 포함한다.
- 일부 주문에는 소성 조건이나 내구성 요구를 포함한다.
- 결과 점수는 형태와 마감 요구를 함께 비교한다.
- 주문 문구에서 선택해야 할 유약과 온도를 추론할 수 있게 한다.

## What we are not shipping

- 경제 시스템, 고객 대화, 온라인 주문 저장

## Facts

현재 주문은 주로 목표 실루엣과 치수에 집중한다.

## Decisions

기존 주문 순환 구조를 확장하고 별도 백엔드는 추가하지 않는다.

## Assumptions

주문 수는 소수의 명확한 조합으로 시작한다.

## Relevant context

주문 데이터, HUD 주문 카드, 결과 점수 계산

## Allowed scope

주문 데이터, 마감 조건, 점수·결과 설명, 관련 테스트

## Forbidden scope

새 유약 종류 제작, 가마 시뮬레이션 재설계

## Acceptance criteria

- 모든 주문에 색 또는 마감 요구가 있다.
- 유약과 온도 선택이 주문 점수에 직접 반영된다.
- 무유약 주문도 존재한다.
- 다음 주문과 마지막→첫 주문 순환이 동작한다.
- 결과 화면이 충족·미충족 이유를 설명한다.

## Human judgment

주문을 읽고 마감 계획을 세울 수 있는가?

## Verification

주문 조합 unit 테스트, 주문 순환·점수 E2E

## Rollback

마감 조건을 제거하고 기존 형태 중심 주문으로 복구한다.
