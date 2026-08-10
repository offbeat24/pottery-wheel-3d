---
id: ONBOARDING-001
title: 시작 플레이 방법 안내
status: HUMAN_REVIEW
type: feature
profile: web

risk:
  level: medium
  reasons:
    - 첫 화면 정보량과 핵심 조작 이해도에 직접 영향을 준다.

# models 는 생략하면 프로파일/프로젝트 설정을 따른다. 필요할 때만 override.
# models:
#   worker: auto

human:
  owner: user
  reviewer_required: true
---

## Problem

플레이어가 회전·정지·스펀지 상태별 조작과 성형 효율 구간을 게임 시작 전에 알기 어렵다.

## What we are shipping

- 기존 시작 모달에 회전 중 성형, 수분·스펀지, 정지 중 마무리 안내를 상태별로 정리한다.
- 34~85% 효율 100%, 실 자르기·흙 높이 추가·제출 가능 시점을 명시한다.

## What we are not shipping

- 단계별 강제 튜토리얼, 영상, 설정 화면

## Facts

- 시작 모달은 이미 첫 주문 전에 표시되고 focus를 가둔다.
- 조작 가능 상태는 회전 중과 정지 중으로 나뉜다.

## Decisions

- 새 모달 대신 기존 3개 카드 구조를 더 명확한 상태 안내로 교체한다.

## Assumptions

- 데스크톱 마우스·키보드 사용자를 우선한다.

## Relevant context

- `src/main.ts`, `src/styles.css`, `DESIGN.md`, `e2e/quality.spec.ts`

## Allowed scope

- 시작 모달 정보 구조, 카피, 스타일, 관련 E2E

## Forbidden scope

- 게임 규칙과 입력 계산 변경

## Acceptance criteria

- 시작 모달에서 회전 중·정지 중·스펀지 조작을 구분한다.
- 회전 34~85%에서 효율 100%임을 안내한다.
- 실 자르기, 흙 높이 추가, 형태 제출 가능 시점을 안내한다.
- 1440×900에서 내용과 시작 버튼이 한 화면에 보인다.

## Human judgment

- 첫 플레이 전에 필요한 정보가 과하지 않게 이해되는지 판단한다.

## Verification

- `npm run verify`
- 실제 1440×900 시작 모달 렌더와 focus 확인

## Rollback

- 기존 3단계 소개 카피와 크기로 되돌린다.
