/* eslint-disable init-declarations */

let targetTabs = new Set();
var settings = {};
var activeTargets = [];

// Interval id variables
let countdown;
let countup;
let pageUpdates;

const DEFAULT_MAX_TIME = 3600;
const DEFAULT_BLACKLIST = [
  "www.youtube.com",
  "www.reddit.com",
  "www.facebook.com",
];
const DEFAULT_WHITELIST = ["wikipedia.org"];
const DEFAULT_INHIBITOR = 3;

class LimidInterval {
  constructor(callback, delay) {
    this._callback = callback;
    this._delay = delay;
    this.active = false;
    this.timerId = null;
  }

  start() {
    if (this.active) return;
    this._clear();
    this.timerId = setInterval(this._callback, this._delay);
    this.active = true;
  }

  stop() {
    if (!this.active) return;
    this._clear();
    this.active = false;
  }

  _clear() {
    clearInterval(this.timerId);
  }
}

// Get values from chrome storage and save to local variable
function updateStorageValues() {
  chrome.storage.sync.get(null, (result) => {
    settings = result;
    console.log(result);
    return settings;
  });
}

function syncSettings() {
  chrome.storage.sync.set(settings, () => console.log("Settings were saved"));
}

function stopCountdown() {
  countdown.stop();
}

// Start decreasing user's free time
// It means he is visiting a distracting website
// Automatically stop countup
function startCountdown() {
  // Check if there is already an instance of countdown
  // and stop it to escape double effect
  stopCountUp();
  // // stopCountdown();
  countdown.start();
}

function stopCountUp() {
  countup.stop();
}

// Start increasing user's free time
// automatically stops countup
function startCountUp() {
  stopCountdown();
  // //stopCountUp();
  countup.start();
}

function lockPage(tabId) {
  chrome.tabs.sendMessage(tabId, {
    type: "lock",
    lock: true,
    time: settings.time,
    maxTime: settings.maxTime,
  });
}

function unlockPage(tabId) {
  chrome.tabs.sendMessage(tabId, { type: "lock", lock: false });
}

function lockAllPages() {
  settings.blocking = true;
  targetTabs.forEach((tabId) => lockPage(tabId));
  activeTargets = [];
  startCountUp();
  sendUpdates();
}

function unlockAllPages() {
  settings.blocking = false;
  targetTabs.forEach((tabId) => unlockPage(tabId));
  stopUpdates();
  checkActiveTabs();
}

function sendUpdate(tabId) {
  chrome.tabs.sendMessage(tabId, {
    type: "update",
    lock: settings.lock,
    time: settings.time,
    maxTime: settings.maxTime,
  });
}

function sendUpdates() {
  pageUpdates.start();
  console.log("Limid: sent update");
}

function stopUpdates() {
  pageUpdates.stop();
}

function checkActiveTabs() {
  if (settings.blocking) return;
  // FIX: Sometimes there are broken tabIds, find a way to remove them;
  const _activeTargets = [];
  const _targetTabs = new Set(targetTabs.values());
  console.log(_targetTabs, targetTabs);

  Promise.resolve()
    .then(() => {
      _targetTabs.forEach((tabId) => {
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
          }
          console.log(tab);
          if (tab === undefined) {
            console.log("Before delete attempt");
            targetTabs.delete(tabId);
            console.log("After delete attempt");
          } else if (tab.active && !tab.discarded) {
            _activeTargets.push(tabId);
          }
          activeTargets = _activeTargets;
        });
      });
    })
    .then(() => {
      // If there is active target tabs start countdown
      if (activeTargets.length) {
        startCountdown();
      } else startCountUp();
    });
}

function addToBlacklist(host) {
  if (!settings.blacklist.includes(host)) settings.blacklist.push(host);
}

function discardPage(tabId) {
  console.log("Discarding tab N" + tabId);
  chrome.tabs.discard(tabId);
}

// Countdown is a process of decreasing user's free time.
// It is active when user has open distracting websites.
countdown = new LimidInterval(() => {
  if (settings.time <= 0) {
    // If time is up, block all pages
    stopCountdown();
    settings.time = 0;
    lockAllPages();
  }
  settings.time -= 1;
  console.log("CDn - " + settings.time);
}, 1000);

// Countup is a process of increasing user's free time.
// It is active when user has no open distracting websites.
countup = new LimidInterval(() => {
  if (settings.time >= settings.maxTime) {
    stopCountUp();
    settings.time = settings.maxTime;
  } else {
    // Restore time but slower
    settings.time += 1 / settings.inhibitor;
  }
  console.log("CUp - " + settings.time);
}, 1000);

// Set initial values
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(null, (result) => {
    const vals = Object.values(result);
    console.log(vals);
    if (vals.length === 0 || vals.includes(undefined)) {
      chrome.storage.sync.set(
        {
          blacklist: DEFAULT_BLACKLIST,
          whitelist: DEFAULT_WHITELIST,
          blocking: false,
          maxTime: DEFAULT_MAX_TIME,
          time: DEFAULT_MAX_TIME,
          inhibitor: DEFAULT_INHIBITOR,
        },
        () => console.log("Initial values are set")
      );
    }
  });
  updateStorageValues();
});

// Receive messages from target tabs
chrome.runtime.onMessage.addListener((request, sender) => {
  console.log(
    sender.tab
      ? "from a content script:" + sender.tab.url
      : "from the extension"
  );
  if (request.lock === false) {
    unlockAllPages();
    startCountdown();
  }
});

// Detect changes in chrome storage
chrome.storage.onChanged.addListener((changes, namespace) => {
  for (let key in changes) {
    let storageChange = changes[key];
    settings[key] = changes[key].newValue;
    console.log(
      'Storage key "%s" in namespace "%s" changed. ' +
        'Old value was "%s", new value is "%s".',
      key,
      namespace,
      storageChange.oldValue,
      storageChange.newValue
    );
  }
  console.log(settings);
});

// Start countdown if targetTab is activated
chrome.tabs.onActivated.addListener((info) => {
  // If extension in blocking mode then we don't have to do anything here.
  if (settings.blocking) return;

  if (targetTabs.has(info.tabId)) {
    console.log(targetTabs);
    startCountdown();
  } else {
    // TODO: Refactor
    startCountUp();
    // Even if you switched to normal tab
    // it doesn't mean there is no active target tabs in other windows
  }
  // TODO: Maybe it is too expensive to check it on every tab change.
  checkActiveTabs();
});

// Delete tabs that were closed from `targetTabs`
chrome.tabs.onRemoved.addListener((tabId, info) => {
  console.log(info);
  if (targetTabs.has(tabId)) {
    console.log("Removing target tab " + info);
    targetTabs.delete(tabId);
  }
});

// Look for target tabs and add to targetTabs array
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log(
    `Some tab was changed: ${tabId} - ${changeInfo.url} - ${tab.url} - ${tab.active}`
  );
  console.log(changeInfo);
  // const isTarget = storage.blacklist.includes(changeInfo.url);
  const urlString = changeInfo.url ?? tab.url;
  const host = new URL(urlString).host;
  console.log(`${host} in ${settings.blacklist}`);
  const isTarget = settings.blacklist.includes(host);
  console.log(`Is target equals to: ${isTarget}`);

  // If targetTab's url changed to normal page then stop tracking it
  console.log("Before onupdate delete attempt");
  if (!isTarget && targetTabs.has(tabId)) targetTabs.delete(tabId);
  console.log("After onupdate delete attempt");
  // Following code is only for target pages
  if (!isTarget) return;

  targetTabs.add(tab.id);
  console.log("tab was pushed to target tabs array");
  // If currently in block mode lock new page
  // Else if not blocking but page is active start countdown
  if (settings.blocking) {
    lockPage(tab.id);
    startCountUp();
  } else if (tab.active) startCountdown();
});

chrome.runtime.onConnect.addListener(function (port) {
  console.log("Established connection with " + port.name);
  port.onMessage.addListener((msg) => {
    if (msg.type === "property") {
      port.postMessage(this[msg.property]);
    } else if (msg.type === "blacklist") {
      addToBlacklist(msg.host);
      const response = `Successfully added ${msg.host} to blacklist`;
      console.log(response);
      port.postMessage({
        type: "response",
        response,
      });
    } else if (msg.request === "active targets") {
      port.postMessage({ activeTargets });
    } else if (msg.type === "discard") {
      discardPage(Number(msg.tabId));
      checkActiveTabs();
    }
  });
});

//

// Sync chrome storage with local settings
setInterval(syncSettings, 30000);
// Check if there is active target tabs in all windows
setInterval(checkActiveTabs, 15000);

// Process of sending updates to target tabs;
pageUpdates = new LimidInterval(() => {
  targetTabs.forEach((tabId) => {
    sendUpdate(tabId);
  });
}, 30000);
