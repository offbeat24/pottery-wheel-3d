---
id: TRIMMING-001
title: 실제 방식의 절단과 굽깎기
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

흙을 잘라낼 때 수치나 강제 축소로 전체 형태가 줄어 실제 철사 절단과 굽깎기 동작처럼 보이지 않는다.

## What we are shipping

- 성형 종료 시 철사 도구로 물레판과 작품 바닥을 분리한다.
- 가죽경도에서 작품을 뒤집고 굽깎기 도구로 바닥의 흙을 국소적으로 깎는다.
- 제거된 양만 질량·부피에서 빠지고 굽 형태가 실제 메시와 점수에 반영된다.

## What we are not shipping

- 자유 조각용 수십 종 도구, 파편 물리, 자동 형태 축소

## Facts

현재 형태 감소는 전체 profile 값을 직접 줄이는 방식에 가깝다.

## Decisions

철사 절단과 굽깎기를 별도 공정으로 분리한다.

## Assumptions

굽깎기는 바닥 제한 영역에서만 가능하다.

## Relevant context

점토 profile·질량, 공정 단계, 마우스 접촉 입력

## Allowed scope

절단·뒤집기·굽깎기 도구, 국소 profile 변화, 관련 테스트

## Forbidden scope

손잡이·유약·가마 변경

## Acceptance criteria

- 철사 절단 없이 물레에서 작품을 떼지 못한다.
- 굽깎기는 가죽경도에서만 가능하다.
- 마우스로 닿은 바닥 영역만 깎인다.
- 제거 질량과 굽 형상이 결과에 반영된다.
- 과도하게 깎으면 바닥 두께 위험이 발생한다.

## Human judgment

전체 축소가 아니라 실제로 바닥을 깎는 느낌이 드는가?

## Verification

국소 profile unit 테스트, 도구 순서 E2E, 메시 렌더 확인

## Rollback

절단·굽깎기 단계를 제거하고 기존 마감 흐름으로 복구한다.
