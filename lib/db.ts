// ─────────────────────────────────────────────────────────────
// 🔌 용어집 데이터베이스 연결 (Turso)
//
// 5주차에서 만든 glosario 를 그대로 봅니다.
// 연결은 '실제로 쓸 때' 만듭니다. 그래야 값이 없어도 배포가 실패하지 않습니다.
// ─────────────────────────────────────────────────────────────

import {
  createClient,
  type Client,
  type InStatement,
  type ResultSet,
} from "@libsql/client";

let 연결: Client | null = null;

function 값정리(값: string) {
  return 값.trim().replace(/^["']|["']$/g, "");
}

export function getDb(): Client {
  if (연결) return 연결;

  const url = 값정리(process.env.TURSO_DATABASE_URL ?? "");
  const authToken = 값정리(process.env.TURSO_AUTH_TOKEN ?? "");

  if (!url) {
    throw new Error(
      "TURSO_DATABASE_URL 이 비어 있습니다. .env.local 을 확인해 주세요.",
    );
  }
  if (!/^(libsql|https?|wss?):\/\//.test(url)) {
    throw new Error(
      `TURSO_DATABASE_URL 형식이 이상합니다. libsql:// 로 시작해야 합니다.`,
    );
  }

  연결 = createClient({ url, authToken });
  return 연결;
}

export const db = {
  execute: (명령: InStatement): Promise<ResultSet> => getDb().execute(명령),
};
