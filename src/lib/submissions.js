import { config } from '../config.js';

function readLocalSubmissions() {
  try {
    const raw = window.localStorage.getItem(config.storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalSubmissions(submissions) {
  window.localStorage.setItem(config.storageKey, JSON.stringify(submissions));
}

function normalizeSubmission(submission) {
  return {
    reviewStatus: 'unchecked',
    reviewedAt: null,
    reviewedBy: null,
    ...submission,
  };
}

function fromRow(row) {
  return normalizeSubmission({
    id: row.id,
    name: row.name,
    squad: row.squad,
    contact: row.contact,
    submittedAt: row.submitted_at,
    responses: row.responses ?? [],
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
    responses: submission.responses,
    review_status: submission.reviewStatus,
    reviewed_at: submission.reviewedAt,
    reviewed_by: submission.reviewedBy,
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

  return response.json();
}

export function createSubmissionStore() {
  return {
    async load() {
      if (!isConfigured()) {
        return readLocalSubmissions().map(normalizeSubmission);
      }

      try {
        const rows = await fetchRows(
          `${config.supabaseTable}?select=*&order=submitted_at.desc`,
          { method: 'GET' },
        );
        const submissions = rows.map(fromRow);
        writeLocalSubmissions(submissions);
        return submissions;
      } catch {
        return readLocalSubmissions().map(normalizeSubmission);
      }
    },

    async save(submission, currentSubmissions) {
      const nextSubmissions = [normalizeSubmission(submission), ...currentSubmissions.map(normalizeSubmission)];

      if (!isConfigured()) {
        writeLocalSubmissions(nextSubmissions);
        return nextSubmissions;
      }

      try {
        await fetchRows(config.supabaseTable, {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify(toRow(submission)),
        });
      } catch {
        // fall back to local cache below
      }

      writeLocalSubmissions(nextSubmissions);
      return nextSubmissions;
    },

    async updateReview(submissionId, reviewStatus, reviewedBy, currentSubmissions) {
      const reviewedAt = new Date().toISOString();
      const nextSubmissions = currentSubmissions.map((submission) =>
        submission.id === submissionId
          ? { ...submission, reviewStatus, reviewedAt, reviewedBy }
          : submission,
      );

      if (!isConfigured()) {
        writeLocalSubmissions(nextSubmissions);
        return nextSubmissions;
      }

      try {
        await fetchRows(
          `${config.supabaseTable}?id=eq.${encodeURIComponent(submissionId)}`,
          {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({
              review_status: reviewStatus,
              reviewed_at: reviewedAt,
              reviewed_by: reviewedBy,
            }),
          },
        );
      } catch {
        // fall back to local cache below
      }

      writeLocalSubmissions(nextSubmissions);
      return nextSubmissions;
    },
  };
}

export function normalizeSubmissionRecord(submission) {
  return normalizeSubmission(submission);
}
