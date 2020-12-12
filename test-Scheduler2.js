class Scheduler {
  constructor() {
    this.queue = [];
    this.count = 2;
    this.running = 0;
  }
  add(task) {
    let resolve;
    let promise = new Promise((res) => {
      resolve = res;
    });

    this.queue.push([task, resolve]);
    this.scheduler();
    return promise;
  }
  scheduler() {
    if (this.running < this.count && this.queue.length > 0) {
      this.running++;
      const [task, resolve] = this.queue.shift();
      task().then(() => {
        resolve();
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
    .then(() => console.log(order));
};

module.exports = () => {
  addTask(1000, 1);
  addTask(500, 2);
  addTask(300, 3);
  addTask(800, 4);
};
