function promise() {
  return new Promise((res) => {
    setTimeout(res, 1000)
  });
}
function test() {
  promise().then(() => {
    console.log(123);
  });
}
module.exports = () => {
  test();
};
