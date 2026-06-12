import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';

// Твой конфиг
const config = {
  adminCode: 'pro-2026',
  adminSessionKey: 'lsfm-pro-admin-session',
  storageKey: 'lsfm-pro-exam-submissions',
  supabaseUrl: 'https://eijjetlaiourgzkzsqpx.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpampldGxhaW91cmd6a3pzcXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzI1NTksImV4cCI6MjA5Njg0ODU1OX0.WkjbDWWOm9EJkBzIyJS-CWRV8bxGffrkR0-SmoycWPM',
  supabaseTable: 'submissions',
};

// Инициализируем Supabase прямо здесь
const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
type QuestionKind = 'single' | 'multi' | 'text';

type Question = {
  id: string;
  kind: QuestionKind;
  title: string;
  prompt: string;
  options?: string[];
  correctAnswer?: string | string[];
  keywords?: string[];
  points: number;
  explanation: string;
};

type Lesson = {
  title: string;
  summary: string;
  points: string[];
};

type Submission = {
  id: string;
  name: string;
  squad: string;
  contact: string;
  submittedAt: string;
  score: number;
  maxScore: number;
  answers: Record<string, string | string[]>;
  breakdown: Array<{ questionId: string; label: string; score: number; maxScore: number; note: string }>;
};

const STORAGE_KEY = 'lsfm-pro-exam-submissions';
const ADMIN_SESSION_KEY = 'lsfm-pro-admin-session';
const ADMIN_CODE = import.meta.env.VITE_ADMIN_CODE ?? 'pro-2026';

const lessons: Lesson[] = [
  {
    title: 'Правила',
    summary: 'Что делать на проверке, чтобы ответ выглядел уверенно и не разваливался на фактах.',
    points: [
      'Сначала читай вопрос целиком и ищи ключевую задачу.',
      'Не спорь с регламентом, а опирайся на него.',
      'Краткий ответ без воды обычно сильнее длинной импровизации.',
    ],
  },
  {
    title: 'Устав',
    summary: 'База дисциплины: единый порядок действий, одинаковые критерии и предсказуемая проверка.',
    points: [
      'Регламент нужен, чтобы у всех были одинаковые условия.',
      'Факты важнее эмоций и домыслов.',
      'Если сомневаешься, сначала фиксируй, потом уточняй.',
    ],
  },
  {
    title: 'ПРО',
    summary: 'Как отвечать на вопросы по ПРО: коротко, по смыслу и с опорой на проверяемые детали.',
    points: [
      'Покажи, что понимаешь порядок проверки.',
      'Укажи, какие доказательства считаешь важными.',
      'Поясняй логику ответа, а не просто повторяй слова из конспекта.',
    ],
  },
];

const questions: Question[] = [
  {
    id: 'q1',
    kind: 'single',
    title: 'Стартовая проверка',
    prompt: 'Что правильнее сделать первым шагом, если ты заметил нарушение ПРО?',
    options: [
      'Сразу спорить публично и повышать градус',
      'Зафиксировать факт и передать старшему по регламенту',
      'Игнорировать и надеяться, что само пройдет',
      'Удалить сообщение и не оставлять следов',
    ],
    correctAnswer: 'Зафиксировать факт и передать старшему по регламенту',
    points: 2,
    explanation: 'Правильный алгоритм: фиксация, передача и работа по процедуре, а не эмоции.',
  },
  {
    id: 'q2',
    kind: 'multi',
    title: 'Содержимое отчета',
    prompt: 'Какие элементы должны быть в нормальном отчете о нарушении? Выбери все подходящие.',
    options: [
      'Время и контекст события',
      'Скрин или ссылка на доказательство',
      'Личные догадки без фактов',
      'Короткое описание того, что произошло',
    ],
    correctAnswer: ['Время и контекст события', 'Скрин или ссылка на доказательство', 'Короткое описание того, что произошло'],
    points: 3,
    explanation: 'Отчет должен быть фактическим: время, контекст, доказательства и краткая суть.',
  },
  {
    id: 'q3',
    kind: 'single',
    title: 'Приоритет',
    prompt: 'Что важнее в стрессовой ситуации?',
    options: ['Эффектность ответа', 'Точность и соблюдение процесса', 'Скорость любой ценой', 'Спор ради победы'],
    correctAnswer: 'Точность и соблюдение процесса',
    points: 2,
    explanation: 'Для экзамена и модерации важны корректность и процесс, а не внешний шум.',
  },
  {
    id: 'q4',
    kind: 'text',
    title: 'Короткий ответ',
    prompt: 'Кратко опиши, почему доказательства важнее эмоций в проверке ПРО.',
    keywords: ['доказ', 'факт', 'провер'],
    points: 4,
    explanation: 'Свободный ответ проверяется по ключевым идеям: факт, доказательства, проверяемость.',
  },
  {
    id: 'q5',
    kind: 'single',
    title: 'Дисциплина',
    prompt: 'Какой подход считается сильным в команде?',
    options: ['Сделать вид, что ничего не было', 'Решать по памяти без чек-листа', 'Следовать единому регламенту', 'Менять правила на ходу'],
    correctAnswer: 'Следовать единому регламенту',
    points: 2,
    explanation: 'Единый регламент снижает хаос и делает проверку одинаковой для всех.',
  },
  {
    id: 'q6',
    kind: 'multi',
    title: 'Красные флаги',
    prompt: 'Что обычно указывает на слабый ответ? Выбери все подходящие.',
    options: ['Нет конкретики', 'Есть факты и примеры', 'Много эмоций и мало смысла', 'Ответ легко повторяет регламент'],
    correctAnswer: ['Нет конкретики', 'Много эмоций и мало смысла'],
    points: 3,
    explanation: 'Слабый ответ обычно расплывчатый, эмоциональный и без проверяемых деталей.',
  },
  {
    id: 'q7',
    kind: 'text',
    title: 'Финал',
    prompt: 'Сформулируй одно правило, которое помогает не провалить проверку.',
    keywords: ['правил', 'регламент', 'факт'],
    points: 4,
    explanation: 'Лучше всего заходит ответ с опорой на регламент и фактическую аргументацию.',
  },
];

const blankAnswers = questions.reduce<Record<string, string | string[]>>((accumulator, question) => {
  accumulator[question.id] = question.kind === 'multi' ? [] : '';
  return accumulator;
}, {});

const blankPracticeAnswers = questions.reduce<Record<string, string | string[]>>((accumulator, question) => {
  accumulator[question.id] = question.kind === 'multi' ? [] : '';
  return accumulator;
}, {});

function loadSubmissions(): Submission[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Submission[]) : [];
  } catch {
    return [];
  }
}

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function scoreQuestion(question: Question, answer: string | string[]) {
  if (question.kind === 'single') {
    const correct = String(question.correctAnswer ?? '');
    const isCorrect = normalize(String(answer)) === normalize(correct);
    return {
      score: isCorrect ? question.points : 0,
      note: isCorrect ? 'Верно' : 'Неверно',
    };
  }

  if (question.kind === 'multi') {
    const correct = [...(question.correctAnswer as string[])].map(normalize).sort();
    const selected = [...(Array.isArray(answer) ? answer : [answer])].map(normalize).filter(Boolean).sort();
    const isCorrect = correct.length === selected.length && correct.every((item, index) => item === selected[index]);
    return {
      score: isCorrect ? question.points : Math.max(0, question.points - 1),
      note: isCorrect ? 'Все пункты найдены' : 'Частичный или неверный ответ',
    };
  }

  const text = normalize(String(answer));
  const hits = (question.keywords ?? []).filter((keyword) => text.includes(normalize(keyword)));
  const score = Math.round((hits.length / Math.max(1, question.keywords?.length ?? 1)) * question.points);
  return {
    score,
    note: hits.length > 0 ? `Найдено ключевых идей: ${hits.length}` : 'Нужны факты и ключевые слова',
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function App() {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(blankAnswers);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, string | string[]>>(blankPracticeAnswers);
  const [name, setName] = useState('');
  const [squad, setSquad] = useState('');
  const [contact, setContact] = useState('');
  const [activeSection, setActiveSection] = useState<'learn' | 'practice' | 'exam'>('learn');
  const [practiceResult, setPracticeResult] = useState<{ score: number; maxScore: number; details: Array<{ title: string; score: number; maxScore: number; note: string }> } | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [adminCode, setAdminCode] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

useEffect(() => {
  // Асинхронно тянем все ответы из базы Supabase
  async function fetchSubmissions() {
    const { data, error } = await supabase
      .from(config.supabaseTable)
      .select('*')
      .order('submittedAt', { ascending: false }); // Свежие ответы будут сверху

    if (error) {
      console.error('Ошибка загрузки из Supabase:', error.message);
    } else if (data) {
      setSubmissions(data as Submission[]);
    }
  }

  fetchSubmissions();
  setIsAdmin(window.sessionStorage.getItem(config.adminSessionKey) === 'true');
}, []);

  useEffect(() => {
    if (submittedId) {
      const timer = window.setTimeout(() => setSubmittedId(null), 5000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [submittedId]);

  const totals = useMemo(() => {
    const maxScore = questions.reduce((sum, question) => sum + question.points, 0);
    const average = submissions.length
      ? Math.round(submissions.reduce((sum, submission) => sum + submission.score, 0) / submissions.length)
      : 0;
    return { maxScore, average };
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    const needle = normalize(search);
    return [...submissions]
      .filter((submission) => {
        if (!needle) return true;
        return [submission.name, submission.squad, submission.contact, submission.id].some((value) =>
          normalize(value).includes(needle),
        );
      })
      .sort((left, right) => right.score - left.score || right.submittedAt.localeCompare(left.submittedAt));
  }, [search, submissions]);

  const selectedSubmission = filteredSubmissions.find((submission) => submission.id === selectedSubmissionId) ?? filteredSubmissions[0] ?? null;

  function updateAnswer(questionId: string, value: string) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  function updatePracticeAnswer(questionId: string, value: string) {
    setPracticeAnswers((current) => ({ ...current, [questionId]: value }));
  }

  function toggleMultiAnswer(questionId: string, option: string) {
    setAnswers((current) => {
      const currentValue = current[questionId];
      const next = Array.isArray(currentValue) ? [...currentValue] : [];
      if (next.includes(option)) {
        return { ...current, [questionId]: next.filter((item) => item !== option) };
      }
      next.push(option);
      return { ...current, [questionId]: next };
    });
  }

  function togglePracticeMultiAnswer(questionId: string, option: string) {
    setPracticeAnswers((current) => {
      const currentValue = current[questionId];
      const next = Array.isArray(currentValue) ? [...currentValue] : [];
      if (next.includes(option)) {
        return { ...current, [questionId]: next.filter((item) => item !== option) };
      }
      next.push(option);
      return { ...current, [questionId]: next };
    });
  }

  function runPracticeCheck(event: FormEvent) {
    event.preventDefault();

    const details = questions.map((question) => {
      const result = scoreQuestion(question, practiceAnswers[question.id]);
      return {
        title: question.title,
        score: result.score,
        maxScore: question.points,
        note: result.note,
      };
    });

    const score = details.reduce((sum, item) => sum + item.score, 0);
    setPracticeResult({ score, maxScore: totals.maxScore, details });
  }

 async function submitExam(event: FormEvent) {
  event.preventDefault();
  if (!name.trim() || !squad.trim()) {
    return;
  }

  const breakdown = questions.map((question) => {
    const result = scoreQuestion(question, answers[question.id]);
    return {
      questionId: question.id,
      label: question.title,
      score: result.score,
      maxScore: question.points,
      note: result.note,
    };
  });

  const score = breakdown.reduce((sum, item) => sum + item.score, 0);
  
  const submission: Submission = {
    id: crypto.randomUUID(),
    name: name.trim(),
    squad: squad.trim(),
    contact: contact.trim(),
    submittedAt: new Date().toISOString(),
    score,
    maxScore: totals.maxScore,
    answers,
    breakdown,
  };

  // --- ВМЕСТО LOCALSTORAGE ОТПРАВЛЯЕМ В ОБЛАКО ---
  const { error } = await supabase
    .from(config.supabaseTable)
    .insert([submission]);

  if (error) {
    console.error('Ошибка отправки в Supabase:', error.message);
    alert('Не удалось сохранить ответы в базу данных. Сообщите админу!');
    return; // Останавливаем выполнение, форму не чистим, чтобы данные не пропали
  }

  // Если всё ок — обновляем локальный стейт, чтобы админ сразу увидел строку
  setSubmissions((current) => [submission, ...current]);
  setSubmittedId(submission.id);
  setSelectedSubmissionId(submission.id);
  setAnswers(blankAnswers);
  setName('');
  setSquad('');
  setContact('');
}

  function loginAsAdmin() {
    if (normalize(adminCode) === normalize(ADMIN_CODE)) {
      window.sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      setIsAdmin(true);
      setAdminCode('');
    }
  }

  function logoutAdmin() {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setIsAdmin(false);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(submissions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lsfm-pro-exam-submissions.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const header = ['id', 'name', 'squad', 'contact', 'submittedAt', 'score', 'maxScore'];
    const rows = submissions.map((submission) => [
      submission.id,
      submission.name,
      submission.squad,
      submission.contact,
      submission.submittedAt,
      submission.score,
      submission.maxScore,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lsfm-pro-exam-submissions.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="shell">
      <div className="glow glow-a" />
      <div className="glow glow-b" />

      <header className="hero">
        <div className="hero-copy">
          <span className="eyebrow">LSFM / PRO / экзаменатор</span>
          <h1>Три раздела: учись, тренируйся и сдавай экзамен отдельно.</h1>
          <p>
            В одном сайте есть раздел обучения с правилами и уставом, тренировка с мгновенной
            проверкой и экзамен, который сохраняется для админов.
          </p>
          <div className="hero-stats">
            <article>
              <strong>{questions.length}</strong>
              <span>вопросов для тренировки и экзамена</span>
            </article>
            <article>
              <strong>{lessons.length}</strong>
              <span>разделов обучения</span>
            </article>
            <article>
              <strong>{submissions.length}</strong>
              <span>экзаменов сохранено</span>
            </article>
          </div>
        </div>

        <aside className="login-panel">
          {isAdmin ? (
            <>
              <div className="panel-badge success">Админ активен</div>
              <h2>Панель доступа открыта</h2>
              <p>Можно смотреть ответы, сортировать попытки и экспортировать данные.</p>
              <button className="secondary-button" type="button" onClick={logoutAdmin}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <div className="panel-badge">Admin Gate</div>
              <h2>Вход для администратора</h2>
              <p>Код по умолчанию: pro-2026. Лучше заменить через VITE_ADMIN_CODE.</p>
              <input
                value={adminCode}
                onChange={(event) => setAdminCode(event.target.value)}
                placeholder="Введите код администратора"
                className="text-input"
              />
              <button className="secondary-button" type="button" onClick={loginAsAdmin}>
                Открыть админ-панель
              </button>
            </>
          )}
        </aside>
      </header>

      <nav className="section-tabs" aria-label="Разделы сайта">
        <button className={activeSection === 'learn' ? 'tab-button active' : 'tab-button'} type="button" onClick={() => setActiveSection('learn')}>
          Обучение
        </button>
        <button className={activeSection === 'practice' ? 'tab-button active' : 'tab-button'} type="button" onClick={() => setActiveSection('practice')}>
          Практика
        </button>
        <button className={activeSection === 'exam' ? 'tab-button active' : 'tab-button'} type="button" onClick={() => setActiveSection('exam')}>
          Экзамен
        </button>
      </nav>

      {activeSection === 'learn' && (
        <section className="card section-card">
          <div className="section-title">
            <span>Обучение</span>
            <strong>Правила, устав и ПРО</strong>
          </div>
          <div className="learning-grid">
            {lessons.map((lesson) => (
              <article key={lesson.title} className="lesson-card">
                <h3>{lesson.title}</h3>
                <p>{lesson.summary}</p>
                <ul>
                  {lesson.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeSection === 'practice' && (
        <section className="card section-card">
          <div className="section-title">
            <span>Практика</span>
            <strong>Пробуй тесты без сохранения попыток</strong>
          </div>

          <form onSubmit={runPracticeCheck} className="exam-form">
            {questions.map((question, index) => (
              <article key={question.id} className="question-card">
                <div className="question-meta">
                  <span>Тест {index + 1}</span>
                  <strong>{question.points} балл{question.points === 1 ? '' : question.points < 5 ? 'а' : 'ов'}</strong>
                </div>
                <h3>{question.title}</h3>
                <p>{question.prompt}</p>

                {question.kind === 'single' && question.options && (
                  <div className="options">
                    {question.options.map((option) => (
                      <label key={option} className="option-row">
                        <input
                          type="radio"
                          name={`practice-${question.id}`}
                          checked={practiceAnswers[question.id] === option}
                          onChange={() => updatePracticeAnswer(question.id, option)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.kind === 'multi' && question.options && (
                  <div className="options">
                    {question.options.map((option) => (
                      <label key={option} className="option-row">
                        <input
                          type="checkbox"
                          checked={Array.isArray(practiceAnswers[question.id]) && practiceAnswers[question.id].includes(option)}
                          onChange={() => togglePracticeMultiAnswer(question.id, option)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.kind === 'text' && (
                  <textarea
                    value={String(practiceAnswers[question.id] ?? '')}
                    onChange={(event) => updatePracticeAnswer(question.id, event.target.value)}
                    className="text-area"
                    placeholder="Коротко, по фактам"
                    rows={4}
                  />
                )}

                <details className="question-hint">
                  <summary>Подсказка</summary>
                  <p>{question.explanation}</p>
                </details>
              </article>
            ))}

            <div className="form-footer">
              <button className="primary-button" type="submit">
                Проверить ответы
              </button>
              <p>Эта проверка только для тренировки. Ничего не сохраняется для админов.</p>
            </div>
          </form>

          {practiceResult && (
            <div className="practice-result">
              <div className="detail-header">
                <div>
                  <span>Результат практики</span>
                  <h3>{practiceResult.score}/{practiceResult.maxScore}</h3>
                </div>
              </div>
              <div className="breakdown-list">
                {practiceResult.details.map((item) => (
                  <article key={item.title} className="breakdown-item">
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.note}</p>
                    </div>
                    <span>
                      {item.score}/{item.maxScore}
                    </span>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {activeSection === 'exam' && (
        <main className="layout">
          <section className="card exam-card section-card">
            <div className="section-title">
              <span>Экзамен</span>
              <strong>Ответы сохраняются для админов</strong>
            </div>

            <form onSubmit={submitExam} className="exam-form">
              <div className="grid-3">
                <label>
                  Имя
                  <input value={name} onChange={(event) => setName(event.target.value)} className="text-input" placeholder="Например, Никита" />
                </label>
                <label>
                  Отряд / группа
                  <input value={squad} onChange={(event) => setSquad(event.target.value)} className="text-input" placeholder="ЛСФМ-1" />
                </label>
                <label>
                  Контакт
                  <input value={contact} onChange={(event) => setContact(event.target.value)} className="text-input" placeholder="Telegram или ник" />
                </label>
              </div>

              {questions.map((question, index) => (
                <article key={question.id} className="question-card">
                  <div className="question-meta">
                    <span>Вопрос {index + 1}</span>
                    <strong>{question.points} балл{question.points === 1 ? '' : question.points < 5 ? 'а' : 'ов'}</strong>
                  </div>
                  <h3>{question.title}</h3>
                  <p>{question.prompt}</p>

                  {question.kind === 'single' && question.options && (
                    <div className="options">
                      {question.options.map((option) => (
                        <label key={option} className="option-row">
                          <input
                            type="radio"
                            name={question.id}
                            checked={answers[question.id] === option}
                            onChange={() => updateAnswer(question.id, option)}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.kind === 'multi' && question.options && (
                    <div className="options">
                      {question.options.map((option) => (
                        <label key={option} className="option-row">
                          <input
                            type="checkbox"
                            checked={Array.isArray(answers[question.id]) && answers[question.id].includes(option)}
                            onChange={() => toggleMultiAnswer(question.id, option)}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.kind === 'text' && (
                    <textarea
                      value={String(answers[question.id] ?? '')}
                      onChange={(event) => updateAnswer(question.id, event.target.value)}
                      className="text-area"
                      placeholder="Коротко, по фактам"
                      rows={4}
                    />
                  )}

                  <details className="question-hint">
                    <summary>Как оценивается</summary>
                    <p>{question.explanation}</p>
                  </details>
                </article>
              ))}

              <div className="form-footer">
                <button className="primary-button" type="submit">
                  Сдать экзамен
                </button>
                <p>
                  Попытка сохраняется локально в этом браузере. Для общей базы подключи Supabase или Firebase.
                </p>
              </div>
            </form>
          </section>

          <section className="card side-card section-card">
            <div className="section-title">
              <span>Результаты</span>
              <strong>Текущая статистика</strong>
            </div>
            <div className="score-grid">
              <div>
                <span>Средний балл</span>
                <strong>{totals.average}</strong>
              </div>
              <div>
                <span>Лучший результат</span>
                <strong>{submissions.length ? Math.max(...submissions.map((submission) => submission.score)) : 0}</strong>
              </div>
            </div>
            {submittedId && (
              <div className="notice success">
                Попытка принята. Можно сразу открыть админ-панель и посмотреть ее в списке.
              </div>
            )}
            <div className="score-list">
              {[...questions].slice(0, 3).map((question) => (
                <article key={question.id}>
                  <span>{question.title}</span>
                  <strong>{question.points} баллов</strong>
                </article>
              ))}
            </div>
          </section>
        </main>
      )}

      {isAdmin && (
        <section className="card admin-card">
          <div className="admin-topbar">
            <div>
              <div className="section-title">
                <span>Админ-панель</span>
                <strong>Ответы и аналитика</strong>
              </div>
              <p>{submissions.length} сохраненных попыток, поиск, экспорт и детальный разбор.</p>
            </div>
            <div className="admin-actions">
              <button className="secondary-button" type="button" onClick={exportCsv}>
                CSV
              </button>
              <button className="secondary-button" type="button" onClick={exportJson}>
                JSON
              </button>
            </div>
          </div>

          <div className="admin-grid">
            <div className="admin-list">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="text-input"
                placeholder="Поиск по имени, отряду или ID"
              />

              <div className="submission-list">
                {filteredSubmissions.length === 0 ? (
                  <div className="empty-state">Пока нет сохраненных попыток.</div>
                ) : (
                  filteredSubmissions.map((submission) => (
                    <button
                      key={submission.id}
                      type="button"
                      className={`submission-item ${selectedSubmission?.id === submission.id ? 'active' : ''}`}
                      onClick={() => setSelectedSubmissionId(submission.id)}
                    >
                      <strong>{submission.name}</strong>
                      <span>{submission.squad}</span>
                      <small>
                        {submission.score}/{submission.maxScore} · {formatDate(submission.submittedAt)}
                      </small>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="admin-detail">
              {selectedSubmission ? (
                <>
                  <div className="detail-header">
                    <div>
                      <span>Выбрана попытка</span>
                      <h3>{selectedSubmission.name}</h3>
                    </div>
                    <strong>
                      {selectedSubmission.score}/{selectedSubmission.maxScore}
                    </strong>
                  </div>
                  <div className="detail-meta">
                    <span>{selectedSubmission.squad}</span>
                    <span>{selectedSubmission.contact || 'Нет контакта'}</span>
                    <span>{formatDate(selectedSubmission.submittedAt)}</span>
                  </div>

                  <div className="breakdown-list">
                    {selectedSubmission.breakdown.map((item) => (
                      <article key={item.questionId} className="breakdown-item">
                        <div>
                          <strong>{item.label}</strong>
                          <p>{item.note}</p>
                        </div>
                        <span>
                          {item.score}/{item.maxScore}
                        </span>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-state">Выбери попытку слева, чтобы увидеть ответы.</div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
