export function renderApplicationSection(containerElement, supabase) {
  if (!document.getElementById('app-laptop-os-styles')) {
    const style = document.createElement('style');
    style.id = 'app-laptop-os-styles';
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=PT+Sans:wght@400;700&family=Times+New+Roman&display=swap');

      /* === 3D НОУТБУК === */
      .laptop-perspective {
        perspective: 1500px;
        max-width: 1300px;
        margin: 40px auto;
        position: relative;
        z-index: 10;
      }
      .laptop-lid {
        width: 100%;
        height: 75vh;
        min-height: 600px;
        background: #020617;
        border: 12px solid #0f172a;
        border-bottom: 25px solid #0f172a;
        border-radius: 16px 16px 0 0;
        box-shadow: 0 -10px 20px rgba(0,0,0,0.5), inset 0 0 15px #000;
        position: relative;
        transform-origin: bottom center;
        transform: rotateX(-90deg); /* Закрытая крышка */
        transition: transform 1.8s cubic-bezier(0.25, 1, 0.2, 1);
        transform-style: preserve-3d;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .laptop-lid.open {
        transform: rotateX(0deg);
      }
      .laptop-base {
        width: 104%;
        height: 40px;
        background: linear-gradient(to bottom, #1e293b, #0f172a);
        margin-left: -2%;
        border-radius: 0 0 20px 20px;
        box-shadow: 0 30px 50px rgba(0,0,0,0.8);
        position: relative;
        z-index: 11;
      }
      .laptop-camera {
        position: absolute; top: 6px; left: 50%; transform: translateX(-50%);
        width: 8px; height: 8px; background: #000; border-radius: 50%;
        box-shadow: inset 0 0 3px rgba(255,255,255,0.4);
      }

      /* Кнопка "Начать работу" (лежит на крышке снаружи) */
      .btn-open-laptop {
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: rgba(15, 23, 42, 0.9); border: 2px solid #3b82f6; color: #3b82f6;
        padding: 20px 40px; font-family: 'PT Sans', sans-serif; font-size: 1.2rem; font-weight: bold;
        text-transform: uppercase; cursor: pointer; border-radius: 8px;
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); transition: 0.3s; z-index: 100;
      }
      .btn-open-laptop:hover { background: #3b82f6; color: #fff; box-shadow: 0 0 40px rgba(59, 130, 246, 0.6); }

      /* === LSFM OS (Оболочка) === */
      .os-screen {
        flex: 1; position: relative; background: #000; overflow: hidden;
      }
      .os-bios {
        position: absolute; inset: 0; background: #000; color: #10b981;
        font-family: 'Share Tech Mono', monospace; padding: 30px; font-size: 1.1rem; line-height: 1.6;
        display: none; z-index: 50; text-align: left;
      }
      
      .os-workspace {
        position: absolute; inset: 0; display: none; flex-direction: column;
        background: url('https://www.transparenttextures.com/patterns/carbon-fibre.png'), radial-gradient(circle at center, #1e293b 0%, #020617 100%);
        z-index: 40;
      }

      /* Рабочий стол и иконки */
      .os-desktop { flex: 1; padding: 20px; position: relative; }
      .os-icon {
        width: 80px; text-align: center; color: #f8fafc; font-family: 'PT Sans', sans-serif;
        font-size: 0.85rem; margin-bottom: 20px; cursor: pointer; transition: 0.2s;
      }
      .os-icon:hover { background: rgba(255,255,255,0.1); border-radius: 8px; }
      .os-icon-img { font-size: 2.5rem; margin-bottom: 5px; display: block; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5)); }

      /* Панель задач (Трей) */
      .os-taskbar {
        height: 45px; background: rgba(15, 23, 42, 0.95); border-top: 1px solid #334155;
        display: flex; justify-content: space-between; align-items: center; padding: 0 15px;
        backdrop-filter: blur(10px); box-shadow: 0 -5px 20px rgba(0,0,0,0.5);
      }
      .os-start-btn {
        background: #3b82f6; color: #fff; border: none; border-radius: 4px;
        padding: 5px 15px; font-family: 'PT Sans', sans-serif; font-weight: bold; cursor: pointer;
        display: flex; align-items: center; gap: 8px;
      }
      .os-tray { display: flex; align-items: center; gap: 15px; color: #cbd5e1; font-family: 'PT Sans', sans-serif; font-size: 0.9rem; }
      .os-clock { font-family: 'Share Tech Mono', monospace; font-size: 1rem; color: #fff; }

      /* === ОКНА ПРОГРАММ === */
      .os-windows-container {
        position: absolute; inset: 20px; display: flex; gap: 20px; pointer-events: none;
      }
      .os-window {
        flex: 1; background: rgba(15, 23, 42, 0.9); border: 1px solid #475569; border-radius: 8px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.6); display: flex; flex-direction: column;
        pointer-events: auto; opacity: 0; transform: translateY(20px);
        backdrop-filter: blur(15px); overflow: hidden;
      }
      .window-animate { animation: windowPop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      @keyframes windowPop { to { opacity: 1; transform: translateY(0); } }

      .os-window-header {
        background: linear-gradient(180deg, #334155, #1e293b); padding: 8px 15px;
        display: flex; justify-content: space-between; align-items: center;
        border-bottom: 1px solid #0f172a;
      }
      .os-window-title { color: #f8fafc; font-family: 'PT Sans', sans-serif; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; }
      .os-window-controls span { display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #ef4444; margin-left: 6px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3); }
      .os-window-controls span:nth-child(2) { background: #f59e0b; }
      .os-window-controls span:nth-child(3) { background: #10b981; }
      .os-window-body { flex: 1; padding: 25px; overflow-y: auto; }

      /* Интерфейс левого окна (Форма) */
      .app-label { color: #94a3b8; font-family: 'PT Sans', sans-serif; font-size: 0.85rem; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; display: block; letter-spacing: 1px; }
      .app-input { width: 100%; background: rgba(0,0,0,0.4) !important; border: 1px solid #3b82f6 !important; color: #fff !important; font-family: 'PT Sans', sans-serif; font-size: 1rem; padding: 12px 15px !important; margin-bottom: 20px; border-radius: 6px !important; outline: none; transition: 0.3s; }
      .app-input:focus { background: rgba(59,130,246,0.1) !important; box-shadow: 0 0 15px rgba(59,130,246,0.3) !important; }
      
      .db-scan-box { border: 1px dashed #475569; background: rgba(0,0,0,0.3); border-radius: 6px; padding: 15px; min-height: 100px; color: #64748b; font-family: 'Share Tech Mono', monospace; text-align: center; margin-bottom: 25px; }
      .db-item { background: rgba(255,255,255,0.03); border: 1px solid #334155; padding: 12px; border-radius: 6px; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: 0.2s; text-align: left; }
      .db-item:hover { border-color: #3b82f6; background: rgba(59,130,246,0.1); }
      .db-item.selected { border-color: #10b981; background: rgba(16,185,129,0.15); box-shadow: 0 0 15px rgba(16,185,129,0.2); }

      .btn-submit { width: 100%; background: #3b82f6; color: #fff; border: none; padding: 15px; border-radius: 6px; font-family: 'PT Sans', sans-serif; font-size: 1.1rem; font-weight: bold; text-transform: uppercase; cursor: pointer; transition: 0.3s; box-shadow: 0 4px 15px rgba(59,130,246,0.4); }
      .btn-submit:disabled { background: #334155; color: #94a3b8; box-shadow: none; cursor: not-allowed; }
      .btn-submit:not(:disabled):hover { background: #2563eb; transform: translateY(-2px); box-shadow: 0 8px 25px rgba(59,130,246,0.6); }

      /* Интерфейс правого окна (Бланк) */
      .document-paper { background: #fdfdfd; color: #1e293b; padding: 35px; border-radius: 2px; box-shadow: inset 0 0 30px rgba(0,0,0,0.05), 0 5px 15px rgba(0,0,0,0.2); position: relative; height: 100%; display: flex; flex-direction: column; }
      .doc-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 10rem; font-weight: 900; color: rgba(0,0,0,0.03); pointer-events: none; font-family: Arial, sans-serif; }
      
      .doc-header { text-align: right; font-family: 'Times New Roman', serif; font-size: 1.05rem; margin-bottom: 25px; line-height: 1.5; }
      .doc-title { text-align: center; font-family: 'Times New Roman', serif; font-size: 1.5rem; font-weight: bold; letter-spacing: 2px; margin-bottom: 25px; }
      .doc-body { font-family: 'Times New Roman', serif; font-size: 1.15rem; line-height: 1.8; text-align: justify; flex: 1; }
      .doc-field { font-weight: bold; color: #2563eb; border-bottom: 1px dashed #2563eb; min-width: 80px; display: inline-block; padding: 0 5px; }
      
      .doc-footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #cbd5e1; padding-top: 15px; font-family: 'Times New Roman', serif; }
      .doc-sign { font-family: 'Brush Script MT', cursive; font-size: 2rem; color: #0f172a; transform: rotate(-5deg); display: inline-block; }

      .stamp-final { position: absolute; bottom: 20px; right: 20px; border: 4px solid #dc2626; color: #dc2626; font-family: 'PT Sans', sans-serif; font-size: 1.4rem; font-weight: 900; padding: 10px 15px; transform: rotate(-15deg) scale(3); opacity: 0; pointer-events: none; border-radius: 8px; }
      .stamp-final.visible { animation: stampSlam 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      @keyframes stampSlam { to { transform: rotate(-15deg) scale(1); opacity: 0.9; } }
      
      /* Мигание текста */
      .blink { animation: blinker 1s linear infinite; }
      @keyframes blinker { 50% { opacity: 0; } }
    `;
    document.head.appendChild(style);
  }

  containerElement.innerHTML = `
    <div class="laptop-perspective">
      <button id="btn-open-laptop" class="btn-open-laptop">ОТКРЫТЬ НОУТБУК LSFM</button>
      
      <div class="laptop-lid" id="laptop-lid">
        <div class="laptop-camera"></div>
        <div class="os-screen">
          
          <div class="os-bios" id="os-bios"></div>

          <div class="os-workspace" id="os-workspace">
            <div class="os-desktop">
              <div class="os-icon"><span class="os-icon-img">🗑️</span>Корзина</div>
              <div class="os-icon"><span class="os-icon-img">🌐</span>Браузер</div>
              <div class="os-icon" style="background: rgba(59,130,246,0.2); border-radius: 8px;"><span class="os-icon-img">📝</span>LSFM_Form.exe</div>
            </div>

            <div class="os-windows-container">
              
              <div class="os-window" id="window-form" style="animation-delay: 0.1s;">
                <div class="os-window-header">
                  <div class="os-window-title">📻 LSFM_Form.exe - Модуль регистрации</div>
                  <div class="os-window-controls"><span></span><span></span><span></span></div>
                </div>
                <div class="os-window-body">
                  <label class="app-label">Идентификатор (Имя_Фамилия)</label>
                  <input type="text" id="app-name" class="app-input" placeholder="Введите данные..." autocomplete="off">

                  <label class="app-label">Пакет документов (Imgur Link)</label>
                  <input type="text" id="app-album" class="app-input" placeholder="Вставьте ссылку..." autocomplete="off">

                  <label class="app-label">База данных ПРО (Синхронизация)</label>
                  <div class="db-scan-box" id="app-exam-list">
                    Ожидание ввода идентификатора...
                  </div>

                  <button id="app-submit-btn" class="btn-submit" disabled>Отправить данные</button>
                </div>
              </div>

              <div class="os-window" id="window-doc" style="animation-delay: 0.3s; max-width: 45%;">
                <div class="os-window-header">
                  <div class="os-window-title">👁️ Document_Viewer.app</div>
                  <div class="os-window-controls"><span></span><span></span><span></span></div>
                </div>
                <div class="os-window-body" style="background: #cbd5e1; padding: 15px;">
                  
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
                    <div class="stamp-final" id="official-stamp">ОТПРАВЛЕНО НА ПРОВЕРКУ</div>
                  </div>

                </div>
              </div>

            </div>

            <div class="os-taskbar">
              <button class="os-start-btn">🎙️ LSFM OS</button>
              <div class="os-tray">
                <span>🔋 100%</span>
                <span>📶 СЕТЬ</span>
                <span class="os-clock" id="os-clock">00:00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="laptop-base"></div>
    </div>
  `;

  // === ЛОГИКА ===
  const btnOpenLaptop = document.getElementById('btn-open-laptop');
  const laptopLid = document.getElementById('laptop-lid');
  const osBios = document.getElementById('os-bios');
  const osWorkspace = document.getElementById('os-workspace');
  const windowForm = document.getElementById('window-form');
  const windowDoc = document.getElementById('window-doc');
  const osClock = document.getElementById('os-clock');

  // Живые часы в трее
  setInterval(() => {
    const now = new Date();
    osClock.textContent = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }, 1000);

  // Анимация открытия и BIOS
  btnOpenLaptop.addEventListener('click', () => {
    btnOpenLaptop.style.display = 'none';
    laptopLid.classList.add('open'); // Открываем крышку (3D)

    // Через 1.5 секунды (когда крышка почти открылась), стартуем BIOS
    setTimeout(() => {
      osBios.style.display = 'block';
      const biosText = [
        "ЗАГРУЗКА ЯДРА LSFM OS v4.0...",
        "ИНИЦИАЛИЗАЦИЯ ПАМЯТИ... OK",
        "ПРОВЕРКА МОДУЛЕЙ СВЯЗИ... OK",
        "ПОДКЛЮЧЕНИЕ К ЗАКРЫТОМУ СЕРВЕРУ 192.168.1.100...",
        "СОЕДИНЕНИЕ УСТАНОВЛЕНО.",
        "ЗАПУСК ГРАФИЧЕСКОЙ ОБОЛОЧКИ..."
      ];
      
      let lineIdx = 0;
      const typeLine = () => {
        if (lineIdx < biosText.length) {
          osBios.innerHTML += biosText[lineIdx] + '<br>';
          lineIdx++;
          setTimeout(typeLine, 200 + Math.random() * 250);
        } else {
          setTimeout(() => {
            osBios.style.display = 'none';
            osWorkspace.style.display = 'flex';
            // Вызываем окна
            windowForm.classList.add('window-animate');
            windowDoc.classList.add('window-animate');
          }, 600);
        }
      };
      typeLine();
    }, 1200);
  });

  // Элементы формы и бланка
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

  // Обновление бланка при вводе
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
      paperLink.style.borderColor = '#2563eb';
    } else {
      paperLink.textContent = 'НЕТ';
      paperLink.style.borderColor = '#ef4444';
    }

    if (n.length >= 3 && l.length > 5 && selectedExamId) {
      submitBtn.disabled = false;
    } else {
      submitBtn.disabled = true;
    }
  };

  albumInput.addEventListener('input', updateBlank);

  // Поиск по БД
  nameInput.addEventListener('input', (e) => {
    updateBlank();
    clearTimeout(debounceTimer);
    
    selectedExamId = null;
    paperTest.textContent = 'НЕТ';
    paperTest.style.color = '#ef4444';
    paperTest.style.borderColor = '#ef4444';
    updateBlank();

    const name = e.target.value.trim();
    if (name.length < 3) {
      examListContainer.innerHTML = 'Ожидание ввода идентификатора...';
      return;
    }

    examListContainer.innerHTML = '<span class="blink" style="color: #3b82f6;">СКАНИРОВАНИЕ БАЗЫ ДАННЫХ LSFM...</span>';

    debounceTimer = setTimeout(async () => {
      const { data, error } = await supabase.from('submissions').select('*').ilike('name', `%${name}%`).limit(4);

      if (error || !data || data.length === 0) {
        examListContainer.innerHTML = '<span style="color: #ef4444;">ОШИБКА 404: ТЕСТЫ НЕ НАЙДЕНЫ</span>';
      } else {
        const sorted = data.sort((a, b) => new Date(b.submittedAt || b.created_at || 0) - new Date(a.submittedAt || a.created_at || 0));

        examListContainer.innerHTML = sorted.map((ex) => {
          const rawDate = ex.submittedAt || ex.created_at;
          const dateStr = rawDate ? new Date(rawDate).toLocaleDateString('ru-RU', {month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'}) : 'НЕИЗВЕСТНО';
          const score = ex.score || 0;
          const max = ex.maxScore || (ex.breakdown ? ex.breakdown.length : '23');
          
          return `
            <div class="db-item" data-id="${ex.id}" data-score="${score}/${max}">
              <div>
                <span style="color: #fff; font-family: 'PT Sans', sans-serif; font-weight: bold;">${ex.name}</span><br>
                <span style="color: #94a3b8; font-size: 0.8rem;">ДАТА: ${dateStr}</span>
              </div>
              <div style="color: #3b82f6; font-weight: bold; font-family: 'Share Tech Mono', monospace; font-size: 1.1rem;">
                [ ${score}/${max} ]
              </div>
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
            paperTest.style.color = '#10b981';
            paperTest.style.borderColor = '#10b981';
            
            updateBlank();
          });
        });
      }
    }, 600);
  });

  // Отправка
  submitBtn.addEventListener('click', async () => {
    if (!selectedExamId) return;

    submitBtn.innerHTML = '<span class="blink">ОТПРАВКА ПАКЕТА ДАННЫХ...</span>';
    submitBtn.disabled = true;

    const { error } = await supabase.from('applications').insert([{
      applicant_name: nameInput.value.trim(),
      passport_url: albumInput.value.trim(),
      licenses_url: albumInput.value.trim(),
      exam_id: selectedExamId,
      status: 'pending'
    }]);

    if (error) {
      alert('СИСТЕМНАЯ ОШИБКА: ' + error.message);
      submitBtn.textContent = 'ОТПРАВИТЬ ДАННЫЕ';
      submitBtn.disabled = false;
    } else {
      submitBtn.textContent = 'УСПЕШНО ПЕРЕДАНО';
      submitBtn.style.background = '#10b981';
      
      nameInput.disabled = true;
      albumInput.disabled = true;
      examListContainer.style.opacity = '0.5';
      examListContainer.style.pointerEvents = 'none';

      // УДАР ПЕЧАТИ ПО БЛАНКУ
      officialStamp.classList.add('visible');
    }
  });
}