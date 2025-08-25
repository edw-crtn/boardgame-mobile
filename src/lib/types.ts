export type User = {
  id: number;
  username: string;
  city?: string | null;
  favoriteGames?: string | null;
  description?: string | null;
};

export type Table = {
  id: number;
  name: string;
  description?: string | null;
  ownerId: number;
};

export type Message = {
  id: number;
  content: string;
  createdAt: string; // ISO
  user: { id: number; username: string };
};

export type EventRec = {
  id: number;
  date: string;
  location?: string | null;
  confirmed: number[];
};

export type PollWithResults = {
  id: number;
  question: string;
  options: string[];
  results: Record<string, number>; // option -> count
  myVotes: string[];                // mes choix
};

export type TableDetail = {
  table: Table;
  members: User[];
  messages: Message[];
  polls: PollWithResults[]; // <-- résultats inclus
  events: EventRec[];
};

export type LoginSuccess = {
  ok: true;
  token: string;
  expiresAt: string;
  user: User;
};
