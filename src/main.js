import { config } from './config.js';
import { learningContent } from './data/learning.js';
import { practiceQuestions } from './data/practice.js';
//import { examQuestions } from './data/exam.js';
import { renderLearningSection } from './sections/learning.js';
import { renderPracticeResult, renderPracticeSection } from './sections/practice.js';
import { renderExamSection } from './sections/exam.js';
import { createSubmissionStore, normalizeSubmissionRecord } from './lib/submissions.js';
import { renderApplicationSection } from './sections/application.js';


// ВОТ ЭТА СТРОКА КРИТИЧЕСКИ ВАЖНА (Без неё будет ошибка createClient is not defined)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
export let supabaseClient = null;
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
  if (question.kind === 'single' || question.kind === 'single-image') {
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
  applications: [], // НОВОЕ: массив заявлений
  selectedAppId: null, // НОВОЕ: выбранное заявление
  adminViewMode: 'exams', // НОВОЕ: 'exams' или 'apps'
  adminStatusFilter: 'all',
  practiceAnswers: {}, 
  practiceResult: null,
  examAnswers: {}, 
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
  dom.applySection.classList.toggle('hidden', section !== 'apply'); // НОВОЕ
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

  const isPassed = selected.reviewStatus === 'passed';
  const isFailed = selected.reviewStatus === 'failed';
  const isUnchecked = selected.reviewStatus === 'unchecked' || !selected.reviewStatus;

  // Генерируем стили для кнопок
  const btnPassedStyle = `padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: 0.2s; font-weight: bold; font-family: inherit; font-size: 0.9rem; ${isPassed ? 'background: #2ecc71; color: #000; border: 1px solid #2ecc71; box-shadow: 0 0 12px rgba(46,204,113,0.4);' : 'background: rgba(46,204,113,0.05); color: #2ecc71; border: 1px solid rgba(46,204,113,0.4);'}`;
  
  const btnFailedStyle = `padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: 0.2s; font-weight: bold; font-family: inherit; font-size: 0.9rem; ${isFailed ? 'background: #ff4757; color: #fff; border: 1px solid #ff4757; box-shadow: 0 0 12px rgba(255,71,87,0.4);' : 'background: rgba(255,71,87,0.05); color: #ff4757; border: 1px solid rgba(255,71,87,0.4);'}`;
  
  const btnUncheckedStyle = `padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: 0.2s; font-weight: bold; font-family: inherit; font-size: 0.9rem; ${isUnchecked ? 'background: #94a3b8; color: #000; border: 1px solid #94a3b8;' : 'background: rgba(148,163,184,0.05); color: #94a3b8; border: 1px solid rgba(148,163,184,0.4);'}`;

  // Блок с кнопками
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
            let isImageKind = false;
            
            // 1. ПРОВЕРЯЕМ СНАПШОТ 
            if (response.snapshotKind) {
              if (response.snapshotHint) hint = response.snapshotHint;
              isImageKind = response.snapshotKind === 'single-image';
              
              if (response.snapshotKind === 'single') {
                correctAnswersText = response.snapshotCorrect;
              } else if (response.snapshotKind === 'single-image') {
                // Если правильный ответ - это картинка
                correctAnswersText = `<br><img src="${escapeHtml(response.snapshotCorrect)}" style="max-height: 120px; border-radius: 6px; margin-top: 8px; border: 2px solid #2ecc71; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">`;
              } else if (response.snapshotKind === 'multi') {
                correctAnswersText = Array.isArray(response.snapshotCorrect) ? response.snapshotCorrect.join(', ') : response.snapshotCorrect;
              } else if (response.snapshotKind === 'text' && response.snapshotCorrect) {
                correctAnswersText = 'Эталон / Ключевые слова: ' + response.snapshotCorrect;
              }
            } 
            // 2. ФОЛБЭК ПО ID
            else {
              try {
                const targetArray = typeof examQuestions !== 'undefined' ? examQuestions : [];
                const qId = response.questionId || response.id;
                const question = targetArray.find(q => q.id === qId);
                
                if (question) {
                  if (question.reviewHint) hint = question.reviewHint;
                  isImageKind = question.kind === 'single-image';
                  
                  if (question.kind === 'single') {
                    correctAnswersText = question.correctAnswer;
                  } else if (question.kind === 'single-image') {
                    correctAnswersText = `<br><img src="${escapeHtml(question.correctAnswer)}" style="max-height: 120px; border-radius: 6px; margin-top: 8px; border: 2px solid #2ecc71; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">`;
                  } else if (question.kind === 'multi') {
                    correctAnswersText = Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : question.correctAnswer;
                  } else if (question.kind === 'text' && question.keywords && question.keywords.length > 0) {
                    correctAnswersText = 'Ключевые слова: ' + question.keywords.join(', ');
                  } else if (question.kind === 'text' && question.correctAnswer) {
                    correctAnswersText = 'Ключевые слова: ' + question.correctAnswer;
                  }
                }
              } catch (e) {
                console.error("Данные вопроса не найдены", e);
              }
            }

            const isCorrect = response.score > 0;
            
            // --- Рендерим ответ стажёра (С учетом картинок) ---
            let userAnswerHtml = response.answer ? escapeHtml(response.answer) : '<span style="color: #ff4757;">Нет ответа</span>';
            
            if (isImageKind && response.answer) {
              userAnswerHtml = `<br><img src="${escapeHtml(response.answer)}" style="max-height: 120px; border-radius: 6px; margin-top: 8px; border: 2px solid ${isCorrect ? '#2ecc71' : '#ff4757'}; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">`;
            }

            return `
              <article class="breakdown-item" style="flex-direction: column; align-items: flex-start; gap: 8px; width: 100%;">
                <div style="width: 100%;">
                  <strong>${response.label ?? response.title ?? response.questionId}</strong>
                  
                  <p style="margin: 6px 0 0 0; font-size: 1rem;"><b>Ответ стажёра:</b> ${userAnswerHtml}</p>
                  
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
// Вспомогательная функция для генерации превьюшек Imgur
// --- УПРОЩЕННАЯ ВЕРСИЯ БЕЗ API IMGUR ---
async function fetchImgurAlbumImages(albumUrl, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div style="background: rgba(15, 23, 42, 0.4); border: 1px dashed rgba(100, 116, 139, 0.4); padding: 15px; border-radius: 12px; text-align: center;">
      <span style="font-size: 1.5rem; display: block; margin-bottom: 8px;">🖼️</span>
      <span style="color: #94a3b8; font-size: 0.9rem;">Предпросмотр отключен.<br>Нажмите на синюю кнопку выше, чтобы просмотреть альбом на Imgur.</span>
    </div>
  `;
}

// Рендер деталей заявления (с новой анимацией и кнопкой)
// Полностью заменяем функцию renderAdminAppDetail в файле main.js
async function renderAdminAppDetail() {
  if (!dom.adminDetail) return;
  
  const selected = state.applications.find(app => app.id === state.selectedAppId);

  if (!selected) {
    dom.adminDetail.innerHTML = '<div class="empty-state">Выбери заявление слева, чтобы увидеть подробности.</div>';
    return;
  }

  const linkedExam = state.submissions.find(sub => sub.id === selected.exam_id);
  const finalAlbumUrl = selected.album_url || selected.passport_url || selected.licenses_url;

  // Генерируем подпись из имени
  const n = selected.applicant_name || 'АНОНИМ';
  const parts = n.split('_');
  const signature = parts.length > 1 ? `${parts[0][0]}. ${parts[1]}` : n;

  // Статус экзамена
  const examText = linkedExam ? `ДА (${linkedExam.score}/${linkedExam.maxScore})` : `НЕ НАЙДЕН`;
  const examColor = linkedExam ? '#10b981' : '#ef4444';

  // Печать вердикта (появляется, если статус уже изменен)
  let stampHtml = '';
  if (selected.status === 'approved') {
    stampHtml = `<div style="position: absolute; bottom: 30px; right: 30px; border: 4px solid #10b981; color: #10b981; font-family: 'PT Sans', sans-serif; font-size: 1.8rem; font-weight: 900; padding: 10px 20px; transform: rotate(-10deg); border-radius: 8px; opacity: 0.8; pointer-events: none; box-shadow: inset 0 0 10px rgba(16,185,129,0.2);">ОДОБРЕНО</div>`;
  } else if (selected.status === 'rejected') {
    stampHtml = `<div style="position: absolute; bottom: 30px; right: 30px; border: 4px solid #ef4444; color: #ef4444; font-family: 'PT Sans', sans-serif; font-size: 1.8rem; font-weight: 900; padding: 10px 20px; transform: rotate(-10deg); border-radius: 8px; opacity: 0.8; pointer-events: none; box-shadow: inset 0 0 10px rgba(239,68,68,0.2);">ОТКЛОНЕНО</div>`;
  }

  dom.adminDetail.innerHTML = `
    <style>
      .admin-doc-paper { background: #fdfdfd; color: #1e293b; padding: 40px; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); position: relative; display: flex; flex-direction: column; overflow: hidden; margin-top: 15px; }
      .admin-doc-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 12rem; font-weight: 900; color: rgba(0,0,0,0.03); pointer-events: none; font-family: Arial, sans-serif; }
      .admin-doc-header { text-align: right; font-family: 'Times New Roman', serif; font-size: 1.05rem; margin-bottom: 25px; line-height: 1.5; }
      .admin-doc-title { text-align: center; font-family: 'Times New Roman', serif; font-size: 1.6rem; font-weight: bold; letter-spacing: 2px; margin-bottom: 25px; }
      .admin-doc-body { font-family: 'Times New Roman', serif; font-size: 1.15rem; line-height: 1.8; text-align: justify; flex: 1; margin-bottom: 40px; }
      .admin-doc-field { font-weight: bold; color: #2563eb; border-bottom: 1px dashed #2563eb; padding: 0 4px; text-decoration: none; transition: 0.2s; }
      .admin-doc-field:hover { background: rgba(37,99,235,0.1); }
      .admin-doc-footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #cbd5e1; padding-top: 15px; font-family: 'Times New Roman', serif; font-size: 1.05rem; }
      .admin-doc-sign { font-family: 'Brush Script MT', cursive; font-size: 2rem; color: #0f172a; transform: rotate(-5deg); display: inline-block; }
    </style>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
      <div>
        <span style="color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">Личное дело кандидата</span>
        <h2 style="margin: 0; color: #fff; font-size: 1.4rem;">${n}</h2>
      </div>
      ${linkedExam ? `<button id="view-linked-exam" class="secondary-button" style="margin: 0; border-color: #3b82f6; color: #3b82f6; padding: 8px 16px;">👀 Открыть тест ПРО</button>` : ''}
    </div>

    <!-- КРАСИВЫЙ БЛАНК ДОКУМЕНТА В АДМИНКЕ -->
    <div class="admin-doc-paper">
      <div class="admin-doc-watermark">LSFM</div>
      <div class="admin-doc-header">
        Директору радиоцентра г. Los Santos Leonardo Jemison<br>
        От гражданина: <span class="admin-doc-field" style="color: #0f172a; border-color: #0f172a;">${n}</span>
      </div>
      <div class="admin-doc-title">ЗАЯВЛЕНИЕ</div>
      <div class="admin-doc-body">
        Прошу принять меня на работу в радиоцентр г. Los Santos на должность радиотехника с испытательным сроком один месяц (( 1 день )). 
        К заявлению прикладываю копии паспорта и лицензий (( /pass, /lic + /c 60 )): 
        <a href="${finalAlbumUrl}" target="_blank" class="admin-doc-field">ОТКРЫТЬ ДОКУМЕНТЫ ↗</a>.<br><br>
        Так же подтверждаю, что успешно прошёл квалификационный онлайн-тест ПРО: <span class="admin-doc-field" style="color: ${examColor}; border-color: ${examColor};">${examText}</span>.
      </div>
      <div class="admin-doc-footer">
        <div>Дата: <strong>${new Date(selected.created_at).toLocaleDateString('ru-RU')}</strong></div>
        <div>Подпись: <span class="admin-doc-sign">${signature}</span></div>
      </div>
      
      ${stampHtml}
    </div>

    <!-- КНОПКИ ВЕРДИКТА -->
    <div style="display: flex; gap: 12px; margin-top: 24px;">
      <button class="save-btn app-status-btn" data-status="approved" style="background: #10b981; flex: 1; padding: 14px; font-size: 1rem; border-radius: 8px; font-weight: bold; color: #000; border: none; box-shadow: 0 4px 15px rgba(16,185,129,0.2); cursor: pointer;">✅ Одобрить</button>
      <button class="save-btn app-status-btn" data-status="rejected" style="background: #ef4444; flex: 1; padding: 14px; font-size: 1rem; border-radius: 8px; font-weight: bold; color: #fff; border: none; box-shadow: 0 4px 15px rgba(239,68,68,0.2); cursor: pointer;">❌ Отклонить</button>
    </div>
  `;

  const viewExamBtn = dom.adminDetail.querySelector('#view-linked-exam');
  if (viewExamBtn && linkedExam) {
    viewExamBtn.addEventListener('click', () => {
      state.adminViewMode = 'exams';
      state.selectedSubmissionId = linkedExam.id;
      dom.adminModeExams.click(); 
    });
  }

  dom.adminDetail.querySelectorAll('.app-status-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const newStatus = btn.dataset.status;
      btn.textContent = 'Сохранение...';
      const { error } = await supabaseClient.from('applications').update({ status: newStatus }).eq('id', selected.id);
      if (!error) {
        selected.status = newStatus;
        renderAdminListSwitcher();
      } else {
        alert('Ошибка изменения статуса: ' + error.message);
        btn.textContent = newStatus === 'approved' ? '✅ Одобрить' : '❌ Отклонить';
      }
    });
  });
}

// Главный свитчер списков (Экзамены <-> Заявления)
function renderAdminListSwitcher() {
  if (state.adminViewMode === 'exams') {
    dom.adminModeExams.className = 'save-btn';
    dom.adminModeExams.style.background = '#3b82f6';
    dom.adminModeExams.style.color = '#fff';
    
    dom.adminModeApps.className = 'secondary-button';
    dom.adminModeApps.style.background = 'transparent';
    
    renderSubmissionList(); 
    renderAdminDetail();    
  } else {
    dom.adminModeApps.className = 'save-btn';
    dom.adminModeApps.style.background = '#8b5cf6';
    dom.adminModeApps.style.color = '#fff';
    
    dom.adminModeExams.className = 'secondary-button';
    dom.adminModeExams.style.background = 'transparent';

    dom.submissionList.innerHTML = state.applications.length ? state.applications.map(app => {
      const isApproved = app.status === 'approved';
      const isRejected = app.status === 'rejected';
      let statusStyle = 'color: #94a3b8; background: rgba(148,163,184,0.1); border: 1px solid rgba(148,163,184,0.2);';
      let statusText = 'Ожидает';
      if (isApproved) { statusStyle = 'color: #10b981; background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3);'; statusText = 'Одобрено'; }
      if (isRejected) { statusStyle = 'color: #ef4444; background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3);'; statusText = 'Отклонено'; }

      return `
        <button type="button" class="submission-item ${state.selectedAppId === app.id ? 'active' : ''}" data-appid="${app.id}">
          <strong style="font-size: 1rem; color: #fff;">${app.applicant_name}</strong>
          <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px; font-size: 0.8rem;">
            <span style="padding: 2px 6px; border-radius: 4px; font-weight: bold; ${statusStyle}">${statusText}</span>
            <span style="color: #64748b;">${formatDate(app.created_at)}</span>
          </div>
        </button>
      `;
    }).join('') : '<div class="empty-state">Нет поданных заявлений.</div>';

    dom.submissionList.querySelectorAll('[data-appid]').forEach((button) => {
      button.addEventListener('click', () => {
        state.selectedAppId = button.dataset.appid;
        renderAdminListSwitcher();
      });
    });

    renderAdminAppDetail();
  }
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
      // ИЗМЕНЕНИЕ ЗДЕСЬ: картинки проверяются так же как обычный single-выбор
      if (question.kind === 'single' || question.kind === 'single-image') {
        const isCorrect = normalize(answer) === normalize(question.correctAnswer ?? '');
        score = isCorrect ? 1 : 0;
        note = isCorrect ? 'Авто-проверка: Верно' : 'Авто-проверка: Ошибка';
      } else if (question.kind === 'multi') {
        const correct = [...(question.correctAnswer ?? [])].map(normalize).sort();
        const selected = [...(Array.isArray(answer) ? answer : [answer])].map(normalize).filter(Boolean).sort();
        const isCorrect = correct.length > 0 && correct.length === selected.length && correct.every((item, index) => item === selected[index]);
        score = isCorrect ? 1 : 0;
        note = isCorrect ? 'Авто-проверка: Верно' : 'Авто-проверка: Ошибка';
      } else {
        // Текстовые вопросы автоматом получают 0 баллов! 
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
      snapshotCorrect: question.correctAnswer,
      snapshotHint: question.reviewHint,
      snapshotKind: question.kind
    };
  });

  // --- ТОЧЕЧНАЯ ПРОВЕРКА НА ЛИМИТ ОШИБОК ---
  const totalErrors = breakdown.filter(item => item.note === 'Авто-проверка: Ошибка' || item.note === 'Нет ответа').length;

  if (totalErrors >= 4) {
    dom.examForm.innerHTML = `
      <div style="background: rgba(239, 68, 68, 0.05); border: 2px solid #ef4444; padding: 40px; border-radius: 12px; text-align: center; max-width: 600px; margin: 40px auto; box-shadow: 0 0 30px rgba(239, 68, 68, 0.2); animation: fadeInUp 0.4s ease;">
        <span style="font-size: 4rem; display: block; margin-bottom: 20px;">🛑</span>
        <h2 style="color: #ef4444; font-family: 'PT Sans', sans-serif; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Экзамен провален</h2>
        <p style="color: #94a3b8; font-size: 1.1rem; line-height: 1.6; margin-bottom: 25px;">
          Вы допустили <strong style="color: #fff; font-size: 1.2rem;">${totalErrors} ошибки(ок)</strong>.<br>
          Максимально допустимый лимит для сдачи экзамена по ПРО, ППЭ, Уставу — <strong style="color: #10b981;">4 ошибки</strong>.<br>
          Данная попытка аннулирована и не пойдет в отчет старшему составу.
        </p>
        <button onclick="window.location.reload()" style="background: #ef4444; color: #fff; border: none; padding: 14px 30px; font-size: 1rem; font-weight: bold; border-radius: 6px; cursor: pointer; transition: 0.2s; box-shadow: 0 5px 15px rgba(239, 68, 68, 0.3);">
          🔄 Начать пересдачу
        </button>
      </div>
    `;
    
    state.examAnswers = createBlankAnswers(examQuestions);
    state.examMeta = { name: '', squad: '', contact: '' };
    return;
  }

  // --- ЕСЛИ ВСЁ ОК, ИДЕТ СТАРЫЙ ФУНКЦИОНАЛ ОТПРАВКИ ---
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

  // --- ОТПРАВКА В DISCORD ---
  const discordWebhookUrl = 'ТВОЙ_СКОПИРОВАННЫЙ_URL_ВЕБХУКА'; 

  if (discordWebhookUrl) {
    const answerBlocks = breakdown.map((item, i) => {
      const statusIcon = item.score > 0 ? '✅' : (item.note.includes('Ожидает ручной') ? '⏳' : '❌');
      let text = `**${i + 1}. ${item.label}**\n👤 Ответ: \`${item.answer || 'Нет ответа'}\``;
      
      if (item.score === 0) {
        text += `\n*${statusIcon} ${item.note}*`;
      } else {
        text += `\n*${statusIcon} Верно (+1 балл)*`;
      }
      return text;
    });

    const chunks = [];
    let currentChunk = "";
    
    for (const block of answerBlocks) {
      if (currentChunk.length + block.length > 3500) {
        chunks.push(currentChunk);
        currentChunk = block;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + block;
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    const sendToDiscord = async () => {
      for (let i = 0; i < chunks.length; i++) {
        const isFirst = i === 0;
        const isLast = i === chunks.length - 1;
        
        const embed = {
          color: 3447003,
          description: chunks[i]
        };

        if (isFirst) {
          embed.title = `📝 Экзамен сдан: ${submission.name}`;
          embed.fields = [
            { name: "Организация", value: submission.squad || "Не указано", inline: true },
            { name: "Связь", value: submission.contact || "Не указано", inline: true },
            { name: "Предварительные баллы", value: `${submission.score} из ${submission.maxScore}`, inline: false }
          ];
        } else {
          embed.title = `📝 Продолжение ответов: ${submission.name} (Часть ${i + 1})`;
        }

        if (isLast) {
          embed.footer = { text: "LSFM Academy System" };
          embed.timestamp = new Date().toISOString();
        }

        try {
          await fetch(discordWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] })
          });
          await new Promise(res => setTimeout(res, 500)); 
        } catch (err) {
          console.error("Ошибка отправки части в Discord:", err);
        }
      }
    };

    sendToDiscord();
  }

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
  if (dom.adminModeExams && dom.adminModeApps) {
    dom.adminModeExams.addEventListener('click', () => {
      state.adminViewMode = 'exams';
      renderAdminListSwitcher();
    });
    
    dom.adminModeApps.addEventListener('click', async () => {
      state.adminViewMode = 'apps';
      const { data } = await supabaseClient.from('applications').select('*').order('created_at', { ascending: false });
      if (data) {
        state.applications = data;
        if (!state.selectedAppId && data.length > 0) state.selectedAppId = data[0].id;
      }
      renderAdminListSwitcher();
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
  try {
    const url = config.supabaseUrl;
    const key = config.supabaseAnonKey; 
    
    if (!url || !key) {
      throw new Error("Ключи Supabase не найдены в конфиге!");
    }
    
    supabaseClient = createClient(url, key);
    const { data, error } = await supabaseClient.from('questions').select('*');
    
    if (error) throw error;
    
    examQuestions = data.sort((a, b) => {
      const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
  } catch (err) {
    console.error('Ошибка загрузки БД (Экзамен будет пуст):', err.message);
  }

  state.practiceAnswers = createBlankAnswers(practiceQuestions);
  state.examAnswers = createBlankAnswers(examQuestions);

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
    applySection: document.getElementById('apply-section'),
    applicationContainer: document.getElementById('application-container'),
    adminModeExams: document.getElementById('admin-mode-exams'),
    adminModeApps: document.getElementById('admin-mode-apps'),
  };
  renderApplicationSection(dom.applicationContainer, supabaseClient);
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