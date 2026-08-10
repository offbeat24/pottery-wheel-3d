---
id: RESULT-002
title: 소성 결과 전체 검사 개선
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

결과 전체 보기가 있지만 유약 유무·도포 부족·온도 차이와 작품 전체 상태를 충분히 비교하고 검사하기 어렵다.

## What we are shipping

- 결과물을 자유 회전·줌하고 바닥·손잡이까지 확인한다.
- 무유약, 유약 종류, 도포 상태, 소성 온도에 따른 실제 최종 재질을 그대로 보여준다.
- 결과 요약과 3D 표면이 같은 상태 원천을 사용한다.
- 결함 위치를 직접 돌려 찾아볼 수 있다.

## What we are not shipping

- 사진 촬영·내보내기, 갤러리 저장, AR 보기

## Facts

현재 결과 뷰와 기본 카메라 dock이 있다.

## Decisions

별도 결과 복제품이 아니라 소성된 실제 작품 메시를 검사한다.

## Assumptions

마우스 드래그와 휠을 기본 카메라 입력으로 사용한다.

## Relevant context

결과 뷰, OrbitControls, 소성 material·texture, 점수 요약

## Allowed scope

결과 카메라, 재질 연결, 결함 표시, 관련 테스트

## Forbidden scope

새 소성 규칙·주문 시스템

## Acceptance criteria

- 360도 회전과 줌으로 작품 전체를 볼 수 있다.
- 본체·바닥·손잡이의 최종 재질이 일관된다.
- 무유약·부분 시유·온도 차이가 3D와 결과표에 동일하게 반영된다.
- 다시 만들기와 다음 주문 뒤 카메라·재질 상태가 초기화된다.

## Human judgment

점수표만 읽지 않고 작품을 직접 검사하게 되는가?

## Verification

카메라 E2E, 상태·재질 연결 테스트, 실제 렌더 확인

## Rollback

검사 개선을 제거하고 기존 고정 결과 뷰로 복구한다.
