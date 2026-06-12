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
        <strong>${escapeHtml(question.kind)}</strong>
      </div>
      <h3>${escapeHtml(question.title)}</h3>
      <p>${escapeHtml(question.prompt)}</p>
      ${optionsMarkup}
      <details class="question-hint">
        <summary>Подсказка для проверяющего</summary>
        <p>${escapeHtml(question.reviewHint ?? 'Проверяется вручную.')}</p>
      </details>
    </article>
  `;
}

export function renderExamSection({ formEl, questions, state, onAnswerChange, onMetaChange, onSubmit }) {
  formEl.innerHTML = `
    <div class="grid-3">
      <label>
        Имя
        <input id="exam-name" class="text-input" value="${escapeHtml(state.meta.name)}" placeholder="Например, Никита" />
      </label>
      <label>
        Отряд / группа
        <input id="exam-squad" class="text-input" value="${escapeHtml(state.meta.squad)}" placeholder="ЛСФМ-1" />
      </label>
      <label>
        Контакт
        <input id="exam-contact" class="text-input" value="${escapeHtml(state.meta.contact)}" placeholder="Telegram или ник" />
      </label>
    </div>
    ${questions.map((question, index) => createQuestionMarkup(question, index, state.answers[question.id])).join('')}
    <div class="form-footer">
      <button class="primary-button" type="submit">Сдать экзамен</button>
      <p>Система не знает правильные ответы. Проверяющий позже пометит экзамен как «сдал» или «не сдал».</p>
    </div>
  `;

  formEl.querySelector('#exam-name').addEventListener('input', (event) => {
    onMetaChange('name', event.currentTarget.value);
  });
  formEl.querySelector('#exam-squad').addEventListener('input', (event) => {
    onMetaChange('squad', event.currentTarget.value);
  });
  formEl.querySelector('#exam-contact').addEventListener('input', (event) => {
    onMetaChange('contact', event.currentTarget.value);
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

  formEl.addEventListener('submit', onSubmit);
}
