// ─────────────────────────────────────────────────────────────
// 🔧 에이전트의 도구들
//
// 지금까지(6주차)는 우리가 "검색해라" 하고 순서를 정해줬습니다.
// 이제는 도구 목록만 건네주고, AI가 언제 무엇을 쓸지 스스로 정합니다.
//
// 비유: 전에는 레시피대로 시켰다면, 이제는 주방을 통째로 맡기는 겁니다.
//
// 💰 용어집검색 = 0원 / 웹검색 = Tavily 크레딧 1건
// ─────────────────────────────────────────────────────────────

import { tool } from "ai";
import { z } from "zod";
import { tavily } from "@tavily/core";
import { db } from "./db";

// ── 도구를 몇 번 썼는지 세는 장치 ───────────────────
// 에이전트가 같은 도구를 무한정 부르지 못하게 막습니다.
export type 사용기록 = {
  용어집검색: number;
  웹검색: number;
  단계: { 이름: string; 입력: string; 요약: string }[];
};

export function 새기록(): 사용기록 {
  return { 용어집검색: 0, 웹검색: 0, 단계: [] };
}

export const 한도 = {
  웹검색: 4, // Tavily 크레딧 아끼기
  용어집검색: 5,
};

// ── 🔧 도구 ① 용어집 검색 (0원) ─────────────────────
function 용어집검색도구(기록: 사용기록) {
  return tool({
    description:
      "우리 팀 스페인어 번역 용어집에서 찾습니다. " +
      "한국어 단어로도, 스페인어 번역으로도 찾을 수 있습니다. " +
      "어떤 표현을 조사하든 가장 먼저 이 도구를 쓰세요.",
    inputSchema: z.object({
      단어: z.string().describe("찾을 한국어 단어 또는 스페인어 표현"),
    }),
    execute: async ({ 단어 }) => {
      if (기록.용어집검색 >= 한도.용어집검색) {
        return { 오류: `용어집 검색 한도(${한도.용어집검색}회)를 다 썼습니다.` };
      }
      기록.용어집검색 += 1;

      const 말 = 단어.trim();
      const 패턴 = `%${말}%`;

      const 결과 = await db.execute({
        sql: `
          select t.word        as 원문,
                 t.category    as 분류,
                 s.translation as 번역,
                 s.nickname    as 올린이,
                 s.note        as 이유,
                 s.region      as 지역,
                 (select count(*) from likes l
                   where l.suggestion_id = s.id) as 하트
            from terms t
            left join suggestions s on s.term_id = t.id
           where ? like '%' || t.word || '%'
              or t.word like ?
              or s.translation like ?
           order by (t.word = ?) desc, 하트 desc
           limit 20
        `,
        args: [말, 패턴, 패턴, 말],
      });

      const 찾은것 = 결과.rows
        .filter((줄) => 줄.번역 != null)
        .map((줄) => ({
          원문: String(줄.원문),
          번역: String(줄.번역),
          분류: 줄.분류 == null ? null : String(줄.분류),
          지역: 줄.지역 == null ? null : String(줄.지역),
          이유: 줄.이유 == null ? null : String(줄.이유),
          올린이: String(줄.올린이),
          하트: Number(줄.하트),
        }));

      기록.단계.push({
        이름: "용어집검색",
        입력: 말,
        요약: 찾은것.length ? `${찾은것.length}건 찾음` : "없음",
      });

      return 찾은것.length
        ? { 찾음: true, 결과: 찾은것 }
        : { 찾음: false, 안내: "용어집에 없습니다. 웹으로 조사해야 합니다." };
    },
  });
}

// ── 🔧 도구 ② 웹 검색 (Tavily, 크레딧 1건) ──────────
function 웹검색도구(기록: 사용기록) {
  return tool({
    description:
      "인터넷을 검색합니다. 표현의 뜻, 어느 나라에서 쓰는지, " +
      "중립 스페인어 대안을 찾을 때 씁니다. " +
      "한 번에 하나의 구체적인 질문만 검색하세요. " +
      `총 ${한도.웹검색}번까지만 쓸 수 있으니 아껴 쓰세요.`,
    inputSchema: z.object({
      검색어: z
        .string()
        .describe(
          "검색할 말. 예: '내로남불 뜻', 'no manches significado país', " +
            "'doble rasero uso América Latina'",
        ),
    }),
    execute: async ({ 검색어 }) => {
      if (기록.웹검색 >= 한도.웹검색) {
        return {
          오류: `웹 검색 한도(${한도.웹검색}회)를 다 썼습니다. 지금까지 모은 자료로 결론을 내세요.`,
        };
      }
      기록.웹검색 += 1;

      try {
        const 검색기 = tavily({
          apiKey: (process.env.TAVILY_API_KEY ?? "").trim(),
        });
        const 결과 = await 검색기.search(검색어, { maxResults: 4 });

        const 정리 = (결과.results ?? []).map((r) => ({
          제목: r.title,
          내용: String(r.content ?? "").slice(0, 500),
          출처: r.url,
        }));

        기록.단계.push({
          이름: "웹검색",
          입력: 검색어,
          요약: `${정리.length}건`,
        });

        return { 결과: 정리 };
      } catch (오류) {
        // 검색이 실패해도 에이전트가 멈추지 않게 합니다
        기록.단계.push({ 이름: "웹검색", 입력: 검색어, 요약: "실패" });
        return {
          오류:
            "웹 검색에 실패했습니다. " +
            "용어집 자료와 지금까지 모은 것만으로 답하세요.",
        };
      }
    },
  });
}

// ⚠️ 도구 이름은 반드시 영문이어야 합니다.
//    Gemini 가 한글 이름을 거부합니다 (Invalid function name).
//    화면에 보이는 이름은 한글 그대로 두고, AI에게 넘기는 이름만 영문으로 씁니다.
export function 도구만들기(기록: 사용기록) {
  return {
    search_glossary: 용어집검색도구(기록),
    search_web: 웹검색도구(기록),
  };
}
