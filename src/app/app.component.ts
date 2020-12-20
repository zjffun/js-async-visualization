import { Component, ElementRef, ViewChild } from '@angular/core';
import Split from 'split.js';
import CodeMirror from 'codemirror';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/addon/runmode/colorize.js';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  @ViewChild('code') code: ElementRef;
  @ViewChild('result') result: ElementRef;
  @ViewChild('tree') tree: ElementRef;
  @ViewChild('detail') detail: ElementRef;

  ngAfterViewInit() {
    Split([this.code.nativeElement, this.result.nativeElement], {
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

    var myCodeMirror = CodeMirror(this.code.nativeElement, {
      value: 'function myScript(){return 100;}\n',
      lineNumbers: true,
      mode: 'javascript',
      theme: 'solarized dark',
    });
  }
}
