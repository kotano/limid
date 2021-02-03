let port;
let currentTab;
let extension;
// let activeTargets;

function g(elem) {
  return document.getElementById(elem);
}

function log(msg) {
  console.log("Limid: " + msg);
}

function addToBlacklist(host) {
  port.postMessage({ type: "blacklist", host });
}

function populateList() {
  const dList = g("distractors-list");
  chrome.runtime.getBackgroundPage((bgWindow) => {
    bgWindow.activeTargets.forEach((tabId) => {
      chrome.tabs.get(tabId, (tab) => {
        const host = new URL(tab.url).host;
        const elemHtml = `
        <li>
          <div>
            <span class="siteName">${host}</span>
            <button data-tabid="${tabId}" class="closeTab">X</button>
          </div>
        </li>`;
        dList.insertAdjacentHTML("afterbegin", elemHtml);
      });
      log(tabId);
    });
  });
}

function requestDiscardPage(tabId) {
  port.postMessage({ type: "discard", tabId });
}

function init(callback) {
  try {
    port = chrome.runtime.connect({ name: "popup" });
    port.onMessage.addListener(function (msg) {
      if (msg.type === "response") {
        log(msg.response);
      }
    });
  } catch (e) {
    log(e);
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    currentTab = tabs[0];
    const host = new URL(currentTab.url).host;
    const input = g("input-website");
    input.value = host;
    const blacklistBtn = g("blacklistBtn");
    blacklistBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      log("Blacklist button was pressed");
      addToBlacklist(host);
    });
  });
  chrome.runtime.getBackgroundPage((bgWindow) => {
    console.log(bgWindow);
    extension = bgWindow;
    const switchButton = g("switchButton");
    switchButton.textContent = bgWindow.settings.blocking ? "Unlock" : "Lock";
    switchButton.onclick = (ev) => {
      if (bgWindow.settings.blocking) {
        bgWindow.unlockAllPages();
        ev.target.textContent = "Lock";
      } else {
        bgWindow.lockAllPages();
        ev.target.textContent = "Unlock";
      }
    };
  });
  return callback;
}

function load() {
  setInterval(() => log(extension.settings.toString()), 15000);
  const dList = g("distractors-list");
  dList.addEventListener("click", (ev) => {
    log("Deleting " + ev);
    ev.stopPropagation();
    requestDiscardPage(ev.target.dataset.tabid);
    ev.target.closest("li").remove();
  });
  populateList();
}

document.addEventListener("DOMContentLoaded", init(load));
