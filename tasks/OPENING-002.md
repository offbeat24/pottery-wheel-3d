---
id: OPENING-002
title: 선택형 중심 구멍 마우스 조작 개선
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

중심 구멍은 선택 사항이 되었지만 마우스로 크기를 키우고 줄이는 조작을 더 쉽게 이해하고 정밀하게 해야 한다.

## What we are shipping

- 구멍 없이 외형 성형과 완성을 계속 허용한다.
- 중심 영역에서 마우스 제스처로 구멍을 만들고 연속적으로 확대·축소한다.
- 현재 바닥 두께와 최대 안전 구멍 크기를 즉시 보여준다.
- 일반 외벽 성형과 중심 조작이 명확히 구분된다.

## What we are not shipping

- 별도 버튼으로 고정 크기 구멍 생성, 자동 중심잡기

## Facts

현재 중심 좌·우클릭으로 opening을 조절하는 기본 기능이 있다.

## Decisions

기존 선택형 opening 모델을 유지하고 입력 피드백과 정밀도를 개선한다.

## Assumptions

마우스만으로 모든 구멍 조작이 가능해야 한다.

## Relevant context

`src/main.ts` 포인터·opening 입력, `src/game/clay.ts`

## Allowed scope

중심 hit area, 제스처, 안전 경계, 도움말·테스트

## Forbidden scope

필수 구멍 단계 추가, 손잡이·유약 변경

## Acceptance criteria

- opening 0 상태에서도 성형과 전체 제작을 완료할 수 있다.
- 마우스로 opening을 0부터 최대 안전값까지 연속 조절한다.
- 확대와 축소가 명확하고 카메라 조작과 충돌하지 않는다.
- 바닥 두께가 위험하면 추가 확대를 막고 이유를 보여준다.

## Human judgment

버튼 설명 없이도 중심을 눌러 구멍을 조절하는 법을 이해하는가?

## Verification

opening 경계 unit 테스트, 구멍 없음·확대·축소 E2E

## Rollback

정밀 제스처를 제거하고 현재 중심 좌·우클릭 조작으로 복구한다.
