# SnapPrompt — 프로젝트 메모

웹서핑 중 발견한 LLM 프롬프트를 저장하고 단축키로 꺼내 쓰는 Chrome 익스텐션 (MV3).
스택: TypeScript + Vite + Preact + @preact/signals + @crxjs/vite-plugin + Fuse.js.

## 명령어
- `npm run build` — 타입체크(`tsc --noEmit`) + 프로덕션 빌드 → `dist/`
- `npm run dev` — Vite 개발 서버 (HMR, `dist/`가 localhost 참조)
- `npm run typecheck`
- 빌드/타입체크는 항상 프로젝트 디렉터리에서 실행 (cwd가 상위로 리셋될 때가 있음 → `cd <프로젝트 루트> && npm run build`)

## 작업 리듬 (필수)
- **각 기능/라운드를 완결할 때마다 `npm run build`(tsc --noEmit + vite build)로 검증한 뒤 커밋한다.** 빌드가 실패하면 커밋하지 않고 먼저 고친다.
- 모든 작은 편집마다 풀빌드하지는 않는다 — 기능 단위로 끊어서 빌드. 중간 점검이 필요하면 `npx tsc --noEmit`만 빠르게 돌린다.
- 커밋은 응집된 기능 단위로, 메시지 끝에 Co-Authored-By 라인 유지. 사용자가 커밋을 요청하거나 라운드가 끝나면 커밋/푸시.

## README 스크린샷 갱신 절차 (표준 — 항상 이 방식 사용)
UI가 바뀌어 README 스크린샷을 갱신할 때는 반드시 아래 순서를 따른다.
프리뷰 도구의 스크린샷은 파일로 저장되지 않으므로 **헤드리스 Chrome으로 PNG를 직접 저장**해야 한다.

1. **`design/shots.html`을 현재 출시본 UI에 맞춰 먼저 동기화한다** (실제 익스텐션과 어긋나지 않게).
   - 각 화면은 `.frame[data-shot="이름"]`, `#이름` 해시로 선택. 다크가 필요한 화면은 스크립트가 자동 적용(`?theme=dark`도 가능).
2. **헤드리스 Chrome으로 2x PNG 저장** → `docs/images/*.png`
   ```bash
   CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
   F="file://$PWD/design/shots.html"
   "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
     --force-device-scale-factor=2 --window-size=<W>x<H> \
     --screenshot="docs/images/<이름>.png" "$F#<이름>" --virtual-time-budget=2000
   ```
   - 화면별 window-size: popup 760x760 · picker 1100x680 · vars 760x900 · save 1040x680 · image 760x960 · history 900x680 · options 1120x840 · onboarding 1040x620
   - 프레임 목록(data-shot): popup · picker · vars · save · image(이미지/영상 옵션 편집기) · history(버전·비교) · options · onboarding
3. README는 `<img src="docs/images/<이름>.png" width="...">`로 참조.
4. 커밋/푸시. 이미지로 push가 끊기면 `git config http.postBuffer 524288000` 후 재시도.

핵심 원칙: **목업을 실제 UI에 동기화 → 헤드리스로 파일 저장 → README 반영.**

## 코드 컨벤션 / 주의점
- **i18n (4개국어: ko/en/ja/zh)**: `chrome.i18n.getMessage`는 브라우저 로케일 고정이라 사용 안 함. `src/shared/i18n.ts`의 커스텀 `t(key, params?)` + `locale` 시그널을 쓴다. **새 UI 문자열은 ko/en/ja/zh 네 카탈로그 모두에 키 추가**(`t()`는 누락 시 en→ko 폴백). 날짜/숫자 포맷은 `dateLocale()`(ko-KR/en-US/ja-JP/zh-CN) 사용. 변수 이름 정규식은 한글+CJK(히라가나/가타카나/한자) 허용 → 일/중 변수명 인식. 샘플·스타터팩 내용은 `samples.ts`·`starterpacks.ts`에서 `{ko,en,ja,zh}` Loc로 보유, build 시 `locale.value`로 선택.
- **콘텐츠 스크립트 격리**: 모든 오버레이 UI는 Shadow DOM 안에 렌더. 디자인 토큰은 `:root, :host` 둘 다에 정의해야 Shadow 내부에서 CSS 변수가 해석됨. 다크는 `[data-theme="dark"], :host([data-theme="dark"])`, 테마 속성은 호스트 엘리먼트에 설정.
- **변수 문법**: `{{name}}` / `{{name|기본값}}` / `{{name:type(...)}}`. 타입: text·textarea·number·date·color·select. 정규식은 콜론/타입 주변 공백 허용. 파서는 `src/shared/variables.ts`.
- **삽입 텍스트 조립(Round C)**: 최종 텍스트는 항상 `src/shared/assemble.ts`의 `assemblePrompt(prompt, values)` 한 곳에서 만든다(피커·변수모달·팝업 복사 모두 이걸 호출). 순서: `[레퍼런스 URL] [본문(치환)] [--파라미터] [네거티브]`. 일반 프롬프트는 변수 치환만(기존과 동일). 변수 추출 소스는 `variableSource(prompt)`=본문+네거티브.
- **이미지/영상 프롬프트**: `Prompt.kind`('general'|'image'|'video', 없으면 general). image/video만 생성 옵션 노출 + 변수 없어도 삽입 모달 항상 표시(`isGenerative`). 옵션 데이터: `negativePrompt`/`negativeStyle`('label'|'mj')·`params`(ImageParam[])·`references`. 파라미터 프리셋 팩은 `src/shared/imageparams.ts`(Midjourney=image, Pika=video). 파라미터 토큰 규칙: `{}`가 값 자리, toggle은 플래그만.
- **공유 편집 컴포넌트**: 이미지/영상 옵션 편집 UI는 `src/components/PromptOptionsEditor.tsx`(자체 `io-*` 클래스 + `prompt-options.css`)를 팝업/옵션 편집기 양쪽에서 재사용. CSS는 두 엔트리(`popup/main.tsx`, `options/main.tsx`)에서 import. 경로 별칭 `@/`=src, `@shared/`=src/shared.
- **히스토리(Round D)**: ① 버전 — 편집기 `save()`에서 `contentChanged(prev,next)`면 `pushVersion(prev.versions, makeVersion(prev, prev.updatedAt))`로 직전 내용을 `Prompt.versions`에 적재(cap `MAX_VERSIONS`=15). UI는 공유 `src/components/PromptHistory.tsx`(`dh-*` 스타일, prompt-options.css에 포함)로 목록·되돌리기·두 항목 좌우 비교(A/B). ② 삽입 로그 — `PROMPT_USED` 메시지에 `text/values/host`를 실어 보내면 background가 `recordUsage`+`addInsertion`로 전역 키 `snapprompt:insertions`에 기록(cap `MAX_INSERTIONS`=200). 변수모달 '최근 사용값' 칩 + 옵션 '기록' 탭에서 활용. 모든 최종 텍스트는 여전히 `assemblePrompt`로 생성해 로그에 저장.
- **저장소**: `chrome.storage.local` (+ `unlimitedStorage`). 키 네임스페이스/마이그레이션은 `src/shared/store.ts`, 모든 컨텍스트는 `subscribe()`(storage.onChanged)로 동기화.
- **팝업 모드**: `?mode=window`(분리 창) / `?mode=panel`(사이드 패널) 쿼리로 분기. 삽입 후 닫기는 툴바 팝업만(창/패널은 상주).
- **권한/호스트(웹스토어 최소권한 — v1.0.0 재설계)**: 광범위 호스트 권한 **전부 미사용** — `<all_urls>`도, 광범위 `optional_host_permissions(*://*/*)`도 없음(2회 반려 → 승인 우선으로 제거). 권한 = `storage·contextMenus·activeTab·scripting·sidePanel`. 콘텐츠 스크립트는 매니페스트 **정적 matches = 잘 알려진 LLM 사이트(=`DEFAULT_ALLOWED_HOSTS`, types.ts)에만**. 그 외 사이트에서는 사용자가 우클릭/단축키로 호출한 순간 background `ensureContentScript`(PING 후 `scripting.executeScript`)가 `activeTab` 권한으로 현재 탭에 1회 주입 → 저장/피커는 어디서나 가능(자동/임의 주입 아님). **임의 사이트를 영구 추가하는 기능은 없음**(optional host 제거로 런타임 origin 요청 불가). 콘텐츠 스크립트는 `siteAllowed`(allowedHosts) 일 때만 **플로팅 버튼** 활성. 옵션 "활성 사이트" = `DEFAULT_ALLOWED_HOSTS` 중 플로팅 버튼 on/off 토글(자유 입력·권한요청 없음, `addHost/removeHost`는 allowedHosts patch만). 설정 키: `allowedHosts`(기본=LLM 시드). `disabledHosts`·`backupFrequency`·`downloads`·`alarms`·`unlimitedStorage`·`syncDynamicSites`(동적 등록)는 제거됨 — 수동 백업은 `downloadBackup`의 anchor download(권한 0), 롤백 스냅샷은 앱 오픈 시 `maybeSnapshot()`(24h). 스키마 v2 마이그레이션은 `ensureSchema`.
- **git**: 원격 `origin` = github.com/01-june-0/snapprompt (public, MIT). 기여 규칙은 `CONTRIBUTING.md`. 커밋 메시지 끝에 Co-Authored-By 라인 유지.

## 문서
- 제품 요구사항: `docs/PRD.md`
- 디자인 목업 인덱스: `design/index.html` / 캡처용: `design/shots.html`
