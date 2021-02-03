function g(elem) {
  return document.getElementById(elem);
}

function loadElements() {
  chrome.runtime.getBackgroundPage((bgWindow) => {
    // Load blacklist
    const blacklist = g("blacklist");
    const blacklistContent = bgWindow.settings.blacklist.join("\n");
    blacklist.textContent = blacklistContent;
    // Load inhibitor
    const inhibitor = g("inhibitor");
    const inhibitorValue = bgWindow.settings.inhibitor;
    inhibitor.value = inhibitorValue;
    inhibitor.nextElementSibling.value = inhibitor.value;
    inhibitor.addEventListener("input", (ev) => {
      ev.stopPropagation();
      ev.target.nextElementSibling.value = ev.target.value;
    });
    // Load maxTime
    // Convert to minutes for better user experience
    const maxTimeValue = Math.round(bgWindow.settings.maxTime / 60);
    const maxTime = g("maxtime");
    maxTime.value = maxTimeValue;
    // Load form
    const optForm = g("options-form");
    optForm.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const formData = new FormData(ev.target);
      const bList = formData
        .get("blacklist")
        .split("\n")
        .map((str) => str.trim());
      console.log(bList);
      chrome.runtime.sendMessage({
        type: "settings",
        blacklist: bList,
        inhibitor: Number(formData.get("inhibitor")),
        maxTime: Number(formData.get("maxtime")) * 60,
      });
    });
  });
}

async function load() {
  loadElements();
}

document.addEventListener("DOMContentLoaded", load);
