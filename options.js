let addTextArea = document.getElementById('addGrayUrl');
let removeTextArea = document.getElementById('removeGrayUrl');
let displayArea = document.getElementById('displayArea');

let addTextAreaButton = document.getElementById('addGrayUrlButton');
let removeTextAreaButton = document.getElementById('removeGrayUrlButton');

document.getElementById("addGrayUrlButton").addEventListener("click", addData);
function addData() {
    chrome.storage.local.get('urls', function(data) {
        var urlList = data.urls
        let addUrls = addTextArea.value.split(/\r?\n/).filter(Boolean);
	let joinedList = addUrls.concat(urlList);
        let filteredList = joinedList.filter((item, pos) => joinedList.indexOf(item) === pos)
        chrome.storage.local.set({ urls: filteredList }).then(() => {
            updateDisplay()
            addTextArea.parentNode.dataset.replicatedValue = ""
            addTextArea.value = ""
      });
    });
}
document.getElementById("removeGrayUrlButton").addEventListener("click", removeData);
function removeData() {
    chrome.storage.local.get('urls', function(data) {
        var urlList = data.urls
        let removeUrls = removeTextArea.value.split(/\r?\n/);
        let validRemovals = urlList.filter(x => removeUrls.indexOf(x) >= 0);
        let filteredList = urlList.filter(x => removeUrls.indexOf(x) < 0);
        chrome.storage.local.set({ urls: filteredList }).then(() => {
            updateDisplay()
            removeTextArea.parentNode.dataset.replicatedValue = ""
            removeTextArea.value = ""
      });
    });
}

function updateDisplay(){ 
    chrome.storage.local.get('urls', function(data) {
        displayArea.textContent = data.urls.join("\n");
    });
}
updateDisplay()
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
    if (message.newUrls != null) {
        console.log("Received update from background")
        displayArea.textContent = message.newUrls.join("\n");
    }
});