import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { config } from './src/config.js';
const supabaseUrl = 'https://eijjetlaiourgzkzsqpx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpampldGxhaW91cmd6a3pzcXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzI1NTksImV4cCI6MjA5Njg0ODU1OX0.WkjbDWWOm9EJkBzIyJS-CWRV8bxGffrkR0-SmoycWPM';
const supabase = createClient(supabaseUrl, supabaseKey);
/*supabaseUrl: 'https://eijjetlaiourgzkzsqpx.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpampldGxhaW91cmd6a3pzcXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzI1NTksImV4cCI6MjA5Njg0ODU1OX0.WkjbDWWOm9EJkBzIyJS-CWRV8bxGffrkR0-SmoycWPM',
  supabaseTable: 'submissions',
*/
//  adminSessionKey: 'lsfm-pro-admin-session',
//  supabaseUrl: 'https://eijjetlaiourgzkzsqpx.supabase.co',
const listContainer = document.getElementById('admin-questions-list');
const addBtn = document.getElementById('add-new-btn');

// Храним следующий свободный ID
let nextAvailableId = 'e1'; 
// Функция для защиты от "сломанных" кавычек
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function fetchQuestions() {
  // Забираем всё без сортировки базы, отсортируем сами в JS
  const { data: questions, error } = await supabase
    .from('questions')
    .select('*');

  if (error) {
    listContainer.innerHTML = `<p style="color:red;">Ошибка загрузки базы: ${error.message}</p>`;
    return;
  }

  // УМНАЯ СОРТИРОВКА: вырезаем все буквы из ID, оставляем только числа и сравниваем
  questions.sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });

  // ВЫЧИСЛЯЕМ СЛЕДУЮЩИЙ ID
  if (questions.length > 0) {
    const maxNum = Math.max(...questions.map(q => parseInt(q.id.replace(/\D/g, ''), 10) || 0));
    nextAvailableId = `e${maxNum + 1}`;
  }

  renderQuestions(questions);
}

function renderQuestions(questions) {
  listContainer.innerHTML = ''; 

  questions.forEach(q => {
    const qDiv = document.createElement('div');
    qDiv.className = 'question-editor';
    
    const optionsText = (q.options && Array.isArray(q.options)) ? q.options.join('\n') : '';

    qDiv.innerHTML = `
      <div class="editor-row">
        <label>ID Вопроса:</label>
        <input type="text" class="q-id" value="${escapeHtml(q.id)}" disabled>
      </div>
      <div class="editor-row">
        <label>Тип (kind: single / multi / text):</label>
        <input type="text" class="q-kind" value="${escapeHtml(q.kind)}">
      </div>
      <div class="editor-row">
        <label>Заголовок (title):</label>
        <input type="text" class="q-title" value="${escapeHtml(q.title)}">
      </div>
      <div class="editor-row">
        <label>Описание (prompt):</label>
        <textarea class="q-prompt" rows="2">${escapeHtml(q.prompt)}</textarea>
      </div>
      <div class="editor-row">
        <label>Подсказка / Правило (reviewHint):</label>
        <textarea class="q-review" rows="3">${escapeHtml(q.reviewHint)}</textarea>
      </div>
      <div class="editor-row">
        <label>Варианты ответов (каждый с новой строки, оставить пустым для text):</label>
        <textarea class="q-options" rows="3" placeholder="Вариант 1\nВариант 2">${escapeHtml(optionsText)}</textarea>
      </div>
      <button class="save-btn">Сохранить изменения</button>
    `;

    qDiv.querySelector('.save-btn').addEventListener('click', async (e) => {
      const btn = e.target;
      btn.textContent = 'Сохраняю...';
      
      const rawOptions = qDiv.querySelector('.q-options').value.split('\n').map(opt => opt.trim()).filter(opt => opt !== '');
      
      const updatedData = {
        kind: qDiv.querySelector('.q-kind').value,
        title: qDiv.querySelector('.q-title').value,
        prompt: qDiv.querySelector('.q-prompt').value,
        "reviewHint": qDiv.querySelector('.q-review').value,
        options: rawOptions.length > 0 ? rawOptions : [] 
      };

      const { error } = await supabase
        .from('questions')
        .update(updatedData)
        .eq('id', q.id);

      if (error) {
        alert('Ошибка при сохранении: ' + error.message);
        btn.textContent = 'Сохранить изменения';
      } else {
        btn.textContent = '✅ Сохранено!';
        btn.style.background = '#3dcb9a';
        setTimeout(() => { btn.textContent = 'Сохранить изменения'; btn.style.background = '#2ecc71'; }, 2000);
      }
    });

    listContainer.appendChild(qDiv);
  });
}

// --- ЛОГИКА ДОБАВЛЕНИЯ НОВОГО ВОПРОСА ---
addBtn.addEventListener('click', () => {
  const qDiv = document.createElement('div');
  qDiv.className = 'question-editor';
  qDiv.style.border = '2px dashed #7fe3ff'; 

  qDiv.innerHTML = `
    <h3 style="color: #7fe3ff; margin-top: 0;">Создание нового вопроса</h3>
    <div class="editor-row">
      <label>ID Вопроса (ОБЯЗАТЕЛЬНО! Англ, без пробелов):</label>
      <input type="text" class="q-id" value="${nextAvailableId}" style="font-weight: bold; color: #7fe3ff;">
    </div>
    <div class="editor-row">
      <label>Тип (kind: single / multi / text):</label>
      <input type="text" class="q-kind" value="text">
    </div>
    <div class="editor-row">
      <label>Заголовок (title):</label>
      <input type="text" class="q-title" value="">
    </div>
    <div class="editor-row">
      <label>Описание (prompt):</label>
      <textarea class="q-prompt" rows="2">Изучите ПРО</textarea>
    </div>
    <div class="editor-row">
      <label>Подсказка / Правило (reviewHint):</label>
      <textarea class="q-review" rows="3"></textarea>
    </div>
    <div class="editor-row">
      <label>Варианты ответов (каждый с новой строки, оставить пустым для text):</label>
      <textarea class="q-options" rows="3" placeholder="Вариант 1\nВариант 2"></textarea>
    </div>
    <button class="save-btn" style="background: #e67e22;">Добавить в базу</button>
  `;

  qDiv.querySelector('.save-btn').addEventListener('click', async (e) => {
    const btn = e.target;
    const idInput = qDiv.querySelector('.q-id').value.trim();

    if (!idInput) {
      alert('Ошибка: укажите уникальный ID вопроса!');
      return;
    }

    btn.textContent = 'Отправка в БД...';
    
    const rawOptions = qDiv.querySelector('.q-options').value.split('\n').map(opt => opt.trim()).filter(opt => opt !== '');

    const newData = {
      id: idInput,
      kind: qDiv.querySelector('.q-kind').value,
      title: qDiv.querySelector('.q-title').value,
      prompt: qDiv.querySelector('.q-prompt').value,
      "reviewHint": qDiv.querySelector('.q-review').value,
      options: rawOptions.length > 0 ? rawOptions : []
    };

    const { error } = await supabase
      .from('questions')
      .insert([newData]);

    if (error) {
      alert('Ошибка при создании: ' + error.message);
      btn.textContent = 'Добавить в базу';
    } else {
      btn.textContent = '✅ Успешно добавлено!';
      btn.style.background = '#3dcb9a';
      
      qDiv.querySelector('.q-id').disabled = true;
      qDiv.style.border = '1px solid rgba(127, 227, 255, 0.2)'; 
      
      setTimeout(() => {
        fetchQuestions(); 
      }, 1500);
    }
  });

  listContainer.prepend(qDiv);
  window.scrollTo({ top: qDiv.offsetTop - 50, behavior: 'smooth' });
});

// --- ЛОГИКА ПАРОЛЯ И АВТОРИЗАЦИИ ---
const overlay = document.getElementById('admin-auth-overlay');
const passwordInput = document.getElementById('admin-password-input');
const authBtn = document.getElementById('admin-auth-btn');

function checkAuth() {
  // Проверяем, залогинен ли уже админ в этой сессии браузера
  if (sessionStorage.getItem(config.adminSessionKey) === 'true') {
    if (overlay) overlay.remove(); // Полностью удаляем защитный экран из DOM
    fetchQuestions(); // Только теперь скачиваем вопросы из базы
  }
}

authBtn.addEventListener('click', () => {
  // Сверяем введенный текст с кодом из твоего config.js
  if (passwordInput.value.trim() === config.adminCode) { 
    // Если в импорте у тебя config экспортируется как объект, пиши config.adminCode
    // Если пароль подошел — сохраняем сессию
    sessionStorage.setItem(config.adminSessionKey, 'true');
    checkAuth();
  } else {
    alert('Неверный пароль!');
    passwordInput.value = '';
    passwordInput.focus();
  }
});

// Вход по нажатию кнопки Enter в поле ввода
passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') authBtn.click();
});

// Запускаем проверку при открытии страницы
checkAuth();