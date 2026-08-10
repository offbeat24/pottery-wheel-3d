---
id: BREAK-001
title: 낮은 점수 결과물 깨기
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

점수가 부족한 결과물을 다시 만들 때 구운 도자기를 폐기하는 피드백 없이 화면만 초기화된다.

## What we are shipping

- 기준 미달 결과에서 “깨고 다시 만들기”를 선택할 수 있다.
- 작품이 작업대 위에서 몇 개의 큰 조각으로 깨지는 짧은 애니메이션을 보여준다.
- 조각을 치운 뒤 같은 주문을 새 흙으로 다시 시작한다.

## What we are not shipping

- 사실적인 날카로운 파편, 자유 파괴 물리, 젖은 작품 폐기

## Facts

현재 결과 화면에는 재시도와 재시작 흐름이 있다.

## Decisions

결정적인 사전 분할 조각을 사용하고 물리 엔진은 추가하지 않는다.

## Assumptions

깨기 기능은 점수 기준 미달일 때만 노출한다.

## Relevant context

결과 뷰, 점수 판정, 재시도·reset

## Allowed scope

파손 조각, 카메라·애니메이션, 재시도 상태, 관련 테스트

## Forbidden scope

점수 공식 재설계, 성형 중 폐기

## Acceptance criteria

- 기준 미달 결과에서만 깨기 행동이 열린다.
- 결과물 모양을 반영한 큰 조각이 보인다.
- 애니메이션 중 다른 결과 행동이 잠긴다.
- 완료 후 같은 주문의 모든 상태가 초기화된다.

## Human judgment

파손이 만족스러운 피드백이면서 과도하게 폭력적이지 않은가?

## Verification

점수 경계 unit 테스트, 파손·재시도 E2E, 실제 렌더 확인

## Rollback

파손 애니메이션을 제거하고 기존 재시도 버튼으로 복구한다.
