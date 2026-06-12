import { escapeHtml } from '../lib/dom.js';

export function renderLearningSection(container, learningContent) {
  const sections = learningContent.sections ?? [];

  container.innerHTML = `
    <div class="learning-reader">
      <aside class="learning-toc">
        <span class="eyebrow">Оглавление</span>
        <h3>${escapeHtml(learningContent.title)}</h3>
        <p>${escapeHtml(learningContent.intro)}</p>
        <nav>
          ${sections
            .map(
              (section) => `
                <a href="#learning-${escapeHtml(section.id)}">${escapeHtml(section.title)}</a>
              `,
            )
            .join('')}
        </nav>
      </aside>

      <div class="learning-content">
        ${sections
          .map(
            (section, index) => `
              <article class="lesson-card learning-section-card" id="learning-${escapeHtml(section.id)}">
                <div class="section-title">
                  <span>Раздел ${index + 1}</span>
                  <strong>${escapeHtml(section.title)}</strong>
                </div>
                <p>${escapeHtml(section.summary)}</p>
                ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
                <ul>
                  ${section.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}
                </ul>
                <div class="learning-subsections">
                  ${(section.subsections ?? [])
                    .map(
                      (subsection) => `
                        <article class="subsection-card">
                          <h4>${escapeHtml(subsection.title)}</h4>
                          <p>${escapeHtml(subsection.text)}</p>
                        </article>
                      `,
                    )
                    .join('')}
                </div>
              </article>
            `,
          )
          .join('')}
      </div>
    </div>
  `;
}
