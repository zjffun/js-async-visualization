export default [
  {
    code: `// var a = Promise.race([Promise.resolve(123)]);
    var timeout;
var b = new Promise((res) => {
  timeout = setTimeout(() => {
  res();
}, 1000)});

// setTimeout(() => {
  // clearTimeout(timeout);
// }, 500)

function t(){
  b.then(() => {});
}

t();
// a.then(() => {
//   console.log(123);
// });
`,
    timeout: 1300,
  },
  {
    code: `
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
          return Promise.race(this.run).then((res) => {
            return this.scheduler();
          });
        }
      }
    }

    const scheduler = new Scheduler();
    const timeout = (time) => {
      return new Promise((r) => setTimeout(r, time));
    };
    let i = 0;
    const addTask = (time, order) => {
      scheduler
        .add(() => {
          return timeout(time);
        })
        .then(() => console.log(order));
    };

    // run
    addTask(1000, 1);
    addTask(500, 2);
    addTask(300, 3);
    addTask(800, 4);
    `,
    timeout: 2000,
  },
  {
    code: `function myScript(){return 100;}

    setTimeout(()=>{setTimeout(()=>{setTimeout(()=>{}, 100)}, 100)}, 100)
    setTimeout(()=>{setTimeout(()=>{setTimeout(()=>{}, 100)}, 100)}, 100)
    console.log(11)
    throw Error(10)`,
    timeout: 500,
  },
];
