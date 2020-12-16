Error.stackTraceLimit = Infinity;

const fs = require("fs");
require("./node_modules_self/zone-node");
// require("zone.js/dist/zone-node");
// const scheduler = require("./test-Scheduler");
// const scheduler = require("./test-Scheduler2");
// const scheduler = require("./test-fn");
const scheduler = require("./test-function-return-promise");
// const scheduler = require("./test-promise-race");

class StoreTaskZoneSpec {
  constructor() {
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

    this.timetravel.push({
      ttid: task.data.ttid,
      type: "schedule",
    });

    fs.writeFileSync(
      "result.json",
      JSON.stringify(lst.getTaskTree(lst.rootTask), null, 2)
    );
    fs.writeFileSync(
      "timetravel.json",
      JSON.stringify(this.timetravel, null, 2)
    );
    return task;
  }

  onInvokeTask(
    parentZoneDelegate,
    currentZone,
    targetZone,
    task,
    applyThis,
    applyArgs
  ) {
    this.timetravel.push({
      ttid: task.data.ttid,
      type: "invoke",
    });
    fs.writeFileSync(
      "result.json",
      JSON.stringify(lst.getTaskTree(lst.rootTask), null, 2)
    );
    fs.writeFileSync(
      "timetravel.json",
      JSON.stringify(this.timetravel, null, 2)
    );
    return parentZoneDelegate.invokeTask(
      targetZone,
      task,
      applyThis,
      applyArgs
    );
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

    debugger;
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

let lst;

function test(fn) {
  return function (done) {
    Zone.current.fork((lst = new StoreTaskZoneSpec(done))).run(fn);
  };
}

test(scheduler)(() => {
  console.log("done");
});
