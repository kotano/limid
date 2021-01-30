/* eslint-disable init-declarations */

// TODO: Store intervals inside objects;
// TODO: Add flag to track if interval is active

let settings = {};
let targetTabs = new Set();

// Interval id variables
let countdown;
let countUp;
let updateInterval;

const DEFAULT_MAX_TIME = 3600;
const DEFAULT_BLACKLIST = [
  "www.youtube.com",
  "www.reddit.com",
  "www.facebook.com",
];
const DEFAULT_WHITELIST = ["wikipedia.org"];
const DEFAULT_INHIBITOR = 3;

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
  if (!countdown) return;
  clearInterval(countdown);
  console.log("Countdown was stopped");
}

function startCountdown() {
  // Check if there is already an instance of countdown
  // and stop it to escape double effect
  stopCountUp();
  stopCountdown();
  countdown = setInterval(() => {
    if (settings.time <= 0) {
      // If time is up, block all pages
      stopCountdown();
      settings.time = 0;
      lockAllPages();
    }
    settings.time -= 1;
    console.log("CDn - " + settings.time);
  }, 1000);
}

function stopCountUp() {
  clearInterval(countUp);
}

function startCountUp() {
  stopCountdown();
  stopCountUp();
  countUp = setInterval(() => {
    if (settings.time >= settings.maxTime) {
      stopCountUp();
      settings.time = settings.maxTime;
    } else {
      // Restore time but slower
      settings.time += 1 / settings.inhibitor;
    }
    console.log("CUp - " + settings.time);
  }, 1000);
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
  startCountUp();
  sendUpdates();
}

function unlockAllPages() {
  settings.blocking = false;
  targetTabs.forEach((tabId) => unlockPage(tabId));
  stopUpdates();
}

function sendUpdates(interval = 30000) {
  updateInterval = setInterval(() => {
    console.log("Update limid info");
    targetTabs.forEach((tabId) => {
      chrome.tabs.sendMessage(tabId, {
        type: "update",
        lock: settings.lock,
        time: settings.time,
        maxTime: settings.maxTime,
      });
    });
  }, interval);
}

function stopUpdates() {
  clearInterval(updateInterval);
}

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

// Start countdown if targetTab is activated
chrome.tabs.onActivated.addListener((info) => {
  // If extension in blocking mode then we don't have to do anything here.
  if (settings.blocking) return;

  if (targetTabs.has(info.tabId)) {
    // Add second to current time
    console.log(targetTabs);
    startCountdown();
  } else if (countdown) {
    // TODO: Refactor
    startCountUp();
    // Even if you switched to normal tab
    // it doesn't mean there is no active target tabs in other windows
    checkActiveTabs();
  }
});

// Delete tabs that were closed from `targetTabs`
chrome.tabs.onRemoved.addListener((info) => {
  if (targetTabs.has(info.tabId)) {
    console.log("Removing target tab " + info.tabId);
    targetTabs.delete(info.tabId);
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
  if (!isTarget) return;
  // Here we can be sure that the page is our target.
  targetTabs.add(tab.id);
  console.log("url was pushed to target urls array");
  // If currently in block mode lock new page
  // Else if not blocking but page is active start countdown
  if (settings.blocking) {
    lockPage(tab.id);
    startCountUp();
  } else if (tab.active) startCountdown();
});

function checkActiveTabs() {
  if (settings.blocking) return;
  targetTabs.forEach((tabId) => {
    chrome.tabs.get(tabId, (tab) => {
      if (tab.active) startCountdown();
    });
  });
}

// Sync chrome storage with local settings
setInterval(syncSettings, 30000);
// Check if there is active target tabs in all windows
setInterval(checkActiveTabs, 15000);
