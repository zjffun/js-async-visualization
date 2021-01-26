import { Component, ElementRef, ViewChild } from '@angular/core';
import Split from 'split.js';
import CodeMirror from 'codemirror';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/addon/runmode/colorize.js';
import 'codemirror/addon/display/panel.js';
import StoreTaskZoneSpec from './StoreTaskZoneSpec';
import { init, update } from './d3Tree';
import { stepEnum } from './enum';
import { TaskTree, TimeTravelData } from '.';

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
  private ttd: TimeTravelData;
  private timeTravelData: Array<TimeTravelData> = [];
  private taskTree;

  currentState = -1;

  totalState = -1;

  runCode() {
    this.timeTravelData = [];

    const that = this;
    const code = this.codeMirror.getValue();
    const func = new Function(code);
    try {
      Zone.current
        .fork(
          new StoreTaskZoneSpec({
            onScheduleTask(task) {
              that.timeTravelData.push({
                id: task.data.timeTravelId,
                state: stepEnum.schedule,
              });

              that.taskTree = this.getTaskTree(this.rootTask);
            },
            onInvokeTask(task) {
              that.timeTravelData.push({
                id: task.data.timeTravelId,
                state: stepEnum.invoke,
              });
            },
          })
        )
        .run(func);
    } catch (error) {
      console.error(error);
      return;
    }
  }

  handleUpdateClick() {
    const treeDataPlane: Array<TaskTree> = [];
    visit(
      this.taskTree,
      function (d) {
        d.states = [];
        treeDataPlane.push(d);
      },
      function (d) {
        return d.children && d.children.length > 0 ? d.children : null;
      }
    );

    // TODO optimize
    this.timeTravelData.forEach((ttd) => {
      ttd.node = treeDataPlane.find((d) => d.timeTravelId === ttd.id);
    });

    this.totalState = this.timeTravelData.length - 1;

    this.tree.nativeElement.querySelector('#tree-container').innerHTML = '';
    init(
      this.taskTree,
      this.tree.nativeElement.querySelector('#tree-container')
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

  prevState() {
    if (this.currentState < 0) {
      return;
    }
    const ttd = this.timeTravelData[this.currentState];
    this.currentState--;
    ttd.node.states.pop();
    this.updateTree();
  }

  nextState() {
    if (this.currentState >= this.timeTravelData.length - 1) {
      return;
    }
    this.currentState++;
    const ttd = this.timeTravelData[this.currentState];
    ttd.node.states.push(ttd.state);
    this.updateTree();
  }

  ngAfterViewInit() {
    Split([this.codeWrapper.nativeElement, this.result.nativeElement], {
      sizes: [50, 50],
      dragInterval: 20,
      minSize: 0,
      elementStyle: function (dimension, size, gutterSize) {
        return {
          'flex-basis': 'calc(' + size + '% - ' + gutterSize + 'px)',
          width: 'calc(' + size + '% - ' + gutterSize + 'px)',
        };
      },
      gutterStyle: function (dimension, gutterSize) {
        return {
          'flex-basis': gutterSize + 'px',
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
          'flex-basis': 'calc(' + size + '% - ' + gutterSize + 'px)',
          height: 'calc(' + size + '% - ' + gutterSize + 'px)',
        };
      },
      gutterStyle: function (dimension, gutterSize) {
        return {
          'flex-basis': gutterSize + 'px',
        };
      },
    });

    const CodeMirrorStatusBar = document.createElement('div');
    CodeMirrorStatusBar.classList.add('CodeMirror-StatusBar');
    CodeMirrorStatusBar.innerText = 'Ln -1, Col -1';

    this.codeMirror = CodeMirror(this.code.nativeElement, {
      value: `function myScript(){return 100;}


setTimeout(()=>{setTimeout(()=>{setTimeout(()=>{}, 100)}, 100)}, 100)
setTimeout(()=>{setTimeout(()=>{setTimeout(()=>{}, 100)}, 100)}, 100)
console.log(11)
throw Error(10)`,
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
    }, 500);
  }
}
