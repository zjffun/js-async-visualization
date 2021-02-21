import browserDetect from 'browser-detect';

const browser = browserDetect();

const configs = {
  unknown: {
    filterStackWhiteReg: /anonymous/,
    getLocReg: undefined,
  },
  // chrome, edge
  chrome: {
    filterStackWhiteReg: /at .*? \(eval at .*?, <anonymous>:\d+:\d+\)/,
    getLocReg: /<anonymous>:(\d+):(\d+)/,
  },
  firefox: {
    filterStackWhiteReg: /anonymous.*? > Function:\d+:\d+/,
    getLocReg: /anonymous.*? > Function:(\d+):(\d+)/,
  },
  opera: null,
};

configs.opera = configs.chrome;

let config = configs[browser.name];

if (!config) {
  config = configs.unknown;
}

export default config;
