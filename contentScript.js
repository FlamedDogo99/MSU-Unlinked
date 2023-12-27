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
var event = new CustomEvent("grayMSUorphanedMessage");
console.log("Sending update notice to possible orphans")
window.dispatchEvent(event)


applyElements();
var linksDOM = document.getElementsByTagName("a"); 
var taggedLinks = document.getElementsByClassName('grayMSUspecialTag');
var grayMSUlastscroll;
var grayStyle = document.getElementsByClassName("grayMSUspecialStyle")[0];

function applyElements() {
    let grayStyle = document.createElement("style");
    grayStyle.textContent = `
        .grayMSUspecialTag {
            text-decoration: line-through !important;
            color: gray !important;
        }
    `;
    grayStyle.className = "grayMSUspecialStyle";
    document.documentElement.appendChild(grayStyle);
}

function sendPageData() {
    let linksHref = [...linksDOM].map(x => x.href);
    chrome.runtime.sendMessage({type: "requestData", data: linksHref});
    console.log("Sent " + linksHref.length + " urls to background to be filtered");
}

window.addEventListener("grayMSUorphanedMessage", onDisconnect);
function onDisconnect() {
    if(chrome.runtime?.id) {
        console.warn("Received false orphan message");
        return;
    }
    console.log("Content script is orphaned. Disconnecting event listeners and removing injected elements");
    chrome.runtime.onMessage.removeListener(onMessage);
    window.removeEventListener('pageshow', pageshow);
    window.removeEventListener("grayMSUorphanedMessage", onDisconnect);
    grayStyle.remove();
    let links = [...linksDOM];
    links.forEach(x => x.classList.remove('grayMSUspecialTag'));
}

window.addEventListener('pageshow', pageshow);
function pageshow() {
    sendPageData();
}

chrome.runtime.onMessage.addListener(onMessage);
function onMessage(message, sender, sendResponse) {
    let links = [...linksDOM];

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
            if(minDistanceID == grayMSUlastscroll) {
                if(grayMSUlastscroll >= taggedLinks.length) {
                    grayMSUlastscroll = 0;
                } else {
                    grayMSUlastscroll += 1;
                }
            } else {
                grayMSUlastscroll = minDistanceID
            }
            taggedLinks[grayMSUlastscroll].scrollIntoView({behavior: 'smooth', block: "center"});
            chrome.runtime.sendMessage({type: "badge", data: '#' + (grayMSUlastscroll + 1), display: "index"});
        }
        break;
    default:
        console.error("Unknown message", message)
    }
}

