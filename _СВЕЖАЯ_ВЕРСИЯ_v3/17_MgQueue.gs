/**
 * 17_MgQueue.gs — очередь MG с trigger chaining.
 */

const MG_QUEUE_KEY = 'MG_QUEUE_STATE';
const MG_WORKER_FN = 'mgQueueWorker_trigger';
const MG_TIME_LIMIT_MS = 4 * 60 * 1000;

function mgQueueEnqueue_(clusterIds, shelfIds, log) {
  const state = {
    clusters: clusterIds.map(id => ({ id, done: false })),
    shelves:  shelfIds.map(id  => ({ id, done: false })),
    startedAt: new Date().toISOString()
  };
  PropertiesService.getDocumentProperties().setProperty(MG_QUEUE_KEY, JSON.stringify(state));
  log.step('🗃 MG-очередь: ' + state.clusters.length + 'cl + ' + state.shelves.length + 'sh');
}

function mgQueueState_() {
  const s = PropertiesService.getDocumentProperties().getProperty(MG_QUEUE_KEY);
  return s ? JSON.parse(s) : null;
}
function mgQueueSave_(s) {
  PropertiesService.getDocumentProperties().setProperty(MG_QUEUE_KEY, JSON.stringify(s));
}
function mgQueueClear_() {
  PropertiesService.getDocumentProperties().deleteProperty(MG_QUEUE_KEY);
}

function mgQueueWorker_(fromUi) {
  const start = Date.now();
  const log = newLogContext_('MG-worker' + (fromUi ? ' (sync)' : ' (trigger)'));
  try {
    let state = mgQueueState_();
    if (!state) { log.flush('OK'); return { clusterDone:0, clusterTotal:0, shelfDone:0, shelfTotal:0, pending:0 }; }

    for (let i = 0; i < state.clusters.length; i++) {
      if (state.clusters[i].done) continue;
      if (Date.now() - start > MG_TIME_LIMIT_MS) { mgQueueSave_(state); mgQueueScheduleNext_(log); return summarize_(state); }
      try {
        const block = readMgFile_(state.clusters[i].id, MG_KIND.CLUSTERS, log);
        appendMgBlock_(block, CONFIG.TEMPLATE_TABS.MG_CLUSTERS.name, 'Кластеры', log);
      } catch (e) { log.error('Cluster ' + state.clusters[i].id + ': ' + e.message); }
      state.clusters[i].done = true;
      mgQueueSave_(state);
      try { SpreadsheetApp.flush(); } catch (e) {}
    }

    for (let i = 0; i < state.shelves.length; i++) {
      if (state.shelves[i].done) continue;
      if (Date.now() - start > MG_TIME_LIMIT_MS) { mgQueueSave_(state); mgQueueScheduleNext_(log); return summarize_(state); }
      try {
        const block = readMgFile_(state.shelves[i].id, MG_KIND.SHELVES, log);
        appendMgBlock_(block, CONFIG.TEMPLATE_TABS.MG_SHELVES.name, 'Полки', log);
      } catch (e) { log.error('Shelf ' + state.shelves[i].id + ': ' + e.message); }
      state.shelves[i].done = true;
      mgQueueSave_(state);
      try { SpreadsheetApp.flush(); } catch (e) {}
    }

    mgQueueClear_();
    log.step('✅ Очередь пуста');
    log.flush('OK');
    return summarize_(state);
  } catch (e) {
    log.error(e.message); log.flush('ERROR'); throw e;
  }
}

function mgQueueWorker_trigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === MG_WORKER_FN) ScriptApp.deleteTrigger(t);
  });
  mgQueueWorker_(false);
}

function mgQueueScheduleNext_(log) {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === MG_WORKER_FN) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger(MG_WORKER_FN).timeBased().after(60 * 1000).create();
  log.step('⏰ Триггер: продолжу через минуту');
}

function summarize_(state) {
  return {
    clusterTotal: state.clusters.length,
    clusterDone:  state.clusters.filter(c => c.done).length,
    shelfTotal:   state.shelves.length,
    shelfDone:    state.shelves.filter(s => s.done).length,
    pending: state.clusters.filter(c => !c.done).length + state.shelves.filter(s => !s.done).length
  };
}
