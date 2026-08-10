---
id: HANDLE-001
title: 손잡이 성형판 직접 조작
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

손잡이를 컨트롤바 수치로 만드는 방식은 손으로 흙띠를 빚고 붙이는 느낌이 없다.

## What we are shipping

- 작품과 분리된 손잡이 성형판을 제공한다.
- 마우스로 흙띠를 당기고 굽혀 폭·높이·두께·곡률을 직접 만든다.
- 완성한 손잡이를 컵 옆면의 접합 위치에 붙인다.

## What we are not shipping

- 완전 자유 조각, 여러 손잡이, 복잡한 주전자 손잡이

## Facts

현재 손잡이는 슬라이더로 사전 정의된 3D 형상을 조절한다.

## Decisions

기존 손잡이 지오메트리를 재사용하고 마우스 제스처를 파라미터 변화에 연결한다.

## Assumptions

한 작품에 손잡이 하나를 만든다.

## Relevant context

`src/main.ts`, 손잡이 지오메트리와 마감 단계 UI

## Allowed scope

손잡이 성형판, 마우스 입력, 접합 미리보기, 관련 테스트

## Forbidden scope

본체 자유 메시 편집, 물그릇, 유약 공정

## Acceptance criteria

- 슬라이더 없이 마우스로 손잡이 비율을 바꿀 수 있다.
- 성형판과 작품 카메라 조작이 충돌하지 않는다.
- 접합 위치를 미리 보고 확정할 수 있다.
- 재시작하면 손잡이가 제거된다.

## Human judgment

손잡이를 “선택”한 것이 아니라 직접 만든 느낌이 드는가?

## Verification

지오메트리 상태 unit 테스트, 드래그·접합 E2E, 실제 렌더 확인

## Rollback

성형판 입력을 제거하고 기존 슬라이더 조절 방식으로 복구한다.
