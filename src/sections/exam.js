import { escapeHtml } from '../lib/dom.js';

// Храним состояние экзамена
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

  // ВАЖНО: добавили data-original-index="${index}" для обратной сортировки
  // и класс q-number для визуальной перенумерации
  return `
    <article class="question-card" data-question-id="${escapeHtml(question.id)}" data-original-index="${index}">
      <div class="question-meta">
        <span class="q-number">Вопрос ${index + 1}</span>
      </div>
      <h3>${escapeHtml(question.title)}</h3>
      <p>${escapeHtml(question.prompt)}</p>
      ${optionsMarkup}
    </article>
  `;
}

// --- ФУНКЦИИ АНТИ-ЧИТА ---
function enableAntiCheat(formEl) {
  disableAntiCheat(); 

  examVisibilityHandler = () => {
    const isExamVisible = formEl.offsetParent !== null;
    if (document.hidden && isExamVisible && isExamStarted) {
      alert("Внимание! Вы покинули вкладку во время экзамена. Страница будет перезагружена.");
      window.location.reload();
    }
  };
  document.addEventListener("visibilitychange", examVisibilityHandler);

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


export function renderExamSection({ formEl, questions, state, onAnswerChange, onMetaChange, onSubmit }) {
  
  if (!isExamStarted) {
    disableAntiCheat(); 
    
    formEl.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; background: rgba(7, 13, 28, 0.5); border-radius: 16px; border: 1px solid rgba(127, 227, 255, 0.2);">
        <h2 style="margin-bottom: 15px; color: #fff;">Готов сдать экзамен?</h2>
        <p style="margin-bottom: 25px; color: #97a7c6; max-width: 500px; margin-left: auto; margin-right: auto; line-height: 1.5;">
          После нажатия кнопки запустится анти-чит система. Сворачивать браузер, переключать вкладки или подглядывать в «Обучение» будет запрещено. Любое из этих действий приведет к аннулированию.
        </p>
        <div style="background: rgba(255, 71, 87, 0.04); border-left: 4px solid #ff4757; padding: 22px 28px; border-radius: 0 16px 16px 0; margin: 25px auto; font-family: sans-serif; line-height: 1.6; max-width: 600px; text-align: left; box-shadow: inset 0 0 20px rgba(255, 71, 87, 0.02);">
    
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
      <span style="font-size: 1.6rem; filter: drop-shadow(0 0 8px rgba(255, 71, 87, 0.6));">⚠️</span>
      <h3 style="color: #ff4757; margin: 0; font-size: 1.15rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 800;">Внимание, стажёры!</h3>
    </div>
    
    <p style="color: #cbd5e1; margin: 0; font-size: 1.05rem;">
      Старший состав будет <b style="color: #fff;">тщательно проверять</b> не только ваше понимание 
      <span style="color: #7fe3ff; font-weight: 600; border-bottom: 1px dashed rgba(127, 227, 255, 0.5); cursor: default;">ПРО</span>, 
      <span style="color: #7fe3ff; font-weight: 600; border-bottom: 1px dashed rgba(127, 227, 255, 0.5); cursor: default;">устава</span> и 
      <span style="color: #7fe3ff; font-weight: 600; border-bottom: 1px dashed rgba(127, 227, 255, 0.5); cursor: default;">ППЭ</span>, 
      но и практическую <span style="color: #ffda75; font-weight: 700; text-decoration: underline; text-underline-offset: 4px; text-decoration-color: rgba(255, 218, 117, 0.5);">правильность редактирования</span> объявлений.
    </p>
    
    <div style="margin-top: 18px; padding-top: 16px; border-top: 1px solid rgba(255, 71, 87, 0.15);">
      <div style="display: inline-block; background: rgba(255, 71, 87, 0.1); color: #ff6b81; padding: 4px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
        Особый контроль
      </div>
      <p style="color: #97a7c6; margin: 0; font-size: 0.95rem;">
        Критически важно строгое соблюдение <b style="color: #fff;">орфографии</b> и <b style="color: #fff;">пунктуации</b> <i style="color: #64748b;">(правильной расстановки знаков препинания)</i>. За ошибки в тексте объявлений экзамен может быть аннулирован.
      </p>
    </div>
    
  </div>
        <button id="btn-start-exam" class="primary-button" type="button" style="font-size: 1.1rem; padding: 12px 30px;">Начать экзамен</button>
      </div>
    `;

    formEl.querySelector('#btn-start-exam').addEventListener('click', () => {
      isExamStarted = true; 
      renderExamSection({ formEl, questions, state, onAnswerChange, onMetaChange, onSubmit });
    });
    return; 
  }


  // --- ЭКЗАМЕН НАЧАЛСЯ ---
  enableAntiCheat(formEl); 

  // 1. Рендерим вопросы В ОРИГИНАЛЬНОМ ПОРЯДКЕ (помещаем их в контейнер #exam-questions-container)
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
    
    <div id="exam-questions-container">
      ${questions.map((question, index) => createQuestionMarkup(question, index, state.answers[question.id])).join('')}
    </div>
    
    <div class="form-footer">
      <button class="primary-button" type="submit">Сдать экзамен</button>
      <p>Система не знает правильные ответы. Проверяющий позже пометит экзамен как «сдал» или «не сдал».</p>
    </div>
  `;

  /*// 2. ДОМ-МАГИЯ: ПЕРЕМЕШИВАЕМ КАРТОЧКИ ВИЗУАЛЬНО
  const container = formEl.querySelector('#exam-questions-container');
  if (container) {
    const cards = Array.from(container.querySelectorAll('.question-card'));
    
    // Перемешиваем массив карточек (Фишер-Йетс)
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    
    // Вставляем обратно в случайном порядке и красиво перенумеровываем от 1 до N
    cards.forEach((card, index) => {
      container.appendChild(card); // Перемещение элемента
      card.querySelector('.q-number').textContent = `Вопрос ${index + 1}`;
    });
  }*/

  // --- ПЕРЕХВАТ ОТПРАВКИ ---
  formEl.addEventListener('submit', (event) => {
    event.preventDefault(); 
    disableAntiCheat(); 
    isExamStarted = false; 

    // 3. ДОМ-МАГИЯ: ВОЗВРАЩАЕМ КАК БЫЛО ПЕРЕД ОТПРАВКОЙ!
    /*// Твоя система даже не узнает, что вопросы переставлялись местами
    if (container) {
      const currentCards = Array.from(container.querySelectorAll('.question-card'));
      currentCards.sort((a, b) => Number(a.dataset.originalIndex) - Number(b.dataset.originalIndex));
      currentCards.forEach(card => container.appendChild(card));
    }*/

    onSubmit(event); 
  });


  // Слушатели данных остаются стандартными
  formEl.querySelector('#exam-name').addEventListener('input', (event) => onMetaChange('name', event.currentTarget.value));
  formEl.querySelector('#exam-squad').addEventListener('input', (event) => onMetaChange('squad', event.currentTarget.value));

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