import { TaskTree } from '.';
import { stepEnum } from './enum';

export default class StoreTaskZoneSpec {
  name = 'StoreTaskZoneSpec';
  rootTask = {
    source: 'root',
    data: {
      timeTravelId: 0,
      children: [],
    },
  };
  timeTravelId = 1;
  timetravel = [];
  private _onScheduleTask;
  private _onInvokeTask;

  constructor({ onScheduleTask, onInvokeTask }) {
    this._onScheduleTask = onScheduleTask;
    this._onInvokeTask = onInvokeTask;
  }

  onScheduleTask(parentZoneDelegate, currentZone, targetZone, task) {
    var task = parentZoneDelegate.scheduleTask(targetZone, task);
    task.data.filteredStack = this.getFilteredStack(task.data.stack);
    task.data.fileline = this.getFileLine(task.data.filteredStack);
    task.data.timeTravelId = this.timeTravelId++;
    if (
      !Zone.currentTask ||
      Zone.currentTask.source === 'HTMLButtonElement.addEventListener:click'
      //  ||
      // Zone.currentTask.source === 'Promise.then'
    ) {
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
    parentZoneDelegate.invokeTask(targetZone, task, applyThis, applyArgs);
    this._onInvokeTask(task);
  }

  getFilteredStack(stack) {
    const reg = /\\node_modules_self\\|\\node_modules\\zone\.js|taskTree.js/;
    let resultStack;
    if (stack) {
      resultStack = stack;
    } else {
      resultStack = new Error().stack;
    }
    const filteredStack = resultStack
      .split('\n')
      .slice(1)
      .filter((s) => !reg.test(s));

    return filteredStack;
  }

  getFileLine(filteredStack) {
    if (filteredStack) {
      return filteredStack[0]
        .replace('at ', '')
        .replace(/(.*?):(\d+:\d+)/, '$2');
    } else {
      return '';
    }
  }

  getTaskTree(task) {
    const result = {
      id: '',
      runCound: -1,
      states: [],
      name: task.source,
      runCount: task.runCount,
      state: task.state,
      fileline: task.data.fileline,
      filteredStack: task.data.filteredStack,
      timeTravelId: task.data.timeTravelId,
      children: [],
    } as TaskTree;
    if (task.data.children) {
      for (const t of task.data.children) {
        result.children.push(this.getTaskTree(t));
      }
    }
    return result;
  }
}
