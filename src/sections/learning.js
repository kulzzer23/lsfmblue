import { escapeHtml } from '../lib/dom.js';

export function renderLearningSection(container, lessons) {
  container.innerHTML = lessons
    .map(
      (lesson) => `
        <article class="lesson-card">
          <h3>${escapeHtml(lesson.title)}</h3>
          <p>${escapeHtml(lesson.summary)}</p>
          <ul>
            ${lesson.points.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}
          </ul>
        </article>
      `,
    )
    .join('');
}
