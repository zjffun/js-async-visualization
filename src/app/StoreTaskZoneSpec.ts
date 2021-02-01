import { StepEnum } from './enum';

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
  private _timeTravelArray = [];

  constructor({ onScheduleTask, onInvokeTask }) {
    this._onScheduleTask = onScheduleTask;
    this._onInvokeTask = onInvokeTask;
  }

  onScheduleTask(parentZoneDelegate, currentZone, targetZone, task) {
    var task = parentZoneDelegate.scheduleTask(targetZone, task);
    task.data.id = this.id++;
    task.data._inSchedule = true;
    if (!Zone.currentTask || !Zone.currentTask.data._inSchedule) {
      this.rootTask.data.children.push(task);
    } else {
      if (!Zone.currentTask.data.children) {
        Zone.currentTask.data.children = [];
      }
      Zone.currentTask.data.children.push(task);
    }

    this._timeTravelArray.push({
      task: task,
      stack: this.getFilteredStack(),
      state: StepEnum.schedule,
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
      task: task,
      stack: this.getFilteredStack(),
      runCount: task.runCount,
      state: StepEnum.invoke,
    });

    this._onInvokeTask(task);

    parentZoneDelegate.invokeTask(targetZone, task, applyThis, applyArgs);
  }

  getFilteredStack() {
    // Chrome
    const whiteReg = /at eval \(eval at .*?, <anonymous>:\d+:\d+\)/;
    const resultStack = new Error().stack;
    const filteredStack = resultStack
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
}
