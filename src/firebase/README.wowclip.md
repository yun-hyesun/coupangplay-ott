# 와우클립 Firestore 규칙 적용

앱은 기존 `firebase.js`의 같은 프로젝트와 Auth를 사용합니다. 기존 `firestore.rules`는 커뮤니티 규칙 예시이며 users/profiles의 실제 배포 규칙이 모두 들어 있지 않으므로 그대로 덮어쓰면 안 됩니다.

`wowclip.rules`는 와우클립만 담은 독립 검수용 파일입니다. 실제 배포 때는 프로젝트 관리자가 Firebase 콘솔에서 현재 배포 규칙을 백업하고, `match /databases/{database}/documents` 안에 `match /wowClips/{clipId}` 블록 전체를 합쳐야 합니다. users/profiles/리뷰/시청 세션의 기존 규칙은 유지합니다. 이미 포괄적인 전체 허용 규칙이 있다면 와우클립 경로에도 적용되므로 새 규칙의 제한이 무효가 됩니다. 해당 경로가 포괄 규칙으로 우회되지 않는지도 합본에서 확인해야 합니다.

2026-11-06 환경의 기존 gcloud 관리 인증으로 현재 프로젝트 규칙 조회가 HTTP 403이고, Chrome의 Firebase 콘솔 계정도 프로젝트 조회 권한이 없어 실제 규칙 배포는 수행하지 못했습니다. 공개 클립 쿼리는 실제 서버에서 HTTP 200으로 확인했습니다. 이후 사용자가 직접 로그인하고 임시 데이터 검수를 승인해 실제 클립 저장·댓글·반복 답글·클립/댓글 공감·새로고침 후 유지·공개 목록 제외·앱 삭제를 검수했습니다. 준비한 전용 규칙의 배포와 다른 계정의 접근 차단은 관리자 권한으로 추가 확인해야 합니다.

## 저장 경로

```text
wowClips/{clipId}                         제목·작품·구간·시즌/회차·화면 형식·작성자·집계
wowClips/{clipId}/comments/{commentId}    댓글과 답글
wowClips/{clipId}/likes/{uid}            계정별 클립 공감
wowClips/{clipId}/commentLikes/{id}      계정별 댓글 공감
wowClips/{clipId}/views/{uid}            계정별 재생 수 집계 기록
wowClips/{clipId}/views/{uid}/profiles/{profileId}  스포일러 보호 해제용 프로필별 재생 기록
```

목록은 `visibility == public`과 `deleted == false`, 내 목록은 `authorUid == uid`와 `deleted == false`, 댓글 공감은 `uid == uid`로 조회합니다. 정렬은 조회된 클립에서 처리하며 기존 팀의 인덱스를 변경하지 않았습니다. 링크 전용은 URL을 아는 사람이 읽을 수 있는 공유 방식이며 개인 비공개 문서가 아닙니다.

작성·댓글·공감은 로그인 필수입니다. 작성자 UID는 현재 Auth를 기준으로 저장하며 프로필은 작성 표시와 내 클립 구분에 사용합니다. 공감은 계정별 1개, 재생 수는 현재 구현에서 로그인 계정별 최초 재생 수입니다. 익명 조회나 반복 재생은 증가시키지 않습니다.

클립을 재생하면 현재 프로필의 시청 기록을 별도로 저장합니다. 이전의 계정별 기록은 프로필을 식별할 수 없어 재생 수에만 사용합니다. 프로필별 저장과 조회를 사용하려면 위 절차에 따라 갱신된 와우클립 규칙을 먼저 배포해야 합니다.

공감·댓글·재생 집계는 관련 문서와 한 트랜잭션에서 갱신합니다. 삭제는 작성자만 `deleted=true`로 바꾸며 감상·댓글·반응 접근을 함께 차단합니다. 하위 문서를 클라이언트에서 일괄 제거하지 않습니다. 완전 삭제/보존 기간 정책은 별도 서버 관리 범위입니다.

댓글·답글 등록과 수정은 최대 300자입니다. 댓글 수정과 삭제는 작성 계정만 할 수 있습니다. 댓글 삭제는 본문을 비우고 댓글 수를 하나 줄이며, 기존 답글은 스레드에 남습니다. 운영에서 이 기능을 사용하려면 위 절차에 따라 갱신된 와우클립 규칙을 함께 배포해야 합니다.

Firebase 연결 전 브라우저 클립을 위한 ‘기존 클립’ 메뉴와 계정 이전 기능은 제거했습니다. 앱은 Firestore 클립만 읽고 저장하며 예전 브라우저 저장소는 읽거나 변경하지 않습니다. 예전 클립·댓글·공감을 서버에 자동 전송하지 않습니다.

## 재현 검수

앱의 package.json/package-lock.json을 바꾸지 않고 별도 런타임 폴더에 firebase-tools, @firebase/rules-unit-testing, firebase, react-test-renderer, @babel/plugin-transform-react-jsx와 Java 21을 준비했습니다.

```powershell
./scripts/wowclip-tests/run.ps1 -RuntimeRoot 'C:/Users/EZEN/Desktop/팀작업/output/wowclip-firebase-2026-11-06/test-runtime'
```

데모 프로젝트 `demo-wowclip-test`와 로컬 8089 포트만 사용합니다. 저장·규칙, 컴포넌트 상태·비동기, 구간·회차 계산, 플레이어 준비·교체·조작을 검수합니다. CLI 설정도 검수 런타임 안에 분리해 기존 Firebase CLI 로그인 설정을 읽거나 바꾸지 않습니다. 컴포넌트 검수는 영상/모달/네트워크를 대체한 React 테스트로 실제 브라우저 재생이나 화면 외형 검수가 아닙니다. 별도의 실제 브라우저 검수 결과는 작업 폴더의 `output/wowclip-firebase-2026-11-06/적용결과와_검수.md`를 참고합니다.

Firestore 에뮬레이터의 [동시 쓰기 규칙 조회 잠금 이슈](https://github.com/firebase/firebase-tools/issues/10518)가 재현돼 엄격한 규칙 검사는 순차 요청으로 하고, 실제 저장 트랜잭션의 동시 재시도 검사는 에뮬레이터 관리 토큰으로 별도 실행합니다. 해당 우회는 검수 코드에만 있으며 앱 서비스에는 넣지 않았습니다.
