import { BASE_URL } from "./config";
import { LoginSuccess, Table, TableDetail } from "./types";

async function asJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}
  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  return data as T;
}

export const api = {
  async login(username: string, password: string) {
    const res = await fetch(`${BASE_URL}/api/mobile/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    return asJson<LoginSuccess>(res);
  },

  async votePoll(token: string, tableId: number, pollId: number, options: string[]) {
    const res = await fetch(`${BASE_URL}/api/mobile/tables/${tableId}/polls/${pollId}/vote`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ option: options }), // multi-choix
    });
    return asJson<{ ok: true }>(res);
  },

  async me(token: string) {
    const res = await fetch(`${BASE_URL}/api/mobile/me`, {
      headers: { authorization: `Bearer ${token}` },
    });
    return asJson<{ ok: true; user: LoginSuccess["user"] }>(res);
  },

  async listTables(token: string) {
    const res = await fetch(`${BASE_URL}/api/mobile/tables`, {
      headers: { authorization: `Bearer ${token}` },
    });
    return asJson<{ ok: true; tables: Table[] }>(res);
  },

  async tableDetail(token: string, tableId: number) {
    const res = await fetch(`${BASE_URL}/api/mobile/tables/${tableId}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    return asJson<TableDetail>(res);
  },

  async postMessage(token: string, tableId: number, content: string) {
    const res = await fetch(`${BASE_URL}/api/mobile/tables/${tableId}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    });
    return asJson<{ ok: true; message: { id: number } }>(res);
  },

  async createTable(token: string, name: string, description?: string) {
  const res = await fetch(`${BASE_URL}/api/mobile/tables`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, description }),
  });
  return asJson<{ ok: true; table: { id: number; name: string; description: string | null; ownerId: number } }>(res);
},

};
