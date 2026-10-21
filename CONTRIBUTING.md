# Contributing to SnapPrompt / 기여 가이드

SnapPrompt에 관심을 가져 주셔서 감사합니다. 이슈와 PR 모두 환영합니다. 한국어와 영어 모두 사용할 수 있습니다.
Thanks for your interest in SnapPrompt. Issues and pull requests are welcome, in Korean or English.

## 시작하기 / Getting started

```bash
git clone https://github.com/01-june-0/snapprompt.git
cd snapprompt
npm install
npm run dev        # Vite dev server (HMR)
```

1. `chrome://extensions` → **개발자 모드** 켜기 / enable **Developer mode**
2. **압축해제된 확장 프로그램을 로드** → `dist/` 선택 / **Load unpacked** → select `dist/`

| 명령 / Command | 설명 / Description |
| --- | --- |
| `npm run dev` | 개발 서버 (HMR) / dev server |
| `npm run typecheck` | `tsc --noEmit` 타입체크 / type check |
| `npm run build` | 타입체크 + 프로덕션 빌드 → `dist/` / type check + production build |

PR을 올리기 전에 `npm run build`가 통과해야 합니다. / `npm run build` must pass before you open a PR.

프로젝트 구조와 설계 메모는 [CLAUDE.md](CLAUDE.md)와 [docs/PRD.md](docs/PRD.md)에 있습니다.
Architecture notes live in [CLAUDE.md](CLAUDE.md) and [docs/PRD.md](docs/PRD.md) (both in Korean).

## 이슈 / Issues

- 버그: 재현 단계, 기대 동작, 실제 동작, Chrome 버전, 발생한 사이트를 적어 주세요.
- 기능 제안: 해결하려는 문제를 먼저 설명해 주세요. 큰 변경은 구현 전에 이슈로 논의하는 편이 좋습니다.
- Bugs: include steps to reproduce, expected vs. actual behavior, your Chrome version, and the site where it happened.
- Features: describe the problem first. For larger changes, please open an issue before writing code.

## Pull request

1. `main`에서 브랜치를 만듭니다. / Branch from `main`.
2. 변경은 작고 응집되게 유지합니다. 기능 하나에 PR 하나가 좋습니다. / Keep PRs small and focused.
3. `npm run build`로 검증합니다. / Verify with `npm run build`.
4. UI가 바뀌면 스크린샷을 첨부합니다. / Attach screenshots for UI changes.
5. 커밋 메시지는 `feat:`, `fix:`, `docs:`, `refactor:` 같은 [Conventional Commits](https://www.conventionalcommits.org/) 접두사를 권장합니다. / Conventional Commit prefixes are preferred.

## 코드 컨벤션 / Code conventions

- **언어 / Language**: TypeScript + Preact + `@preact/signals`. 기존 코드의 스타일, 네이밍, 주석 밀도를 따릅니다. / Match the surrounding code.
- **i18n (ko/en/ja/zh)**: 새 UI 문자열은 `src/shared/i18n.ts`의 **4개 카탈로그(ko, en, ja, zh) 모두**에 키를 추가하고 `t(key)`로 사용합니다. `chrome.i18n.getMessage`는 쓰지 않습니다. 번역이 어렵다면 영어·한국어만 채우고 PR에 알려 주세요. / Add every new UI string to all four catalogs and use `t(key)`. If you can't translate all four, fill en/ko and say so in the PR.
- **오버레이 UI / Overlay UI**: 콘텐츠 스크립트의 UI는 Shadow DOM 안에서만 렌더하고, 디자인 토큰은 `:root, :host` 둘 다에 정의합니다. / Content-script UI renders inside a Shadow DOM; define design tokens on both `:root` and `:host`.
- **최종 텍스트 조립 / Prompt assembly**: 삽입할 최종 텍스트는 항상 `src/shared/assemble.ts`의 `assemblePrompt()`로 만듭니다. / Always build the final text through `assemblePrompt()`.
- **저장소 / Storage**: `chrome.storage.local`만 사용하며 키와 마이그레이션은 `src/shared/store.ts`에서 관리합니다. / Use `chrome.storage.local` only; keys and migrations live in `src/shared/store.ts`.

## 권한과 개인정보 / Permissions and privacy

SnapPrompt는 **사용자 데이터를 수집하거나 외부로 전송하지 않으며**, 웹스토어 심사를 위해 권한을 최소화했습니다. 다음 변경은 PR에서 반드시 사유를 설명해 주세요.
SnapPrompt collects and transmits no user data, and keeps its permissions minimal for Chrome Web Store review. Please justify any PR that does one of the following:

- `manifest.config.ts`의 권한이나 호스트 매치를 추가·확대 / adds or broadens permissions or host matches
- 네트워크 요청, 분석, 원격 코드, 추적 도구 추가 / adds network requests, analytics, remote code, or trackers

## 행동 강령 / Code of conduct

참여하면 [행동 강령](CODE_OF_CONDUCT.md)에 동의한 것으로 봅니다. / By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## 라이선스 / License

기여한 코드는 프로젝트와 같은 [MIT 라이선스](LICENSE)로 배포됩니다. / Contributions are licensed under the project's [MIT License](LICENSE).
