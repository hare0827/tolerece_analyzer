# 공차 누적 분석기 (Tolerance Stack-up Analyzer)

## 프로젝트 개요

기구 설계 엔지니어를 위한 공차 누적 분석 웹 애플리케이션.
Worst Case / RSS / Monte Carlo 세 가지 방법으로 공차 누적을 계산하고 시각화한다.

## 기술 스택

- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Chart**: Recharts
- **Build**: Vite
- **Unit Test**: Vitest
- **CSV**: Papa Parse

## 단위 / 언어 규칙

- 모든 치수 단위는 **mm 고정** (단위 변환 기능 없음)
- UI 언어: **한국어 고정**
- 소수점: 최대 4자리 표시 (0.0001mm 분해능)

---

## 프로젝트 구조

```
src/
├── agents/
│   ├── toleranceEngine/     # 공차 계산 엔진 (순수 함수)
│   ├── monteCarlo/          # Monte Carlo 시뮬레이션
│   └── csvHandler/          # CSV import/export
├── components/
│   ├── InputTable/          # 부품 공차 입력 테이블
│   ├── ResultPanel/         # 계산 결과 패널
│   ├── Charts/              # 시각화 컴포넌트
│   └── common/              # 공통 UI 컴포넌트
├── types/
│   └── tolerance.ts         # 공유 타입 정의
├── hooks/
│   └── useToleranceCalc.ts  # 계산 로직 훅
└── utils/
    └── formatters.ts        # 숫자 포맷 유틸
```

---

## Agent 역할 정의

### 🔧 [AGENT: 공차분석 전문가]
**담당**: `src/agents/toleranceEngine/`, `src/agents/monteCarlo/`

**책임**:
- Worst Case, RSS, Monte Carlo 계산 로직 구현
- 모든 계산은 순수 함수(pure function)로 작성 — 사이드 이펙트 없음
- 단위 테스트 필수 (Vitest)

**핵심 수식**:

Worst Case:
$$T_{wc} = \sum_{i=1}^{n} |t_i|$$

RSS (Root Sum Square):
$$T_{rss} = \sqrt{\sum_{i=1}^{n} t_i^2}$$

Monte Carlo: 각 부품 공차를 정규분포 $N(\mu=0, \sigma=t_i/3)$ 로 샘플링, 10,000회 반복

**기여도 계산** (Sensitivity):
$$S_i = \frac{t_i^2}{\sum t_j^2} \times 100 \quad [\%] \quad \text{(RSS 기준)}$$

**출력 타입**:
```typescript
interface CalculationResult {
  worstCase: number;
  rss: number;
  monteCarlo: {
    mean: number;
    stdDev: number;
    p99: number;      // 99th percentile
    histogram: { bin: number; count: number }[];
  };
  sensitivity: { partId: string; percentage: number }[];
  verdict: 'PASS' | 'FAIL' | 'WARNING';  // 목표 공차 대비
}
```

---

### 🎨 [AGENT: UI 디자이너]
**담당**: `src/components/`, Tailwind 스타일링 전반

**책임**:
- 공학 도구 느낌의 클린한 UI (과도한 장식 금지)
- 색상 규칙:
  - PASS: `green-600`
  - FAIL: `red-600`
  - WARNING: `yellow-500`
  - 기여도 높은 부품: `orange-400` 강조
- 반응형: 최소 1280px 기준 (데스크탑 우선)
- 폰트: 숫자는 `font-mono` 강제 적용

**컴포넌트 규칙**:
- 모든 입력 필드는 즉시 계산 트리거 (onChange)
- 로딩 상태: Monte Carlo 계산 시 spinner 표시
- 에러 상태: 빨간 테두리 + 툴팁 메시지

---

### ⚛️ [AGENT: Frontend]
**담당**: `src/hooks/`, `src/components/InputTable/`, 상태 관리

**책임**:
- `useToleranceCalc` 훅으로 계산 엔진과 UI 연결
- 부품 행 추가/삭제/순서변경 (drag & drop은 v2)
- 상태 관리: `useState` + `useReducer` (외부 라이브러리 없음)
- CSV import 시 기존 데이터 replace (append 아님) — 사용자 확인 모달 필수

**입력 데이터 타입**:
```typescript
interface TolerancePart {
  id: string;
  name: string;           // 부품명/치수명
  nominal: number;        // 공칭값 (mm)
  upperTol: number;       // +공차 (양수)
  lowerTol: number;       // -공차 (양수로 입력, 내부에서 음수 처리)
  distribution: 'normal' | 'uniform';
  cpk: number;            // 공정능력지수 (기본값: 1.33)
  enabled: boolean;       // 계산 포함 여부 토글
}
```

---

### 🗄️ [AGENT: Backend / 데이터]
**담당**: `src/agents/csvHandler/`, `src/utils/`

**책임**:
- CSV import: Papa Parse 사용, 헤더 자동 매핑
- CSV export: 계산 결과 포함한 전체 데이터 내보내기
- 로컬 스토리지: 마지막 입력 데이터 자동 저장 (key: `tsa_last_session`)
- 입력값 검증: nominal 필수, 공차 0 이상, Cpk 0.5~2.0 범위

**CSV 형식 (import/export 공통)**:
```
부품명,공칭값,+공차,-공차,분포,Cpk
하우징 폭,50.000,0.050,0.050,normal,1.33
```

---

## 공통 규칙 (모든 Agent 적용)

### 코딩 컨벤션
- TypeScript strict mode 활성화
- `any` 타입 사용 금지
- 함수형 컴포넌트만 사용 (class component 금지)
- 파일당 단일 책임 원칙

### 계산 정밀도
- 내부 계산: JavaScript `number` (64-bit float, 15자리 유효숫자)
- 표시: `toFixed(4)` — 0.0001mm 분해능
- Monte Carlo 샘플 수: 기본 10,000회 (설정 변경 가능, 최대 100,000)

### 에러 처리
- 빈 입력값 → 계산 스킵 (에러 throw 금지)
- 공차 합계 0 → "유효한 공차값을 입력하세요" 표시
- CSV 파싱 실패 → 행 단위 스킵 + 실패 행 수 toast 알림

### 테스트
- 계산 엔진 함수는 단위 테스트 필수
- 테스트 케이스: 단일 부품, 다중 부품, 비대칭 공차, Cpk 변화

---

## 개발 명령어

```bash
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드
npm run test         # Vitest 단위 테스트
npm run typecheck    # tsc --noEmit
```

## v2 로드맵 (현재 범위 외)

- [ ] Creo BOM CSV 직접 import 매핑
- [ ] ECN(변경 요청서) 자동 초안 생성
- [ ] 감도 분석 기반 공차 최적화 제안
- [ ] 부품 행 drag & drop 순서 변경
- [ ] 다국어 지원 (영어)
