import { tree, linkVertical, select, hierarchy, zoom } from 'd3';
import { StateEnum } from './enum';
import { TaskNode } from './index.d';

const stepColorMap = {
  [StateEnum.scheduled]: '#fff176',
  [StateEnum.invoked]: '#81c784',
  [StateEnum.canceled]: '#e57373',
};

const sortNameMap = {
  requestAnimationFrame: 'rAF',
};

function lastElement(arr) {
  if (!Array.isArray(arr)) {
    return undefined;
  }
  return arr[arr.length - 1];
}

function getFillColor(d) {
  return stepColorMap[lastElement(d.data.timeTravel).state];
}

const promiseReg = /^Promise\./;
const eventReg = /.*?\.addEventListener:/;

function getSortName(name: string) {
  if (name.length < 11) {
    return name;
  }
  if (sortNameMap[name]) {
    return sortNameMap[name];
  }

  if (promiseReg.test(name)) {
    return name.replace(promiseReg, 'P.');
  }

  if (eventReg.test(name)) {
    return name.replace(eventReg, 'event:');
  }

  return name.slice(name.length - 10);
}

let root: TaskNode;
let viewerWidth;
let viewerHeight;
let treeObj;
let i = 0;

const duration = 750;

const treeFn = tree<any>().nodeSize([22, 120]);

const diagonal = linkVertical<any, any>()
  .x((d) => d.y)
  .y((d) => d.x);

let baseSvg;
let svgGroup;

let left;
let right;
let top;
let bottom;

let nodeClickHandler;

export function init(taskData: TaskNode, dom: HTMLElement, onNodeClick) {
  nodeClickHandler = onNodeClick;
  viewerWidth = dom.clientWidth - 2;
  viewerHeight = dom.clientHeight - 2;

  // Define the root
  root = taskData;

  // tree
  treeObj = treeFn(hierarchy(root));
  treeObj.x0 = treeObj.x;
  treeObj.y0 = treeObj.y;
  // // Stash the old positions for transition.
  treeObj.eachBefore((d) => {
    if (d.parent) {
      const t: any = d;
      t.x0 = d.parent.x;
      t.y0 = d.parent.y;
    }
  });

  // zoom
  function handleZoom(e) {
    svgGroup.attr('transform', e.transform);
  }
  const zoomListener = zoom().scaleExtent([0.1, 3]).on('zoom', handleZoom);

  baseSvg = select(dom)
    .append('svg')
    .attr('viewBox', [-10, -10, viewerWidth - 20, viewerHeight - 20].toString())
    .attr('width', viewerWidth)
    .attr('height', viewerHeight)
    .style('width', viewerWidth)
    .style('height', viewerHeight)
    .call(zoomListener);

  const gWrapper = baseSvg
    .append('g')
    .attr('transform', 'translate(60, ' + viewerHeight / 2 + ') scale(1)');

  svgGroup = gWrapper.append('g');
}

export function update() {
  // Compute the new tree layout.
  const nodes = treeObj
    .descendants()
    .filter((n) => n.data.timeTravel.length > 0);
  const links = treeObj
    .links()
    .filter((n) => n.target.data.timeTravel.length > 0);

  left = root;
  right = root;
  top = root;
  bottom = root;
  nodes.forEach((n) => {
    if (n.x < left.x) {
      left = n;
    }
    if (n.x > right.x) {
      right = n;
    }
    if (n.y < bottom.y) {
      bottom = n;
    }
    if (n.y > top.y) {
      top = n;
    }
  });

  const circleR = 8;

  // Update the nodes…
  const node = svgGroup
    .selectAll('g.node')
    .data(nodes, (d) => {
      return d.id || (d.id = ++i);
    })
    .join(
      (enter) =>
        enter
          .append('g')
          .attr('class', 'node')
          .attr('transform', (d) => {
            return 'translate(' + d.y0 + ',' + d.x0 + ')';
          })
          .call((enter) =>
            enter
              .append('circle')
              .attr('class', 'nodeCircle')
              .attr('r', circleR)
              .style('fill', getFillColor)
              .on('click', (e, d) => {
                e.stopPropagation();
                nodeClickHandler(d.data);
              })
          )
          .call((enter) =>
            enter
              .append('text')
              .attr('dy', '.35em')
              .attr('class', 'nodeText nodeText--id')
              .attr('text-anchor', 'middle')
              .text((d) => {
                return d.data.id;
              })
              .style('fill-opacity', 1)
              .on('click', (e, d) => {
                e.stopPropagation();
                nodeClickHandler(d.data);
              })
          )
          .call((enter) =>
            enter
              .append('text')
              .attr('x', (d) => {
                return d.children || d._children ? -10 : 10;
              })
              .attr('dy', '.35em')
              .attr('class', 'nodeText')
              .attr('text-anchor', (d) => {
                return d.children || d._children ? 'end' : 'start';
              })
              .text((d) => {
                return getSortName(d.data.name);
              })
              .style('fill-opacity', 1)
              .on('click', (e, d) => {
                e.stopPropagation();
                nodeClickHandler(d.data);
              })
              .append('title')
              .text((d) => {
                return d.data.name;
              })
          )
          .call((enter) =>
            enter
              .transition()
              .duration(duration)
              .attr('transform', (d) => {
                return 'translate(' + d.y + ',' + d.x + ')';
              })
          ),
      (update) =>
        update
          .call((update) => update.select('text').style('fill-opacity', 1))
          .call((update) =>
            update
              .select('circle.nodeCircle')
              .attr('r', circleR)
              .style('fill', getFillColor)
          ),
      (exit) => {
        exit
          .call((exit) =>
            exit
              .transition()
              .duration(duration)
              .attr('transform', (d) => {
                return 'translate(' + d.y0 + ',' + d.x0 + ')';
              })
              .remove()
          )
          .call((exit) => exit.select('circle').attr('r', 0))
          .call((exit) => exit.select('text').style('fill-opacity', 0));
      }
    );

  // Update the links…
  const link = svgGroup
    .selectAll('path.link')
    .data(links, (d) => {
      return d.target.id;
    })
    .join(
      (enter) =>
        enter
          .insert('path', 'g')
          .attr('class', 'link')
          .attr('d', (d) => {
            const o = {
              x: d.source.x,
              y: d.source.y,
            };
            return diagonal({
              source: o,
              target: o,
            });
          })
          .call((enter) =>
            enter.transition().duration(duration).attr('d', diagonal)
          ),
      (update) => {},
      (exit) =>
        exit
          .transition()
          .duration(duration)
          .attr('d', (d) => {
            const o = {
              x: d.source.x,
              y: d.source.y,
            };
            return diagonal({
              source: o,
              target: o,
            });
          })
          .remove()
    );
}
