---
id: HANDS-001
title: 양손과 소매 시각 통일
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

양손의 소매 색과 재질이 달라 같은 작업자의 양손처럼 보이지 않는다.

## What we are shipping

- 양손의 피부·소매 색, 재질, 조명을 동일한 원천에서 파생한다.
- 좌우 구분은 자세와 위치로만 표현한다.
- 모든 제작 단계에서 색이 일관되는지 확인한다.

## What we are not shipping

- 캐릭터 꾸미기, 의상 선택, 손 모델 전면 교체

## Facts

현재 양손이 서로 다른 재질 또는 색 설정을 사용할 가능성이 있다.

## Decisions

공유 material 또는 공통 색 토큰을 사용한다.

## Assumptions

양손은 같은 작업자의 동일한 옷이다.

## Relevant context

`src/main.ts` 손·소매 메시와 material

## Allowed scope

손·소매 material, 조명 반응, 시각 회귀 테스트

## Forbidden scope

손 애니메이션·입력 방식 변경

## Acceptance criteria

- 양손 피부와 소매가 같은 색·거칠기를 사용한다.
- 젖은 흙과 조명 반사 때문에 다른 옷처럼 보이지 않는다.
- 성형·건조·시유·결과 화면에서 일관된다.

## Human judgment

양손이 자연스럽게 한 사람의 손으로 보이는가?

## Verification

material 상태 테스트, 1440×900 단계별 렌더 확인

## Rollback

공유 material을 제거하고 기존 좌우 손 재질로 복구한다.
