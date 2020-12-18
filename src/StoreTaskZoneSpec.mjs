export default class StoreTaskZoneSpec {
  constructor({ onScheduleTask, onInvokeTask }) {
    this.name = "StoreTaskZoneSpec";
    this.rootTask = {
      source: "root",
      data: {
        ttid: 0,
        children: [],
      },
    };
    this.ttid = 1;
    this.timetravel = [];
    this._onScheduleTask = onScheduleTask;
    this._onInvokeTask = onInvokeTask;
  }

  onScheduleTask(parentZoneDelegate, currentZone, targetZone, task) {
    var task = parentZoneDelegate.scheduleTask(targetZone, task);
    task.data.filteredStack = this.getFilteredStack(task.data.stack);
    task.data.fileline = this.getFileLine(task.data.filteredStack);
    task.data.ttid = this.ttid++;
    if (!Zone.currentTask) {
      this.rootTask.data.children.push(task);
    } else {
      if (!Zone.currentTask.data.children) {
        Zone.currentTask.data.children = [];
      }
      Zone.currentTask.data.children.push(task);
    }

    this._onScheduleTask(task);
  }

  onInvokeTask(
    parentZoneDelegate,
    currentZone,
    targetZone,
    task,
    applyThis,
    applyArgs
  ) {
    parentZoneDelegate.invokeTask(
      targetZone,
      task,
      applyThis,
      applyArgs
    );
    this._onInvokeTask(task);
  }

  getFilteredStack(stack) {
    const reg = /\\node_modules_self\\|\\node_modules\\zone\.js|taskTree.js/;
    let resultStack = [];
    if (stack) {
      resultStack = stack;
    } else {
      resultStack = new Error().stack;
    }
    const filteredStack = resultStack
      .split("\n")
      .slice(1)
      .filter((s) => !reg.test(s));

    return filteredStack;
  }

  getFileLine(filteredStack) {
    if (filteredStack) {
      return filteredStack[0]
        .replace("at ", "")
        .replace(/(.*?):(\d+:\d+)/, "$2");
    } else {
      return "";
    }
  }

  getTaskTree(task) {
    const result = {
      name: task.source,
      runCount: task.runCount,
      state: task.state,
      fileline: task.data.fileline,
      filteredStack: task.data.filteredStack,
      ttid: task.data.ttid,
      children: [],
    };
    if (task.data.children) {
      for (const t of task.data.children) {
        result.children.push(this.getTaskTree(t));
      }
    }
    return result;
  }
}
