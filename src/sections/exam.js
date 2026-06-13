import { escapeHtml } from '../lib/dom.js';

// Храним состояние: начат ли экзамен
let isExamStarted = false;

// Храним ссылки на функции анти-чита
let examVisibilityHandler = null;
let examTabCheatHandler = null;

function createQuestionMarkup(question, index, currentAnswer) {
  const options = question.options ?? [];

  const optionsMarkup =
    question.kind === 'single'
      ? `<div class="options">
          ${options
            .map(
              (option) => `
                <label class="option-row">
                  <input type="radio" name="exam-${question.id}" value="${escapeHtml(option)}" ${currentAnswer === option ? 'checked' : ''} />
                  <span>${escapeHtml(option)}</span>
                </label>
              `,
            )
            .join('')}
        </div>`
      : question.kind === 'multi'
        ? `<div class="options">
            ${options
              .map(
                (option) => `
                  <label class="option-row">
                    <input type="checkbox" data-option="${escapeHtml(option)}" ${Array.isArray(currentAnswer) && currentAnswer.includes(option) ? 'checked' : ''} />
                    <span>${escapeHtml(option)}</span>
                  </label>
                `,
              )
              .join('')}
          </div>`
        : `<textarea class="text-area" rows="4" data-question-id="${escapeHtml(question.id)}" placeholder="Коротко, по фактам">${escapeHtml(currentAnswer ?? '')}</textarea>`;

  return `
    <article class="question-card" data-question-id="${escapeHtml(question.id)}">
      <div class="question-meta">
        <span>Вопрос ${index + 1}</span>
      </div>
      <h3>${escapeHtml(question.title)}</h3>
      <p>${escapeHtml(question.prompt)}</p>
      ${optionsMarkup}
    </article>
  `;
}

// Функции-помощники для управления анти-читом
function enableAntiCheat(formEl) {
  disableAntiCheat(); // Убиваем старые, если вдруг остались

  // 1. Ловим сворачивание (Alt+Tab, смена вкладки браузера)
  examVisibilityHandler = () => {
    const isExamVisible = formEl.offsetParent !== null;
    if (document.hidden && isExamVisible && isExamStarted) {
      alert("Внимание! Вы покинули вкладку во время экзамена. Страница будет перезагружена.");
      window.location.reload();
    }
  };
  document.addEventListener("visibilitychange", examVisibilityHandler);

  // 2. Ловим клики по кнопкам навигации на самом сайте
  examTabCheatHandler = (event) => {
    const clickedTab = event.target.closest('.tab-button');
    if (clickedTab && clickedTab.dataset.section !== 'exam') {
      const isExamVisible = formEl.offsetParent !== null;
      if (isExamVisible && isExamStarted) {
        alert("Внимание! Вы попытались открыть другой раздел сайта во время экзамена. Экзамен аннулирован.");
        window.location.reload();
      }
    }
  };
  document.addEventListener("click", examTabCheatHandler, true);
}

function disableAntiCheat() {
  if (examVisibilityHandler) {
    document.removeEventListener("visibilitychange", examVisibilityHandler);
    examVisibilityHandler = null;
  }
  if (examTabCheatHandler) {
    document.removeEventListener("click", examTabCheatHandler, true);
    examTabCheatHandler = null;
  }
}


// --- ОСНОВНАЯ ФУНКЦИЯ РЕНДЕРА ---
export function renderExamSection({ formEl, questions, state, onAnswerChange, onMetaChange, onSubmit }) {
  
  // Если экзамен ЕЩЕ НЕ НАЧАТ -> показываем экран старта
  if (!isExamStarted) {
    disableAntiCheat(); // Гарантируем, что защита спит
    
    // Красивая заглушка перед стартом
    formEl.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; background: rgba(7, 13, 28, 0.5); border-radius: 16px; border: 1px solid rgba(127, 227, 255, 0.2);">
        <h2 style="margin-bottom: 15px; color: #fff;">Готов сдать экзамен?</h2>
        <p style="margin-bottom: 25px; color: #97a7c6; max-width: 500px; margin-left: auto; margin-right: auto; line-height: 1.5;">
          После нажатия кнопки запустится анти-чит система. Сворачивать браузер, переключать вкладки или подглядывать в «Обучение» будет запрещено. Любое из этих действий приведет к аннулированию.
        </p>
        <button id="btn-start-exam" class="primary-button" type="button" style="font-size: 1.1rem; padding: 12px 30px;">Начать экзамен</button>
      </div>
    `;

    // Ждем нажатия на кнопку старта
    formEl.querySelector('#btn-start-exam').addEventListener('click', () => {
      isExamStarted = true; // Меняем состояние
      // Перезапускаем рендер, но теперь он пойдет по ветке "экзамен начат"
      renderExamSection({ formEl, questions, state, onAnswerChange, onMetaChange, onSubmit });
    });

    return; // Останавливаем выполнение функции, пока не нажали старт
  }


  // --- ЭКЗАМЕН НАЧАЛСЯ ---
  
  enableAntiCheat(formEl); // Выпускаем кракена (включаем слежку)

  // Рендерим саму форму
  formEl.innerHTML = `
    <div class="grid-3">
      <label>
        Имя
        <input id="exam-name" class="text-input" value="${escapeHtml(state.meta.name)}" placeholder="Имя_Фамилия" />
      </label>
      <label>
        Организация
        <input id="exam-squad" class="text-input" value="${escapeHtml(state.meta.squad)}" placeholder="Организация" />
      </label>
    </div>
    ${questions.map((question, index) => createQuestionMarkup(question, index, state.answers[question.id])).join('')}
    <div class="form-footer">
      <button class="primary-button" type="submit">Сдать экзамен</button>
      <p>Система не знает правильные ответы. Проверяющий позже пометит экзамен как «сдал» или «не сдал».</p>
    </div>
  `;

  // --- ПЕРЕХВАТ ОТПРАВКИ ---
  formEl.addEventListener('submit', (event) => {
    event.preventDefault(); 
    disableAntiCheat(); // Вырубаем защиту ПЕРЕД отправкой
    isExamStarted = false; // Сбрасываем статус, чтобы в следующий раз снова была кнопка старта
    onSubmit(event); 
  });

  formEl.querySelector('#exam-name').addEventListener('input', (event) => {
    onMetaChange('name', event.currentTarget.value);
  });
  formEl.querySelector('#exam-squad').addEventListener('input', (event) => {
    onMetaChange('squad', event.currentTarget.value);
  });

  formEl.querySelectorAll('input[type="radio"]').forEach((input) => {
    input.addEventListener('change', (event) => {
      const questionId = input.closest('[data-question-id]').dataset.questionId;
      onAnswerChange(questionId, event.currentTarget.value, 'single');
    });
  });

  formEl.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener('change', () => {
      const questionId = input.closest('[data-question-id]').dataset.questionId;
      onAnswerChange(questionId, input.dataset.option, 'multi');
    });
  });

  formEl.querySelectorAll('textarea').forEach((textarea) => {
    textarea.addEventListener('input', () => {
      onAnswerChange(textarea.dataset.questionId, textarea.value, 'text');
    });
  });
}