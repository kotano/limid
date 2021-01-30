// TODO: Refactor lockPage;
// TODO: Refactor async functions;

let limidOverlay;

chrome.runtime.onMessage.addListener(function (request, sender) {
  console.log(
    sender.tab
      ? "from a content script:" + sender.tab.url
      : "from the extension"
  );
  console.log(request);
  if (request.type === "update") {
    updateProgress(request);
    return;
  }
  if (request.lock === true) {
    if (limidOverlay) {
      updateProgress(request);
    } else lockPage(() => updateProgress(request));
  } else if (request.lock === false) {
    unlockPage();
  }
});

function updateProgress({ time, maxTime }) {
  const progress = document.getElementById("limid-progress-bar");
  progress.setAttribute("max", maxTime.toString());
  progress.setAttribute("value", time.toString());
}

function requestUnlock() {
  chrome.runtime.sendMessage({ lock: false });
}

async function getBlocker() {
  const contentUrl = chrome.runtime.getURL("content.html");
  const response = await fetch(contentUrl);
  const contents = await response.text();
  const blocker = document.createElement("div");
  blocker.insertAdjacentHTML("afterbegin", contents);
  blocker
    .querySelector("#limid-giveup-button")
    .addEventListener("click", () => {
      console.log("Resume button was clicked.");
      requestUnlock();
    });
  return blocker;
}

async function lockPage(cb) {
  const blocker = await getBlocker();
  document.body.classList.add("limid-block-body");
  document.body.prepend(blocker);
  console.log("Inserted blocker div from LIMID");
  document.querySelectorAll("video").forEach((vid) => {
    vid.pause();
  });
  if (document.fullscreenElement) document.exitFullscreen();
  window.stop();
  limidOverlay = blocker;
  console.log(limidOverlay);
  return cb(null, true);
}

function unlockPage() {
  console.log("Entering unlockPage");
  console.log(limidOverlay);
  if (limidOverlay) {
    limidOverlay.remove();
    document.body.classList.remove("limid-block-body");
    limidOverlay = undefined;
    return true;
  } else {
    return false;
  }
}
