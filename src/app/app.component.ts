import { Component, ElementRef, ViewChild } from '@angular/core';
import Split from 'split.js';
import CodeMirror from 'codemirror';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/addon/runmode/colorize.js';
import 'codemirror/addon/display/panel.js';
import 'codemirror/addon/selection/mark-selection.js';
import StoreTaskZoneSpec from './StoreTaskZoneSpec';
import { init, update } from './d3Tree';
import { TimeTravel } from '.';

function visit(parent, visitFn, childrenFn) {
  if (!parent) return;

  visitFn(parent);

  var children = childrenFn(parent);
  if (children) {
    var count = children.length;
    for (var i = 0; i < count; i++) {
      visit(children[i], visitFn, childrenFn);
    }
  }
}

function getLoc(str: string) {
  const locReg = /<anonymous>:(\d+):(\d+)/;
  const res = str.match(locReg);
  return {
    line: +res[1] - 3,
    ch: +res[2] - 1,
  };
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  @ViewChild('codeWrapper') codeWrapper: ElementRef;
  @ViewChild('code') code: ElementRef;
  @ViewChild('result') result: ElementRef;
  @ViewChild('tree') tree: ElementRef;
  @ViewChild('detail') detail: ElementRef;

  private codeMirror: CodeMirror.Editor;
  private timeTravelArray: Array<TimeTravel> = [];
  private taskTree;
  private locMark;

  currentState = -1;

  totalState = -1;

  runCode() {
    this.timeTravelArray = [];

    const that = this;
    const code = this.codeMirror.getValue();
    const func = new Function(code);
    try {
      Zone.current
        .fork(
          new StoreTaskZoneSpec({
            onScheduleTask() {
              that.taskTree = this.getTaskTree(this.rootTask);
              that.timeTravelArray = this.getTimeTravelArray();
            },
            onInvokeTask() {},
            onCancelTask() {},
          })
        )
        .run(func);
    } catch (error) {
      console.error(error);
      return;
    }
  }

  handleUpdateClick() {
    visit(
      this.taskTree,
      (d) => {
        d.timeTravel = [];
      },
      (d) => d.children
    );

    // TODO optimize
    this.timeTravelArray.forEach((ttd) => {
      ttd.node = ttd.task.data.node;
    });

    this.totalState = this.timeTravelArray.length - 1;

    this.tree.nativeElement.querySelector('#tree-container').innerHTML = '';
    init(
      this.taskTree,
      this.tree.nativeElement.querySelector('#tree-container'),
      this.handleNodeClick.bind(this)
    );
    this.updateTree();
  }

  updateTree() {
    update();
  }

  handleChangeState(e) {
    const targetState = +e.target.value;
    console.log(e);
    if (this.currentState > targetState) {
      while (this.currentState > targetState) {
        this.prevState();
      }
    } else {
      while (this.currentState < targetState) {
        this.nextState();
      }
    }
  }

  handleNodeClick(data) {
    (document.querySelector(
      '.info-container pre'
    ) as HTMLElement).innerText = JSON.stringify(
      data,
      (k, v) => {
        if (['parent', 'children', 'task', 'node'].includes(k)) {
          return undefined;
        }
        return v;
      },
      2
    );
    this.setLocMark(data.data.timeTravel[data.data.timeTravel.length - 1]);
  }

  setLocMark(timeTravelData?: TimeTravel) {
    const stackFrame = timeTravelData?.stack?.[0];
    if (stackFrame) {
      const { line, ch } = getLoc(stackFrame);
      this.locMark?.clear();
      this.locMark = this.codeMirror.markText(
        { line, ch },
        { line, ch: ch + 1 },
        { className: 'CodeMirror-CurrentLoc' }
      );
    }
  }

  prevState() {
    if (this.currentState < 0) {
      return;
    }
    const ttd = this.timeTravelArray[this.currentState];
    this.currentState--;
    ttd.node.timeTravel.pop();
    this.updateTree();
    this.handleNodeClick({
      data: ttd.node,
    });
    this.setLocMark(this.timeTravelArray[this.currentState]);
  }

  nextState() {
    if (this.currentState >= this.timeTravelArray.length - 1) {
      return;
    }
    this.currentState++;
    const ttd = this.timeTravelArray[this.currentState];
    ttd.node.timeTravel.push(ttd);
    this.updateTree();
    this.handleNodeClick({
      data: ttd.node,
    });
    this.setLocMark(ttd);
  }

  ngAfterViewInit() {
    Split([this.codeWrapper.nativeElement, this.result.nativeElement], {
      sizes: [50, 50],
      dragInterval: 20,
      minSize: 0,
      elementStyle: function (dimension, size, gutterSize) {
        return {
          flex: `0 0 auto`,
          width: `calc(${size}% - ${gutterSize}px)`,
        };
      },
      gutterStyle: function (dimension, gutterSize) {
        return {
          flex: `0 0 ${gutterSize}px`,
        };
      },
    });

    Split([this.tree.nativeElement, this.detail.nativeElement], {
      sizes: [50, 50],
      dragInterval: 20,
      minSize: 0,
      direction: 'vertical',
      elementStyle: function (dimension, size, gutterSize) {
        return {
          flex: `0 0 auto`,
          height: `calc(${size}% - ${gutterSize}px)`,
        };
      },
      gutterStyle: function (dimension, gutterSize) {
        return {
          flex: `0 0 ${gutterSize}px`,
        };
      },
    });

    const CodeMirrorStatusBar = document.createElement('div');
    CodeMirrorStatusBar.classList.add('CodeMirror-StatusBar');
    CodeMirrorStatusBar.innerText = 'Ln -1, Col -1';

    let code;
    code = `// var a = Promise.race([Promise.resolve(123)]);
var b = new Promise((res) => setTimeout(() => {
  res();
}, 1000));
b.then(() => {});
// a.then(() => {
//   console.log(123);
// });
`;

    // code = `
    // class Scheduler {
    //   constructor() {
    //     this.count = 2;
    //     this.queue = [];
    //     this.run = [];
    //   }
    //   add(task) {
    //     this.queue.push(task);
    //     return this.scheduler();
    //   }
    //   scheduler() {
    //     if (this.run.length < this.count && this.queue.length) {
    //       const task = this.queue.shift();
    //       const promise = task().then(() => {
    //         this.run.splice(this.run.indexOf(promise), 1);
    //       });
    //       this.run.push(promise);
    //       return promise;
    //     } else {
    //       return Promise.race(this.run).then((res) => {
    //         return this.scheduler();
    //       });
    //     }
    //   }
    // }

    // const scheduler = new Scheduler();
    // const timeout = (time) => {
    //   return new Promise((r) => setTimeout(r, time));
    // };
    // let i = 0;
    // const addTask = (time, order) => {
    //   scheduler
    //     .add(() => {
    //       return timeout(time);
    //     })
    //     .then(() => console.log(order));
    // };

    // // run
    // addTask(1000, 1);
    // addTask(500, 2);
    // addTask(300, 3);
    // addTask(800, 4);`;

    //     code = `function myScript(){return 100;}

    // setTimeout(()=>{setTimeout(()=>{setTimeout(()=>{}, 100)}, 100)}, 100)
    // setTimeout(()=>{setTimeout(()=>{setTimeout(()=>{}, 100)}, 100)}, 100)
    // console.log(11)
    // throw Error(10)`;

    this.codeMirror = CodeMirror(this.code.nativeElement, {
      value: code,
      lineNumbers: true,
      mode: 'javascript',
      theme: 'solarized dark',
    });

    this.codeMirror.on('cursorActivity', () => {
      const c = this.codeMirror.getCursor();
      CodeMirrorStatusBar.innerText = `Ln ${c.line}, Col ${c.ch}`;
    });

    this.codeMirror.addPanel(CodeMirrorStatusBar, {
      position: 'before-bottom',
      stable: true,
    });

    // debug
    this.runCode();
    setTimeout(() => {
      this.handleUpdateClick();
    }, 3000);
  }
}
