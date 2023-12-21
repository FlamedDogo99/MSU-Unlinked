// Used to compare content script's copy of local storage to the background script when background broadcasts a change
const _realConsole = window.console;
const consoleOutput = (logAuthor = "contentScript.js") => {
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

window.addEventListener('pageshow', function() {
    if(taggedLinks.length > 0) {
        chrome.runtime.sendMessage({type: "badge", data: taggedLinks.length, display: "count"});
    }
});

applyElements();

var linksDOM = document.getElementsByTagName("a"); 
var taggedLinks = document.getElementsByClassName('grayMSUspecialTag');
var tagVar = document.getElementsByClassName("grayMSUspecialTagVar")[0];

sendPageData();


function applyElements() {
    let tagVar = document.createElement("a");
    tagVar.className = "grayMSUspecialTagVar";
    tagVar.dataset.lastscroll = "0";
    document.documentElement.appendChild(tagVar);
    
    let grayStyle = document.createElement("style");
    grayStyle.textContent = `
        .grayMSUspecialTag {
            text-decoration: line-through !important;
            color: gray !important;
        }
    `;
    document.documentElement.appendChild(grayStyle);
}

function sendPageData() {
    let linksHref = [...linksDOM].map(x => x.href);
    chrome.runtime.sendMessage({type: "requestData", data: linksHref});
    console.log("Sent " + linksHref.length + " urls to background to be filtered");
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    let links = [...linksDOM]

    switch(message.type) {
    case "data": // Receiving list of urls from background
        links.forEach(x => x.classList.remove('grayMSUspecialTag'));
        let applyLinks = message.data;
        console.log("Received " + applyLinks.length + " urls from background")
        let filteredLinks = links.filter(x => applyLinks.indexOf(x.href) > -1);
        filteredLinks.forEach(linked => linked.className += "grayMSUspecialTag"); 
        chrome.runtime.sendMessage({type: "badge", data: taggedLinks.length, display: "count"});
    break;
    case "updateRequest":
        console.log("Received update request from background")
        sendPageData();
        break;
    case "doubleClick":
        chrome.runtime.sendMessage({type: "badge", data: taggedLinks.length, display: "count"});
        break;
    case "click":
        let selectedIndex = parseInt(tagVar.dataset.lastscroll);
        if(taggedLinks.length > 0) {
            let x = (window.innerWidth) / 2 + window.scrollX;
            let y = (window.innerHeight) / 2 + window.scrollY;
            let minDististance = 50000;
            let minDistanceID = null;
            for (let i = 0; i < taggedLinks.length; i++) {
                let targetNode = taggedLinks[i];
                let centerX = targetNode.offsetLeft + targetNode.offsetWidth / 2;
                let centerY = targetNode.offsetTop + targetNode.offsetHeight / 2;
                let distance = Math.abs(x - centerX) + Math.abs(y - centerY);
                if (distance < minDististance) {
                        minDististance = distance;
                        minDistanceID = i;
                }
            }
            if(minDistanceID == selectedIndex) {
                if(selectedIndex >= taggedLinks.length) {
                    selectedIndex = 0;
                } else {
                    selectedIndex += 1;
                }
            } else {
                selectedIndex = minDistanceID
            }
            tagVar.dataset.lastscroll = '' + selectedIndex;
            taggedLinks[selectedIndex].scrollIntoView({behavior: 'smooth', block: "center"});
            chrome.runtime.sendMessage({type: "badge", data: '#' + (selectedIndex + 1), display: "index"});
        }
        break;
    default:
        console.error("Unknown message", message)
    }
});

