# SnapPrompt — 프로젝트 메모

웹서핑 중 발견한 LLM 프롬프트를 저장하고 단축키로 꺼내 쓰는 Chrome 익스텐션 (MV3).
스택: TypeScript + Vite + Preact + @preact/signals + @crxjs/vite-plugin + Fuse.js.

## 명령어
- `npm run build` — 타입체크(`tsc --noEmit`) + 프로덕션 빌드 → `dist/`
- `npm run dev` — Vite 개발 서버 (HMR, `dist/`가 localhost 참조)
- `npm run typecheck`
- 빌드/타입체크는 항상 프로젝트 디렉터리에서 실행 (cwd가 상위로 리셋될 때가 있음 → `cd /Users/edm/Developer/snapprompt && npm run build`)

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
   - 화면별 window-size: popup 760x700 · picker 1100x680 · vars 720x600 · save 1040x680 · options 1120x820 · onboarding 1040x620
3. README는 `<img src="docs/images/<이름>.png" width="...">`로 참조.
4. 커밋/푸시. 이미지로 push가 끊기면 `git config http.postBuffer 524288000` 후 재시도.

핵심 원칙: **목업을 실제 UI에 동기화 → 헤드리스로 파일 저장 → README 반영.**

## 코드 컨벤션 / 주의점
- **i18n**: `chrome.i18n.getMessage`는 브라우저 로케일 고정이라 사용 안 함. `src/shared/i18n.ts`의 커스텀 `t(key, params?)` + `locale` 시그널을 쓴다. 새 UI 문자열은 ko/en 카탈로그 양쪽에 키 추가. 컴포넌트에서 `t()`를 쓰면 언어 변경 시 자동 리렌더.
- **콘텐츠 스크립트 격리**: 모든 오버레이 UI는 Shadow DOM 안에 렌더. 디자인 토큰은 `:root, :host` 둘 다에 정의해야 Shadow 내부에서 CSS 변수가 해석됨. 다크는 `[data-theme="dark"], :host([data-theme="dark"])`, 테마 속성은 호스트 엘리먼트에 설정.
- **변수 문법**: `{{name}}` / `{{name|기본값}}` / `{{name:type(...)}}`. 타입: text·textarea·number·date·color·select. 정규식은 콜론/타입 주변 공백 허용. 파서는 `src/shared/variables.ts`.
- **저장소**: `chrome.storage.local` (+ `unlimitedStorage`). 키 네임스페이스/마이그레이션은 `src/shared/store.ts`, 모든 컨텍스트는 `subscribe()`(storage.onChanged)로 동기화.
- **팝업 모드**: `?mode=window`(분리 창) / `?mode=panel`(사이드 패널) 쿼리로 분기. 삽입 후 닫기는 툴바 팝업만(창/패널은 상주).
- **git**: 원격 `origin` = github.com/01-june-0/snapprompt (private), HTTPS + gh 토큰. 커밋 메시지 끝에 Co-Authored-By 라인 유지.

## 문서
- 제품 요구사항: `docs/PRD.md`
- 디자인 목업 인덱스: `design/index.html` / 캡처용: `design/shots.html`
