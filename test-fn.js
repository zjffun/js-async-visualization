module.exports = () => {
  setTimeout(() => {
    setTimeout(() => {
      Promise.resolve(0).then(() => {});
    }, 1000);
  }, 0);
  let resolve;
  let promise;
  setInterval(() => {
    promise = new Promise((res) => {
      resolve = res;
    });
  }, 200);
  setTimeout(() => {
    resolve("123");
    promise.then(() => {});
  }, 300);
};
