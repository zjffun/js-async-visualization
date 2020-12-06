class Scheduler {
  constructor() {
    this.count = 2;
    this.queue = [];
    this.run = [];
  }
  add(task) {
    this.queue.push(task);
    return this.scheduler();
  }
  scheduler() {
    if (this.run.length < this.count && this.queue.length) {
      const task = this.queue.shift();
      const promise = task().then(() => {
        this.run.splice(this.run.indexOf(promise), 1);
      });
      this.run.push(promise);
      return promise;
    } else {
      debugger
      Promise.resolve(0).then(() => {
        
      });
      return Promise.race(this.run).then((res) => {
        return this.scheduler();
      });
    }
  }
}

const scheduler = new Scheduler();
const timeout = (time) => {
  return new Promise((r) => {
    return setTimeout(r, time);
  });
};
let i = 0;
const addTask = (time, order) => {
  scheduler
    .add(() => {
      debugger
      return timeout(time);
    })
    .then(() => console.log(order));
};

// addTask(1200, 5)
// addTask(1400, 6)
module.exports = function () {
  addTask(1000, 1);
  addTask(500, 2);
  addTask(300, 3);
  addTask(800, 4);
};
