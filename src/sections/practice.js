import { escapeHtml } from '../lib/dom.js';

// Храним состояние: начата ли практика
let isPracticeStarted = false;

// Добавили параметр itemResult — сюда прилетит результат после проверки
function createQuestionMarkup(question, index, currentAnswer, itemResult) {
  const options = question.options ?? [];
  const isSubmitted = !!itemResult; // Проверяем, сдан ли тест
  
  const optionsMarkup = question.kind === 'single'
    ? `<div class="options">
        ${options.map(option => {
          const isChecked = currentAnswer === option;
          let optionClass = 'option-row';
          
          // Подсветка ответов после проверки
          if (isSubmitted) {
            const isCorrectOption = option === question.correctAnswer;
            if (isCorrectOption) optionClass += ' highlight-correct';
            else if (isChecked) optionClass += ' highlight-wrong';
          }

          return `
            <label class="${optionClass}">
              <input type="radio" name="practice-${question.id}" value="${escapeHtml(option)}" ${isChecked ? 'checked' : ''} ${isSubmitted ? 'disabled' : ''} />
              <span>${escapeHtml(option)}</span>
            </label>
          `;
        }).join('')}
      </div>`
    : question.kind === 'multi'
      ? `<div class="options">
          ${options.map(option => {
            const isChecked = Array.isArray(currentAnswer) && currentAnswer.includes(option);
            let optionClass = 'option-row';
            
            // Подсветка ответов после проверки
            if (isSubmitted) {
              const isCorrectOption = Array.isArray(question.correctAnswer) && question.correctAnswer.includes(option);
              if (isCorrectOption) optionClass += ' highlight-correct';
              else if (isChecked) optionClass += ' highlight-wrong';
            }

            return `
              <label class="${optionClass}">
                <input type="checkbox" data-option="${escapeHtml(option)}" ${isChecked ? 'checked' : ''} ${isSubmitted ? 'disabled' : ''} />
                <span>${escapeHtml(option)}</span>
              </label>
            `;
          }).join('')}
        </div>`
      : `<textarea class="text-area" rows="4" data-question-id="${escapeHtml(question.id)}" placeholder="Коротко, по фактам" ${isSubmitted ? 'disabled' : ''}>${escapeHtml(currentAnswer ?? '')}</textarea>`;

  // Блок с обратной связью (появляется только после проверки)
  let feedbackMarkup = '';
  if (isSubmitted) {
    const isCorrect = itemResult.score > 0;
    feedbackMarkup = `
      <div class="inline-feedback ${isCorrect ? 'status-passed' : 'status-failed'}" style="margin-top: 15px; padding: 10px; border-radius: 8px; background: rgba(0,0,0,0.2);">
        <strong style="color: ${isCorrect ? '#2ecc71' : '#e74c3c'}">${isCorrect ? '✅ Верно' : '❌ Ошибка'}</strong>
        <p style="margin: 5px 0 0 0; font-size: 0.9em;"><b>Правильный ответ:</b> ${escapeHtml(itemResult.correctAnswer)}</p>
        <p style="margin: 5px 0 0 0; font-size: 0.9em; color: #aaa;"><i>${escapeHtml(itemResult.note)}</i></p>
      </div>
    `;
  }

  return `
    <article class="question-card" data-question-id="${escapeHtml(question.id)}">
      <div class="question-meta">
        <span>Тест ${index + 1}</span>
      </div>
      <h3>${escapeHtml(question.title)}</h3>
      <p>${escapeHtml(question.prompt)}</p>
      ${optionsMarkup}
      ${feedbackMarkup}
    </article>
  `;
}

export function renderPracticeSection({ formEl, resultEl, questions, state, onAnswerChange, onSubmit, result }) {
  
  // --- ЭКРАН ПРЕДУПРЕЖДЕНИЯ ---
  if (!isPracticeStarted && !result) {
   formEl.innerHTML = `
      <style>
        .prac-wrap {
          text-align: center; padding: 40px 20px; background: rgba(7, 13, 28, 0.5); border-radius: 16px; border: 1px solid rgba(127, 227, 255, 0.1);
        }
        .prac-inner {
          background: rgba(127, 227, 255, 0.04); border-left: 4px solid #7fe3ff; padding: 25px 30px; border-radius: 0 16px 16px 0; margin: 0 auto 30px; text-align: left; max-width: 600px; box-shadow: inset 0 0 20px rgba(127, 227, 255, 0.02);
        }
        .prac-alert {
          background: rgba(255, 187, 0, 0.08); border: 1px solid rgba(255, 187, 0, 0.15); padding: 16px; border-radius: 12px;
        }
        .prac-btn {
          font-size: 1.1rem; padding: 12px 40px; box-shadow: 0 4px 15px rgba(127, 227, 255, 0.2); transition: all 0.3s ease;
        }
        
        /* МАГИЯ АДАПТИВНОСТИ ДЛЯ МОБИЛОК */
        @media (max-width: 600px) {
          .prac-wrap { padding: 20px 10px; }
          .prac-inner { padding: 15px 12px; margin-bottom: 20px; border-left-width: 3px; }
          .prac-alert { padding: 12px; }
          .prac-btn { width: 100%; padding: 12px 20px; font-size: 1rem; }
          .prac-inner h2 { font-size: 1.1rem !important; }
          .prac-inner p { font-size: 0.95rem !important; line-height: 1.4 !important; }
        }
      </style>

      <div class="prac-wrap">
        <div class="prac-inner">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
            <span style="font-size: 1.5rem; filter: drop-shadow(0 0 8px rgba(127, 227, 255, 0.6));">🎯</span>
            <h2 style="color: #7fe3ff; margin: 0; font-size: 1.25rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 800;">Режим тренировки</h2>
          </div>

          <p style="color: #cbd5e1; margin: 0 0 15px 0; font-size: 1.05rem; line-height: 1.6;">
            Данный раздел создан <b style="color: #fff;">исключительно</b> для самостоятельной подготовки и самопроверки ваших знаний 
            <span style="color: #ffda75; font-weight: 600; border-bottom: 1px dashed rgba(255, 218, 117, 0.5); cursor: default;">ПРО</span> перед настоящим экзаменом.
          </p>

          <div class="prac-alert">
            <div style="display: inline-block; background: rgba(255, 187, 0, 0.15); color: #ffda75; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: bold; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
              Важно понимать
            </div>
            <p style="color: #97a7c6; margin: 0; font-size: 0.95rem; line-height: 1.5;">
              Успешное прохождение этого теста <b style="color: #ff4757;">не даёт права на повышение</b>. Результаты остаются только на вашем экране и <b style="color: #fff; text-decoration: underline; text-underline-offset: 3px; text-decoration-color: rgba(255,255,255,0.3);">не идут в официальный отчёт</b>.
            </p>
          </div>
        </div>

        <button id="btn-start-practice" class="primary-button prac-btn" type="button">Начать практику</button>
      </div>
    `;

    formEl.querySelector('#btn-start-practice').addEventListener('click', () => {
      isPracticeStarted = true; 
      // Перерисовываем форму, теперь с вопросами
      renderPracticeSection({ formEl, resultEl, questions, state, onAnswerChange, onSubmit, result });
    });
    return; // Останавливаем выполнение, чтобы не рисовать вопросы
  }

  // --- САМ ТЕСТ ---
  formEl.innerHTML = `
    ${questions.map((question, index) => {
      // Ищем результат конкретно для этого вопроса
      const itemResult = result?.details?.find(d => d.id === question.id);
      return createQuestionMarkup(question, index, state.answers[question.id], itemResult);
    }).join('')}
    
    <div class="form-footer">
      ${!result ? `<button class="primary-button" type="submit">Проверить ответы</button>` : `<button class="primary-button" type="button" id="retry-practice">Пройти заново</button>`}
      <p>Это тренировка: результат показывается сразу, но ничего не сохраняется для админов.</p>
    </div>
  `;

  // Обработчики событий вешаем только если тест еще не сдан
  if (!result) {
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

    formEl.addEventListener('submit', onSubmit);
  } else {
    // Кнопка рестарта
    document.getElementById('retry-practice')?.addEventListener('click', () => {
      isPracticeStarted = false; // Сбрасываем флаг, чтобы снова показать дисклеймер (по желанию)
      window.location.reload(); 
    });
  }
}

// Теперь этот блок выводит только общую оценку сверху (отдельные ответы мы вывели инлайн)
export function renderPracticeResult(resultEl, result) {
  if (!result) {
    resultEl.classList.add('hidden');
    resultEl.innerHTML = '';
    return;
  }

  resultEl.classList.remove('hidden');
  resultEl.innerHTML = `
    <div class="detail-header" style="background: rgba(46, 204, 113, 0.1); padding: 20px; border-radius: 8px; border: 1px solid #2ecc71; margin-bottom: 20px;">
      <div>
        <span>Тренировка завершена</span>
        <h3 style="margin: 0; color: #2ecc71;">Твой результат: ${result.score} из ${result.maxQuestions}</h3>
      </div>
    </div>
  `;
}