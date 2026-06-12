import { config } from './config.js';
import { lessons } from './data/learning.js';
import { practiceQuestions } from './data/practice.js';
import { examQuestions } from './data/exam.js';
import { renderLearningSection } from './sections/learning.js';
import { renderPracticeResult, renderPracticeSection } from './sections/practice.js';
import { renderExamSection } from './sections/exam.js';
import { createSubmissionStore, normalizeSubmissionRecord } from './lib/submissions.js';

const store = createSubmissionStore();

function createBlankAnswers(questions) {
  return questions.reduce((accumulator, question) => {
    accumulator[question.id] = question.kind === 'multi' ? [] : '';
    return accumulator;
  }, {});
}

function normalize(text) {
  return String(text).trim().toLowerCase();
}

function scorePracticeQuestion(question, answer) {
  if (question.kind === 'single') {
    const isCorrect = normalize(answer) === normalize(question.correctAnswer ?? '');
    return { score: isCorrect ? 1 : 0, note: isCorrect ? 'Верно' : 'Неверно' };
  }

  if (question.kind === 'multi') {
    const correct = [...(question.correctAnswer ?? [])].map(normalize).sort();
    const selected = [...(Array.isArray(answer) ? answer : [answer])].map(normalize).filter(Boolean).sort();
    const isCorrect = correct.length === selected.length && correct.every((item, index) => item === selected[index]);
    return { score: isCorrect ? 1 : 0, note: isCorrect ? 'Все пункты найдены' : 'Частичный или неверный ответ' };
  }

  const text = normalize(answer);
  const hits = (question.keywords ?? []).filter((keyword) => text.includes(normalize(keyword)));
  const score = hits.length > 0 ? 1 : 0;
  return { score, note: hits.length > 0 ? `Найдено ключевых идей: ${hits.length}` : 'Нужны факты и ключевые слова' };
}

function formatDate(value) {
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

let dom = {};

const state = {
  activeSection: 'learn',
  isAdmin: sessionStorage.getItem(config.adminSessionKey) === 'true',
  submissions: [],
  selectedSubmissionId: null,
  practiceAnswers: createBlankAnswers(practiceQuestions),
  practiceResult: null,
  examAnswers: createBlankAnswers(examQuestions),
  examMeta: { name: '', squad: '', contact: '' },
};

function setSection(section) {
  state.activeSection = section;
  dom.learnSection.classList.toggle('hidden', section !== 'learn');
  dom.practiceSection.classList.toggle('hidden', section !== 'practice');
  dom.examSection.classList.toggle('hidden', section !== 'exam');
  dom.tabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.section === section);
  });
}

function updateHeroStats() {
  dom.questionsCount.textContent = String(practiceQuestions.length + examQuestions.length);
  dom.lessonsCount.textContent = String(lessons.length);
  dom.savedCount.textContent = String(state.submissions.length);

  const pending = state.submissions.filter((submission) => submission.reviewStatus === 'unchecked').length;
  const reviewed = state.submissions.length - pending;

  dom.pendingCount.textContent = String(pending);
  dom.reviewedCount.textContent = String(reviewed);
  dom.adminCountText.textContent = `${state.submissions.length} сохраненных экзаменов, поиск, экспорт и ручная проверка.`;
  if (dom.submittedNote) {
    dom.submittedNote.classList.toggle('hidden', !state.submissions.some((submission) => submission.id === state.selectedSubmissionId));
  }
}

function renderSubmissionList() {
  if (!dom.submissionList || !dom.adminSearch) {
    return;
  }

  const query = normalize(dom.adminSearch?.value ?? '');
  const filtered = [...state.submissions]
    .filter((submission) =>
      !query || [submission.name, submission.squad, submission.contact, submission.id].some((value) => normalize(value).includes(query)),
    )
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));

  dom.submissionList.innerHTML = filtered.length
    ? filtered
        .map(
          (submission) => `
            <button type="button" class="submission-item ${state.selectedSubmissionId === submission.id ? 'active' : ''}" data-id="${submission.id}">
              <strong>${submission.name}</strong>
              <span>${submission.squad}</span>
              <small>${submission.reviewStatus === 'passed' ? 'Сдал' : submission.reviewStatus === 'failed' ? 'Не сдал' : 'Ожидает проверки'} · ${formatDate(submission.submittedAt)}</small>
            </button>
          `,
        )
        .join('')
    : '<div class="empty-state">Пока нет сохраненных попыток.</div>';

  dom.submissionList.querySelectorAll('[data-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedSubmissionId = button.dataset.id;
      renderAdminDetail();
      renderSubmissionList();
    });
  });
}

function renderAdminDetail() {
  if (!dom.adminDetail) {
    return;
  }

  const selected = state.submissions.find((submission) => submission.id === state.selectedSubmissionId) ?? state.submissions[0] ?? null;

  if (!selected) {
    dom.adminDetail.innerHTML = '<div class="empty-state">Выбери попытку слева, чтобы увидеть ответы.</div>';
    return;
  }

  state.selectedSubmissionId = selected.id;

  dom.adminDetail.innerHTML = `
    <div class="detail-header">
      <div>
        <span>Выбрана попытка</span>
        <h3>${selected.name}</h3>
      </div>
      <strong>${selected.reviewStatus === 'passed' ? 'Сдал' : selected.reviewStatus === 'failed' ? 'Не сдал' : 'Не проверено'}</strong>
    </div>
    <div class="detail-meta">
      <span>${selected.squad}</span>
      <span>${selected.contact || 'Нет контакта'}</span>
      <span>${formatDate(selected.submittedAt)}</span>
    </div>
    <div class="breakdown-list">
      ${selected.responses
        .map(
          (response) => `
            <article class="breakdown-item">
              <div>
                <strong>${response.title}</strong>
                <p>${response.prompt}</p>
                <p><b>Ответ:</b> ${response.answer ? response.answer : 'Нет ответа'}</p>
              </div>
            </article>
          `,
        )
        .join('')}
    </div>
    <div class="admin-actions" style="margin-top: 16px;">
      <button class="secondary-button" type="button" data-review="passed">Сдал</button>
      <button class="secondary-button" type="button" data-review="failed">Не сдал</button>
      <button class="secondary-button" type="button" data-review="unchecked">Снять отметку</button>
    </div>
  `;

  dom.adminDetail.querySelectorAll('[data-review]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.submissions = await store.updateReview(
        selected.id,
        button.dataset.review,
        state.isAdmin ? 'admin' : 'checker',
        state.submissions,
      );
      renderAdminDetail();
      renderSubmissionList();
      updateHeroStats();
    });
  });
}

function renderPracticeSummary() {
  renderPracticeResult(dom.practiceResult, state.practiceResult);
}

function renderAdminShell() {
  if (dom.adminStatusOff) {
    dom.adminStatusOff.classList.toggle('hidden', state.isAdmin);
  }
  if (dom.adminStatusOn) {
    dom.adminStatusOn.classList.toggle('hidden', !state.isAdmin);
  }
  if (dom.adminSection) {
    dom.adminSection.classList.toggle('hidden', !state.isAdmin);
  }
}

function setPracticeAnswer(questionId, value, kind) {
  if (kind === 'multi') {
    const current = Array.isArray(state.practiceAnswers[questionId]) ? [...state.practiceAnswers[questionId]] : [];
    if (current.includes(value)) {
      state.practiceAnswers[questionId] = current.filter((item) => item !== value);
    } else {
      current.push(value);
      state.practiceAnswers[questionId] = current;
    }
    return;
  }

  state.practiceAnswers[questionId] = value;
}

function setExamAnswer(questionId, value, kind) {
  if (kind === 'multi') {
    const current = Array.isArray(state.examAnswers[questionId]) ? [...state.examAnswers[questionId]] : [];
    if (current.includes(value)) {
      state.examAnswers[questionId] = current.filter((item) => item !== value);
    } else {
      current.push(value);
      state.examAnswers[questionId] = current;
    }
    return;
  }

  state.examAnswers[questionId] = value;
}

async function submitPractice(event) {
  event.preventDefault();

  const details = practiceQuestions.map((question) => {
    const result = scorePracticeQuestion(question, state.practiceAnswers[question.id]);
    return {
      title: question.title,
      score: result.score,
      maxScore: 1,
      note: result.note,
    };
  });

  const score = details.reduce((sum, item) => sum + item.score, 0);
  state.practiceResult = { score, maxQuestions: practiceQuestions.length, details };
  renderPracticeSummary();
}

async function submitExam(event) {
  event.preventDefault();

  const name = state.examMeta.name.trim();
  const squad = state.examMeta.squad.trim();
  if (!name || !squad) {
    return;
  }

  const responses = examQuestions.map((question) => ({
    questionId: question.id,
    title: question.title,
    prompt: question.prompt,
    answer: Array.isArray(state.examAnswers[question.id])
      ? state.examAnswers[question.id].join(', ')
      : state.examAnswers[question.id],
  }));

  const submission = normalizeSubmissionRecord({
    id: crypto.randomUUID(),
    name,
    squad,
    contact: state.examMeta.contact.trim(),
    submittedAt: new Date().toISOString(),
    responses,
    reviewStatus: 'unchecked',
    reviewedAt: null,
    reviewedBy: null,
  });

  state.submissions = await store.save(submission, state.submissions);
  state.selectedSubmissionId = submission.id;
  state.examAnswers = createBlankAnswers(examQuestions);
  state.examMeta = { name: '', squad: '', contact: '' };

  renderExamSection({
    formEl: dom.examForm,
    questions: examQuestions,
    state: { answers: state.examAnswers, meta: state.examMeta },
    onAnswerChange: setExamAnswer,
    onMetaChange: (field, value) => {
      state.examMeta[field] = value;
    },
    onSubmit: submitExam,
  });
  renderAdminShell();
  renderSubmissionList();
  renderAdminDetail();
  updateHeroStats();
}

function bindAdminControls() {
  if (dom.adminLogin) {
    dom.adminLogin.addEventListener('click', () => {
      if (normalize(dom.adminCodeInput.value) === normalize(config.adminCode)) {
        sessionStorage.setItem(config.adminSessionKey, 'true');
        state.isAdmin = true;
        dom.adminCodeInput.value = '';
        renderAdminShell();
        renderSubmissionList();
        renderAdminDetail();
      }
    });
  }

  if (dom.adminLogout) {
    dom.adminLogout.addEventListener('click', () => {
      sessionStorage.removeItem(config.adminSessionKey);
      state.isAdmin = false;
      renderAdminShell();
    });
  }

  if (dom.adminSearch) {
    dom.adminSearch.addEventListener('input', () => {
      renderSubmissionList();
      renderAdminDetail();
    });
  }

  if (dom.exportJson) {
    dom.exportJson.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(state.submissions, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'lsfm-pro-exam-submissions.json';
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  if (dom.exportCsv) {
    dom.exportCsv.addEventListener('click', () => {
      const header = ['id', 'name', 'squad', 'contact', 'submittedAt', 'reviewStatus', 'reviewedAt', 'reviewedBy'];
      const rows = state.submissions.map((submission) => [
        submission.id,
        submission.name,
        submission.squad,
        submission.contact,
        submission.submittedAt,
        submission.reviewStatus,
        submission.reviewedAt ?? '',
        submission.reviewedBy ?? '',
      ]);
      const csv = [header, ...rows]
        .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'lsfm-pro-exam-submissions.csv';
      link.click();
      URL.revokeObjectURL(url);
    });
  }
}

async function init() {
  dom = {
    learnSection: document.getElementById('learn-section'),
    practiceSection: document.getElementById('practice-section'),
    examSection: document.getElementById('exam-section'),
    adminSection: document.getElementById('admin-section'),
    learningGrid: document.getElementById('learning-grid'),
    practiceForm: document.getElementById('practice-form'),
    practiceResult: document.getElementById('practice-result'),
    examForm: document.getElementById('exam-form'),
    submissionList: document.getElementById('submission-list'),
    adminDetail: document.getElementById('admin-detail'),
    adminSearch: document.getElementById('admin-search'),
    adminCodeInput: document.getElementById('admin-code'),
    adminStatusOff: document.getElementById('admin-status-off'),
    adminStatusOn: document.getElementById('admin-status-on'),
    adminCountText: document.getElementById('admin-count-text'),
    submittedNote: document.getElementById('submitted-note'),
    pendingCount: document.getElementById('pending-count'),
    reviewedCount: document.getElementById('reviewed-count'),
    savedCount: document.getElementById('saved-count'),
    lessonsCount: document.getElementById('lessons-count'),
    questionsCount: document.getElementById('questions-count'),
    scoreList: document.getElementById('score-list'),
    tabButtons: document.querySelectorAll('.tab-button'),
    adminLogin: document.getElementById('admin-login'),
    adminLogout: document.getElementById('admin-logout'),
    exportCsv: document.getElementById('export-csv'),
    exportJson: document.getElementById('export-json'),
  };

  renderLearningSection(dom.learningGrid, lessons);

  renderPracticeSection({
    formEl: dom.practiceForm,
    resultEl: dom.practiceResult,
    questions: practiceQuestions,
    state: { answers: state.practiceAnswers },
    onAnswerChange: setPracticeAnswer,
    onSubmit: submitPractice,
  });

  renderExamSection({
    formEl: dom.examForm,
    questions: examQuestions,
    state: { answers: state.examAnswers, meta: state.examMeta },
    onAnswerChange: setExamAnswer,
    onMetaChange: (field, value) => {
      state.examMeta[field] = value;
    },
    onSubmit: submitExam,
  });

  dom.tabButtons.forEach((button) => {
    button.addEventListener('click', () => setSection(button.dataset.section));
  });

  bindAdminControls();

  state.submissions = (await store.load()).map(normalizeSubmissionRecord);
  state.selectedSubmissionId = state.submissions[0]?.id ?? null;

  renderAdminShell();
  renderSubmissionList();
  renderAdminDetail();
  updateHeroStats();
  setSection(state.activeSection);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
