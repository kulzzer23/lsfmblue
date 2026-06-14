import { config } from './config.js';
import { learningContent } from './data/learning.js';
import { practiceQuestions } from './data/practice.js';
//import { examQuestions } from './data/exam.js';
import { renderLearningSection } from './sections/learning.js';
import { renderPracticeResult, renderPracticeSection } from './sections/practice.js';
import { renderExamSection } from './sections/exam.js';
import { createSubmissionStore, normalizeSubmissionRecord } from './lib/submissions.js';


// ВОТ ЭТА СТРОКА КРИТИЧЕСКИ ВАЖНА (Без неё будет ошибка createClient is not defined)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export let examQuestions = []; 
const store = createSubmissionStore();

// ... дальше пошел твой код (функции и т.д.)

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

// Убрали вызов createBlankAnswers отсюда, так как вопросы еще не загружены
const state = {
  activeSection: 'learn',
  isAdmin: sessionStorage.getItem(config.adminSessionKey) === 'true',
  submissions: [],
  selectedSubmissionId: null,
  adminStatusFilter: 'all',
  practiceAnswers: {}, // Заполним в init()
  practiceResult: null,
  examAnswers: {}, // Заполним в init()
  examMeta: { name: '', squad: '', contact: '' },
};

function getReviewStatusLabel(status) {
  if (status === 'passed') return 'Сдал';
  if (status === 'failed') return 'Не сдал';
  return 'Не проверено';
}

function getReviewStatusClass(status) {
  if (status === 'passed') return 'status-passed';
  if (status === 'failed') return 'status-failed';
  return 'status-unchecked';
}

function getFilteredSubmissions() {
  const query = normalize(dom.adminSearch?.value ?? '');
  const filter = state.adminStatusFilter;

  return [...state.submissions]
    .filter((submission) => !filter || filter === 'all' || submission.reviewStatus === filter)
    .filter((submission) => !query || [submission.name, submission.squad, submission.contact, submission.id].some((value) => normalize(value).includes(query)))
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
}

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
  dom.lessonsCount.textContent = String(learningContent.sections.length);
  dom.savedCount.textContent = String(state.submissions.length);

  const pending = state.submissions.filter((submission) => submission.reviewStatus === 'unchecked').length;
  const reviewed = state.submissions.length - pending;

  dom.pendingCount.textContent = String(pending);
  dom.reviewedCount.textContent = String(reviewed);
  dom.adminCountText.textContent = `${state.submissions.length} сохраненных экзаменов, поиск, фильтр и ручная проверка.`;
  if (dom.submittedNote) {
    dom.submittedNote.classList.toggle('hidden', !state.submissions.some((submission) => submission.id === state.selectedSubmissionId));
  }
}

function renderSubmissionList() {
  if (!dom.submissionList || !dom.adminSearch) return;

  const filtered = getFilteredSubmissions();

  dom.submissionList.innerHTML = filtered.length
    ? filtered
        .map(
          (submission) => {
            // --- ОПРЕДЕЛЯЕМ ЦВЕТА ДЛЯ ЛЕВОЙ ПАНЕЛИ ---
            const isPassed = submission.reviewStatus === 'passed';
            const isFailed = submission.reviewStatus === 'failed';
            
            let statusStyle = 'color: #94a3b8; background: rgba(148,163,184,0.1); border: 1px solid rgba(148,163,184,0.2);'; // Не проверено
            if (isPassed) statusStyle = 'color: #2ecc71; background: rgba(46,204,113,0.1); border: 1px solid rgba(46,204,113,0.2);'; // Сдал
            if (isFailed) statusStyle = 'color: #ff4757; background: rgba(255,71,87,0.1); border: 1px solid rgba(255,71,87,0.2);'; // Не сдал

            return `
              <button type="button" class="submission-item ${getReviewStatusClass(submission.reviewStatus)} ${state.selectedSubmissionId === submission.id ? 'active' : ''}" data-id="${submission.id}">
                <strong style="font-size: 1rem; color: #fff;">${submission.name}</strong>
                <span style="color: #97a7c6; font-size: 0.85rem; margin-top: 2px; display: block;">${submission.squad}</span>
                
                <div style="margin-top: 10px; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 0.8rem; color: #64748b;">
                  <span style="padding: 2px 6px; border-radius: 4px; font-weight: bold; ${statusStyle}">
                    ${getReviewStatusLabel(submission.reviewStatus)}
                  </span>
                  <span style="color: #7fe3ff; font-weight: bold;">${submission.score ?? 0}/${submission.maxScore ?? 0}</span>
                  <span>${formatDate(submission.submittedAt)}</span>
                </div>
              </button>
            `;
          }
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
  if (!dom.adminDetail) return;

  const filtered = getFilteredSubmissions();
  const selected = filtered.find((submission) => submission.id === state.selectedSubmissionId) ?? filtered[0] ?? null;

  if (!selected) {
    dom.adminDetail.innerHTML = '<div class="empty-state">Выбери попытку слева, чтобы увидеть ответы.</div>';
    return;
  }

  state.selectedSubmissionId = selected.id;
  const breakdownArray = selected.breakdown ?? selected.responses ?? [];

  // --- НАЧАЛО ЗАМЕНЫ ---
  // Определяем текущий статус, чтобы подсветить активную кнопку
  const isPassed = selected.reviewStatus === 'passed';
  const isFailed = selected.reviewStatus === 'failed';
  const isUnchecked = selected.reviewStatus === 'unchecked' || !selected.reviewStatus;

  // Генерируем стили для кнопок
  const btnPassedStyle = `padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: 0.2s; font-weight: bold; font-family: inherit; font-size: 0.9rem; ${isPassed ? 'background: #2ecc71; color: #000; border: 1px solid #2ecc71; box-shadow: 0 0 12px rgba(46,204,113,0.4);' : 'background: rgba(46,204,113,0.05); color: #2ecc71; border: 1px solid rgba(46,204,113,0.4);'}`;
  
  const btnFailedStyle = `padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: 0.2s; font-weight: bold; font-family: inherit; font-size: 0.9rem; ${isFailed ? 'background: #ff4757; color: #fff; border: 1px solid #ff4757; box-shadow: 0 0 12px rgba(255,71,87,0.4);' : 'background: rgba(255,71,87,0.05); color: #ff4757; border: 1px solid rgba(255,71,87,0.4);'}`;
  
  const btnUncheckedStyle = `padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: 0.2s; font-weight: bold; font-family: inherit; font-size: 0.9rem; ${isUnchecked ? 'background: #94a3b8; color: #000; border: 1px solid #94a3b8;' : 'background: rgba(148,163,184,0.05); color: #94a3b8; border: 1px solid rgba(148,163,184,0.4);'}`;

  // Блок с кнопками (вынесли в переменную, так как он у тебя дублируется сверху и снизу)
  const reviewButtonsHtml = `
    <div class="admin-actions admin-review-actions" style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;">
      <button type="button" data-review="passed" style="${btnPassedStyle}">✅ Сдал</button>
      <button type="button" data-review="failed" style="${btnFailedStyle}">❌ Не сдал</button>
      <button type="button" data-review="unchecked" style="${btnUncheckedStyle}">⏳ Не проверено</button>
    </div>
  `;

  dom.adminDetail.innerHTML = `
    <div class="detail-header">
      <div>
        <span>Выбрана попытка</span>
        <h3>${selected.name}</h3>
      </div>
      <div style="text-align: right;">
        <strong class="status-pill ${getReviewStatusClass(selected.reviewStatus)}" style="margin-bottom: 5px; display: inline-block;">${getReviewStatusLabel(selected.reviewStatus)}</strong>
        <div style="color: #7fe3ff; font-size: 1.1rem; font-weight: bold; margin-top: 5px;">
          Баллы: ${selected.score ?? 0} / ${selected.maxScore ?? breakdownArray.length}
        </div>
      </div>
      ${reviewButtonsHtml}
    </div>
    <div class="detail-meta">
      <span>${selected.squad}</span>
      <span>${selected.contact || 'Нет контакта'}</span>
      <span>${formatDate(selected.submittedAt)}</span>
      <span>${getReviewStatusLabel(selected.reviewStatus)}</span>
    </div>
    <div class="breakdown-list">
      ${breakdownArray
        .map(
          (response, index) => {
            let hint = '';
            let correctAnswersText = '';
            
            // Вытягиваем оригинальный вопрос из загруженной БД
            try {
              const targetArray = typeof examQuestions !== 'undefined' ? examQuestions : [];
              const qId = response.questionId || response.id;
              const question = targetArray.find(q => q.id === qId);
              
              if (question) {
                if (question.reviewHint) hint = question.reviewHint;
                
                // Формируем текст правильного ответа для вывода админу
                if (question.kind === 'single') {
                  correctAnswersText = question.correctAnswer;
                } else if (question.kind === 'multi') {
                  correctAnswersText = Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : question.correctAnswer;
                } else if (question.kind === 'text' && question.keywords && question.keywords.length > 0) {
                  correctAnswersText = 'Ключевые слова: ' + question.keywords.join(', ');
                }
              }
            } catch (e) {
              console.error("Данные вопроса не найдены", e);
            }

            const isCorrect = response.score > 0;

            return `
              <article class="breakdown-item" style="flex-direction: column; align-items: flex-start; gap: 8px; width: 100%;">
                <div style="width: 100%;">
                  <strong>${response.label ?? response.title ?? response.questionId}</strong>
                  <p style="margin: 6px 0 0 0; font-size: 1rem;"><b>Ответ стажёра:</b> ${response.answer ? response.answer : '<span style="color: #ff4757;">Нет ответа</span>'}</p>
                  
                  ${correctAnswersText ? `
                    <p style="margin: 6px 0 0 0; font-size: 0.95rem; color: #7fe3ff;"><b>Правильный ответ:</b> ${correctAnswersText}</p>
                  ` : ''}
                  
                </div>
                ${hint ? `
                  <div style="margin-top: 6px; padding: 10px 14px; background: rgba(255, 187, 0, 0.08); border: 1px solid rgba(255, 187, 0, 0.15); border-radius: 8px; font-size: 0.9rem; color: #ffda75; width: 100%;">
                    <b style="color: #ffbb00;">Шпаргалка ПРО:</b> ${hint}
                  </div>
                ` : ''}
                
                <label style="display: flex; align-items: center; gap: 10px; margin-top: 8px; cursor: pointer; background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 8px; width: 100%; border: 1px solid ${isCorrect ? 'rgba(46, 204, 113, 0.3)' : 'transparent'};">
                  <input type="checkbox" class="review-answer-cb" data-index="${index}" ${isCorrect ? 'checked' : ''} style="transform: scale(1.3); cursor: pointer;" />
                  <span style="color: ${isCorrect ? '#2ecc71' : '#97a7c6'}; font-weight: ${isCorrect ? 'bold' : 'normal'};">Ответ верный (1 балл)</span>
                  <span style="color: #64748b; font-size: 0.8rem; margin-left: auto;">${response.note || ''}</span>
                </label>

              </article>
            `;
          }
        )
        .join('')}
    </div>
    
    ${reviewButtonsHtml}
  `;
  // --- КОНЕЦ ЗАМЕНЫ ---

  dom.adminDetail.querySelectorAll('.review-answer-cb').forEach((checkbox) => {
    checkbox.addEventListener('change', async (event) => {
      const index = parseInt(event.target.dataset.index, 10);
      const isChecked = event.target.checked;

      breakdownArray[index].score = isChecked ? 1 : 0;
      selected.score = breakdownArray.reduce((sum, item) => sum + (item.score || 0), 0);

      try {
        state.submissions = await store.save(selected, state.submissions);
        renderSubmissionList();
        renderAdminDetail();
      } catch (error) {
        console.error("Ошибка сохранения балла:", error);
        alert('Не удалось сохранить баллы в базу!');
        event.target.checked = !isChecked; 
      }
    });
  });

  dom.adminDetail.querySelectorAll('[data-review]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        state.submissions = await store.updateReview(
          selected.id,
          button.dataset.review,
          state.isAdmin ? 'admin' : 'checker',
          state.submissions,
        );
        renderSubmissionList();
        renderAdminDetail();
        updateHeroStats();
      } catch (error) {
        window.alert(
          error instanceof Error
            ? `Не удалось сохранить статус: ${error.message}`
            : 'Не удалось сохранить статус в Supabase.',
        );
      }
    });
  });
}
function renderPracticeSummary() {
  renderPracticeResult(dom.practiceResult, state.practiceResult);
}

function renderAdminShell() {
  if (dom.adminStatusOff) dom.adminStatusOff.classList.toggle('hidden', state.isAdmin);
  if (dom.adminStatusOn) dom.adminStatusOn.classList.toggle('hidden', !state.isAdmin);
  if (dom.adminSection) dom.adminSection.classList.toggle('hidden', !state.isAdmin);
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
    const userAnswer = state.practiceAnswers[question.id];
    const result = scorePracticeQuestion(question, userAnswer);
    
    return {
      id: question.id,
      title: question.title,
      score: result.score,
      maxScore: 1,
      note: result.note,
      userAnswer: Array.isArray(userAnswer) ? userAnswer.join(', ') : (userAnswer || '—'),
      correctAnswer:
        question.kind === 'multi'
          ? Array.isArray(question.correctAnswer)
            ? question.correctAnswer.join(', ')
            : String(question.correctAnswer ?? '—')
          : question.kind === 'text'
            ? `Ожидаемые идеи: ${(question.keywords ?? []).join(', ') || '—'}`
            : String(question.correctAnswer ?? '—'),
    };
  });

  const score = details.reduce((sum, item) => sum + item.score, 0);
  state.practiceResult = { score, maxQuestions: practiceQuestions.length, details };
  
  renderPracticeSummary(); 
  
  renderPracticeSection({
    formEl: dom.practiceForm,
    resultEl: dom.practiceResult,
    questions: practiceQuestions,
    state: { answers: state.practiceAnswers },
    onAnswerChange: setPracticeAnswer,
    onSubmit: submitPractice,
    result: state.practiceResult 
  });

  window.scrollTo({ 
    top: dom.practiceSection.offsetTop - 20, 
    behavior: 'smooth' 
  });
}

async function submitExam(event) {
  event.preventDefault();

  const name = state.examMeta.name.trim();
  const squad = state.examMeta.squad.trim();
  if (!name || !squad) return;

  const breakdown = examQuestions.map((question) => {
    const answer = state.examAnswers[question.id];
    const normalizedAnswer = Array.isArray(answer) ? answer.join(', ') : String(answer ?? '');
    const hasAnswer = normalizedAnswer.trim().length > 0;
    
    // --- НОВАЯ СИСТЕМА ОЦЕНКИ ---
    let score = 0;
    let note = 'Нет ответа';

    if (hasAnswer) {
      if (question.kind === 'single') {
        // Сверяем строку
        const isCorrect = normalize(answer) === normalize(question.correctAnswer ?? '');
        score = isCorrect ? 1 : 0;
        note = isCorrect ? 'Авто-проверка: Верно' : 'Авто-проверка: Ошибка';
      } else if (question.kind === 'multi') {
        // Сверяем массивы
        const correct = [...(question.correctAnswer ?? [])].map(normalize).sort();
        const selected = [...(Array.isArray(answer) ? answer : [answer])].map(normalize).filter(Boolean).sort();
        const isCorrect = correct.length > 0 && correct.length === selected.length && correct.every((item, index) => item === selected[index]);
        score = isCorrect ? 1 : 0;
        note = isCorrect ? 'Авто-проверка: Верно' : 'Авто-проверка: Ошибка';
      } else {
        // Текстовые вопросы автоматом получают 0 баллов! 
        // Проверяющий обязан прочитать глазами и сам поставить галочку.
        score = 0; 
        note = 'Ожидает ручной проверки';
      }
    }

    return {
      questionId: question.id,
      label: question.title,
      score: score, 
      maxScore: 1,
      note: note,
      answer: normalizedAnswer,
    };
  });

  const answers = breakdown.reduce((accumulator, item) => {
    accumulator[item.questionId] = item.answer;
    return accumulator;
  }, {});

  const score = breakdown.reduce((sum, item) => sum + item.score, 0);
  const maxScore = breakdown.length;

  const submission = normalizeSubmissionRecord({
    id: crypto.randomUUID(),
    name,
    squad,
    contact: state.examMeta.contact.trim(),
    submittedAt: new Date().toISOString(),
    score,
    maxScore,
    answers,
    breakdown,
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

  if (dom.adminStatusFilter) {
    dom.adminStatusFilter.addEventListener('change', () => {
      state.adminStatusFilter = dom.adminStatusFilter.value;
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
      const header = ['id', 'name', 'squad', 'contact', 'submittedAt', 'score', 'maxScore'];
      const rows = state.submissions.map((submission) => [
        submission.id,
        submission.name,
        submission.squad,
        submission.contact,
        submission.submittedAt,
        submission.score ?? '',
        submission.maxScore ?? '',
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
  // 1. ЗАГРУЖАЕМ ВОПРОСЫ ПЕРЕД ТЕМ, КАК СТРОИТЬ САЙТ
  try {
    // Берем точные названия из твоего config.js
    const url = config.supabaseUrl;
    const key = config.supabaseAnonKey; 
    
    if (!url || !key) {
      throw new Error("Ключи Supabase не найдены в конфиге!");
    }
    
    // ОБЯЗАТЕЛЬНО пишем const перед supabase!
    const supabase = createClient(url, key);
    const { data, error } = await supabase.from('questions').select('*');
    
    if (error) throw error;
    
    examQuestions = data.sort((a, b) => {
      const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
  } catch (err) {
    console.error('Ошибка загрузки БД (Экзамен будет пуст):', err.message);
  }

  // 2. ТЕПЕРЬ ЗАПОЛНЯЕМ СТЕЙТ ПУСТЫМИ ОТВЕТАМИ
  state.practiceAnswers = createBlankAnswers(practiceQuestions);
  state.examAnswers = createBlankAnswers(examQuestions);

  // 3. ПРИВЯЗЫВАЕМ DOM И РЕНДЕРИМ
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
    adminStatusFilter: document.getElementById('admin-status-filter'),
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

  renderLearningSection(dom.learningGrid, learningContent);
  
  const btnTop = document.getElementById('scroll-to-top');
  const btnBottom = document.getElementById('scroll-to-bottom');
  const btnAdminUpast = document.getElementById('admin-upast');
  const btnAdminEnter = document.getElementById('admin-enter');
  const adminSection = document.getElementById('admin-section');

  if (btnAdminUpast && adminSection) {
    btnAdminUpast.addEventListener('click', () => {
      adminSection.classList.remove('hidden');
      adminSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  if (btnAdminEnter) {
  btnAdminEnter.addEventListener('click', () => {
    // Открываем админку в новой вкладке
    window.open('https://kulzzer23.github.io/lsfmblue/admin.html', '_blank');
  });
}
  if (btnTop) {
    btnTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (btnBottom) {
    btnBottom.addEventListener('click', () => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
  }

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
    questions: examQuestions, // Передаем скачанный массив
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