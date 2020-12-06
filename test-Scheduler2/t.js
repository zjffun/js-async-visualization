require("zone.js");

const expect = function (d) {
  console.log(d);
  return {
    toBe: function (d) {
      console.log(d);
    },
  };
};

let rootZone = Zone.current;
// LibZone represents some third party library which developer does
// not control. This zone is here only for illustrative purposes.
// In practice it is unlikely that most third-party libraries would
// have such fine grained zone control.
let libZone = rootZone.fork({ name: "libZone" });
// Represents a zone of an application which the developer does
// control
let appZone = rootZone.fork({ name: "appZone" });
let appZone1 = rootZone.fork({ name: "appZone1" });

// In this Example we try to demonstrate the difference between
// resolving a promise and listening to a promise. Promise
// resolution could happen in a third party libZone.
let promise = libZone.run(() => {
  return new Promise((resolve, reject) => {
    expect(Zone.current).toBe(libZone);
    // The Promise can be resolved immediately or at some later
    // point in time as in this example.
    setTimeout(() => {
      expect(Zone.current).toBe(libZone);
      // Promise is resolved in libZone, but this does not affect
      // the promise listeners.
      resolve("OK");
    }, 500);
  });
});

appZone.run(() => {
  promise.then(() => {
    // Because the developer controls which zone the .then()
    // executes, they will expect that the callback will execute in
    // the same zone, in this case the appZone.
    expect(Zone.current).toBe(appZone);
  });
});

appZone1.run(() => {
  promise.then(() => {
    // And also different thenCallback can be invoked in different
    // zone.
    expect(Zone.current).toBe(appZone1);
  });
});
