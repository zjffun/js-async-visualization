let curState = -1;
function prevState() {
  if (curState < 0) {
    return;
  }
  if (curState > timeTravelData.length - 1) {
    curState = timeTravelData.length - 1;
  }
  const ttd = timeTravelData[curState--];
  ttd.node.step.pop();
  updateTree();
  document.querySelector(".curState").innerText = curState;
  document.querySelector(".state-range").value = curState;
}
function nextState() {
  if (curState > timeTravelData.length - 1) {
    return;
  }
  if (curState < 0) {
    curState = 0;
  }
  const ttd = timeTravelData[curState++];
  ttd.node.step.push(ttd.type);
  updateTree();
  document.querySelector(".curState").innerText = curState;
  document.querySelector(".state-range").value = curState;
}
function changeState(e) {
  const targetState = +e.target.value;
  console.log(e);
  if (curState > targetState) {
    while (curState > targetState) {
      prevState();
    }
  } else {
    while (curState < targetState) {
      nextState();
    }
  }
}
function showInfoContianer() {
  document.querySelector(".info-container").style.display = "block";
}
function hideInfoContianer() {
  document.querySelector(".info-container").style.display = "none";
}

document.addEventListener("click", hideInfoContianer);
