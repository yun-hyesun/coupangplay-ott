# src(6).zip 기준 수정 안내

## 적용 범위
- 상세(detail): 재생, 회차 재생, 별점(0.5점 포함), 찜하기, 공유, 펼침/접힘 아이콘을 public/images의 공통 SVG로 교체
- 영상(watch): 기존 WatchIcon의 name API를 유지하며 공통 SVG를 표시; 설정 선택 체크 아이콘 교체, SCSS에서 img 크기 처리
- 약관 및 정책(policy): 자세히 보기, 모달 닫기, 원문 읽기 버튼에 공통 아이콘 표시; 버튼 간격 8px
- 스토어: src(6).zip에 이미 구현된 fromStore 전달과 Detail.jsx의 구매하기 조건을 유지. 스토어 배너/카드/호버 상세정보에서 ?from=store가 전달되며, 일반 상세에서는 재생하기 유지.

## 주요 변경 파일
- `src/components/common/CommonIcon.jsx`
- `src/page/watch/WatchIcon.jsx`
- `src/page/watch/Watch.scss`
- `src/page/watch/WatchSettingsPanel.jsx`
- `src/page/detail/DetailComponents.jsx`
- `src/page/detail/Detail.jsx`
- `src/page/policy/Policy.jsx`
- `src/page/policy/Policy.scss`

## 핵심 코드
`CommonIcon.jsx`: name에 따라 `/images/icon/DesignSystem_Icon.../*.svg`를 선택하여 `<img>`로 표시합니다. `public`은 Vite 프로젝트 루트에 두어야 합니다.
`WatchIcon.jsx`: 기존 `<WatchIcon name="play" />` 호출을 유지한 채 내부를 `<CommonIcon name={name} />`로 교체했습니다.
`DetailComponents.jsx`: 직접 작성한 SVG 대신 CommonIcon을 사용하며, 별점 채우기는 이미지의 클리핑으로 처리합니다.
`Detail.jsx`: 재생하기/회차 재생의 문자 ▶를 CommonIcon으로 변경. 스토어에서는 구매하기 버튼을 유지합니다.
`Policy.jsx`: 공통 SVG를 버튼 안에 배치했습니다.

## 스토어 버튼 조건
`Detail.jsx`의 `isStoreDetail`은 `location.state.fromStore` 또는 URL 쿼리 `from=store`로 판별합니다.
스토어의 MainBanner/ContentCard/CardHover 링크는 `?from=store`를 추가하므로 새로고침에도 구매하기를 유지합니다. 직접 입력한 `/detail/movie/597965`처럼 쿼리 없는 주소는 일반 상세페이지로 판별됩니다.
실제 결제 API는 연결하지 않았습니다.

## 검증 범위
- 공통 아이콘 경로 24개가 제공된 public 이미지 파일에 존재함을 확인
- 스토어 진입 링크와 구매 분기 코드가 유지됨을 정적 확인
- ZIP CRC 무결성 검사
- Vite 빌드/브라우저 렌더링은 프로젝트 최상위 package.json이 제공되지 않아 미실행
