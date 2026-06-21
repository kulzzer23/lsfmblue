export function renderApplicationSection(containerElement, supabase) {
  if (!document.getElementById('app-laptop-os-styles')) {
    const style = document.createElement('style');
    style.id = 'app-laptop-os-styles';
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=PT+Sans:wght@400;700&family=Times+New+Roman&display=swap');

      /* === 3D КОРПУС === */
      .laptop-perspective {
        perspective: 1500px;
        max-width: 1200px;
        margin: 10px auto;
        position: relative;
        z-index: 10;
      }
      .laptop-lid {
        width: 100%;
        height: 72vh;
        min-height: 480px;
        background: #020617;
        border: 10px solid #0f172a;
        border-bottom: 20px solid #0f172a;
        border-radius: 12px 12px 0 0;
        box-shadow: 0 -5px 15px rgba(0,0,0,0.5), inset 0 0 10px #000;
        position: relative;
        transform-origin: bottom center;
        transform: rotateX(-90deg);
        transition: transform 1.5s cubic-bezier(0.25, 1, 0.2, 1);
        transform-style: preserve-3d;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .laptop-lid.open { transform: rotateX(0deg); }
      .laptop-base { width: 104%; height: 30px; background: linear-gradient(to bottom, #1e293b, #0f172a); margin-left: -2%; border-radius: 0 0 15px 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.7); position: relative; z-index: 11; }
      .laptop-camera { position: absolute; top: 5px; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; background: #000; border-radius: 50%; }

      .btn-open-laptop { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(15, 23, 42, 0.95); border: 2px solid #3b82f6; color: #3b82f6; padding: 15px 35px; font-family: 'PT Sans', sans-serif; font-size: 1.1rem; font-weight: bold; text-transform: uppercase; cursor: pointer; border-radius: 6px; box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); transition: 0.3s; z-index: 100; }
      .btn-open-laptop:hover { background: #3b82f6; color: #fff; box-shadow: 0 0 35px rgba(59, 130, 246, 0.6); }

      /* === ИНТЕРФЕЙС LSFM OS (ФИКСИРОВАННЫЙ ЭКРАН) === */
      .os-screen { flex: 1; position: relative; background: #000; overflow: hidden; display: flex; flex-direction: column; }
      .os-bios { position: absolute; inset: 0; background: #000; color: #10b981; font-family: 'Share Tech Mono', monospace; padding: 20px; font-size: 1rem; line-height: 1.5; display: none; z-index: 50; text-align: left; }
      
      .os-workspace { 
        flex: 1; 
        display: none; 
        flex-direction: column; 
        background: radial-gradient(circle at center, #1e293b 0%, #020617 100%); 
        position: relative;
        overflow: hidden;
      }

      /* Панель задач (Нижний трей) */
      .os-taskbar { height: 35px; background: #0f172a; border-top: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; padding: 0 12px; z-index: 45; }
      .os-start-btn { background: #3b82f6; color: #fff; border: none; border-radius: 3px; padding: 3px 10px; font-family: 'PT Sans', sans-serif; font-weight: bold; font-size: 0.8rem; cursor: pointer; }
      .os-tray { display: flex; gap: 12px; color: #cbd5e1; font-size: 0.8rem; font-family: 'PT Sans', sans-serif; }

      /* КОНТЕЙНЕР ДЛЯ ОКОН (СТРОГО ОДИН ЭКРАН БЕЗ СКРОЛЛА) */
      .os-windows-container { 
        flex: 1;
        padding: 12px; 
        display: flex; 
        gap: 12px; 
        height: calc(100% - 35px);
        position: relative;
      }
      
      .os-window { 
        flex: 1; 
        background: rgba(15, 23, 42, 0.95); 
        border: 1px solid #334155; 
        border-radius: 6px; 
        display: flex; 
        flex-direction: column; 
        opacity: 0; 
        transform: translateY(10px);
        overflow: hidden;
      }
      .window-animate { animation: windowPop 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      @keyframes windowPop { to { opacity: 1; transform: translateY(0); } }

      .os-window-header { background: #1e293b; padding: 5px 10px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #0f172a; }
      .os-window-title { color: #f8fafc; font-family: 'PT Sans', sans-serif; font-size: 0.8rem; }
      .os-window-controls span { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #ef4444; margin-left: 4px; }
      .os-window-controls span:nth-child(2) { background: #f59e0b; }
      .os-window-controls span:nth-child(3) { background: #10b981; }
      
      .os-window-body { 
        flex: 1; 
        padding: 12px; 
        display: flex; 
        flex-direction: column; 
        overflow: hidden; /* Запрещаем скролл самого окна */
      }

      /* ФОРМА (ЛЕВОЕ ОКНО) */
      .app-label { color: #94a3b8; font-family: 'PT Sans', sans-serif; font-size: 0.75rem; font-weight: bold; margin-bottom: 3px; display: block; }
      .app-input { width: 100%; background: #000 !important; border: 1px solid #3b82f6 !important; color: #fff !important; padding: 8px 10px !important; margin-bottom: 10px; border-radius: 4px !important; font-size: 0.85rem; outline: none; }
      
      /* Список тестов ужимаем и даем внутренний скролл только ему */
      .db-scan-box { 
        flex: 1; 
        border: 1px dashed #334155; 
        background: #000; 
        border-radius: 4px; 
        padding: 8px; 
        color: #64748b; 
        font-family: 'Share Tech Mono', monospace; 
        font-size: 0.8rem; 
        margin-bottom: 10px; 
        overflow-y: auto; 
      }
      .db-item { background: rgba(255,255,255,0.02); border: 1px solid #232936; padding: 8px; border-radius: 4px; margin-bottom: 4px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
      .db-item:hover { border-color: #3b82f6; }
      .db-item.selected { border-color: #10b981; background: rgba(16,185,129,0.1); }

      .btn-submit { width: 100%; background: #3b82f6; color: #fff; border: none; padding: 10px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.9rem; text-transform: uppercase; }
      .btn-submit:disabled { background: #232936; color: #475569; cursor: not-allowed; }

      /* ФИЗИЧЕСКИЙ БЛАНК (ПРАВОЕ ОКНО) */
      .document-paper { 
        background: #fdfdfd; 
        color: #1e293b; 
        padding: 15px 20px; 
        border-radius: 2px; 
        height: 100%; 
        display: flex; 
        flex-direction: column; 
        position: relative; 
        box-shadow: inset 0 0 20px rgba(0,0,0,0.02);
      }
      .doc-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 7rem; font-weight: 900; color: rgba(0,0,0,0.02); pointer-events: none; }
      .doc-header { text-align: right; font-family: 'Times New Roman', serif; font-size: 0.8rem; margin-bottom: 12px; line-height: 1.3; }
      .doc-title { text-align: center; font-family: 'Times New Roman', serif; font-size: 1.05rem; font-weight: bold; margin-bottom: 12px; }
      .doc-body { font-family: 'Times New Roman', serif; font-size: 0.88rem; line-height: 1.4; text-align: justify; flex: 1; }
      .doc-field { font-weight: bold; color: #2563eb; border-bottom: 1px dashed #2563eb; }
      .doc-footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #cbd5e1; margin-top: auto; padding-top: 6px; font-family: 'Times New Roman', serif; font-size: 0.8rem; }
      .doc-sign { font-family: 'Brush Script MT', cursive; font-size: 1.3rem; color: #0f172a; transform: rotate(-5deg); display: inline-block; }

      .stamp-final { position: absolute; bottom: 40px; right: 20px; border: 3px solid #dc2626; color: #dc2626; font-size: 1rem; font-weight: 900; padding: 4px 8px; transform: rotate(-12deg); opacity: 0; border-radius: 4px; }
      .stamp-final.visible { opacity: 0.8; }
      
      /* НА МОБИЛКАХ ОТКЛЮЧАЕМ СХЛОПЫВАНИЕ, ОСТАВЛЯЕМ ПК ИНТЕРФЕЙС */
      @media (max-width: 900px) {
        .os-windows-container { pointer-events: auto; }
        #window-doc { max-width: 45%; display: flex !important; }
      }

      .blink { animation: blinker 1s linear infinite; }
      @keyframes blinker { 50% { opacity: 0; } }
    `;
    document.head.appendChild(style);
  }

  // Отрендеренная структура (убран дублирующийся и лишний код)
  containerElement.innerHTML = `
    <div class="laptop-perspective">
      <button id="btn-open-laptop" class="btn-open-laptop">ВКЛЮЧИТЬ БОРТОВОЙ ПК LSFM</button>
      
      <div class="laptop-lid" id="laptop-lid">
        <div class="laptop-camera"></div>
        <div class="os-screen">
          
          <div class="os-bios" id="os-bios"></div>

          <div class="os-workspace" id="os-workspace">
            <div class="os-windows-container">
              
              <div class="os-window" id="window-form">
                <div class="os-window-header">
                  <div class="os-window-title">🎙️ LSFM_MDT.exe - Регистратура</div>
                  <div class="os-window-controls"><span></span><span></span><span></span></div>
                </div>
                <div class="os-window-body">
                  <label class="app-label">Идентификатор (Имя_Фамилия)</label>
                  <input type="text" id="app-name" class="app-input" placeholder="Henry_Urban" autocomplete="off">

                  <label class="app-label">Пакет документов (Imgur Link)</label>
                  <input type="text" id="app-album" class="app-input" placeholder="https://imgur.com/..." autocomplete="off">

                  <label class="app-label">Синхронизация базы тестов ПРО</label>
                  <div class="db-scan-box" id="app-exam-list">
                    Введите корректный идентификатор...
                  </div>

                  <button id="app-submit-btn" class="btn-submit" disabled>Передать контракт</button>
                </div>
              </div>

              <div class="os-window" id="window-doc" style="max-width: 48%;">
                <div class="os-window-header">
                  <div class="os-window-title">👁️ DocViewer.app</div>
                  <div class="os-window-controls"><span></span><span></span><span></span></div>
                </div>
                <div class="os-window-body" style="background: #cbd5e1; padding: 10px;">
                  
                  <div class="document-paper">
                    <div class="doc-watermark">LSFM</div>
                    <div class="doc-header">
                      Директору радиоцентра г. Los Santos Leonardo Jemison<br>
                      От гражданина: <span class="doc-field" id="paper-name" style="color: #0f172a; border-color: #0f172a;">...</span>
                    </div>
                    <div class="doc-title">ЗАЯВЛЕНИЕ</div>
                    <div class="doc-body">
                      Прошу принять меня на работу в радиоцентр г. Los Santos на должность радиотехника с испытательным сроком один месяц (( 1 день )). 
                      К заявлению прикладываю копии паспорта и лицензий (( /pass, /lic + /c 60 )): <span class="doc-field" id="paper-link" style="color: #ef4444; border-color: #ef4444;">НЕТ</span>.<br><br>
                      Так же подтверждаю, что успешно прошёл квалификационный онлайн-тест ПРО: <span class="doc-field" id="paper-test" style="color: #ef4444; border-color: #ef4444;">НЕТ</span>.
                    </div>
                    <div class="doc-footer">
                      <div>Дата: <strong id="paper-date"></strong></div>
                      <div>Подпись: <span class="doc-sign" id="paper-signature"></span></div>
                    </div>
                    <div class="stamp-final" id="official-stamp">ОБРАБОТАНО</div>
                  </div>

                </div>
              </div>

            </div>

            <div class="os-taskbar">
              <button class="os-start-btn">LSFM OS</button>
              <div class="os-tray">
                <span>🔋 100%</span>
                <span class="os-clock" id="os-clock">00:00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="laptop-base"></div>
    </div>
  `;

  // === СТАНДАРТНЫЙ СКРИПТ АВТОМАТИЗАЦИИ ===
  const btnOpenLaptop = document.getElementById('btn-open-laptop');
  const laptopLid = document.getElementById('laptop-lid');
  const osBios = document.getElementById('os-bios');
  const osWorkspace = document.getElementById('os-workspace');
  const windowForm = document.getElementById('window-form');
  const windowDoc = document.getElementById('window-doc');
  const osClock = document.getElementById('os-clock');

  setInterval(() => {
    osClock.textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }, 1000);

  btnOpenLaptop.addEventListener('click', () => {
    btnOpenLaptop.style.display = 'none';
    laptopLid.classList.add('open');

    setTimeout(() => {
      osBios.style.display = 'block';
      const biosText = [
        "ЗАГРУЗКА СИСТЕМЫ LSFM OS v4.5...",
        "ОПЕРАТИВНАЯ ПАМЯТЬ... ОК",
        "ПОДКЛЮЧЕНИЕ К БАЗЕ SUPABASE... ОК",
        "ЗАПУСК ИНТЕРФЕЙСА ТЕРМИНАЛА..."
      ];
      let lineIdx = 0;
      const typeLine = () => {
        if (lineIdx < biosText.length) {
          osBios.innerHTML += biosText[lineIdx] + '<br>';
          lineIdx++;
          setTimeout(typeLine, 150);
        } else {
          setTimeout(() => {
            osBios.style.display = 'none';
            osWorkspace.style.display = 'flex';
            windowForm.classList.add('window-animate');
            windowDoc.classList.add('window-animate');
          }, 300);
        }
      };
      typeLine();
    }, 1000);
  });

  const nameInput = document.getElementById('app-name');
  const albumInput = document.getElementById('app-album');
  const examListContainer = document.getElementById('app-exam-list');
  const submitBtn = document.getElementById('app-submit-btn');

  const paperName = document.getElementById('paper-name');
  const paperLink = document.getElementById('paper-link');
  const paperTest = document.getElementById('paper-test');
  const paperDate = document.getElementById('paper-date');
  const paperSignature = document.getElementById('paper-signature');
  const officialStamp = document.getElementById('official-stamp');

  paperDate.textContent = new Date().toLocaleDateString('ru-RU');

  let selectedExamId = null;
  let debounceTimer;

  const updateBlank = () => {
    const n = nameInput.value.trim();
    const l = albumInput.value.trim();

    paperName.textContent = n || '...';
    if (n) {
      const parts = n.split('_');
      paperSignature.textContent = parts.length > 1 ? `${parts[0][0]}. ${parts[1]}` : n;
    } else {
      paperSignature.textContent = '';
    }

    if (l.length > 5) {
      paperLink.innerHTML = `<a href="${l}" target="_blank" style="color: #2563eb; text-decoration: none;">ПРИКРЕПЛЕНЫ ↗</a>`;
    } else {
      paperLink.textContent = 'НЕТ';
    }

    if (n.length >= 3 && l.length > 5 && selectedExamId) {
      submitBtn.disabled = false;
    } else {
      submitBtn.disabled = true;
    }
  };

  albumInput.addEventListener('input', updateBlank);

  nameInput.addEventListener('input', (e) => {
    updateBlank();
    clearTimeout(debounceTimer);
    selectedExamId = null;
    paperTest.textContent = 'НЕТ';
    updateBlank();

    const name = e.target.value.trim();
    if (name.length < 3) {
      examListContainer.innerHTML = 'Введите корректный идентификатор...';
      return;
    }

    examListContainer.innerHTML = '<span class="blink" style="color: #3b82f6;">ПОИСК В ГЛОБАЛЬНОЙ БАЗЕ ДАННЫХ...</span>';

    debounceTimer = setTimeout(async () => {
      const { data, error } = await supabase.from('submissions').select('*').ilike('name', `%${name}%`).limit(4);

      if (error || !data || data.length === 0) {
        examListContainer.innerHTML = '<span style="color: #ef4444;">ЗАПИСИ ОТСУТСТВУЮТ</span>';
      } else {
        const sorted = data.sort((a, b) => new Date(b.submittedAt || b.created_at || 0) - new Date(a.submittedAt || a.created_at || 0));

        examListContainer.innerHTML = sorted.map((ex) => {
          const rawDate = ex.submittedAt || ex.created_at;
          const dateStr = rawDate ? new Date(rawDate).toLocaleDateString('ru-RU', {month: '2-digit', day: '2-digit'}) : '??';
          const score = ex.score || 0;
          const max = ex.maxScore || (ex.breakdown ? ex.breakdown.length : '23');
          return `
            <div class="db-item" data-id="${ex.id}" data-score="${score}/${max}">
              <div><strong>${ex.name}</strong><br><small style="color:#64748b;">Дата: ${dateStr}</small></div>
              <div style="color:#3b82f6; font-family:monospace; font-weight:bold;">[ ${score}/${max} ]</div>
            </div>
          `;
        }).join('');

        const items = examListContainer.querySelectorAll('.db-item');
        items.forEach(item => {
          item.addEventListener('click', () => {
            items.forEach(c => c.classList.remove('selected'));
            item.classList.add('selected');
            selectedExamId = item.dataset.id;
            paperTest.textContent = `ДА (${item.dataset.score})`;
            updateBlank();
          });
        });
      }
    }, 600);
  });

  submitBtn.addEventListener('click', async () => {
    if (!selectedExamId) return;
    submitBtn.textContent = 'ОТПРАВКА СИСТЕМНОГО ПАКЕТА...';
    submitBtn.disabled = true;

    const { error } = await supabase.from('applications').insert([{
      applicant_name: nameInput.value.trim(),
      passport_url: albumInput.value.trim(),
      licenses_url: albumInput.value.trim(),
      exam_id: selectedExamId,
      status: 'pending'
    }]);

    if (error) {
      alert('ОШИБКА ПЕРЕДАЧИ: ' + error.message);
      submitBtn.textContent = 'Передать контракт';
      submitBtn.disabled = false;
    } else {
      submitBtn.textContent = 'УСПЕШНО ЗАПИСАНО';
      nameInput.disabled = true;
      albumInput.disabled = true;
      examListContainer.style.opacity = '0.5';
      examListContainer.style.pointerEvents = 'none';
      officialStamp.classList.add('visible');
    }
  });
}