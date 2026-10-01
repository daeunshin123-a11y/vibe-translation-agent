// ─────────────────────────────────────────────────────────────
// 💾 이미 얻은 조사 결과를 보관함에 넣기 (한 번만 실행)
//
//   실행:  node --env-file=.env.local scripts/결과담기.mjs
//
//   터미널에서 돌렸던 "no manches" 결과를 브라우저에서도 볼 수 있게
//   저장해 둡니다. 💰 돈은 이미 썼으니 버리지 않습니다.
// ─────────────────────────────────────────────────────────────

import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const 계획 = `1. 팀 내 기존 번역 용어집(Glossary) 검색 및 "no manches" 등재 여부 확인
2. "no manches"의 정확한 뜻과 뉘앙스, 비속어 수위 및 🌎주요 사용 국가/지역(지역색) 조사
3. 멕시코 지역색을 제거한 중립 스페인어 대안 표현(예: "no inventes", "no puede ser" 등) 탐색
4. 문맥별 한국어 대역어 정리 및 목표 지역(중립)에 적합한 최종 번역 가이드 도출하여 용어집 업데이트 제안`;

const 단계들 = [
  { 이름: "용어집검색", 입력: "no manches", 요약: "없음" },
  { 이름: "웹검색", 입력: "no manches significado pais de origen uso", 요약: "4건" },
  {
    이름: "웹검색",
    입력: "no manches sinónimos español neutro no inventes no puede ser",
    요약: "4건",
  },
];

const 점검 = "충분함";

const 보고서 = `**뜻·뉘앙스**
'말도 안 돼', '설마', '장난해?' 등을 의미하는 격식 없는 일상 구어 표현입니다.
비속어인 "¡No mames!"를 완곡하게 순화한 표현으로, 놀라움, 불신, 황당함 등의 감정을 나타냅니다.
*(팀 내 기존 용어집 검색 결과: 미등재)*

**🌎 지역**
멕시코 및 멕시코계 히스패닉 (타 라틴아메리카 및 스페인에서는 멕시코 고유 어휘로 인식)

**후보**
1. ¡No puede ser! — 중립(전 지역 통용) — 놀람이나 불신의 상황에 어울림
2. ¡No inventes! — 중립(전 지역 통용) — 장난, 거짓말, 황당함에 반응하는 일상 구어 상황에 어울림
3. ¡No me digas! — 중립(전 지역 통용) — 가벼운 놀람이나 감탄 상황에 어울림

**✅ 추천**
**¡No puede ser!**
멕시코 지역색을 배제하면서 '말도 안 돼'라는 의미를 전 스페인어권에서 가장 범용적으로 전달할 수 있기 때문입니다.

---
*점검 의견: 지적된 한계 사항 없음 (충분함)*`;

await db.execute({
  sql: `insert into researches (word, region, plan, steps, reflection, report)
        values (?, ?, ?, ?, ?, ?)
        on conflict(word, region) do update set
          plan = excluded.plan, steps = excluded.steps,
          reflection = excluded.reflection, report = excluded.report`,
  args: ["no manches", "중립", 계획, JSON.stringify(단계들), 점검, 보고서],
});

const 확인 = await db.execute(
  `select word, region, length(report) as 길이, created_at from researches`,
);
console.log("보관함 내용:");
for (const r of 확인.rows) {
  console.log(`  ♻️ ${r.word} (${r.region})  보고서 ${r.길이}자  ${r.created_at}`);
}
