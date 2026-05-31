/**
 * 17_MgQueue.gs
 * ============================================================================
 * Очередь обработки MarketGuru-файлов с trigger chaining.
 *
 * Зачем: Apps Script лимит 6 мин на исполнение. При 9 файлах кластеров × 9 файлов
 * полок + большие таблицы — пайплайн может не уложиться. Очередь сохраняет состояние
 * в Properties, worker обрабатывает один файл за вызов и автоматически создаёт
 * одноразовый триггер для следующего файла, если время идёт к лимиту.
 * ============================================================================
 */

const MG_QUEUE_KEY = 'MG_QUEUE_STATE';
const MG_WORKER_FN = 'mgQueueWorker_trigger';
const MG_TIME_LIMIT_MS = 4 * 60 * 1000; // запас 2 минуты перед лимитом 6 мин

/**
 * Поставить пакет файлов в очередь. Затирает предыдущее состояние.
 */
function mgQueueEnqueue_(clusterIds, shelfIds, log) {
  const state = {
    clusters: clusterIds.map(id => ({ id, done: false })),
    shelves:  shelfIds.map(id  => ({ id, done: false })),
    startedAt: new Date().toISOString()
  };
  PropertiesService.getDocumentProperties().setProperty(MG_QUEUE_KEY, JSON.stringify(state));
  log.step('🗃 Очередь MG: ' + state.clusters.length + ' кластеров + ' + state.shelves.length + ' полок');
}

function mgQueueState_() {
  const s = PropertiesService.getDocumentProperties().getProperty(MG_QUEUE_KEY);
  return s ? JSON.parse(s) : null;
}

function mgQueueSave_(state) {
  PropertiesService.getDocumentProperties().setProperty(MG_QUEUE_KEY, JSON.stringify(state));
}

function mgQueueClear_() {
  PropertiesService.getDocumentProperties().deleteProperty(MG_QUEUE_KEY);
}

/**
 * Worker: обрабатывает файлы по одному, пока остаётся время. Когда время заканчивается —
 * ставит триггер на повторный запуск через минуту.
 *
 * @param {boolean} fromUi — true, если вызвано из сайдбара (управление логом).
 */
function mgQueueWorker_(fromUi) {
  const start = Date.now();
  const log = newLogContext_('MG-worker' + (fromUi ? ' (sync)' : ' (trigger)'));
  try {
    let state = mgQueueState_();
    if (!state) { log.flush('OK'); return { clusterDone:0, clusterTotal:0, shelfDone:0, shelfTotal:0, pending:0 }; }

    // Обработаем кластеры
    for (let i = 0; i < state.clusters.length; i++) {
      if (state.clusters[i].done) continue;
      if (Date.now() - start > MG_TIME_LIMIT_MS) { mgQueueSave_(state); mgQueueScheduleNext_(log); return summarize_(state); }
      try {
        const block = readMgFile_(state.clusters[i].id, MG_KIND.CLUSTERS, log);
        appendMgBlock_(block, CONFIG.TEMPLATE_TABS.MG_CLUSTERS.name, 'Кластеры', log);
      } catch (e) {
        log.error('Cluster file ' + state.clusters[i].id + ': ' + e.message);
      }
      state.clusters[i].done = true;
      mgQueueSave_(state);
      SpreadsheetApp.flush();
    }

    // Обработаем полки
    for (let i = 0; i < state.shelves.length; i++) {
      if (state.shelves[i].done) continue;
      if (Date.now() - start > MG_TIME_LIMIT_MS) { mgQueueSave_(state); mgQueueScheduleNext_(log); return summarize_(state); }
      try {
        const block = readMgFile_(state.shelves[i].id, MG_KIND.SHELVES, log);
        appendMgBlock_(block, CONFIG.TEMPLATE_TABS.MG_SHELVES.name, 'Полки', log);
      } catch (e) {
        log.error('Shelf file ' + state.shelves[i].id + ': ' + e.message);
      }
      state.shelves[i].done = true;
      mgQueueSave_(state);
      SpreadsheetApp.flush();
    }

    mgQueueClear_();
    log.step('✅ Очередь MG обработана полностью');
    log.flush('OK');
    return summarize_(state);
  } catch (e) {
    log.error(e.message + '\n' + (e.stack||''));
    log.flush('ERROR');
    throw e;
  }
}

/**
 * Триггер-обёртка — вызывается через time-based trigger.
 */
function mgQueueWorker_trigger() {
  // Снести триггеры этой функции, иначе будут множиться
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === MG_WORKER_FN) ScriptApp.deleteTrigger(t);
  });
  mgQueueWorker_(false);
}

function mgQueueScheduleNext_(log) {
  // Снести старые триггеры
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === MG_WORKER_FN) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger(MG_WORKER_FN).timeBased().after(60 * 1000).create();
  log.step('⏰ Поставлен триггер: продолжу обработку очереди через минуту');
}

function summarize_(state) {
  return {
    clusterTotal: state.clusters.length,
    clusterDone:  state.clusters.filter(c => c.done).length,
    shelfTotal:   state.shelves.length,
    shelfDone:    state.shelves.filter(s => s.done).length,
    pending:      state.clusters.filter(c => !c.done).length + state.shelves.filter(s => !s.done).length
  };
}
