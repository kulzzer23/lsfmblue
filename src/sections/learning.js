import { escapeHtml } from '../lib/dom.js';

export function renderLearningSection(container, learningContent) {
  const sections = learningContent.sections ?? [];

  // --- ВАЖНО: Память статуса (должна быть здесь, снаружи renderLine) ---
  let exampleMode = 'default';

  const renderLine = (line) => {
    // --- ПАРСИНГ КАРТИНОК И КНОПОК ---
    if (line.startsWith('[IMG:')) {
      const url = line.replace('[IMG:', '').replace(']', '').trim();
      return `<img src="${escapeHtml(url)}" class="learning-image" alt="Иллюстрация" />`;
    }
    
    if (line.startsWith('[BTN:')) {
      const match = line.match(/\[BTN:(.+?)\|(.+?)\]/);
      if (match) {
        return `
          <a href="${escapeHtml(match[1])}" target="_blank" class="primary-button download-btn" download>
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            ${escapeHtml(match[2])}
          </a>
        `;
      }
    }

    // --- ПАРСИНГ ТАБЛИЦ ---
    if (line.startsWith('[TABLE:')) {
      const match = line.match(/\[TABLE:(.+?)\|(.+?)\]/);
      if (match) {
        return `
          <div class="learning-table-row">
            <div class="table-key">${escapeHtml(match[1].trim())}</div>
            <div class="table-value">${escapeHtml(match[2].trim())}</div>
          </div>
        `;
      }
    }

    // Твой код выше...
    
    let cleanLine = escapeHtml(line); // <-- Обрати внимание, я заменил const на let, чтобы строку можно было изменить

    // --- НОВАЯ ФИШКА: Автоматическая красная плашка для ТЭГ | ПРО ---
    cleanLine = cleanLine.replace(/ТЭГ \| ПРО/g, '<span class="tag-pro-badge">ТЭГ | ПРО</span>');

    // --- СБРОС ЦВЕТА ПРИ НОВОМ ПРАВИЛЕ ---
    if (/^\d+\.\s/.test(line) || /^\d+\.\d+\.\s/.test(line) || /^\d+\.\d+\.\d+\.\s/.test(line)) {
      exampleMode = 'default';
    }
    
    // Твой код ниже...

    // --- СБРОС ЦВЕТА ПРИ НОВОМ ПРАВИЛЕ ---
    if (/^\d+\.\s/.test(line) || /^\d+\.\d+\.\s/.test(line) || /^\d+\.\d+\.\d+\.\s/.test(line)) {
      exampleMode = 'default';
    }

    // Отрисовка правил
    if (/^\d+\.\s/.test(line)) return `<p class="rule-lvl-1">${cleanLine}</p>`;
    if (/^\d+\.\d+\.\s/.test(line)) return `<p class="rule-lvl-2">${cleanLine}</p>`;
    if (/^\d+\.\d+\.\d+\.\s/.test(line)) return `<p class="rule-lvl-3">${cleanLine}</p>`;

    // --- ЛОВИМ СТАТУС, ЗАПОМИНАЕМ И РИСУЕМ ПЛАШКУ ---
    if (line.trim() === 'Верно:') {
      exampleMode = 'success';
      return `<div class="rule-badge success"><span>✓</span> Верно</div>`;
    }
    if (line.trim() === 'Неверно:') {
      exampleMode = 'error';
      return `<div class="rule-badge error"><span>✕</span> Неверно</div>`;
    }
    if (line.trim() === 'Примеры:') {
      exampleMode = 'info';
      return `<div class="rule-badge info">Примеры:</div>`;
    }

    // --- РИСУЕМ ПРИМЕР С ЗАПОМНЕННЫМ ЦВЕТОМ ---
    if (line.includes('ТЭГ |') || line.includes('Отправитель:') || line.startsWith('Номер ')) {
      return `<div class="rule-example example-${exampleMode}">${cleanLine}</div>`;
    }

    // Примечания
    if (line.includes('(!) ПРИМЕЧАНИЕ:') || line.includes('Примечание:')) {
      return `<div class="rule-note">${cleanLine}</div>`;
    }

    return `<p class="rule-default">${cleanLine}</p>`;
  };

  // ... дальше твой старый код: container.innerHTML = `...`
  container.innerHTML = `
    <div class="learning-reader">
      <aside class="learning-toc">
        <span class="eyebrow">Оглавление</span>
        <h3>${escapeHtml(learningContent.title)}</h3>
        <p>${escapeHtml(learningContent.intro)}</p>
        
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
          ${sections
            .map(
              (section) => `
                <button 
                  type="button" 
                  class="secondary-button" 
                  style="text-align: left; padding: 12px 16px;"
                  onclick="document.getElementById('learning-${escapeHtml(section.id)}').scrollIntoView({behavior: 'smooth'})"
                >
                  ${escapeHtml(section.title)}
                </button>
              `,
            )
            .join('')}
        </div>
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
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                      ${section.subsections.map((sub, subIndex) => `
                        <button 
                          type="button" 
                          class="secondary-button"
                          style="padding: 10px 16px; font-size: 0.9rem;"
                          onclick="document.getElementById('learning-${escapeHtml(section.id)}-sub-${subIndex}').scrollIntoView({behavior: 'smooth'})"
                        >
                          ${escapeHtml(sub.title)}
                        </button>
                      `).join('')}
                    </div>
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
  // --- ЛОГИКА ПЛАВАЮЩЕЙ ПАНЕЛИ ---
  // Ищем оригинальный блок, где лежат твои кнопки (Замени '.learning-toc', если у тебя другой класс/ID)
  const originalToc = container.querySelector('.learning-toc') || document.querySelector('.learning-toc');
   
  
  if (originalToc) {
    let floatingMenu = document.getElementById('floating-glass-menu');
    if (!floatingMenu) {
      floatingMenu = document.createElement('div');
      floatingMenu.id = 'floating-glass-menu';
      floatingMenu.className = 'floating-glass-menu';
      document.body.appendChild(floatingMenu);
    }

    // Добавляем кнопку сворачивания
    const toggleBtn = document.createElement('button');
    toggleBtn.innerHTML = '≡'; // Или иконку из SVG
    toggleBtn.className = 'toggle-btn';
    toggleBtn.onclick = () => {
      floatingMenu.classList.toggle('collapsed');
      toggleBtn.innerHTML = floatingMenu.classList.contains('collapsed') ? '=' : 'Скрыть меню';
    };
    floatingMenu.appendChild(toggleBtn);

    // Клонируем кнопки (как раньше)
    const originalButtons = originalToc.querySelectorAll('button');
    originalButtons.forEach(originalBtn => {
      const cloneBtn = originalBtn.cloneNode(true);
      cloneBtn.addEventListener('click', () => {
        originalBtn.click();
        floatingMenu.querySelectorAll('button.active').forEach(b => b.classList.remove('active'));
        cloneBtn.classList.add('active');
      });
      floatingMenu.appendChild(cloneBtn);
    });

    // 3. Радар скролла: показываем панель только когда оригинал исчез
    window.addEventListener('scroll', () => {
      const rect = originalToc.getBoundingClientRect();
      // Если нижний край оригинального блока ушел вверх за пределы экрана (< 0)
      if (rect.bottom < 0) {
        floatingMenu.classList.add('visible');
      } else {
        floatingMenu.classList.remove('visible');
      }
    });
  }
}