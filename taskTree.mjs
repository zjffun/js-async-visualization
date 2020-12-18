Error.stackTraceLimit = Infinity;

import StoreTaskZoneSpec from "./src/StoreTaskZoneSpec.mjs";

async function main() {
  // require("zone.js/dist/zone-node");
  await import("./node_modules_self/zone-node.js");
  const fs = await import("fs");
  // const scheduler = await import("./test-Scheduler.js");
  // const scheduler = require("./test-Scheduler2");
  const scheduler = await import("./test-fn.js");
  // const scheduler = require("./test-function-return-promise");
  // const scheduler = require("./test-promise-race");
  function test(fn) {
    Zone.current
      .fork(
        new StoreTaskZoneSpec({
          onScheduleTask(task) {
            this.timetravel.push({
              ttid: task.data.ttid,
              type: "schedule",
            });

            fs.writeFileSync(
              "result.json",
              JSON.stringify(this.getTaskTree(this.rootTask), null, 2)
            );
            fs.writeFileSync(
              "timetravel.json",
              JSON.stringify(this.timetravel, null, 2)
            );
          },
          onInvokeTask(task) {
            this.timetravel.push({
              ttid: task.data.ttid,
              type: "invoke",
            });
            fs.writeFileSync(
              "timetravel.json",
              JSON.stringify(this.timetravel, null, 2)
            );
          },
        })
      )
      .run(fn);
  }
  test(scheduler.default);
}

main();
