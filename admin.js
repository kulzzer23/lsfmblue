import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { config } from './src/config.js';

// --- СТИЛИ ДЛЯ АДМИНКИ (ВКЛЮЧАЯ КНОПКИ УПРАВЛЕНИЯ) ---
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
  
  .opt-content { display: flex; align-items: center; gap: 12px; flex: 1; cursor: pointer; }
  .opt-text { color: #0f172a; font-size: 0.95rem; word-break: break-word; }
  
  .icon-btn { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; padding: 6px 10px; transition: 0.2s; font-size: 1.1rem; }
  .icon-btn:hover { background: #f1f5f9; border-color: #94a3b8; }
  .icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .delete-q:hover { background: #fef2f2; border-color: #fca5a5; }
  .opt-del-btn { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.2rem; opacity: 0.6; transition: 0.2s; padding: 0 5px; }
  .opt-del-btn:hover { opacity: 1; transform: scale(1.1); }
  
  .save-btn { width: 100%; padding: 12px; border: none; border-radius: 6px; font-weight: bold; font-size: 1rem; cursor: pointer; transition: 0.2s; color: #fff; background: #3b82f6; margin-top: 15px; }
  .save-btn:hover { background: #2563eb; }
  .save-btn.is-new { background: #f59e0b; }
  .save-btn.is-new:hover { background: #d97706; }
  
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
`;
document.head.appendChild(style);

// --- КЛЮЧИ И ПОДКЛЮЧЕНИЕ К БАЗЕ ---
const supabaseUrl = 'https://eijjetlaiourgzkzsqpx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpampldGxhaW91cmd6a3pzcXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzI1NTksImV4cCI6MjA5Njg0ODU1OX0.WkjbDWWOm9EJkBzIyJS-CWRV8bxGffrkR0-SmoycWPM';
const supabase = createClient(supabaseUrl, supabaseKey);

const listContainer = document.getElementById('admin-questions-list');
const addBtn = document.getElementById('add-new-btn');

// Глобальный массив всех вопросов в памяти
let currentQuestions = [];

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ДОБАВЛЯЕМ ПРЕДУПРЕЖДЕНИЕ О ПЕРЕМЕЩЕНИИ
const warningBanner = document.createElement('div');
warningBanner.innerHTML = `
  <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px; border-radius: 8px; font-size: 0.95rem; color: #78350f;">
    <strong>⚠️ Важно:</strong> При удалении или перемещении вопросов все ID (e1, e2...) пересчитываются заново. <u>Обязательно сохраните текущие изменения в карточках</u> перед тем, как двигать списки!
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
}

function renderQuestionsList() {
  listContainer.innerHTML = '';
  currentQuestions.forEach((q, index) => {
    listContainer.appendChild(createEditorComponent(q, false, index, currentQuestions.length));
  });
}

// --- ЛОГИКА ПЕРЕИНДЕКСАЦИИ (ДВИЖЕНИЕ И УДАЛЕНИЕ) ---
async function syncDatabaseAndRender(newArray, loadingText) {
  // Показываем экран загрузки
  const loader = document.createElement('div');
  loader.innerHTML = `<h2 style="color: white; font-family: sans-serif;">${loadingText} Перестраиваем базу...</h2>`;
  loader.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 9999; display: flex; align-items: center; justify-content: center;';
  document.body.appendChild(loader);

  try {
    // 1. Переназначаем ID строго по порядку
    const finalArray = newArray.map((q, i) => ({ ...q, id: `e${i + 1}` }));

    // 2. Получаем старые ID и удаляем ВСЕ старые вопросы
    const { data: oldData } = await supabase.from('questions').select('id');
    const oldIds = oldData.map(q => q.id);
    
    if (oldIds.length > 0) {
      await supabase.from('questions').delete().in('id', oldIds);
    }

    // 3. Заливаем массив с правильными ID обратно
    if (finalArray.length > 0) {
      await supabase.from('questions').insert(finalArray);
    }

    // 4. Обновляем локальный массив и перерисовываем
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
  const temp = newArray[index];
  newArray[index] = newArray[targetIndex];
  newArray[targetIndex] = temp;

  await syncDatabaseAndRender(newArray, 'Сдвигаем вопрос 🔄');
}

async function handleDelete(index) {
  if (!confirm('Вы уверены, что хотите удалить этот вопрос? Все последующие вопросы сдвинутся вверх и изменят свой ID.')) return;

  const newArray = [...currentQuestions];
  newArray.splice(index, 1);

  await syncDatabaseAndRender(newArray, 'Удаляем вопрос 🗑️');
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

  // ШАПКА КАРТОЧКИ (С КНОПКАМИ УПРАВЛЕНИЯ)
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

  const btnClass = isNew ? 'save-btn is-new' : 'save-btn';
  const btnText = isNew ? 'Добавить в базу' : 'Сохранить изменения в карточке';
  
  const selSingle = state.kind === 'single' ? 'selected' : '';
  const selMulti = state.kind === 'multi' ? 'selected' : '';
  const selText = state.kind === 'text' ? 'selected' : '';

  qDiv.innerHTML = headerHtml + `
    <div class="editor-row" style="display: none;">
      <input type="text" class="q-id" value="${escapeHtml(state.id)}" disabled>
    </div>
    <div class="editor-row">
      <label>Тип вопроса (kind):</label>
      <select class="q-kind custom-select">
        <option value="single" ${selSingle}>Один вариант (single)</option>
        <option value="multi" ${selMulti}>Несколько вариантов (multi)</option>
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

  // ПРИВЯЗКА КНОПОК ПЕРЕМЕЩЕНИЯ
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
      guiContainer.innerHTML = `
        <div class="gui-section">
          <label class="gui-section-label">Варианты ответов (отметьте правильные ✅):</label>
          <div class="opt-add-bar">
            <input type="text" class="new-opt-input" placeholder="Введите новый вариант ответа...">
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
          
          const inputType = state.kind === 'single' ? 'radio' : 'checkbox';
          const checkedAttr = isCorrect ? 'checked' : '';

          pill.innerHTML = `
            <label class="opt-content">
              <input type="${inputType}" name="correct-${state.id}" ${checkedAttr} style="transform: scale(1.2); cursor: pointer;">
              <span class="opt-text">${escapeHtml(opt)}</span>
            </label>
            <button type="button" class="opt-del-btn" title="Удалить">✖</button>
          `;

          const inputCheck = pill.querySelector('input');
          inputCheck.addEventListener('change', () => {
            if (state.kind === 'single') {
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
            if (state.kind === 'single' && state.correctAnswer === opt) state.correctAnswer = '';
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

  // --- СОХРАНЕНИЕ КОНКРЕТНОЙ КАРТОЧКИ ---
  qDiv.querySelector('.save-btn').addEventListener('click', async (e) => {
    const btn = e.target;
    btn.textContent = isNew ? 'Отправка...' : 'Сохраняю...';
    
    state.id = qDiv.querySelector('.q-id').value.trim();
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

    let error;
    if (isNew) {
      const res = await supabase.from('questions').insert([payload]);
      error = res.error;
    } else {
      const res = await supabase.from('questions').update(payload).eq('id', state.id);
      error = res.error;
    }

    if (error) {
      alert('Ошибка: ' + error.message);
      btn.textContent = isNew ? 'Добавить в базу' : 'Сохранить изменения в карточке';
    } else {
      btn.textContent = '✅ Успешно!';
      btn.style.background = '#10b981'; 
      
      if (isNew) {
        qDiv.querySelector('.q-id').disabled = true;
        qDiv.style.border = '1px solid #e2e8f0'; 
        setTimeout(() => fetchQuestions(), 1000);
      } else {
        // Обновляем в локальном массиве
        currentQuestions[index] = payload;
        setTimeout(() => { btn.textContent = 'Сохранить изменения в карточке'; btn.style.background = '#3b82f6'; }, 2000);
      }
    }
  });

  return qDiv;
}

// ДОБАВЛЕНИЕ НОВОГО ВОПРОСА
addBtn.addEventListener('click', () => {
  const newEditor = createEditorComponent({ kind: 'text' }, true);
  listContainer.prepend(newEditor);
  window.scrollTo({ top: newEditor.offsetTop - 50, behavior: 'smooth' });
});

// --- АВТОРИЗАЦИЯ ---
const overlay = document.getElementById('admin-auth-overlay');
const passwordInput = document.getElementById('admin-password-input');
const authBtn = document.getElementById('admin-auth-btn');

function checkAuth() {
  if (sessionStorage.getItem(config.adminSessionKey) === 'true') {
    if (overlay) overlay.remove(); 
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

passwordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') authBtn.click(); });
checkAuth();