export default [
  {
    code: `// Promise
const promise = new Promise((res) => {
  setTimeout(() => {
    res();
  }, 1000);
});

promise
  .then(() => {
    // do something
  })
  .catch(() => {
    // handle error
  })
  .finally(() => {
    // do something
  });

promise.then(() => {
  // do something else
});
`,
  },
  {
    code: `// Event
let i = 0;

function raf(){
  Promise
    .resolve(i)
    .then(d => d + 17)
    .then(d => d + Math.random() * 17)
    .then(d => {
      i = d;
      if (i < 42) {
        raf();
      } else {
        div.removeEventListener("click", listener);
      }
    });
}

function listener() {
  requestAnimationFrame(raf);
}

const div = document.createElement("div");

div.addEventListener("click", listener);

div.click();
    `,
  },
  {
    code: `// Perform two tasks simultaneously
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
  return new Promise((r) => setTimeout(() => {
    r();
  }, time));
};
const addTask = (time, order) => {
  scheduler
    .add(() => {
      return timeout(time);
    })
    .then(() => console.log(order));
};


addTask(1000, 1);
addTask(500, 2);
addTask(300, 3);
addTask(800, 4);
addTask(200, 4);
`,
  },
];
