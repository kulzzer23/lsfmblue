import { escapeHtml } from '../lib/dom.js';

export function renderLearningSection(container, learningContent) {
  const sections = learningContent.sections ?? [];

  const renderLine = (line) => {
    const cleanLine = escapeHtml(line);
    if (/^\d+\.\s/.test(line)) return `<p class="rule-lvl-1">${cleanLine}</p>`;
    if (/^\d+\.\d+\.\s/.test(line)) return `<p class="rule-lvl-2">${cleanLine}</p>`;
    if (/^\d+\.\d+\.\d+\.\s/.test(line)) return `<p class="rule-lvl-3">${cleanLine}</p>`;
    if (line.trim() === 'Верно:') return `<p class="rule-status success"><span>✓</span> Верно</p>`;
    if (line.trim() === 'Неверно:') return `<p class="rule-status error"><span>✕</span> Неверно</p>`;
    if (line.trim() === 'Примеры:') return `<p class="rule-status info">Примеры:</p>`;
    if (line.includes('ТЭГ |') || line.includes('Отправитель:') || line.startsWith('Номер ')) {
      return `<div class="rule-example">${cleanLine}</div>`;
    }
    if (line.includes('(!) ПРИМЕЧАНИЕ:') || line.includes('Примечание:')) {
      return `<div class="rule-note">${cleanLine}</div>`;
    }
    return `<p class="rule-default">${cleanLine}</p>`;
  };

  container.innerHTML = `
    <div class="learning-reader">
      <aside class="learning-toc">
        <span class="eyebrow">Оглавление</span>
        <h3>${escapeHtml(learningContent.title)}</h3>
        <p>${escapeHtml(learningContent.intro)}</p>
        
        <nav class="pill-nav">
          ${sections
            .map(
              (section) => `
                <a href="#learning-${escapeHtml(section.id)}" class="nav-pill">${escapeHtml(section.title)}</a>
              `,
            )
            .join('')}
        </nav>
      </aside>

      <div class="learning-content">
        ${sections
          .map((section, index) => {
            const hasSubsections = section.subsections && section.subsections.length > 0;

            return `
              <article class="lesson-card learning-section-card" id="learning-${escapeHtml(section.id)}">
                <div class="section-title">
                  <span>Раздел ${index + 1}</span>
                  <strong>${escapeHtml(section.title)}</strong>
                </div>
                <p>${escapeHtml(section.summary)}</p>
                
                ${(section.paragraphs || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
                
                ${hasSubsections ? `
                  <div class="subsection-nav">
                    <span>Главы в этом разделе:</span>
                    <nav class="pill-nav">
                      ${section.subsections.map((sub, subIndex) => `
                        <a href="#learning-${escapeHtml(section.id)}-sub-${subIndex}" class="nav-pill">
                          ${escapeHtml(sub.title)}
                        </a>
                      `).join('')}
                    </nav>
                  </div>
                ` : ''}

                <div class="learning-subsections">
                  ${(section.subsections ?? [])
                    .map(
                      (subsection, subIndex) => `
                        <article class="subsection-card" id="learning-${escapeHtml(section.id)}-sub-${subIndex}">
                          <h4>${escapeHtml(subsection.title)}</h4>
                          <div class="subsection-text-rules">
                            ${subsection.text.map(renderLine).join('')}
                          </div>
                        </article>
                      `,
                    )
                    .join('')}
                </div>
              </article>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}