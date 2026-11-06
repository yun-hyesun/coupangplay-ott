# 와우클립

현재 진입점은 `WowClip.jsx`의 `/wowclip`이다. 기존 MainLayout과 팀의 인증·프로필·작품·시청 기록 구조를 재사용한다. 폴더 구성은 팀의 `home`·`my`처럼 기능 폴더 아래 컴포넌트와 SCSS를 나누는 방식에 맞췄다.

```text
wowclip/
├── WowClip.jsx              # 현재 목록·감상 진입점
├── components/              # 카드, 연속 감상, 댓글, 플레이어, 편집, 공용 UI
├── hooks/                   # useWowClipLibrary
├── utils/                   # 표시·저장 데이터, 구간·자르기 계산, 해당 테스트
├── scss/                    # 와우클립 전용 스타일
├── pages/                   # 별도로 들어온 목록·상세·편집 화면 보존
└── README.md
```

## 현재 연결

- `App.jsx` → `WowClip.jsx` → `components/ClipCard` 또는 `components/ClipFeed`.
- 홈의 `WowClipSection` → 같은 카드와 저장소. 공개 클립을 공감·최신순으로 최대 8개 표시한다.
- 본편 `Watch` → `components/FullVideoClipButton` → `components/ClipEditor` → 저장 후 감상 화면.
- 페이지 루트의 import 경로는 유지했다. 홈·Watch는 옮긴 모듈 경로만 변경했다.

## 동작

카드는 2:3 세로형이며 최소 270px에서 남는 가로 공간을 균등 분배한다. 카드 사이 간격은 20px, 640px 이하에서는 2열·12px이다. 예시 작품·작성자·숫자를 채우지 않고 저장된 클립만 표시하며 빈 상태와 읽기 오류를 처리한다.

감상 화면은 세로 스크롤·방향키·이전/다음 버튼으로 저장된 클립을 이어 본다. 활성 클립의 플레이어 하나만 마운트하고 선택 구간을 반복한다. 하트, 댓글, 공유, 본인 클립 삭제를 제공한다. 감상 화면에는 제작 버튼이 없고 본편에서만 제작한다.

편집은 가로형 16:9와 세로형 9:16을 제공한다. 구간 바를 움직이면 원본과 결과 미리보기가 해당 시각을 따라가고 조절 후 선택 시작점부터 재생한다. 세로 선택 영역은 드래그·방향키로 옮기며 `layout`·`cropX`·구간을 저장한다. 원본과 미리보기는 유튜브의 독립 플레이어이므로 통신 상태에 따라 작은 재생 오차가 생길 수 있다.

댓글은 우측 패널 안에서 스크롤한다. 입력 박스는 대기·포커스·작성 중 모두 72px이며, 같은 입력창으로 답글을 쓰고 성공하면 일반 댓글로 돌아간다. 답글 연결선·접기/펼치기·인기/최신/등록순을 제공한다. 댓글 공감은 선/채움 엄지 아이콘으로 바뀌고 숫자 변화로 답글 위치가 움직이지 않게 폭을 확보한다.

스포일러 보호된 클립은 확인 전 실제 제목·장면·댓글·플레이어를 렌더링하지 않는다. 안전한 작품 이미지가 없으면 장면 썸네일로 대체하지 않는다. 제작 직후 본인의 확인 화면과 같은 페이지에서 이미 확인한 클립은 바로 연다.

## 데이터와 범위

- 영상과 작품 정보는 기존 TMDB/YouTube 결과를 전달받는다. 예시 이미지를 다운로드하지 않는다.
- `localStorage['coupangplay.wowclip.v1']`에 구간·화면 형식·댓글·공감을 저장한다. 로그인/프로필 ID로 소유자를 구분한다.
- 저장 변경은 같은 화면의 다른 훅과 다른 탭에도 반영한다. 팀의 Zustand·Firebase 저장소는 수정하지 않는다.
- 현재는 YouTube 영상의 구간과 화면 위치를 참조한다. MP4 인코딩·업로드·서버 공개는 연결하지 않았다. 복사 링크는 같은 브라우저 저장소에 있는 클립을 연다.
- YouTube 기본 조작부는 숨기고 자체 조작부를 쓴다. YouTube의 제목·브랜드 표시 전체를 제거하는 기능은 아니다.

## 별도 화면 코드 보존

`pages/WowClipGallery.jsx`, `pages/WowClipDetail.jsx`, `pages/WowClipCreate.jsx`는 현재 App 라우트나 본편 제작 버튼에서 사용하지 않는다. 이 코드는 별도 `src/components/wowclip/clipStorage.js`와 `coupang-wowclip-v2` 형식을 사용한다. 현재 저장소와 자동으로 합치거나 라우트를 교체하지 않았다. 기존 샘플 데이터와 Firebase 댓글 연동도 실사용 흐름에 연결하지 않았다.

`WowClipCreate`는 기존 WowClip 파일 뒤에 붙어 있던 편집 모듈을 분리해 이름만 구분한 것이다. 기존 코드의 삭제나 기능 통합 없이 보존했다. 편집용 SCSS도 `scss/WowClipCreate.scss`로 분리해 해당 화면에서만 불러온다. 이 세 파일에 남아 있던 기존 lint 진단은 실사용 코드의 검수와 구분한다.

## 검증

```sh
node --test src/page/wowclip/utils/clipTimeline.test.js src/page/wowclip/utils/clipPresentation.test.js
npx eslint src/page/wowclip/WowClip.jsx src/page/wowclip/components src/page/wowclip/hooks src/page/wowclip/utils src/page/home/components/WowClipSection.jsx
npm run build
```

2026-11-06 폴더 이동 후 문법·경로·SCSS 컴파일 및 메모리 전용 브라우저 검수를 수행했다. 자세한 결과는 작업 폴더의 `output/wowclip-organization-2026-11-06/`에 있다. 브라우저 검수의 가상 클립·댓글은 실제 사용자 저장소에 넣지 않았다.

조직 방식 참고: [React 컴포넌트 분리](https://react.dev/learn/importing-and-exporting-components), [기능별 관련 코드 배치](https://redux.js.org/style-guide/#structure-files-as-feature-folders-with-single-file-logic). Redux 도입이나 전체 프로젝트 구조 변경을 의미하지 않는다.
