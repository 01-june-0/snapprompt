# SnapPrompt

웹서핑 중 발견한 LLM 프롬프트를 빠르게 저장하고("Snap") 필요할 때 한 번에 꺼내 쓰는 Chrome 익스텐션.

## 기능 (Phase 1)

- **저장**: 웹페이지에서 텍스트 선택 → 우클릭 "SnapPrompt에 저장" → 모달에서 제목·폴더·태그 입력
- **꺼내쓰기**:
  - 팝업에서 검색 → 복사
  - 단축키 → 인라인 피커(Spotlight 스타일) → 현재 입력창에 자동 삽입
- **변수**: `{{이름}}` 또는 `{{이름|기본값}}` 템플릿 + 입력 모달
- **분류**: 폴더(무제한 계층) + 태그
- **백업**: JSON export/import + 내부 자동 스냅샷
- **테마/언어**: 라이트·다크, 한국어·영어
- **온보딩**: 첫 설치 3단계 가이드

## 기술 스택

- TypeScript + Vite + Preact + @preact/signals
- Fuse.js (퍼지 검색)
- @crxjs/vite-plugin (Manifest V3 빌드)
- `chrome.storage.local` (+ `unlimitedStorage`)

## 개발

```bash
npm install
npm run dev      # HMR 개발 서버
npm run build    # 타입체크 + 프로덕션 빌드 → dist/
npm run typecheck
```

## Chrome에 로드

1. `npm run build`
2. `chrome://extensions` 접속
3. 우측 상단 "개발자 모드" 켜기
4. "압축해제된 확장 프로그램을 로드합니다" → `dist/` 폴더 선택
5. 단축키 설정: `chrome://extensions/shortcuts`에서 "프롬프트 피커 열기" 키 지정

## 프로젝트 구조

```
src/
├─ background/    서비스 워커 (컨텍스트 메뉴, 단축키, 메시지 허브, 스냅샷)
├─ content/       콘텐츠 스크립트 (Shadow DOM 피커·저장·변수 모달, 삽입 호환 레이어)
├─ popup/         익스텐션 팝업 (검색·목록·편집)
├─ options/       설정 페이지 (7탭) + 온보딩
├─ shared/        types · store · variables · search · backup · theme · messaging
└─ assets/icons/  생성된 아이콘 (scripts/generate-icons.mjs)
docs/PRD.md       제품 요구사항
design/           HTML 디자인 목업 (index.html이 목차)
```

## 문서

- 기획: [docs/PRD.md](docs/PRD.md)
- 디자인: [design/index.html](design/index.html)
