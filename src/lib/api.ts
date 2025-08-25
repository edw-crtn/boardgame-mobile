// src/lib/api.ts
import { Table, TableDetail } from "./types";

// ⚙️ RÉGLER L’URL DE TON BACKEND
// - Android Emulator: http://10.0.2.2:3000
// - iOS Simulator:    http://localhost:3000
// - Appareil réel (Expo Go): http://<IP_DE_TA_MACHINE>:3000
export const BASE_URL = "http://192.168.178.113:3000";


// --- Normalisation des erreurs ---
const ERROR_MAP: Record<string, string> = {
  INVALID_BODY: "Données invalides.",
  USER_NOT_FOUND: "Utilisateur introuvable.",
  WRONG_PASSWORD: "Mot de passe incorrect.",
  USERNAME_TAKEN: "Ce nom d’utilisateur est déjà utilisé.",
  USER_EXISTS: "Ce nom d’utilisateur est déjà utilisé.",
  UNAUTHORIZED: "Accès refusé. Connecte-toi.",
  SERVER_ERROR: "Erreur serveur.",
};

function normalizeError(payload: any): string {
  const raw = payload?.error || payload?.code || payload?.message;
  if (typeof raw === "string" && ERROR_MAP[raw]) return ERROR_MAP[raw];
  if (typeof raw === "string" && /^[A-Z0-9_]+$/.test(raw)) return "Une erreur est survenue.";
  return typeof raw === "string" ? raw : "Une erreur est survenue.";
}

async function handle(res: Response) {
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(normalizeError(data));
  return data;
}

function headers(token?: string, json = true): HeadersInit {
  const h: Record<string, string> = {};
  if (json) h["Content-Type"] = "application/json";
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

function qs(params: Record<string, any>) {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) v.forEach((x) => s.append(k, String(x)));
    else s.set(k, String(v));
  });
  const str = s.toString();
  return str ? `?${str}` : "";
}

// --- AUTH ---
async function login(username: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/mobile/auth/login`, {
    method: "POST",
    headers: headers(undefined, true),
    body: JSON.stringify({ username, password }),
  });
  return handle(res) as Promise<{ ok: true; token: string; user: { id: number; username: string } }>;
}

async function register(username: string, password: string, confirm: string) {
  const res = await fetch(`${BASE_URL}/api/mobile/auth/register`, {
    method: "POST",
    headers: headers(undefined, true),
    body: JSON.stringify({ username, password, confirm }),
  });
  return handle(res) as Promise<{ ok: true; token: string; user: { id: number; username: string } }>;
}

// --- TABLES ---
async function listTables(token: string) {
  const res = await fetch(`${BASE_URL}/api/mobile/tables`, {
    headers: headers(token, false),
  });
  return handle(res) as Promise<{ ok: true; tables: Table[] }>;
}

async function createTable(token: string, name: string, description?: string) {
  const res = await fetch(`${BASE_URL}/api/mobile/tables`, {
    method: "POST",
    headers: headers(token, true),
    body: JSON.stringify({ name, description }),
  });
  return handle(res) as Promise<{ ok: true; table: Table }>;
}

async function tableDetail(token: string, tableId: number) {
  const res = await fetch(`${BASE_URL}/api/mobile/tables/${tableId}`, {
    headers: headers(token, false),
  });
  return handle(res) as Promise<TableDetail>;
}

async function editTable(token: string, tableId: number, name: string, description?: string) {
  const res = await fetch(`${BASE_URL}/api/mobile/tables/${tableId}/edit`, {
    method: "POST",
    headers: headers(token, true),
    body: JSON.stringify({ name, description }),
  });
  return handle(res) as Promise<{ ok: true }>;
}

// --- MESSAGES ---
async function postMessage(token: string, tableId: number, content: string) {
  const res = await fetch(`${BASE_URL}/api/mobile/tables/${tableId}/messages`, {
    method: "POST",
    headers: headers(token, true),
    body: JSON.stringify({ content }),
  });
  return handle(res) as Promise<{ ok: true }>;
}

// --- MEMBRES ---
async function addMember(token: string, tableId: number, username: string) {
  const res = await fetch(`${BASE_URL}/api/mobile/tables/${tableId}/members`, {
    method: "POST",
    headers: headers(token, true),
    body: JSON.stringify({ username }),
  });
  return handle(res) as Promise<{ ok: true }>;
}

async function removeMember(token: string, tableId: number, userId: number) {
  const res = await fetch(`${BASE_URL}/api/mobile/tables/${tableId}/members/${userId}/delete`, {
    method: "POST",
    headers: headers(token, true),
    body: JSON.stringify({}),
  });
  return handle(res) as Promise<{ ok: true }>;
}

// --- SONDAGES ---
async function createPoll(token: string, tableId: number, question: string, options: string[]) {
  const res = await fetch(`${BASE_URL}/api/mobile/tables/${tableId}/polls`, {
    method: "POST",
    headers: headers(token, true),
    body: JSON.stringify({ question, options }),
  });
  return handle(res) as Promise<{ ok: true }>;
}

async function votePoll(token: string, tableId: number, pollId: number, option: string[]) {
  const res = await fetch(`${BASE_URL}/api/mobile/tables/${tableId}/polls/${pollId}/vote`, {
    method: "POST",
    headers: headers(token, true),
    body: JSON.stringify({ option }),
  });
  return handle(res) as Promise<{ ok: true }>;
}

async function addPollOption(token: string, tableId: number, pollId: number, option: string) {
  const res = await fetch(`${BASE_URL}/api/mobile/tables/${tableId}/polls/${pollId}/add-option`, {
    method: "POST",
    headers: headers(token, true),
    body: JSON.stringify({ option }),
  });
  return handle(res) as Promise<{ ok: true }>;
}

async function deletePoll(token: string, tableId: number, pollId: number) {
  const res = await fetch(`${BASE_URL}/api/mobile/tables/${tableId}/polls/${pollId}/delete`, {
    method: "POST",
    headers: headers(token, true),
    body: JSON.stringify({}),
  });
  return handle(res) as Promise<{ ok: true }>;
}

// --- ÉVÉNEMENTS ---
async function createEvent(token: string, tableId: number, day: string, time: string, location?: string) {
  const res = await fetch(`${BASE_URL}/api/mobile/tables/${tableId}/events`, {
    method: "POST",
    headers: headers(token, true),
    body: JSON.stringify({ day, time, location }),
  });
  return handle(res) as Promise<{ ok: true }>;
}

async function editEvent(
  token: string,
  tableId: number,
  eventId: number,
  day: string,
  time: string,
  location?: string
) {
  const res = await fetch(`${BASE_URL}/api/mobile/tables/${tableId}/events/${eventId}/edit`, {
    method: "POST",
    headers: headers(token, true),
    body: JSON.stringify({ day, time, location }),
  });
  return handle(res) as Promise<{ ok: true }>;
}

async function deleteEvent(token: string, tableId: number, eventId: number) {
  const res = await fetch(`${BASE_URL}/api/mobile/tables/${tableId}/events/${eventId}/delete`, {
    method: "POST",
    headers: headers(token, true),
    body: JSON.stringify({}),
  });
  return handle(res) as Promise<{ ok: true }>;
}

// --- RECHERCHE JOUEURS ---
async function listPlayerCities(token: string) {
  const res = await fetch(`${BASE_URL}/api/mobile/players/cities`, {
    headers: headers(token, false),
  });
  return handle(res) as Promise<{ ok: true; cities: { city: string; count: number }[] }>;
}

async function searchPlayers(
  token: string,
  q?: string,
  city?: string,
  limit: number = 50,
  excludeTableId?: number
) {
  const res = await fetch(
    `${BASE_URL}/api/mobile/players${qs({ q, city, limit, excludeTableId })}`,
    { headers: headers(token, false) }
  );
  return handle(res) as Promise<{ ok: true; users: Array<{ id: number; username: string; city?: string; description?: string }> }>;
}

// --- PROFIL ---
async function getMyProfile(token: string) {
  const res = await fetch(`${BASE_URL}/api/mobile/profile`, {
    headers: headers(token, false),
  });
  return handle(res) as Promise<{ ok: true; user: { id: number; username: string; city?: string; favoriteGames?: string; description?: string } }>;
}

async function updateMyProfile(token: string, data: {
  city?: string;
  favoriteGames?: string;
  description?: string;
}) {
  // ➜ même ressource que GET, mais en POST (conforme à ta route)
  const res = await fetch(`${BASE_URL}/api/mobile/profile`, {
    method: "POST",
    headers: headers(token, true), // réutilise ton helper
    body: JSON.stringify(data),
  });
  return handle(res);
}


async function createInviteTokenApi(token: string, tableId: number) {
  const res = await fetch(`${BASE_URL}/api/mobile/tables/${tableId}/invite/create`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res) as Promise<{ ok: true; token: string; expiresAt: string }>;
}

async function redeemInviteApi(token: string, inviteToken: string) {
  const res = await fetch(`${BASE_URL}/api/mobile/invite/redeem`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ token: inviteToken }),
  });
  return handle(res) as Promise<{ ok: true; tableId: number; joined: boolean }>;
}


// Export API
export const api = {
  // auth
  login,
  register,
  // alias (au cas où ton useAuth appelle encore mobileLogin)
  mobileLogin: login,
  mobileRegister: register,

  // tables
  listTables,
  createTable,
  tableDetail,
  editTable,

  // messages
  postMessage,

  // members
  addMember,
  removeMember,

  // polls
  createPoll,
  votePoll,
  addPollOption,
  deletePoll,

  // events
  createEvent,
  editEvent,
  deleteEvent,

  // players
  listPlayerCities,
  searchPlayers,

  // profile
  getMyProfile,
  updateMyProfile,

  //QR
  createInviteToken: createInviteTokenApi,
  redeemInvite: redeemInviteApi,
};
