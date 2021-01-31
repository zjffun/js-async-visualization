import { tree, linkVertical, select, hierarchy, zoom } from 'd3';
import { StepEnum } from './enum';
import { TaskNode } from './index.d';

const stepColorMap = {
  [StepEnum.scheduling]: 'yellow',
  [StepEnum.schedule]: 'yellow',
  [StepEnum.invoke]: 'green',
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

let root: TaskNode;
let viewerWidth;
let viewerHeight;
let treeObj;
let i = 0;

const duration = 750;

const treeFn = tree<any>().nodeSize([12, 120]);

const diagonal = linkVertical<any, any>()
  .x((d) => d.y)
  .y((d) => d.x);

// define the baseSvg, attaching a class for styling and the zoomListener
// dom.innerHTML = '';
let baseSvg;
let svgGroup;

let left;
let right;
let top;
let bottom;
// A recursive helper function for performing some setup by walking through all nodes

export function init(taskData: TaskNode, dom: HTMLElement) {
  viewerWidth = dom.clientWidth;
  viewerHeight = dom.clientHeight;

  // Define the root
  root = taskData;
  root.timeTravel.push({
    state: StepEnum.invoke,
  });

  // tree
  treeObj = treeFn(hierarchy(root));
  treeObj.x0 = treeObj.x;
  treeObj.y0 = treeObj.y;
  // // Stash the old positions for transition.
  treeObj.eachBefore(function (d) {
    if (d.parent) {
      let t: any = d;
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
    .call(zoomListener);

  let gWrapper = baseSvg
    .append('g')
    .attr('transform', 'translate(60, ' + viewerHeight / 2 + ') scale(1)');

  svgGroup = gWrapper.append('g');
}

export function update() {
  // Compute the new tree layout.
  var nodes = treeObj.descendants().filter((n) => n.data.timeTravel.length > 0);
  var links = treeObj
    .links()
    .filter((n) => n.target.data.timeTravel.length > 0);

  left = root;
  right = root;
  top = root;
  bottom = root;
  nodes.forEach((node) => {
    if (node.x < left.x) left = node;
    if (node.x > right.x) right = node;
    if (node.y < bottom.y) bottom = node;
    if (node.y > top.y) top = node;
  });

  // Update the nodes…
  var node = svgGroup
    .selectAll('g.node')
    .data(nodes, function (d) {
      return d.id || (d.id = ++i);
    })
    .join(
      (enter) =>
        enter
          .append('g')
          .attr('class', 'node')
          .attr('transform', function (d) {
            return 'translate(' + d.y0 + ',' + d.x0 + ')';
          })
          .call((enter) =>
            enter
              .append('circle')
              .attr('class', 'nodeCircle')
              .attr('r', 4.5)
              .style('fill', getFillColor)
          )
          .call((enter) =>
            enter
              .append('text')
              .attr('x', function (d) {
                return d.children || d._children ? -10 : 10;
              })
              .attr('dy', '.35em')
              .attr('class', 'nodeText')
              .attr('text-anchor', function (d) {
                return d.children || d._children ? 'end' : 'start';
              })
              .text(function (d) {
                return [d.data.name].join('\n');
              })
              .style('fill-opacity', 1)
              .on('click', function (e, d) {
                e.stopPropagation();
                (document.querySelector(
                  '.info-container pre'
                ) as HTMLElement).innerText = JSON.stringify(
                  d,
                  (k, v) => {
                    if (['parent', 'children', 'task', 'node'].includes(k)) {
                      return undefined;
                    }
                    return v;
                  },
                  2
                );
              })
          )
          .call((enter) =>
            enter
              .transition()
              .duration(duration)
              .attr('transform', function (d) {
                return 'translate(' + d.y + ',' + d.x + ')';
              })
          ),
      (update) =>
        update
          .call((update) => update.select('text').style('fill-opacity', 1))
          .call((update) =>
            update
              .select('circle.nodeCircle')
              .attr('r', 4.5)
              .style('fill', getFillColor)
          ),
      (exit) => {
        exit
          .call((exit) =>
            exit
              .transition()
              .duration(duration)
              .attr('transform', function (d) {
                return 'translate(' + d.y0 + ',' + d.x0 + ')';
              })
              .remove()
          )
          .call((exit) => exit.select('circle').attr('r', 0))
          .call((exit) => exit.select('text').style('fill-opacity', 0));
      }
    );

  // Update the links…
  var link = svgGroup
    .selectAll('path.link')
    .data(links, function (d) {
      return d.target.id;
    })
    .join(
      (enter) =>
        enter
          .insert('path', 'g')
          .attr('class', 'link')
          .attr('stroke', 'aqua')
          .attr('d', function (d) {
            var o = {
              x: d.x0,
              y: d.y0,
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
          .attr('d', function (d) {
            var o = {
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
