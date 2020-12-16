/*Copyright (c) 2013-2016, Rob Schmuecker
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* The name Rob Schmuecker may not be used to endorse or promote products
  derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL MICHAEL BOSTOCK BE LIABLE FOR ANY DIRECT,
INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.*/

const steps = {
  schedule: "schedule",
  invoke: "invoke",
};

const stepColor = {
  [steps.schedule]: "yellow",
  [steps.invoke]: "green",
};

function lastEle(arr) {
  if (!Array.isArray(arr)) {
    return undefined;
  }
  return arr[arr.length - 1];
}

// Get timetravel data
d3.json("timetravel.json", function (error, timeTravelData) {
  window.timeTravelData = timeTravelData;
  document.querySelector(".totalState").innerHTML = timeTravelData.length;
  document
    .querySelector(".state-range")
    .setAttribute("max", timeTravelData.length);
  // Get JSON data
  d3.json("result.json", function (error, treeData) {
    var treeDataPlane = [];

    // Calculate total nodes, max label length
    var totalNodes = 0;
    var maxLabelLength = 0;
    // Misc. variables
    var i = 0;
    var duration = 750;
    var root;

    // size of the diagram
    var viewerWidth = $(document).width();
    var viewerHeight = $(document).height();

    var tree = d3.layout.tree().size([viewerHeight, viewerWidth]);

    // define a d3 diagonal projection for use by the node paths later on.
    var diagonal = d3.svg.diagonal().projection(function (d) {
      return [d.y, d.x];
    });

    // A recursive helper function for performing some setup by walking through all nodes
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

    // Call visit function to establish maxLabelLength
    visit(
      treeData,
      function (d) {
        d.step = [];
        treeDataPlane.push(d);
        totalNodes++;
        maxLabelLength = Math.max(d.name.length, maxLabelLength);
      },
      function (d) {
        return d.children && d.children.length > 0 ? d.children : null;
      }
    );

    // TODO optimize
    timeTravelData.forEach((ttd) => {
      ttd.node = treeDataPlane.find((d) => d.ttid === ttd.ttid);
    });

    // Define the zoom function for the zoomable tree

    function zoom() {
      svgGroup.attr(
        "transform",
        "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")"
      );
    }

    // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
    var zoomListener = d3.behavior
      .zoom()
      .scaleExtent([0.1, 3])
      .on("zoom", zoom);

    // define the baseSvg, attaching a class for styling and the zoomListener
    var baseSvg = d3
      .select("#tree-container")
      .append("svg")
      .attr("width", viewerWidth)
      .attr("height", viewerHeight)
      .attr("class", "overlay")
      .call(zoomListener);

    // Helper functions for collapsing and expanding nodes.

    function collapse(d) {
      if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
      }
    }

    function expand(d) {
      if (d._children) {
        d.children = d._children;
        d.children.forEach(expand);
        d._children = null;
      }
    }

    var overCircle = function (d) {
      selectedNode = d;
      updateTempConnector();
    };
    var outCircle = function (d) {
      selectedNode = null;
      updateTempConnector();
    };

    // Function to update the temporary connector indicating dragging affiliation
    var updateTempConnector = function () {
      var data = [];
      if (draggingNode !== null && selectedNode !== null) {
        // have to flip the source coordinates since we did this for the existing connectors on the original tree
        data = [
          {
            source: {
              x: selectedNode.y0,
              y: selectedNode.x0,
            },
            target: {
              x: draggingNode.y0,
              y: draggingNode.x0,
            },
          },
        ];
      }
      var link = svgGroup.selectAll(".templink").data(data);

      link
        .enter()
        .append("path")
        .attr("class", "templink")
        .attr("d", d3.svg.diagonal())
        .attr("pointer-events", "none");

      link.attr("d", d3.svg.diagonal());

      link.exit().remove();
    };

    // Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving with large amount of children.
    function centerNode(source) {
      scale = zoomListener.scale();
      x = -source.y0;
      y = -source.x0;
      x = x * scale + viewerWidth / 2;
      y = y * scale + viewerHeight / 2;
      d3.select("g")
        .transition()
        .duration(duration)
        .attr(
          "transform",
          "translate(" + x + "," + y + ")scale(" + scale + ")"
        );
      zoomListener.scale(scale);
      zoomListener.translate([x, y]);
    }

    // Toggle children function
    function toggleChildren(d) {
      if (d.children) {
        d._children = d.children;
        d.children = null;
      } else if (d._children) {
        d.children = d._children;
        d._children = null;
      }
      return d;
    }

    // Toggle children on click.

    function click(d) {
      if (d3.event.defaultPrevented) return; // click suppressed
      d = toggleChildren(d);
      update(d);
      centerNode(d);
    }

    function update(source) {
      // Compute the new height, function counts total children of root node and sets tree height accordingly.
      // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
      // This makes the layout more consistent.
      var levelWidth = [1];
      var childCount = function (level, n) {
        if (n.children && n.children.length > 0) {
          if (levelWidth.length <= level + 1) levelWidth.push(0);

          levelWidth[level + 1] += n.children.length;
          n.children.forEach(function (d) {
            childCount(level + 1, d);
          });
        }
      };
      childCount(0, root);
      var newHeight = d3.max(levelWidth) * 25; // 25 pixels per line
      tree = tree.size([newHeight, viewerWidth]);

      // Compute the new tree layout.
      var nodes = tree
          .nodes(root)
          .reverse()
          .filter((n) => n.step.length > 0),
        links = tree.links(nodes);

      // Set widths between levels based on maxLabelLength.
      nodes.forEach(function (d) {
        d.y = d.depth * (maxLabelLength * 10); //maxLabelLength * 10px
        // alternatively to keep a fixed scale one can set a fixed depth per level
        // Normalize for fixed-depth by commenting out below line
        // d.y = (d.depth * 500); //500px per level.
      });

      // Update the nodes…
      node = svgGroup.selectAll("g.node").data(nodes, function (d) {
        return d.id || (d.id = ++i);
      });

      // Enter any new nodes at the parent's previous position.
      var nodeEnter = node
        .enter()
        .append("g")
        // .call(dragListener)
        .attr("class", "node")
        .attr("transform", function (d) {
          return "translate(" + source.y0 + "," + source.x0 + ")";
        });
      // .on("click", click);

      nodeEnter
        .append("circle")
        .attr("class", "nodeCircle")
        .attr("r", 0)
        .style("fill", function (d) {
          return stepColor[lastEle(d.step)];
        });

      nodeEnter
        .append("text")
        .attr("x", function (d) {
          return d.children || d._children ? -10 : 10;
        })
        .attr("dy", ".35em")
        .attr("class", "nodeText")
        .attr("text-anchor", function (d) {
          return d.children || d._children ? "end" : "start";
        })
        .text(function (d) {
          return d.name;
        })
        .style("fill-opacity", 0);

      // Update the text to reflect whether node has children or not.
      node
        .select("text")
        .attr("x", function (d) {
          return d.children || d._children ? -10 : 10;
        })
        .attr("text-anchor", function (d) {
          return d.children || d._children ? "end" : "start";
        })
        .text(function (d) {
          return [d.name, d.runCount, d.fileline].join("\n");
        })
        .on("click", function (d) {
          d3.event.stopPropagation();
          showInfoContianer();
          document.querySelector(
            ".info-container pre"
          ).innerText = JSON.stringify(
            d,
            (k, v) => {
              if (k === "parent" || k === "children") {
                return undefined;
              }
              return v;
            },
            2
          );
        });

      // Change the circle fill depending on whether it has children and is collapsed
      node
        .select("circle.nodeCircle")
        .attr("r", 4.5)
        .style("fill", function (d) {
          return stepColor[lastEle(d.step)];
        });

      // Transition nodes to their new position.
      var nodeUpdate = node
        .transition()
        .duration(duration)
        .attr("transform", function (d) {
          return "translate(" + d.y + "," + d.x + ")";
        });

      // Fade the text in
      nodeUpdate.select("text").style("fill-opacity", 1);

      // Transition exiting nodes to the parent's new position.
      var nodeExit = node
        .exit()
        .transition()
        .duration(duration)
        .attr("transform", function (d) {
          return "translate(" + source.y + "," + source.x + ")";
        })
        .remove();

      nodeExit.select("circle").attr("r", 0);

      nodeExit.select("text").style("fill-opacity", 0);

      // Update the links…
      var link = svgGroup.selectAll("path.link").data(links, function (d) {
        return d.target.id;
      });

      // Enter any new links at the parent's previous position.
      link
        .enter()
        .insert("path", "g")
        .attr("class", "link")
        .attr("d", function (d) {
          var o = {
            x: source.x0,
            y: source.y0,
          };
          return diagonal({
            source: o,
            target: o,
          });
        });

      // Transition links to their new position.
      link.transition().duration(duration).attr("d", diagonal);

      // Transition exiting nodes to the parent's new position.
      link
        .exit()
        .transition()
        .duration(duration)
        .attr("d", function (d) {
          var o = {
            x: source.x,
            y: source.y,
          };
          return diagonal({
            source: o,
            target: o,
          });
        })
        .remove();

      // Stash the old positions for transition.
      nodes.forEach(function (d) {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    }

    // Append a group which holds all nodes and which the zoom Listener can act upon.
    var svgGroup = baseSvg.append("g");

    // Define the root
    root = treeData;
    root.x0 = viewerHeight / 2;
    root.y0 = 0;
    root.step.push(steps.invoke);

    // Layout the tree initially and center on the root node.
    update(root);
    centerNode(root);

    window.updateTree = function () {
      update(root);
    };
  });
});
