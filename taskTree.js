const fs = require("fs");
require("zone.js/dist/zone-node");
// const scheduler = require("./Scheduler");
// const scheduler = require("./test-fn");
// const scheduler = require("./test-function-return-promise");
const scheduler = require("./test-promise-race");

class StoreTaskZoneSpec {
  constructor() {
    this.name = "StoreTaskZoneSpec";
    this.rootTask = {
      source: "root",
      data: {
        children: [],
      },
    };
  }

  onScheduleTask(parentZoneDelegate, currentZone, targetZone, task) {
    var task = parentZoneDelegate.scheduleTask(targetZone, task);
    task.data.fileline = this.getFileLine();
    if (!Zone.currentTask) {
      this.rootTask.data.children.push(task);
      return task;
    }
    if (!Zone.currentTask.data.children) {
      Zone.currentTask.data.children = [];
    }
    Zone.currentTask.data.children.push(task);

    fs.writeFileSync(
      "result.json",
      JSON.stringify(lst.getTaskTree(lst.rootTask), null, 2)
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
    fs.writeFileSync(
      "result.json",
      JSON.stringify(lst.getTaskTree(lst.rootTask), null, 2)
    );
    return parentZoneDelegate.invokeTask(
      targetZone,
      task,
      applyThis,
      applyArgs
    );
  }

  getFileLine() {
    const reg = /\\node_modules\\zone\.js|taskTree.js/;
    console.log(
      new Error().stack
        .split("\n")
        .slice(1)
        .filter((s) => !reg.test(s))
    );
    debugger;
    const fileline = new Error().stack
      .split("\n")
      .slice(1)
      .find((s) => !reg.test(s));
    if (fileline) {
      return fileline.replace("at ", "").replace(/(.*?):(\d+:\d+)/, "$2");
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
