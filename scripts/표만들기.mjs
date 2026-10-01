// ─────────────────────────────────────────────────────────────
// 🏗️  조사 결과 보관함 만들기 (한 번만 실행)
//
//   실행:  node --env-file=.env.local scripts/표만들기.mjs
//
//   💰 돈 주고 얻은 조사 결과를 저장해 둡니다.
//      같은 단어를 다시 조사하면 AI를 안 부르고 여기서 꺼냅니다. (0원)
//
//   여러 번 돌려도 안전합니다 (IF NOT EXISTS).
// ─────────────────────────────────────────────────────────────

import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

await db.execute(`
  CREATE TABLE IF NOT EXISTS researches (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    word       TEXT NOT NULL,              -- 조사한 표현
    region     TEXT NOT NULL,              -- 목표 지역 (중립/멕시코/...)
    plan       TEXT,                       -- 📋 세운 계획
    steps      TEXT,                       -- 🔁 도구 사용 기록 (JSON)
    reflection TEXT,                       -- 🔍 점검 의견
    report     TEXT NOT NULL,              -- 📄 최종 보고서
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (word, region)                  -- 🔒 같은 표현+지역은 하나만
  )
`);
console.log("  ✓ researches");

await db.execute(
  `CREATE INDEX IF NOT EXISTS idx_researches_word ON researches(word)`,
);
console.log("  ✓ idx_researches_word");

const 확인 = await db.execute(
  `select name from sqlite_master
    where type='table' and name not like 'sqlite_%' order by name`,
);
console.log("\n현재 표:", 확인.rows.map((r) => r.name).join(", "));
