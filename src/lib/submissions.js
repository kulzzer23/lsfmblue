import { config } from '../config.js';

function normalizeSubmission(submission) {
  const responses = Array.isArray(submission.responses)
    ? submission.responses
    : Array.isArray(submission.breakdown)
      ? submission.breakdown.map((item) => ({
          questionId: item.questionId ?? item.label ?? item.title ?? '',
          title: item.label ?? item.title ?? item.questionId ?? '',
          prompt: item.prompt ?? '',
          answer: item.answer ?? '',
        }))
      : submission.answers && typeof submission.answers === 'object'
        ? Object.entries(submission.answers).map(([questionId, answer]) => ({
            questionId,
            title: questionId,
            prompt: '',
            answer: Array.isArray(answer) ? answer.join(', ') : String(answer ?? ''),
          }))
        : [];

  const answers =
    submission.answers && typeof submission.answers === 'object'
      ? submission.answers
      : responses.reduce((accumulator, response) => {
          accumulator[response.questionId] = response.answer;
          return accumulator;
        }, {});

  const breakdown = Array.isArray(submission.breakdown)
    ? submission.breakdown
    : responses.map((response) => {
        const answer = String(response.answer ?? '').trim();
        return {
          questionId: response.questionId,
          label: response.title ?? response.questionId,
          score: answer ? 1 : 0,
          maxScore: 1,
          note: answer ? 'Ответ сохранен' : 'Нет ответа',
          answer: response.answer ?? '',
        };
      });

  const score = typeof submission.score === 'number' ? submission.score : responses.filter((response) => String(response.answer ?? '').trim()).length;
  const maxScore = typeof submission.maxScore === 'number' ? submission.maxScore : responses.length;

  return {
    ...submission,
    score,
    maxScore,
    answers,
    breakdown,
    responses,
    reviewStatus: submission.reviewStatus ?? 'unchecked',
    reviewedAt: submission.reviewedAt ?? null,
    reviewedBy: submission.reviewedBy ?? null,
  };
}

function fromRow(row) {
  return normalizeSubmission({
    id: row.id,
    name: row.name,
    squad: row.squad,
    contact: row.contact,
    submittedAt: row.submitted_at,
    score: row.score,
    maxScore: row.max_score,
    answers: row.answers,
    breakdown: row.breakdown,
    responses: row.responses,
    reviewStatus: row.review_status ?? 'unchecked',
    reviewedAt: row.reviewed_at ?? null,
    reviewedBy: row.reviewed_by ?? null,
  });
}

function toRow(submission) {
  return {
    id: submission.id,
    name: submission.name,
    squad: submission.squad,
    contact: submission.contact,
    submitted_at: submission.submittedAt,
    score: submission.score,
    max_score: submission.maxScore,
    answers: submission.answers,
    breakdown: submission.breakdown,
    review_status: submission.reviewStatus ?? 'unchecked',
    reviewed_at: submission.reviewedAt ?? null,
    reviewed_by: submission.reviewedBy ?? null,
  };
}

function isConfigured() {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}

function createHeaders() {
  return {
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${config.supabaseAnonKey}`,
    'Content-Type': 'application/json',
  };
}

async function fetchRows(path, init) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...createHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return [];
  }

  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

export function createSubmissionStore() {
  return {
    async load() {
      if (!isConfigured()) {
        return [];
      }

      const rows = await fetchRows(`${config.supabaseTable}?select=*&order=submitted_at.desc`, {
        method: 'GET',
      });
      return rows.map(fromRow);
    },

    async save(submission, currentSubmissions) {
      const nextSubmissions = [normalizeSubmission(submission), ...currentSubmissions.map(normalizeSubmission)];

      if (!isConfigured()) {
        throw new Error('Supabase is not configured');
      }

      await fetchRows(config.supabaseTable, {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(toRow(submission)),
      });

      return nextSubmissions;
    },

    async updateReview(submissionId, reviewStatus, reviewedBy, currentSubmissions) {
      const reviewedAt = new Date().toISOString();
      const nextSubmissions = currentSubmissions.map((submission) =>
        submission.id === submissionId ? { ...submission, reviewStatus, reviewedAt, reviewedBy } : submission,
      );

      if (!isConfigured()) {
        throw new Error('Supabase is not configured');
      }

      await fetchRows(`${config.supabaseTable}?id=eq.${encodeURIComponent(submissionId)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          review_status: reviewStatus,
          reviewed_at: reviewedAt,
          reviewed_by: reviewedBy,
        }),
      });

      return nextSubmissions;
    },
  };
}

export function normalizeSubmissionRecord(submission) {
  return normalizeSubmission(submission);
}
