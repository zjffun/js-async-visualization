module.exports = () => {
  // var a = Promise.race([Promise.resolve(123)]);
  var b = new Promise((res) => setTimeout(res, 10000));
  debugger;
  b.then(() => {});
  // a.then(() => {
  //   console.log(123);
  // });
  debugger;
};
