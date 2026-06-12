import { escapeHtml } from '../lib/dom.js';

function createQuestionMarkup(question, index, currentAnswer) {
  const options = question.options ?? [];

  const optionsMarkup =
    question.kind === 'single'
      ? `<div class="options">
          ${options
            .map(
              (option) => `
                <label class="option-row">
                  <input type="radio" name="practice-${question.id}" value="${escapeHtml(option)}" ${currentAnswer === option ? 'checked' : ''} />
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
        <span>Тест ${index + 1}</span>
        <strong>${escapeHtml(question.kind)}</strong>
      </div>
      <h3>${escapeHtml(question.title)}</h3>
      <p>${escapeHtml(question.prompt)}</p>
      ${optionsMarkup}
      <details class="question-hint">
        <summary>Подсказка</summary>
        <p>${escapeHtml(question.explanation)}</p>
      </details>
    </article>
  `;
}

export function renderPracticeSection({ formEl, resultEl, questions, state, onAnswerChange, onSubmit }) {
  formEl.innerHTML = `
    ${questions.map((question, index) => createQuestionMarkup(question, index, state.answers[question.id])).join('')}
    <div class="form-footer">
      <button class="primary-button" type="submit">Проверить ответы</button>
      <p>Это тренировка: результат показывается сразу, но ничего не сохраняется для админов.</p>
    </div>
  `;

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
  resultEl.innerHTML = '';
  resultEl.classList.add('hidden');
}

export function renderPracticeResult(resultEl, result) {
  if (!result) {
    resultEl.classList.add('hidden');
    // Внутри renderPracticeResult в sections/practice.js
resultEl.innerHTML = `
  <div class="detail-header">
    <h3>Результат: ${result.score}/${result.maxQuestions}</h3>
  </div>
  <div class="breakdown-list">
    ${result.details.map(item => `
      <article class="breakdown-item">
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <p style="color: #ccc; font-size: 0.9em;">Ваш ответ: <b>${escapeHtml(item.userAnswer)}</b></p>
          <p>Правильно: ${escapeHtml(item.correctAnswer)}</p>
          <details>
             <summary>Разбор</summary>
             <p>${escapeHtml(item.note)}</p>
          </details>
        </div>
        <span class="${item.score === 1 ? 'status-passed' : 'status-failed'}">
            ${item.score}/${item.maxScore}
        </span>
      </article>
    `).join('')}
  </div>
`;
    return;
  }

  resultEl.classList.remove('hidden');
  resultEl.innerHTML = `
    <div class="detail-header">
      <div>
        <span>Результат практики</span>
        <h3>${result.score}/${result.maxQuestions}</h3>
      </div>
    </div>
    <div class="breakdown-list">
      ${result.details
        .map(
          (item) => `
            <article class="breakdown-item">
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <p>${escapeHtml(item.note)}</p>
                <p><b>Правильный ответ:</b> ${escapeHtml(item.correctAnswer)}</p>
              </div>
              <span>${item.score}/${item.maxScore}</span>
            </article>
          `,
        )
        .join('')}
    </div>
  `;
}
