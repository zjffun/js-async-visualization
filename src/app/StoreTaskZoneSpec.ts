import { StateEnum } from './enum';

export interface TaskNode {
  id: string;
  name: string;
  task;
  children: Array<TaskNode>;
}
export default class StoreTaskZoneSpec {
  name = 'StoreTaskZoneSpec';
  rootTask = {
    source: 'root',
    data: {
      timeTravelId: 0,
      children: [],
    },
  };
  id = 1;
  private _onScheduleTask;
  private _onInvokeTask;
  private _onCancelTask;
  private _timeTravelArray = [];
  private _onFinish;

  constructor({ onScheduleTask, onInvokeTask, onCancelTask, onFinish }) {
    this._onScheduleTask = onScheduleTask;
    this._onInvokeTask = onInvokeTask;
    this._onCancelTask = onCancelTask;
    this._onFinish = onFinish;
  }

  onScheduleTask(parentZoneDelegate, currentZone, targetZone, taskParam) {
    const task = parentZoneDelegate.scheduleTask(targetZone, taskParam);
    task.data.id = this.id++;
    task.data._inSchedule = true;
    task.data.LongStackTraceStack = new Error('LongStackTrace').stack;

    if (!Zone.currentTask || !Zone.currentTask.data._inSchedule) {
      task.data.parent = this.rootTask;
      this.rootTask.data.children.push(task);
    } else {
      if (!Zone.currentTask.data.children) {
        Zone.currentTask.data.children = [];
      }
      task.data.parent = Zone.currentTask;
      Zone.currentTask.data.children.push(task);
    }

    /**
     * promise source is only 'Promise.then'
     * see: node_modules/zone.js/dist/zone-evergreen.js:697
     */
    if (task.source === 'Promise.then' && task._state === 'scheduling') {
      task.data.promiseInvokeStack = new Error('PromiseInvokeStack').stack;
    }

    /**
     * add
     * `chainPromise.__av_stack__ = new Error().stack;`
     * to
     * node_modules/zone.js/dist/zone-evergreen.js:975
     * node_modules/zone.js/dist/zone-evergreen.js:995
     */
    this._timeTravelArray.push({
      task,
      stack: this.getFilteredStack(task),
      state: StateEnum.scheduled,
    });

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
    this._timeTravelArray.push({
      task,
      stack: this.getFilteredStack(task),
      runCount: task.runCount,
      state: StateEnum.invoked,
    });

    this._onInvokeTask(task);

    parentZoneDelegate.invokeTask(targetZone, task, applyThis, applyArgs);
  }

  onCancelTask(parentZoneDelegate, currentZone, targetZone, task) {
    this._timeTravelArray.push({
      task,
      stack: this.getFilteredStack(task),
      state: StateEnum.canceled,
    });

    this._onCancelTask(task);

    parentZoneDelegate.cancelTask(targetZone, task);
  }

  onHasTask(parentZoneDelegate, currentZone, targetZone, hasTaskState) {
    parentZoneDelegate.hasTask(targetZone, hasTaskState);
    if (
      hasTaskState.eventTask === false &&
      hasTaskState.macroTask === false &&
      hasTaskState.microTask === false
    ) {
      this._onFinish();
    }
  }

  getFilteredStack(task?: any) {
    // Chrome
    const whiteReg = /at .*? \(eval at .*?, <anonymous>:\d+:\d+\)/;

    let stack = task.data.__av_stack__;

    if (task.source === 'Promise.then' && task._state === 'running') {
      stack = task.data.promiseInvokeStack;
    }

    if (task._state === 'canceling') {
      stack = new Error().stack;
    }

    if (!stack) {
      stack = this.getLongStackTrace(task);
    }

    const filteredStack = stack
      .split('\n')
      .slice(1)
      .filter((s) => whiteReg.test(s));

    return filteredStack;
  }

  getTaskTree(task) {
    const result = {
      id: task.data.id,
      name: task.source,
      task,
      children: [],
    } as TaskNode;

    task.data.node = result;

    if (task.data.children) {
      for (const t of task.data.children) {
        result.children.push(this.getTaskTree(t));
      }
    }

    return result;
  }

  getTimeTravelArray() {
    return this._timeTravelArray;
  }

  private getLongStackTrace(task) {
    const trace = [];
    while (task) {
      trace.push(task.data.LongStackTraceStack);
      task = task.data.LongStackTraceParentTask;
    }
    return trace.join('\n');
  }
}
