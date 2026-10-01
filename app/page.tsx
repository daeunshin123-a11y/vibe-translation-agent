"use client";

import { useRef, useState } from "react";
import { 지역목록 } from "@/lib/지역";

const 용어집주소 = "https://vibe-glossary-ko-es.vercel.app";

type 도구단계 = { 이름: string; 입력: string; 요약: string };

const 예시 = ["내로남불", "no manches", "국뽕", "che boludo"];

export default function Home() {
  const [질문, 질문설정] = useState("");
  const [지역, 지역설정] = useState<string>("중립");

  const [도는중, 도는중설정] = useState(false);
  const [상태, 상태설정] = useState("");
  const [계획, 계획설정] = useState("");
  const [단계들, 단계들설정] = useState<도구단계[]>([]);
  const [점검, 점검설정] = useState("");
  const [보고서, 보고서설정] = useState("");
  const [통계, 통계설정] = useState<{
    용어집검색: number;
    웹검색: number;
    단계수: number;
    캐시?: boolean;
  } | null>(null);
  const [오류, 오류설정] = useState("");
  const [보관됨, 보관됨설정] = useState("");
  // 📌 보고서에서 뽑아낸 '용어집에 바로 등록할 값'
  const [등록감, 등록감설정] = useState<{
    번역: string;
    지역: string;
    이유: string;
  } | null>(null); // 저장해둔 결과를 꺼내 쓴 경우 그 시각

  const 조사한말 = useRef("");

  async function 조사시작(글: string, 다시조사 = false) {
    const 다듬은글 = 글.trim();
    if (!다듬은글 || 도는중) return;

    // 초기화
    도는중설정(true);
    상태설정("시작하는 중...");
    계획설정("");
    단계들설정([]);
    점검설정("");
    보고서설정("");
    통계설정(null);
    오류설정("");
    보관됨설정("");
    등록감설정(null);
    조사한말.current = 다듬은글;

    try {
      const 응답 = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 질문: 다듬은글, 지역, 다시조사 }),
      });
      if (!응답.ok || !응답.body) throw new Error(await 응답.text());

      const 읽기 = 응답.body.getReader();
      const 디코더 = new TextDecoder();
      let 남은줄 = "";

      while (true) {
        const { done, value } = await 읽기.read();
        if (done) break;
        남은줄 += 디코더.decode(value, { stream: true });

        const 줄들 = 남은줄.split("\n");
        남은줄 = 줄들.pop() ?? "";

        for (const 줄 of 줄들) {
          if (!줄.trim()) continue;
          let 소식: { 종류: string; 내용: unknown };
          try {
            소식 = JSON.parse(줄);
          } catch {
            continue;
          }

          if (소식.종류 === "상태") 상태설정(String(소식.내용));
          else if (소식.종류 === "보관됨") 보관됨설정(String(소식.내용));
          else if (소식.종류 === "등록감")
            등록감설정(소식.내용 as { 번역: string; 지역: string; 이유: string });
          else if (소식.종류 === "계획") 계획설정(String(소식.내용));
          else if (소식.종류 === "도구")
            단계들설정((이전) => [...이전, 소식.내용 as 도구단계]);
          else if (소식.종류 === "점검") 점검설정(String(소식.내용));
          else if (소식.종류 === "보고서")
            보고서설정((이전) => 이전 + String(소식.내용));
          else if (소식.종류 === "끝") {
            통계설정(소식.내용 as typeof 통계);
            상태설정("");
          } else if (소식.종류 === "오류") 오류설정(String(소식.내용));
        }
      }
    } catch (e) {
      오류설정(e instanceof Error ? e.message : "조사에 실패했습니다.");
    } finally {
      도는중설정(false);
      상태설정("");
    }
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <header className="text-center">
          <p className="text-2xl">🔍</p>
          <h1 className="mt-1 text-3xl font-bold text-[var(--테라코타)]">
            번역 리서치 에이전트
          </h1>
          <p className="mt-2 text-sm text-[var(--연한글자)]">
            용어집에 없는 표현을 스스로 조사하고, 어느 지역 말인지까지 확인합니다
          </p>
        </header>

        {/* ── 입력 ── */}
        <div className="mt-8 rounded-2xl border-2 border-[var(--테두리)] bg-[var(--종이)] p-6">
          <label className="block text-sm font-medium text-[var(--먹색)]">
            조사할 표현
          </label>
          <input
            value={질문}
            onChange={(e) => 질문설정(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") 조사시작(질문);
            }}
            placeholder="내로남불  ·  no manches"
            disabled={도는중}
            className="mt-1 w-full rounded-xl border-2 border-[var(--테두리)] px-4 py-3 focus:border-[var(--테라코타)] focus:outline-none disabled:opacity-60"
          />

          <label className="mt-4 block text-sm font-medium text-[var(--먹색)]">
            🌎 목표 지역
          </label>
          <div className="mt-1 flex flex-wrap gap-2">
            {지역목록.map((항목) => (
              <button
                key={항목.값}
                type="button"
                onClick={() => 지역설정(항목.값)}
                disabled={도는중}
                title={항목.설명}
                className={`rounded-full border-2 px-3 py-1.5 text-sm transition disabled:opacity-60 ${
                  지역 === 항목.값
                    ? "border-[var(--테라코타)] bg-[var(--테라코타)] text-white"
                    : "border-[var(--테두리)] text-[var(--연한글자)] hover:border-[var(--테라코타)]"
                }`}
              >
                {항목.이모지} {항목.이름}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => 조사시작(질문)}
            disabled={도는중 || !질문.trim()}
            className="mt-5 w-full rounded-xl bg-[var(--테라코타)] px-4 py-3.5 font-semibold text-white transition hover:bg-[var(--테라코타진)] disabled:bg-[var(--테두리)] disabled:text-[var(--연한글자)]"
          >
            {도는중 ? "조사하는 중..." : "🔍 조사 시작"}
          </button>

          <p className="mt-2 text-center text-xs text-[var(--연한글자)]">
            💰 한 번 조사에 AI를 5~15번 부릅니다. 무료 한도를 아껴 쓰세요.
          </p>

          {!도는중 && !보고서 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {예시.map((말) => (
                <button
                  key={말}
                  type="button"
                  onClick={() => 질문설정(말)}
                  className="rounded-full border-2 border-[var(--테두리)] bg-[var(--크림)] px-3 py-1 text-xs text-[var(--연한글자)] hover:border-[var(--테라코타)]"
                >
                  {말}
                </button>
              ))}
            </div>
          )}
        </div>

        {오류 && (
          <p className="mt-4 whitespace-pre-wrap rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            ❌ {오류}
          </p>
        )}

        {/* ── 생각하는 과정 ── */}
        {(도는중 || 계획 || 보고서) && (
          <section className="mt-6 space-y-4">
            {보관됨 && (
              <div className="떠오름 rounded-2xl border-2 border-green-300 bg-green-50 px-5 py-3">
                <p className="text-sm text-green-900">
                  ♻️ <strong>저장해둔 결과입니다 (0원)</strong> — 전에 조사한
                  내용을 그대로 보여드려요.
                </p>
                <button
                  type="button"
                  onClick={() => 조사시작(조사한말.current, true)}
                  disabled={도는중}
                  className="mt-2 rounded-lg border-2 border-green-300 bg-white px-3 py-1.5 text-xs text-green-900 hover:border-green-500 disabled:opacity-50"
                >
                  🔄 새로 조사하기 (💰 AI 호출)
                </button>
              </div>
            )}

            {상태 && (
              <div className="떠오름 rounded-2xl border-2 border-[var(--테두리)] bg-[var(--종이)] px-5 py-3 text-[var(--연한글자)]">
                <span className="점">•</span>
                <span className="점">•</span>
                <span className="점">•</span>
                <span className="ml-2 text-sm">{상태}</span>
              </div>
            )}

            {계획 && (
              <div className="떠오름 rounded-2xl border-2 border-[var(--테두리)] bg-[var(--종이)] p-5">
                <p className="text-sm font-semibold text-[var(--테라코타)]">
                  📋 1. 계획 (Plan)
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--먹색)]">
                  {계획}
                </p>
              </div>
            )}

            {단계들.length > 0 && (
              <div className="떠오름 rounded-2xl border-2 border-[var(--테두리)] bg-[var(--종이)] p-5">
                <p className="text-sm font-semibold text-[var(--테라코타)]">
                  🔁 2. 조사 (ReAct)
                </p>
                <ul className="mt-2 space-y-2">
                  {단계들.map((단계, i) => (
                    <li key={i} className="text-sm text-[var(--먹색)]">
                      <span className="text-[var(--연한글자)]">
                        {단계.이름 === "웹검색" ? "🌐" : "📖"}{" "}
                        {단계.이름}
                      </span>{" "}
                      &ldquo;{단계.입력}&rdquo;
                      <span className="text-[var(--연한글자)]"> → {단계.요약}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {점검 && (
              <div className="떠오름 rounded-2xl border-2 border-[var(--테두리)] bg-[var(--종이)] p-5">
                <p className="text-sm font-semibold text-[var(--테라코타)]">
                  🔍 3. 점검 (Reflect)
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--먹색)]">
                  {점검}
                </p>
              </div>
            )}

            {보고서 && (
              <div className="떠오름 rounded-2xl border-2 border-[var(--머스터드)] bg-[var(--종이)] p-5">
                <p className="text-sm font-semibold text-[var(--머스터드)]">
                  📄 4. 보고서
                </p>
                <div className="mt-2 whitespace-pre-wrap text-[var(--먹색)]">
                  {보고서}
                </div>

                {!도는중 && (
                  <div className="mt-4">
                    <a
                      href={
                        `${용어집주소}/?add=${encodeURIComponent(조사한말.current)}` +
                        (등록감
                          ? `&draft=${encodeURIComponent(등록감.번역)}` +
                            `&region=${encodeURIComponent(등록감.지역)}` +
                            `&note=${encodeURIComponent(등록감.이유)}`
                          : "")
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block rounded-xl bg-[var(--머스터드)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      ＋ 용어집에 등록하기
                    </a>
                    {등록감 && (
                      <p className="mt-2 text-xs text-[var(--연한글자)]">
                        등록 폼에 미리 채워집니다 — {등록감.번역} · 🌎{" "}
                        {등록감.지역}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {통계 && (
              <p className="text-center text-xs text-[var(--연한글자)]">
                {통계.캐시 ? (
                  <>♻️ 저장해둔 결과 · AI 호출 0건 · 💰 0원</>
                ) : (
                  <>
                    📖 용어집 검색 {통계.용어집검색}회 · 🌐 웹 검색{" "}
                    {통계.웹검색}회 · 도구 사용 {통계.단계수}단계 · 💾 저장됨
                  </>
                )}
              </p>
            )}
          </section>
        )}

        <footer className="mt-10 text-center text-xs text-[var(--연한글자)]">
          바이브코딩 스터디 7주차 · Plan → ReAct → Reflect
        </footer>
      </div>
    </main>
  );
}
