const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const USER_NAME = 'Harsha A';

async function guildRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('X-User-Name', USER_NAME);
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

export async function askQuestion(question: string): Promise<string> {
  const res = await fetch(`${API_BASE}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    let errorMsg = 'Failed to get answer';
    try {
      const errData = await res.json();
      if (errData.detail) errorMsg = errData.detail;
    } catch {
      // Ignore json parse error
    }
    throw new Error(errorMsg);
  }
  const data = await res.json();
  return data.answer;
}

export interface RoadmapDayData {
  day_number: number;
  title: string;
  learning_objectives: string[];
  key_concepts: string[];
  study_content: string;
}

export interface CreateGuildRoadmapResult {
  guild_name: string;
  topic: string;
  days: RoadmapDayData[];
}

export interface GuildData {
  id: string;
  name: string;
  topic: string;
  creator: string;
  member_count: number;
  days: RoadmapDayData[];
  current_day: number;
  unlocked_day: number;
  user_xp: number;
  completed_days: number[];
  is_member: boolean;
}

export async function createGuild(
  guildName: string,
  topic: string,
  notesText: string,
  durationDays: number,
  file?: File
): Promise<GuildData> {
  const formData = new FormData();
  formData.append('guild_name', guildName);
  formData.append('topic', topic);
  formData.append('notes_text', notesText);
  formData.append('duration_days', String(durationDays));
  if (file) formData.append('files', file, file.name);

  const res = await guildRequest('/guilds', { method: 'POST', body: formData });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to create guild');
  }
  return res.json();
}

export async function listGuilds(): Promise<GuildData[]> {
  const res = await guildRequest('/guilds');
  if (!res.ok) throw new Error('Failed to load guilds');
  return res.json();
}

export async function joinGuild(guildId: string): Promise<GuildData> {
  const res = await guildRequest(`/guilds/${guildId}/join`, { method: 'POST' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to join guild');
  }
  return res.json();
}

export async function createGuildRoadmap(
  guildName: string,
  topic: string,
  notesText: string = '',
  durationDays: number = 5
): Promise<CreateGuildRoadmapResult> {
  const res = await fetch(`${API_BASE}/guilds/create-roadmap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guild_name: guildName,
      topic,
      notes_text: notesText,
      duration_days: durationDays,
    }),
  });

  if (!res.ok) {
    let errorMsg = 'Failed to generate guild roadmap';
    try {
      const errData = await res.json();
      if (errData.detail) errorMsg = errData.detail;
    } catch {}
    throw new Error(errorMsg);
  }
  return res.json();
}

export interface QuizQuestionData {
  id: number;
  question: string;
  options: string[];
  correct_idx: number;
  difficulty: 'easy' | 'hard';
  xp: number;
  concept_tag: string;
  explanation: string;
}

export interface GenerateGuildQuizResult {
  topic: string;
  day_number: number;
  questions: QuizQuestionData[];
}

export async function generateGuildQuiz(
  guildId: string,
  dayNumber: number
): Promise<GenerateGuildQuizResult> {
  const res = await guildRequest(`/guilds/${guildId}/day/${dayNumber}/quiz/generate`, { method: 'POST' });

  if (!res.ok) {
    let errorMsg = 'Failed to generate guild quiz';
    try {
      const errData = await res.json();
      if (errData.detail) errorMsg = errData.detail;
    } catch {}
    throw new Error(errorMsg);
  }
  return res.json();
}

export interface SubmitQuizResult {
  guild: GuildData;
  score_percent: number;
  earned_xp: number;
  passed: boolean;
  missed_questions: MissedQuestionDetailData[];
}

export async function submitGuildQuiz(
  guildId: string,
  dayNumber: number,
  answers: Array<number | null>
): Promise<SubmitQuizResult> {
  const res = await guildRequest(`/guilds/${guildId}/day/${dayNumber}/quiz/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ day_number: dayNumber, answers }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to submit quiz');
  }
  return res.json();
}

export interface LeaderboardEntryData {
  rank: number;
  name: string;
  daily_xp: number;
  total_xp: number;
  passed: boolean;
  score_percent: number;
  is_current_user: boolean;
  xp?: number;
}

export async function getDailyLeaderboard(guildId: string, dayNumber: number): Promise<LeaderboardEntryData[]> {
  const res = await guildRequest(`/guilds/${guildId}/day/${dayNumber}/leaderboard`);
  if (!res.ok) throw new Error('Failed to load daily leaderboard');
  return res.json();
}

export async function getFinalLeaderboard(guildId: string): Promise<LeaderboardEntryData[]> {
  const res = await guildRequest(`/guilds/${guildId}/leaderboard/final`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to load final leaderboard');
  }
  return res.json();
}

export interface MissedQuestionDetailData {
  question: string;
  chosen_answer: string;
  correct_answer: string;
  concept_tag: string;
}

export interface ConceptAnalysisData {
  concept: string;
  reason_for_mistake: string;
  suggested_review: string;
}

export interface AnalyzeMistakesResult {
  topic: string;
  day_number: number;
  analyses: ConceptAnalysisData[];
  overall_suggestions: string[];
}

export async function analyzeQuizMistakes(
  topic: string,
  dayNumber: number,
  missedQuestions: MissedQuestionDetailData[]
): Promise<AnalyzeMistakesResult> {
  const res = await fetch(`${API_BASE}/guilds/analyze-mistakes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      day_number: dayNumber,
      missed_questions: missedQuestions,
    }),
  });

  if (!res.ok) {
    let errorMsg = 'Failed to analyze quiz mistakes';
    try {
      const errData = await res.json();
      if (errData.detail) errorMsg = errData.detail;
    } catch {}
    throw new Error(errorMsg);
  }
  return res.json();
}
