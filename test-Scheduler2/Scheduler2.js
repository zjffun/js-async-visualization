require("zone.js");
require("zone.js/dist/long-stack-trace-zone")

const ZoneA = Zone.current.fork('A')

class Scheduler {
  constructor() {
    this.queue = [];
    this.count = 2;
    this.running = 0;
  }
  add(task) {
    return ZoneA.run(() => {
      let resolve;
      let promise = new Promise((res) => {
        resolve = res;
      });

      this.queue.push([task, resolve]);
      this.scheduler();
      return promise;
    });
  }
  scheduler() {
    if (this.running < this.count && this.queue.length > 0) {
      this.running++;
      const [task, resolve] = this.queue.shift();
      task().then(() => {
        ZoneA.run(resolve);
        this.running--;
        this.scheduler();
      });
    }
  }
}

const scheduler = new Scheduler();
const timeout = (time) => {
  return new Promise((r) => setTimeout(r, time));
};

const addTask = (time, order) => {
  scheduler
    .add(() => {
      return timeout(time);
    })
    .then(() => {
      // console.log("----------", new Error().stack);
      // debugger;
      debugger
      throw new Error()
      console.log(order);
    });
};

function foo() {
  addTask(1000, 1);
  addTask(500, 2);
  // addTask(300, 3);
  // addTask(100, 31);
  // addTask(800, 4);
  // addTask(800, 41);
  // addTask(800, 51);
  // addTask(200, 61);
}

Zone.current.fork(Zone.longStackTraceZoneSpec).run(foo);
