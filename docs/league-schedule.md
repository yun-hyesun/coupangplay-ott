# 경기일정 탭 구조

Figma 기준: [PC 1920 경기 일정](https://www.figma.com/design/Hi2fCvvbk19aERqLTbX8gE?node-id=1079-12890)

```text
LeagueDetail
├─ LeagueHeader                 공통 리그 헤더 · 점수 ON/OFF · 탭 메뉴
└─ LeagueSchedulePage           경기일정 탭 전용 콘텐츠
   ├─ toolbar                  날짜별/라운드별 · 시즌/월 · 달력 · 최근
   ├─ selector                 5개 라운드 또는 7개 날짜 · 이전/다음
   ├─ timezone                 한국시간 기준
   ├─ results
   │  └─ date-group            날짜 제목 · 같은 날짜의 경기 목록
   │     └─ ScheduleMatchRow
   │        ├─ badges          예정/종료/LIVE · 제공된 화질
   │        ├─ matchup         홈 팀 · 점수/시간/라운드 · 원정 팀
   │        └─ actions         경기 찜하기 · 영상/중계 보기
   └─ ScheduleCalendar         날짜·연월 선택 모달
```

- `src/components/LeagueSchedulePage.jsx`: 화면, 조회 상태, 달력, 찜하기. 기존 홈의 `LeagueSchedule.jsx`는 유지한다.
- `src/components/scss/LeagueSchedulePage.scss`: 콘텐츠 너비 1792px(1920 화면 좌우 64px), 라운드 바 128px, 경기 행 120px, 팀 로고 64px. 1100px·700px 이하 대응.
- `src/data/leagueScheduleView.js`: 시즌 범위, 라운드 목록, 한국 날짜별 그룹, 5개 라운드 범위, 달력 날짜 생성.
- `src/service/leagueScheduleService.js`: 시즌 일정 조회 및 짧은 캐시. 기존 리그별 데이터 공급자를 재사용한다.
- `public/images/sports/league-detail/schedule/`: Figma에서 받은 원본 아이콘. 팀 로고는 프로젝트 팀 카탈로그를 사용한다.

실제 API 일정으로 라운드를 구성한다. Figma의 샘플 날짜·경기·화질·하이라이트 여부는 고정하지 않는다. 진행 중 경기, 다음 경기, 시즌 마지막 경기 순서로 최근 라운드를 정한다. 날짜 조회와 그룹은 한국시간 기준이다.

마이 팀은 기존 설정과 연결하며 해당 경기 양쪽에 파란색을 표시한다. 찜하기는 이 PC의 localStorage에 보관하며 외부 알림을 등록하지 않는다. 종료 경기의 직접 영상 주소가 없으면 리그 동영상 탭을 연다. 라이브 경기의 중계 주소가 없으면 쿠팡플레이를 연다.

조회 중·빈 일정·조회 실패·부분 실패를 각각 표시하며, 실패 시 다시 조회할 수 있다. 라운드 정보가 없는 대회는 날짜별 조회를 사용한다. 달력은 Esc와 바깥 클릭으로 닫을 수 있다.

데이터 공급자의 조회 제한으로 갱신이 실패하면 같은 시즌에서 24시간 이내에 성공한 일정이 있을 때 안내 문구와 함께 유지한다. 이전에 조회하지 않은 시즌은 재조회 안내를 표시한다.
