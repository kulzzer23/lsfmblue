import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { config } from './src/config.js';
import { content } from './src/content.js';
import { LEARNING_CONTENT_KEY, getLearningContent, saveLearningContent } from './src/data/learning.js';

// --- СТИЛИ ДЛЯ АДМИНКИ (СВЕТЛАЯ ТЕМА + DRAG & DROP МОДАЛКА) ---
const style = document.createElement('style');
style.textContent = `
  .question-editor { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; color: #1e293b; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); font-family: sans-serif; }
  .editor-row { margin-bottom: 15px; }
  .editor-row label { display: block; margin-bottom: 5px; font-weight: 600; color: #475569; font-size: 0.9rem; }
  
  .question-editor input[type="text"], .question-editor textarea, .custom-select { 
    width: 100%; box-sizing: border-box; background: #f8fafc; color: #0f172a; border: 1px solid #cbd5e1; 
    padding: 10px 12px; border-radius: 6px; font-size: 0.95rem; font-family: inherit; transition: border-color 0.2s; 
  }
  .question-editor input[type="text"]:focus, .question-editor textarea:focus, .custom-select:focus { 
    outline: none; border-color: #3b82f6; background: #ffffff; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .gui-section { background: #f1f5f9; border-radius: 10px; padding: 15px; margin-top: 15px; border: 1px dashed #cbd5e1; animation: fadeIn 0.3s ease; }
  .gui-section-label { color: #334155; font-weight: 600; margin-bottom: 10px; display: block; font-size: 0.9rem; }
  
  .opt-add-bar { display: flex; gap: 10px; margin-bottom: 15px; }
  .opt-add-btn { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 0 20px; border-radius: 6px; cursor: pointer; font-weight: 600; transition: 0.2s; white-space: nowrap; }
  .opt-add-btn:hover { background: #bae6fd; }
  
  .opt-list { display: flex; flex-direction: column; gap: 8px; }
  .opt-pill { display: flex; align-items: center; justify-content: space-between; background: #ffffff; border: 1px solid #e2e8f0; padding: 10px 15px; border-radius: 8px; transition: 0.2s; }
  .opt-pill:hover { border-color: #94a3b8; }
  .opt-pill.is-correct { border-color: #22c55e; background: #f0fdf4; }
  
  .opt-content { display: flex; align-items: center; gap: 12px; flex: 1; cursor: pointer; overflow: hidden; }
  .opt-text { color: #0f172a; font-size: 0.95rem; word-break: break-word; }
  
  .icon-btn { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; padding: 6px 10px; transition: 0.2s; font-size: 1.1rem; }
  .icon-btn:hover { background: #f1f5f9; border-color: #94a3b8; }
  .icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .delete-q:hover { background: #fef2f2; border-color: #fca5a5; }
  .opt-del-btn { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.2rem; opacity: 0.6; transition: 0.2s; padding: 0 5px; flex-shrink: 0; }
  .opt-del-btn:hover { opacity: 1; transform: scale(1.1); }
  
  .save-btn { width: 100%; padding: 12px; border: none; border-radius: 6px; font-weight: bold; font-size: 1rem; cursor: pointer; transition: 0.2s; color: #fff; background: #3b82f6; margin-top: 15px; }
  .save-btn:hover { background: #2563eb; }
  .save-btn.is-new { background: #f59e0b; }
  .save-btn.is-new:hover { background: #d97706; }

  .learning-editor-shell { display: grid; gap: 18px; }
  .learning-editor-actions { display: flex; flex-wrap: wrap; gap: 10px; }
  .learning-editor-actions .icon-btn { padding: 10px 14px; }
  .learning-meta-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
  .learning-section-card-editor,
  .learning-subsection-card-editor {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px;
  }
  .learning-section-card-editor { margin-top: 16px; }
  .learning-subsection-card-editor { margin-top: 12px; background: #ffffff; }
  .learning-card-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    margin-bottom: 14px;
  }
  .learning-card-head h4,
  .learning-card-head h5 { margin: 0; color: #0f172a; }
  .learning-card-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .learning-card-actions .icon-btn { padding: 6px 10px; }
  .learning-editor textarea[data-field] { min-height: 90px; resize: vertical; }
  .learning-editor .mini-note { font-size: 0.85rem; color: #64748b; margin-top: 6px; line-height: 1.45; }
  .learning-divider { height: 1px; background: #e2e8f0; margin: 16px 0; }
  
  /* --- СТИЛИ ДЛЯ DRAG & DROP МОДАЛКИ --- */
  .reorder-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: 0.3s; }
  .reorder-overlay.active { opacity: 1; pointer-events: auto; }
  .reorder-modal { background: #fff; width: 90%; max-width: 650px; max-height: 85vh; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-family: sans-serif; }
  .reorder-header { padding: 18px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
  .reorder-list { padding: 15px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 8px; }
  .reorder-item { padding: 12px 15px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; display: flex; align-items: center; gap: 15px; cursor: grab; transition: transform 0.1s; user-select: none; }
  .reorder-item:active { cursor: grabbing; border-color: #8b5cf6; box-shadow: 0 4px 10px rgba(139, 92, 246, 0.2); transform: scale(1.01); z-index: 10; }
  .drag-handle { color: #94a3b8; font-size: 1.4rem; cursor: grab; line-height: 1; display: flex; align-items: center; }
  .reorder-footer { padding: 15px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc; }
  
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
`;
document.head.appendChild(style);

// --- КЛЮЧИ И ПОДКЛЮЧЕНИЕ К БАЗЕ ---
const supabaseUrl = 'https://eijjetlaiourgzkzsqpx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpampldGxhaW91cmd6a3pzcXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzI1NTksImV4cCI6MjA5Njg0ODU1OX0.WkjbDWWOm9EJkBzIyJS-CWRV8bxGffrkR0-SmoycWPM';
const supabase = createClient(supabaseUrl, supabaseKey);

const listContainer = document.getElementById('admin-questions-list');
const addBtn = document.getElementById('add-new-btn');
const adminTabExams = document.getElementById('admin-tab-exams');
const adminTabLearning = document.getElementById('admin-tab-learning');
const adminExamsActions = document.getElementById('admin-exams-actions');
const adminLearningActions = document.getElementById('admin-learning-actions');
const saveLearningBtn = document.getElementById('save-learning-btn');
const resetLearningBtn = document.getElementById('reset-learning-btn');

let adminMode = 'exams';
let learningDraft = null;

async function ensureLearningDraft() {
  if (!learningDraft) {
    learningDraft = cloneLearningContent(await getLearningContent());
  }

  return learningDraft;
}

// ВНЕДРЯЕМ КНОПКУ РЕЖИМА СОРТИРОВКИ
const reorderBtn = document.createElement('button');
reorderBtn.className = 'save-btn';
reorderBtn.style.cssText = 'margin: 0 0 0 10px; background: #8b5cf6; width: auto; display: inline-block; padding: 12px 20px;';
reorderBtn.innerHTML = '📋 Быстрая сортировка';
reorderBtn.onclick = openReorderModal;
addBtn.parentNode.insertBefore(reorderBtn, addBtn.nextSibling);

// Глобальный массив всех вопросов в памяти
let currentQuestions = [];

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function cloneLearningContent(source) {
  return JSON.parse(JSON.stringify(source));
}

function createEmptySection(index = 0) {
  return {
    id: `section-${index + 1}`,
    title: 'Новый раздел',
    summary: '',
    paragraphs: [],
    bullets: [],
    subsections: [createEmptySubsection()],
  };
}

function createEmptySubsection() {
  return {
    title: 'Новая глава',
    text: [''],
  };
}

function splitTextareaLines(value) {
  return String(value ?? '').split(/\r?\n/);
}

function joinTextareaLines(value) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function setAdminMode(mode) {
  adminMode = mode;

  adminTabExams?.classList.toggle('active', mode === 'exams');
  adminTabLearning?.classList.toggle('active', mode === 'learning');
  adminExamsActions && (adminExamsActions.style.display = mode === 'exams' ? '' : 'none');
  adminLearningActions && (adminLearningActions.style.display = mode === 'learning' ? 'flex' : 'none');

  if (mode === 'exams') {
    renderQuestionsList();
  } else {
    renderLearningEditor();
  }
}

async function renderLearningEditor() {
  const current = await ensureLearningDraft();
  listContainer.innerHTML = '';

  const editor = document.createElement('div');
  editor.className = 'question-editor learning-editor';
  editor.innerHTML = `
    <h3 style="margin-top:0; color:#0f172a;">Редактор раздела обучения</h3>
    <p style="margin-top:-6px; color:#475569; line-height:1.5;">Здесь можно менять заголовок, вводный текст, разделы и главы обучения. Сохранение идёт в тот же override-ключ, который использует сайт.</p>
    <div class="learning-editor-actions">
      <button type="button" id="learning-add-section-btn" class="icon-btn">➕ Добавить раздел</button>
      <button type="button" id="learning-restore-btn" class="icon-btn">↩️ Восстановить из src/content.js</button>
      <button type="button" id="learning-save-preview-btn" class="icon-btn">💾 Сохранить сейчас</button>
    </div>
    <div class="learning-divider"></div>
    <div class="learning-meta-grid">
      <div class="editor-row">
        <label>Заголовок страницы</label>
        <input type="text" data-field="title" value="${escapeHtml(current.title ?? '')}" placeholder="Название раздела обучения">
      </div>
      <div class="editor-row">
        <label>Вступление</label>
        <textarea data-field="intro" rows="4" placeholder="Короткое описание для страницы">${escapeHtml(current.intro ?? '')}</textarea>
      </div>
    </div>
    <div id="learning-sections-list"></div>
  `;
  listContainer.appendChild(editor);

  const sectionsList = editor.querySelector('#learning-sections-list');

  const renderSections = () => {
    sectionsList.innerHTML = (current.sections ?? []).map((section, sectionIndex) => {
      const subsections = safeArray(section.subsections);
      const paragraphs = safeArray(section.paragraphs);

      return `
        <section class="learning-section-card-editor" data-section-index="${sectionIndex}">
          <div class="learning-card-head">
            <div>
              <h4>Раздел ${sectionIndex + 1}</h4>
              <div class="mini-note">Редактируется напрямую в форме — без JSON.</div>
            </div>
            <div class="learning-card-actions">
              <button type="button" class="icon-btn" data-action="move-section-up" data-section-index="${sectionIndex}" ${sectionIndex === 0 ? 'disabled' : ''}>↑</button>
              <button type="button" class="icon-btn" data-action="move-section-down" data-section-index="${sectionIndex}" ${sectionIndex === (current.sections.length - 1) ? 'disabled' : ''}>↓</button>
              <button type="button" class="icon-btn delete-q" data-action="remove-section" data-section-index="${sectionIndex}">Удалить</button>
            </div>
          </div>

          <div class="learning-meta-grid">
            <div class="editor-row">
              <label>ID раздела</label>
              <input type="text" data-field="section-id" data-section-index="${sectionIndex}" value="${escapeHtml(section.id ?? '')}" placeholder="pro">
            </div>
            <div class="editor-row">
              <label>Заголовок раздела</label>
              <input type="text" data-field="section-title" data-section-index="${sectionIndex}" value="${escapeHtml(section.title ?? '')}" placeholder="Название раздела">
            </div>
          </div>

          <div class="editor-row" style="margin-top: 12px;">
            <label>Краткое описание</label>
            <textarea data-field="section-summary" data-section-index="${sectionIndex}" rows="3" placeholder="Краткий анонс раздела">${escapeHtml(section.summary ?? '')}</textarea>
          </div>

          <div class="editor-row">
            <label>Абзацы сверху раздела</label>
            <textarea data-field="section-paragraphs" data-section-index="${sectionIndex}" rows="4" placeholder="Один абзац = одна строка">${escapeHtml(joinTextareaLines(paragraphs))}</textarea>
            <div class="mini-note">Каждая строка станет отдельным абзацем на сайте.</div>
          </div>

          <div class="learning-divider"></div>

          <div class="learning-card-head">
            <div>
              <h5>Подразделы</h5>
              <div class="mini-note">Добавляйте, удаляйте и меняйте порядок глав внутри раздела.</div>
            </div>
            <div class="learning-card-actions">
              <button type="button" class="icon-btn" data-action="add-subsection" data-section-index="${sectionIndex}">➕ Глава</button>
            </div>
          </div>

          <div>
            ${subsections.map((subsection, subIndex) => `
              <article class="learning-subsection-card-editor" data-sub-index="${subIndex}">
                <div class="learning-card-head">
                  <h5>Глава ${subIndex + 1}</h5>
                  <div class="learning-card-actions">
                    <button type="button" class="icon-btn" data-action="move-subsection-up" data-section-index="${sectionIndex}" data-sub-index="${subIndex}" ${subIndex === 0 ? 'disabled' : ''}>↑</button>
                    <button type="button" class="icon-btn" data-action="move-subsection-down" data-section-index="${sectionIndex}" data-sub-index="${subIndex}" ${subIndex === (subsections.length - 1) ? 'disabled' : ''}>↓</button>
                    <button type="button" class="icon-btn delete-q" data-action="remove-subsection" data-section-index="${sectionIndex}" data-sub-index="${subIndex}">Удалить</button>
                  </div>
                </div>

                <div class="editor-row">
                  <label>Название главы</label>
                  <input type="text" data-field="subsection-title" data-section-index="${sectionIndex}" data-sub-index="${subIndex}" value="${escapeHtml(subsection.title ?? '')}" placeholder="Например: I. ОСНОВНЫЕ ПРАВИЛА">
                </div>

                <div class="editor-row">
                  <label>Текст главы</label>
                  <textarea data-field="subsection-text" data-section-index="${sectionIndex}" data-sub-index="${subIndex}" rows="7" placeholder="Одна строка = один элемент массива text">${escapeHtml(joinTextareaLines(safeArray(subsection.text)))}</textarea>
                  <div class="mini-note">Если нужна пустая строка в контенте — оставьте пустую строку в textarea.</div>
                </div>
              </article>
            `).join('')}
          </div>
        </section>
      `;
    }).join('');
  };

  renderSections();

  const syncField = (target) => {
    const sectionIndex = target.dataset.sectionIndex !== undefined ? Number(target.dataset.sectionIndex) : null;
    const subIndex = target.dataset.subIndex !== undefined ? Number(target.dataset.subIndex) : null;
    const field = target.dataset.field;

    if (field === 'title') {
      current.title = target.value;
      return;
    }
    if (field === 'intro') {
      current.intro = target.value;
      return;
    }

    if (sectionIndex === null || Number.isNaN(sectionIndex) || !current.sections?.[sectionIndex]) return;
    const section = current.sections[sectionIndex];

    if (field === 'section-id') section.id = target.value;
    if (field === 'section-title') section.title = target.value;
    if (field === 'section-summary') section.summary = target.value;
    if (field === 'section-paragraphs') section.paragraphs = splitTextareaLines(target.value);

    if (subIndex !== null && !Number.isNaN(subIndex) && safeArray(section.subsections)[subIndex]) {
      const subsection = section.subsections[subIndex];
      if (field === 'subsection-title') subsection.title = target.value;
      if (field === 'subsection-text') subsection.text = splitTextareaLines(target.value);
    }
  };

  editor.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    syncField(target);
  });

  editor.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const sectionIndex = Number(btn.dataset.sectionIndex);
    const subIndex = btn.dataset.subIndex !== undefined ? Number(btn.dataset.subIndex) : null;

    if (action === 'add-section') {
      current.sections = safeArray(current.sections);
      current.sections.push(createEmptySection(current.sections.length));
      renderSections();
      return;
    }

    if (!safeArray(current.sections)[sectionIndex]) return;
    const section = current.sections[sectionIndex];

    if (action === 'remove-section') {
      if (!confirm(`Удалить раздел «${section.title || section.id || sectionIndex + 1}»?`)) return;
      current.sections.splice(sectionIndex, 1);
      renderSections();
      return;
    }

    if (action === 'move-section-up' && sectionIndex > 0) {
      [current.sections[sectionIndex - 1], current.sections[sectionIndex]] = [current.sections[sectionIndex], current.sections[sectionIndex - 1]];
      renderSections();
      return;
    }

    if (action === 'move-section-down' && sectionIndex < current.sections.length - 1) {
      [current.sections[sectionIndex + 1], current.sections[sectionIndex]] = [current.sections[sectionIndex], current.sections[sectionIndex + 1]];
      renderSections();
      return;
    }

    if (action === 'add-subsection') {
      section.subsections = safeArray(section.subsections);
      section.subsections.push(createEmptySubsection());
      renderSections();
      return;
    }

    if (subIndex !== null && safeArray(section.subsections)[subIndex]) {
      if (action === 'remove-subsection') {
        if (!confirm(`Удалить главу «${section.subsections[subIndex].title || subIndex + 1}»?`)) return;
        section.subsections.splice(subIndex, 1);
        renderSections();
        return;
      }

      if (action === 'move-subsection-up' && subIndex > 0) {
        [section.subsections[subIndex - 1], section.subsections[subIndex]] = [section.subsections[subIndex], section.subsections[subIndex - 1]];
        renderSections();
        return;
      }

      if (action === 'move-subsection-down' && subIndex < section.subsections.length - 1) {
        [section.subsections[subIndex + 1], section.subsections[subIndex]] = [section.subsections[subIndex], section.subsections[subIndex + 1]];
        renderSections();
        return;
      }
    }
  });

  editor.querySelector('#learning-restore-btn').onclick = () => {
    learningDraft = cloneLearningContent(content.learning);
    renderLearningEditor();
  };

  editor.querySelector('#learning-add-section-btn').onclick = () => {
    learningDraft.sections = safeArray(learningDraft.sections);
    learningDraft.sections.push(createEmptySection(learningDraft.sections.length));
    renderLearningEditor();
  };

  editor.querySelector('#learning-save-preview-btn').onclick = persistLearningDraft;
}

async function persistLearningDraft() {
  try {
    await ensureLearningDraft();
    learningDraft = cloneLearningContent(learningDraft);
    if (!learningDraft || typeof learningDraft !== 'object') {
      alert('Неверная структура данных');
      return;
    }

    await saveLearningContent(learningDraft);
    alert('Раздел обучения сохранён в базе данных. Обновите сайт, чтобы увидеть изменения.');
  } catch (err) {
    alert('Не удалось сохранить: ' + err.message);
  }
}

function resetLearningDraft() {
  if (!confirm('Сбросить раздел обучения к исходному src/content.js?')) return;
  learningDraft = cloneLearningContent(content.learning);
  renderLearningEditor();
  alert('Сброшено. Сохраните изменения, чтобы записать их в базу.');
}

const warningBanner = document.createElement('div');
warningBanner.innerHTML = `
  <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px; border-radius: 8px; font-size: 0.95rem; color: #78350f;">
    <strong>⚠️ Важно:</strong> При удалении или перемещении вопросов все ID (e1, e2...) пересчитываются заново. <u>Сохраняйте изменения в открытых карточках</u> перед тем, как двигать списки.
  </div>
`;
listContainer.parentElement.insertBefore(warningBanner, listContainer);

// --- ЗАГРУЗКА И ОТРИСОВКА ---
async function fetchQuestions() {
  const { data: questions, error } = await supabase.from('questions').select('*');
  if (error) {
    listContainer.innerHTML = '<p style="color:red;">Ошибка загрузки базы: ' + error.message + '</p>';
    return;
  }

  questions.sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });

  currentQuestions = questions;
  renderQuestionsList();
  renderAnnouncementEditor()
}

function renderQuestionsList() {
  listContainer.innerHTML = '';
  currentQuestions.forEach((q, index) => {
    listContainer.appendChild(createEditorComponent(q, false, index, currentQuestions.length));
  });
}

// --- ЛОГИКА ПЕРЕИНДЕКСАЦИИ (ДВИЖЕНИЕ И УДАЛЕНИЕ) ---
async function syncDatabaseAndRender(newArray, loadingText) {
  const loader = document.createElement('div');
  loader.innerHTML = `<h2 style="color: white; font-family: sans-serif;">${loadingText} Перестраиваем базу...</h2>`;
  loader.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 9999; display: flex; align-items: center; justify-content: center;';
  document.body.appendChild(loader);

  try {
    const finalArray = newArray.map((q, i) => ({ ...q, id: `e${i + 1}` }));
    const { data: oldData } = await supabase.from('questions').select('id');
    const oldIds = oldData.map(q => q.id);
    
    if (oldIds.length > 0) {
      await supabase.from('questions').delete().in('id', oldIds);
    }

    if (finalArray.length > 0) {
      await supabase.from('questions').insert(finalArray);
    }

    currentQuestions = finalArray;
    renderQuestionsList();
  } catch (err) {
    alert('Ошибка при синхронизации базы: ' + err.message);
  } finally {
    loader.remove();
  }
}

async function handleMove(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= currentQuestions.length) return;
  const newArray = [...currentQuestions];
  [newArray[index], newArray[targetIndex]] = [newArray[targetIndex], newArray[index]];
  await syncDatabaseAndRender(newArray, 'Сдвигаем вопрос 🔄');
}

async function handleDelete(index) {
  if (!confirm('Вы уверены, что хотите удалить этот вопрос? Все последующие вопросы сдвинутся вверх и изменят свой ID.')) return;
  const newArray = [...currentQuestions];
  newArray.splice(index, 1);
  await syncDatabaseAndRender(newArray, 'Удаляем вопрос 🗑️');
}

// ============================================================================
// МОДАЛЬНОЕ ОКНО БЫСТРОЙ СОРТИРОВКИ (DRAG & DROP)
// ============================================================================
function openReorderModal() {
  if (currentQuestions.length === 0) return alert('Нет вопросов для сортировки!');

  const overlay = document.createElement('div');
  overlay.className = 'reorder-overlay';

  const listItemsHtml = currentQuestions.map((q, i) => `
    <div class="reorder-item" draggable="true" data-index="${i}">
      <span class="drag-handle">☰</span>
      <div style="flex:1; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">
        <strong style="color:#3b82f6;">${q.id}</strong>: 
        <span style="color:#334155;">${escapeHtml(q.title || q.prompt)}</span>
      </div>
    </div>
  `).join('');

  overlay.innerHTML = `
    <div class="reorder-modal">
      <div class="reorder-header">
        <h3 style="margin:0; color:#0f172a;">Перетащите вопросы, чтобы изменить порядок</h3>
        <button class="icon-btn close-modal" style="border:none; background:none;">✖</button>
      </div>
      <div class="reorder-list" id="reorder-list-container">
        ${listItemsHtml}
      </div>
      <div class="reorder-footer">
        <button class="icon-btn cancel-btn" style="padding: 8px 15px;">Отмена</button>
        <button class="save-btn save-order-btn" style="margin:0; width:auto; padding: 8px 20px; background: #8b5cf6;">Сохранить новый порядок</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  setTimeout(() => overlay.classList.add('active'), 10);

  const closeModal = () => {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 300);
  };
  
  overlay.querySelector('.close-modal').onclick = closeModal;
  overlay.querySelector('.cancel-btn').onclick = closeModal;

  // ЛОГИКА DRAG & DROP
  const listContainerEl = overlay.querySelector('#reorder-list-container');
  let draggedItem = null;

  const items = overlay.querySelectorAll('.reorder-item');
  items.forEach(item => {
    item.addEventListener('dragstart', function(e) {
      draggedItem = this;
      setTimeout(() => this.style.opacity = '0.4', 0);
    });

    item.addEventListener('dragend', function() {
      draggedItem = null;
      this.style.opacity = '1';
      items.forEach(i => { i.style.borderTop = ''; i.style.borderBottom = ''; });
    });

    item.addEventListener('dragover', function(e) {
      e.preventDefault();
      if (this !== draggedItem) {
        const rect = this.getBoundingClientRect();
        const offset = e.clientY - rect.top;
        if (offset < rect.height / 2) {
          this.style.borderTop = '3px solid #8b5cf6';
          this.style.borderBottom = '';
        } else {
          this.style.borderBottom = '3px solid #8b5cf6';
          this.style.borderTop = '';
        }
      }
    });

    item.addEventListener('dragleave', function() {
      this.style.borderTop = '';
      this.style.borderBottom = '';
    });

    item.addEventListener('drop', function(e) {
      e.preventDefault();
      this.style.borderTop = '';
      this.style.borderBottom = '';
      if (this !== draggedItem) {
        const rect = this.getBoundingClientRect();
        const offset = e.clientY - rect.top;
        if (offset < rect.height / 2) {
          listContainerEl.insertBefore(draggedItem, this);
        } else {
          listContainerEl.insertBefore(draggedItem, this.nextSibling);
        }
      }
    });
  });

  // СОХРАНЕНИЕ НОВОГО ПОРЯДКА
  overlay.querySelector('.save-order-btn').onclick = () => {
    const newDOMItems = listContainerEl.querySelectorAll('.reorder-item');
    const newArray = [];
    newDOMItems.forEach(item => {
      const originalIndex = parseInt(item.dataset.index, 10);
      newArray.push(currentQuestions[originalIndex]);
    });
    
    closeModal();
    syncDatabaseAndRender(newArray, 'Массовая сортировка...');
  };
}

// ============================================================================
// ГЛАВНЫЙ ВИЗУАЛЬНЫЙ КОНСТРУКТОР ВОПРОСА (GUI)
// ============================================================================
function createEditorComponent(initialData, isNew = false, index = 0, totalQuestions = 1) {
  const qDiv = document.createElement('div');
  qDiv.className = 'question-editor';
  if (isNew) qDiv.style.border = '2px dashed #3b82f6';

  let state = {
    id: initialData.id || `e${currentQuestions.length + 1}`,
    kind: initialData.kind || 'text',
    title: initialData.title || '',
    prompt: initialData.prompt || 'Изучите ПРО',
    reviewHint: initialData.reviewHint || '',
    options: Array.isArray(initialData.options) ? [...initialData.options] : [],
    correctAnswer: initialData.correctAnswer || (initialData.kind === 'multi' ? [] : '')
  };

  if (state.kind === 'multi' && !Array.isArray(state.correctAnswer)) {
    state.correctAnswer = state.correctAnswer ? [state.correctAnswer] : [];
  }

  const headerHtml = isNew 
    ? '<h3 style="color: #0f172a; margin-top: 0;">✨ Создание нового вопроса</h3>' 
    : `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; background: #f8fafc; padding: 10px 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <h3 style="margin: 0; color: #0f172a; font-size: 1.1rem;">Вопрос ${index + 1} <span style="color: #94a3b8; font-size: 0.9rem; font-weight: normal;">(${state.id})</span></h3>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="icon-btn move-up" title="Сдвинуть вверх" ${index === 0 ? 'disabled' : ''}>⬆️</button>
          <button type="button" class="icon-btn move-down" title="Сдвинуть вниз" ${index === totalQuestions - 1 ? 'disabled' : ''}>⬇️</button>
          <button type="button" class="icon-btn delete-q" title="Удалить навсегда">🗑️</button>
        </div>
      </div>
    `;

  const positionOptions = Array.from({ length: currentQuestions.length + 1 }, (_, i) => 
    `<option value="${i}" ${i === 0 ? 'selected' : ''}>Вставить на позицию ${i + 1} ${i === 0 ? '(Самым первым)' : i === currentQuestions.length ? '(В самый конец)' : ''}</option>`
  ).join('');

  const idOrPositionHtml = isNew 
    ? `
      <div class="editor-row">
        <label style="color: #8b5cf6;">Позиция в списке (куда вставить вопрос):</label>
        <select class="q-position custom-select" style="border-color: #8b5cf6;">
          ${positionOptions}
        </select>
      </div>
      `
    : `
      <div class="editor-row" style="display: none;">
        <input type="text" class="q-id" value="${escapeHtml(state.id)}" disabled>
      </div>
      `;

  const btnClass = isNew ? 'save-btn is-new' : 'save-btn';
  const btnText = isNew ? 'Добавить в базу' : 'Сохранить изменения в карточке';
  
  const selSingle = state.kind === 'single' ? 'selected' : '';
  const selMulti = state.kind === 'multi' ? 'selected' : '';
  const selText = state.kind === 'text' ? 'selected' : '';
  const selSingleImg = state.kind === 'single-image' ? 'selected' : '';

  qDiv.innerHTML = headerHtml + idOrPositionHtml + `
    <div class="editor-row">
      <label>Тип вопроса (kind):</label>
      <select class="q-kind custom-select">
        <option value="single" ${selSingle}>Один вариант (single)</option>
        <option value="multi" ${selMulti}>Несколько вариантов (multi)</option>
        <option value="single-image" ${selSingleImg}>Один вариант с картинками (single-image)</option>
        <option value="text" ${selText}>Текстовый ответ (text)</option>
      </select>
    </div>
    <div class="editor-row">
      <label>Заголовок (title):</label>
      <input type="text" class="q-title" value="${escapeHtml(state.title)}">
    </div>
    <div class="editor-row">
      <label>Описание (prompt):</label>
      <textarea class="q-prompt" rows="2">${escapeHtml(state.prompt)}</textarea>
    </div>
    <div class="editor-row">
      <label>Подсказка / Правило (reviewHint):</label>
      <textarea class="q-review" rows="2">${escapeHtml(state.reviewHint)}</textarea>
    </div>
    
    <div class="gui-container"></div>
    
    <button class="${btnClass}">
      ${btnText}
    </button>
  `;

  if (!isNew) {
    qDiv.querySelector('.move-up')?.addEventListener('click', () => handleMove(index, -1));
    qDiv.querySelector('.move-down')?.addEventListener('click', () => handleMove(index, 1));
    qDiv.querySelector('.delete-q')?.addEventListener('click', () => handleDelete(index));
  }

  const guiContainer = qDiv.querySelector('.gui-container');
  const kindSelect = qDiv.querySelector('.q-kind');

  const renderGUI = () => {
    guiContainer.innerHTML = '';

    if (state.kind === 'text') {
      const correctStr = typeof state.correctAnswer === 'string' ? state.correctAnswer : '';
      guiContainer.innerHTML = `
        <div class="gui-section">
          <label class="gui-section-label">Ключевые слова или эталонный ответ (correctAnswer):</label>
          <textarea class="q-text-correct" rows="3" placeholder="Свободный бюджет, оружие, и т.д.">${escapeHtml(correctStr)}</textarea>
        </div>
      `;
      guiContainer.querySelector('.q-text-correct').addEventListener('input', (e) => {
        state.correctAnswer = e.target.value;
      });
    } else {
      const isImage = state.kind === 'single-image';
      const placeholderText = isImage ? "Введите ссылку на картинку (https://...)" : "Введите новый вариант ответа...";
      
      guiContainer.innerHTML = `
        <div class="gui-section">
          <label class="gui-section-label">Варианты ответов (${isImage ? 'ссылки на изображения' : 'отметьте правильные ✅'}):</label>
          <div class="opt-add-bar">
            <input type="text" class="new-opt-input" placeholder="${placeholderText}">
            <button type="button" class="opt-add-btn">Добавить</button>
          </div>
          <div class="opt-list"></div>
        </div>
      `;

      const listEl = guiContainer.querySelector('.opt-list');
      const inputEl = guiContainer.querySelector('.new-opt-input');
      const addBtnEl = guiContainer.querySelector('.opt-add-btn');

      const addOption = () => {
        const val = inputEl.value.trim();
        if (val && !state.options.includes(val)) {
          state.options.push(val);
          inputEl.value = '';
          renderOptionsList();
        }
      };

      addBtnEl.addEventListener('click', addOption);
      inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } });

      const renderOptionsList = () => {
        listEl.innerHTML = '';
        if (state.options.length === 0) {
          listEl.innerHTML = '<span style="color: #94a3b8; font-size: 0.9rem;">Пока нет вариантов. Добавьте первый!</span>';
        }

        state.options.forEach(opt => {
          const isCorrect = state.kind === 'multi' 
            ? Array.isArray(state.correctAnswer) && state.correctAnswer.includes(opt)
            : state.correctAnswer === opt;

          const pill = document.createElement('div');
          pill.className = 'opt-pill ' + (isCorrect ? 'is-correct' : '');
          
          const inputType = (state.kind === 'single' || state.kind === 'single-image') ? 'radio' : 'checkbox';
          const checkedAttr = isCorrect ? 'checked' : '';

          // Если это картинка, рендерим превью сбоку
          const optPreview = isImage 
            ? `<img src="${escapeHtml(opt)}" style="height: 40px; width: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1; flex-shrink: 0; background: #e2e8f0;">` 
            : '';
          
          // Стилизуем текст, чтобы длинные ссылки не ломали UI
          const textStyles = isImage ? 'font-size: 0.75rem; color: #64748b; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;' : '';

          pill.innerHTML = `
            <label class="opt-content">
              <input type="${inputType}" name="correct-${state.id}" ${checkedAttr} style="transform: scale(1.2); cursor: pointer; flex-shrink: 0;">
              ${optPreview}
              <span class="opt-text" style="${textStyles}">${escapeHtml(opt)}</span>
            </label>
            <button type="button" class="opt-del-btn" title="Удалить">✖</button>
          `;

          const inputCheck = pill.querySelector('input');
          inputCheck.addEventListener('change', () => {
            if (state.kind === 'single' || state.kind === 'single-image') {
              state.correctAnswer = opt;
            } else {
              if (inputCheck.checked) {
                if (!state.correctAnswer.includes(opt)) state.correctAnswer.push(opt);
              } else {
                state.correctAnswer = state.correctAnswer.filter(ans => ans !== opt);
              }
            }
            renderOptionsList(); 
          });

          pill.querySelector('.opt-del-btn').addEventListener('click', () => {
            state.options = state.options.filter(o => o !== opt);
            if ((state.kind === 'single' || state.kind === 'single-image') && state.correctAnswer === opt) state.correctAnswer = '';
            if (state.kind === 'multi') state.correctAnswer = state.correctAnswer.filter(ans => ans !== opt);
            renderOptionsList();
          });

          listEl.appendChild(pill);
        });
      };
      
      renderOptionsList();
    }
  };

  kindSelect.addEventListener('change', (e) => {
    state.kind = e.target.value;
    state.correctAnswer = state.kind === 'multi' ? [] : '';
    renderGUI();
  });

  renderGUI(); 

  qDiv.querySelector('.save-btn').addEventListener('click', async (e) => {
    const btn = e.target;
    btn.textContent = isNew ? 'Отправка...' : 'Сохраняю...';
    
    if (!isNew) state.id = qDiv.querySelector('.q-id').value.trim();
    state.title = qDiv.querySelector('.q-title').value.trim();
    state.prompt = qDiv.querySelector('.q-prompt').value.trim();
    state.reviewHint = qDiv.querySelector('.q-review').value.trim();

    const payload = {
      id: state.id,
      kind: state.kind,
      title: state.title,
      prompt: state.prompt,
      "reviewHint": state.reviewHint,
      options: state.kind === 'text' ? [] : state.options,
      correctAnswer: state.correctAnswer
    };

    if (isNew) {
      const insertIndex = parseInt(qDiv.querySelector('.q-position').value, 10);
      const newArray = [...currentQuestions];
      newArray.splice(insertIndex, 0, payload);
      
      qDiv.remove();
      await syncDatabaseAndRender(newArray, 'Добавляем и сдвигаем 🪄');
      
    } else {
      const { error } = await supabase.from('questions').update(payload).eq('id', state.id);

      if (error) {
        alert('Ошибка: ' + error.message);
        btn.textContent = 'Сохранить изменения в карточке';
      } else {
        btn.textContent = '✅ Успешно!';
        btn.style.background = '#10b981'; 
        
        currentQuestions[index] = payload;
        setTimeout(() => { btn.textContent = 'Сохранить изменения в карточке'; btn.style.background = '#3b82f6'; }, 2000);
      }
    }
  });

  return qDiv;
}

addBtn.addEventListener('click', () => {
  if (adminMode !== 'exams') return;
  const newEditor = createEditorComponent({ kind: 'text' }, true);
  listContainer.prepend(newEditor);
  window.scrollTo({ top: newEditor.offsetTop - 50, behavior: 'smooth' });
});

adminTabExams?.addEventListener('click', () => setAdminMode('exams'));
adminTabLearning?.addEventListener('click', () => setAdminMode('learning'));
saveLearningBtn?.addEventListener('click', persistLearningDraft);
resetLearningBtn?.addEventListener('click', resetLearningDraft);

const overlay = document.getElementById('admin-auth-overlay');
const passwordInput = document.getElementById('admin-password-input');
const authBtn = document.getElementById('admin-auth-btn');

function checkAuth() {
  if (sessionStorage.getItem(config.adminSessionKey) === 'true') {
    if (overlay) overlay.remove(); 
    setAdminMode('exams');
    fetchQuestions(); 
  }
}

authBtn.addEventListener('click', () => {
  if (passwordInput.value.trim() === config.adminCode) { 
    sessionStorage.setItem(config.adminSessionKey, 'true');
    checkAuth();
  } else {
    alert('Неверный пароль!');
    passwordInput.value = '';
    passwordInput.focus();
  }
});

// Добавь это в админку (например, в renderAdminShell)
async function renderAnnouncementEditor() {
  const { data, error } = await supabase.from('global_announcements').select('*').limit(1).single();
  
  if (error || !data) {
    console.warn('Не удалось загрузить объявление:', error?.message);
    return;
  }

  const recordId = data.id; // Используем реальный id записи из базы

  const editor = document.createElement('div');
  editor.className = 'question-editor';
  editor.innerHTML = `
    <h3>Управление объявлением на главной</h3>
    <div class="editor-row">
      <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
        <input type="checkbox" id="ann-active" ${data.active ? 'checked' : ''} style="width: 20px; height: 20px;"> 
        <span>Включить объявление</span>
      </label>
    </div>
    <div class="editor-row">
      <label>Текст объявления:</label>
      <textarea id="ann-text" rows="4" placeholder="Текст объявления">${escapeHtml(data.text || '')}</textarea>
    </div>
    <div class="editor-row">
      <label>Ссылка (опционально):</label>
      <input type="text" id="ann-link" placeholder="https://..." value="${escapeHtml(data.link || '')}">
    </div>
    <button id="save-ann" class="save-btn">Сохранить объявление</button>
  `;
  listContainer.parentElement.insertBefore(editor, listContainer);

  document.getElementById('save-ann').onclick = async () => {
    const btn = document.getElementById('save-ann');
    btn.textContent = 'Сохраняю...';
    
    const { error: updateError } = await supabase.from('global_announcements').update({
      active: document.getElementById('ann-active').checked,
      text: document.getElementById('ann-text').value,
      link: document.getElementById('ann-link').value
    }).eq('id', recordId);
    
    if (updateError) {
      alert('Ошибка сохранения: ' + updateError.message);
      btn.textContent = 'Сохранить объявление';
    } else {
      btn.textContent = '✅ Обновлено!';
      btn.style.background = '#10b981';
      setTimeout(() => { btn.textContent = 'Сохранить объявление'; btn.style.background = '#3b82f6'; }, 2000);
    }
  };
}
// Вызови renderAnnouncementEditor() после успешной авторизации админа

ensureLearningDraft().catch((error) => {
  console.error('Не удалось загрузить раздел обучения:', error);
});

passwordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') authBtn.click(); });
checkAuth();