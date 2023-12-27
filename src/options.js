const _realConsole = window.console;
const consoleOutput = (logAuthor = "options.js") => {
  const style = {
    // Remember to change these as well on module.js
    leftPrefix: "background:  #00205B; color: white; border-radius: 0.5rem 0 0 0.5rem; padding: 0 0.5rem",
    rightPrefix:
      "background: #B9975B; color: white; border-radius: 0 0.5rem 0.5rem 0; padding: 0 0.5rem; font-weight: bold",
    text: "",
  };
  return [`%cGrayMSU%c${logAuthor}%c`, style.leftPrefix, style.rightPrefix, style.text];
};
const console = {
  ..._realConsole,
  log: _realConsole.log.bind(_realConsole, ...consoleOutput()),
  warn: _realConsole.warn.bind(_realConsole, ...consoleOutput()),
  error: _realConsole.error.bind(_realConsole, ...consoleOutput()),
};

var addTextArea = document.getElementById('addGrayUrl');
var removeTextArea = document.getElementById('removeGrayUrl');
var displayArea = document.getElementById('displayArea');

var addTextAreaButton = document.getElementById('addGrayUrlButton');
var removeTextAreaButton = document.getElementById('removeGrayUrlButton');

var setEnabled;
(setEnabled = function() {
    let disableAddButton = (addTextArea.value == '');
    let disableRemoveButton = (removeTextArea.value == '');
    addTextAreaButton.disabled = disableAddButton;
    removeTextAreaButton.disabled = disableRemoveButton;
    addTextArea.parentNode.dataset.replicatedValue = addTextArea.value
    removeTextArea.parentNode.dataset.replicatedValue = removeTextArea.value
})();

document.oninput = setEnabled;
document.onchange = setEnabled;

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type == "optionsUpdateRequest") {
        console.log("Received update request from background")
        chrome.storage.local.get('urls', function(data) {
            displayArea.textContent = data.urls.join("\n");
        });
    }
});
document.getElementById("addGrayUrlButton").addEventListener("click", addLinks);
document.getElementById("removeGrayUrlButton").addEventListener("click", removeLinks);

function addLinks() {
    let links = addTextArea.value.split(/\r?\n/).filter(Boolean);
    applyChanges("add", links);
    addTextArea.parentNode.dataset.replicatedValue = "";
    addTextArea.value = "";
}

function removeLinks() {
    let links = removeTextArea.value.split(/\r?\n/).filter(Boolean);
    applyChanges("remove", links)
    removeTextArea.parentNode.dataset.replicatedValue = "";
    removeTextArea.value = "";
}

function applyChanges(changeType, data) {
    displayArea.textContent = "Updating...";
    console.log("Requesting to " + changeType + " " + data.length + " urls")
    chrome.runtime.sendMessage({type: changeType, data: data});
}

chrome.storage.local.get('urls', function(data) {
    displayArea.textContent = data.urls.join("\n");
});