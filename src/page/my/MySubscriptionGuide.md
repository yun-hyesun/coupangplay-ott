# My 구독 페이지 사용설명서

## 적용 방법

압축 파일의 `src`를 기존 프로젝트의 `src`에 반영합니다. 이번 파일은 React + JSX + SCSS 소스입니다. 기존 프로젝트의 package.json, Vite 설정, Firebase 환경설정, public 폴더는 그대로 사용하세요. 테스트용 가짜 계정이나 가짜 결제 성공 처리는 배포 소스에 포함하지 않았습니다.

기존에 My 접두어가 없던 my 내부 파일도 이름을 변경했습니다. **예전 파일을 남긴 채 단순 덮어쓰기하지 말고, 기존 `src/page/my` 폴더를 백업한 후 새 폴더로 교체**하세요. `src/App.jsx`도 함께 반영해야 새 주소로 이동할 수 있습니다. 외부에서 직접 import한 my 파일이 있다면 새 이름으로 변경하세요. 공개 export 이름은 기존 사용처 호환을 위해 유지했습니다.

## 파일 구조와 역할

| 위치 | 역할 |
| --- | --- |
| MySubscription.jsx | 기존 로그인·Firestore 구독 목록·이용권 등록을 유지한 구독 관리 페이지. 해지 확인·완료·해지 철회 연결 |
| MyPassGuide.jsx | 일반 회원 요금과 와우 회원 할인 안내, 패스 8종 카드, 구독 중 관리 이동 |
| MySubscriptionCheckout.jsx | 선택 상품 확인, 필수 약관 동의, 결제 요청, 오류 및 서버 승인 후 완료 화면 |
| MyMembership.jsx | 와우 멤버십 안내, 인기작 6종, 쇼핑 혜택, FAQ, 가입 진입 |
| MySubscriptionData.js | Figma 기준 패스 가격·문구·유의사항·FAQ 데이터 |
| components/MyPassCard.jsx | 패스 이름·금액·설명·선택 또는 구독 관리 버튼 |
| components/MySubscriptionButton.jsx | 주요·보조·hover·disabled·키보드 포커스 버튼 공통화 |
| components/MySubscriptionModal.jsx | 네이티브 dialog 기반 모달. Escape·배경 클릭·포커스 복원·스크롤 잠금 |
| components/MySubscriptionFaq.jsx | 키보드 조작 가능한 details/summary FAQ |
| components/MySubscriptionPayment.jsx | 결제 서버 어댑터. Firebase ID 토큰으로 인증 |
| components/MySubscriptionActions.jsx | 서버에서 정기결제 해지·철회 요청 |
| components/MyVoucherModal.jsx | 기존 이용권 등록 모달을 이름만 변경하여 재사용 |
| components/MySubscriptionMenu.jsx | 기존 구독 관리 드롭다운 재사용 |
| scss/MySubscriptionUi.scss | 신규 화면·카드·버튼·모달·FAQ·반응형 스타일 |
| scss/MySubscription.scss | 기존 구독내역 및 결제내역 스타일. 미사용 중복 해지 모달 스타일 제거 |
| assets/MyMembershipPoster.png | Figma에서 받은 원본 이미지. 각 포스터 영역의 crop 위치와 비율을 SCSS에서 유지 |

my 내부 모든 파일명은 `My`로 시작합니다. JSX 컴포넌트는 `components`, 스타일은 `scss`, 이미지 원본은 `assets`에 구분했습니다. 기존 css 폴더의 파일도 My 접두어로 바꾸었으며 새 구현은 SCSS를 import합니다. MyWatchList.scss와 MyWatchlist.scss는 각각 기존 목록 컴포넌트와 페이지용 파일이므로 대소문자를 유지합니다.

## 화면 주소

| 주소 | 화면 |
| --- | --- |
| /my/subscription | 기존 내 구독내역 + 패스 둘러보기 |
| /my/subscription/passes | 패스 안내·선택 |
| /my/subscription/checkout?plan=sports-pass | 스포츠 패스 결제 확인 |
| /my/subscription/checkout?plan=ebs-pass | EBS ON 결제 확인 |
| /my/subscription/checkout?plan=sony-pass | SONY PICTURES 결제 확인 |
| /my/subscription/checkout?plan=paramount-pass | Paramount+ 결제 확인 |
| /my/subscription/checkout?plan=kids-pass | 키즈+ 결제 확인 |
| /my/subscription/checkout?plan=crunchyroll-pass | Crunchyroll 결제 확인 |
| /my/subscription/checkout?plan=moa-pass | MOA 결제 확인 |
| /my/subscription/checkout?plan=jplus-pass | JPlus 결제 확인 |
| /my/subscription/membership | 와우 멤버십 안내 |
| /my/subscription/checkout?plan=wow-membership | 와우 멤버십 결제 확인 |
| /my/subscription/payment?plan=sports-pass | 기존 결제내역 페이지 유지 |

헤더·푸터는 App의 기존 MainLayout을 재사용합니다. 각 페이지에서 별도로 중복 렌더링하지 않습니다. 기존 마이페이지 본문과 사이드바는 새로 그리지 않았습니다.

## 디자인 작성 방식

기존 my처럼 named export 함수 컴포넌트, React Router, Zustand 상태, `@use` SCSS 구조로 작성했습니다. 기존 `_variables.scss`의 Pretendard·폰트 굵기·브랜드 파랑·보조 텍스트·테두리 변수를 사용합니다. 기존 전역 변수와 Figma 색이 다른 부분은 전역 디자인에 영향을 주지 않도록 MySubscriptionUi.scss 안에 구독 화면용 토큰으로 한정했습니다.

Figma 화면: 1920px, 좌우 64px, 카드 간격 12px, 카드 내부 24px, 정보 상자 32px, 버튼 높이 44px 및 radius 8px, 모달 폭 560px 및 radius 16px입니다. 결제 본문은 768px입니다. 인기작은 Figma가 제공한 원본 이미지와 원래의 crop 비율을 사용했습니다. 카드·제목·버튼은 고정 좌표 대신 grid/flex로 배치합니다.

태블릿은 2열, 모바일은 1열 패스 카드로 전환합니다. 모바일은 기존 my의 767px 기준과 20px 좌우 여백을 따릅니다. CSS 클래스에 `my-pass-` 접두어를 사용하여 다른 페이지에 영향을 주지 않습니다.

## 결제·해지 서버 연결

첨부 소스에는 결제/정기결제 서버가 없습니다. 실제 결제 완료·권한 부여·자동결제 중단이 구현되었다고 표시하지 않습니다. 연결 전 버튼을 누르면 오류 안내가 나오며, 임의로 구독을 생성하거나 기존 구독 문서를 삭제하지 않습니다.

- `POST /api/subscriptions/checkout`: JSON `{ "planId": "sports-pass" }`, Authorization Bearer Firebase ID 토큰. 서버가 결제까지 확인한 경우에만 `{ "status": "paid", "orderId": "서버 주문 번호" }` 반환.
- `POST /api/subscriptions/{id}/cancel`: 이용기간을 유지한 정기결제 해지. 서버 확인 후 `{ "success": true }` 반환 및 계정 구독 문서를 `status: "cancel_pending"`, `endDate`로 갱신.
- `POST /api/subscriptions/{id}/resume`: 해지 신청 철회. 서버 확인 후 `{ "success": true }` 반환 및 `status: "active"` 갱신.

서버는 Firebase 토큰을 검증하고 회원의 상품·와우 자격·실제 가격을 조회해야 합니다. 카드 정보는 저장하지 않습니다. 실제 PG의 결제창/리다이렉트가 필요한 경우 Payment 어댑터를 해당 PG 흐름에 연결하세요. 서버에서 중복 결제를 막기 위한 주문 멱등 처리 및 결제 웹훅 검증이 필요합니다. 화면 금액은 시안 값이며 운영 가격의 근거로 신뢰하지 마세요. 현재는 일반 회원 요금으로 표시합니다. 와우 회원 할인 적용은 검증된 회원 자격 및 서버 견적 연동이 필요합니다.

기존 store의 `onCancelSubscription`은 즉시 문서 삭제 방식이라 신규 해지 흐름에서는 호출하지 않습니다. 기존 이용권 코드 등록은 원래의 시연용 코드/Firestore 처리를 유지했습니다. 기존 MyPaymentHistory는 제공된 샘플 데이터를 유지했으며 실제 거래 내역 API는 별도 연결해야 합니다. Firebase 보안 규칙은 기존 프로젝트 규칙을 사용하며 이번 변경에서 배포하지 않았습니다.

## 검증 결과와 범위

- 신규 구독 화면 묶음 React/SCSS 빌드 통과.
- DOM 동작 검증 통과: 8종 패스, 선택 시 주소 이동, 필수 동의 전 버튼 비활성화, 실패 안내, 실패 시 잘못된 완료 화면 미표시, 잘못된 plan 처리, 6종 포스터 슬롯, 5개 FAQ, 해지 확인 및 실패 안내, 해지 대기 배너.
- JSX 상대 import 경로 누락 0개. my 내부 My 접두어 누락 0개.
- `public` 파일·기존 프로젝트 설정이 첨부되지 않았으므로 기존 로고/아이콘/프로필 이미지는 원래 프로젝트의 public 자산에 의존합니다. 신규 포스터 원본은 포함했습니다.
- 전체 App 통합 빌드는 다른 기존 페이지의 Sass 전역 변수 주입 설정 누락으로 실패했습니다. 첨부되지 않은 기존 Vite 설정을 함께 사용해야 합니다. 관련 없는 페이지 스타일은 변경하지 않았습니다.
- 브라우저 프로세스 실행 제한으로 실제 브라우저 화면 캡처 및 데스크톱/모바일 시각 검증은 완료하지 못했습니다. DOM 검증은 레이아웃 검증을 대신하지 않습니다. 배포 전 1920px·390px에서 포스터 crop, 결제 본문, 모달 포커스/스크롤, 기존 public 자산을 확인하세요.

기준: Figma 5926:39445, 패스 안내 5938:127489, 결제 확인 5938:127894, 와우 멤버십 5910:126032, 해지 화면 5929:126578 / 5929:126618. 파일 수정일 2026-11-06.
