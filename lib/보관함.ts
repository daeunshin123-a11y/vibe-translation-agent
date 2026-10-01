// ─────────────────────────────────────────────────────────────
// 💾 조사 결과 보관함 (캐시)
//
// 💰 돈 주고 얻은 조사 결과를 버리지 않습니다.
//    같은 표현을 다시 조사하면 AI를 안 부르고 여기서 꺼냅니다. (0원)
//
// 발표 전에 미리 몇 개 조사해두면, 당일엔 0원으로 시연할 수 있습니다.
// ─────────────────────────────────────────────────────────────

import { db } from "./db";

export type 보관된조사 = {
  단어: string;
  지역: string;
  계획: string;
  단계들: { 이름: string; 입력: string; 요약: string }[];
  점검: string;
  보고서: string;
  저장시각: string;
};

export async function 꺼내기(
  단어: string,
  지역: string,
): Promise<보관된조사 | null> {
  const 결과 = await db.execute({
    sql: `select word, region, plan, steps, reflection, report, created_at
            from researches
           where word = ? and region = ?`,
    args: [단어.trim(), 지역],
  });

  const 줄 = 결과.rows[0];
  if (!줄) return null;

  let 단계들: 보관된조사["단계들"] = [];
  try {
    단계들 = JSON.parse(String(줄.steps ?? "[]"));
  } catch {
    /* 저장이 깨져 있어도 보고서는 보여줍니다 */
  }

  return {
    단어: String(줄.word),
    지역: String(줄.region),
    계획: String(줄.plan ?? ""),
    단계들,
    점검: String(줄.reflection ?? ""),
    보고서: String(줄.report ?? ""),
    저장시각: String(줄.created_at ?? ""),
  };
}

export async function 담기(조사: Omit<보관된조사, "저장시각">) {
  await db.execute({
    sql: `insert into researches (word, region, plan, steps, reflection, report)
          values (?, ?, ?, ?, ?, ?)
          on conflict(word, region) do update set
            plan       = excluded.plan,
            steps      = excluded.steps,
            reflection = excluded.reflection,
            report     = excluded.report,
            created_at = datetime('now')`,
    args: [
      조사.단어.trim(),
      조사.지역,
      조사.계획,
      JSON.stringify(조사.단계들),
      조사.점검,
      조사.보고서,
    ],
  });
}
