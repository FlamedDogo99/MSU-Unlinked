function saveURLlist(data) {
    console.log(data)
    chrome.storage.local.set({ urls: data.urls });
} 
chrome.runtime.onInstalled.addListener(function(details){
    if(details.reason == "install"){
        chrome.action.setBadgeBackgroundColor({ color: 'blue' });
        const url = chrome.runtime.getURL('initialURLS.json');
        fetch(url)
            .then((response) => response.json()) //assuming file contains json
            .then((json) => saveURLlist(json));
        chrome.tabs.create({ url: chrome.runtime.getURL("instructions.html") });
    }
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.badgeText != null) {
        chrome.action.setBadgeText({
            tabId: sender.tab.id,
            text: message.badgeText,
        }, () => chrome.runtime.lastError); // ignore errors due to closed/prerendered tabs
    }
    if (message.iconText != null) {
        chrome.action.setTitle({
            tabId: sender.tab.id,
            title: message.iconText,
        }, () => chrome.runtime.lastError); // ignore errors due to closed/prerendered tabs
    }
    if (message.actionCount != null) {
        chrome.action.setBadgeBackgroundColor({ color: 'orange', tabId: sender.tab.id});
    } else {
        chrome.action.setBadgeBackgroundColor({ color: 'blue', tabId: sender.tab.id});
    }
});

var clickCnt = 0;   // Click counter
var delay = 250;    // Maximum time (milliseconds) between clicks to be considered a double-click
var timer;
chrome.action.onClicked.addListener(function(tab){
    clickCnt++; 
    if(clickCnt > 1){
        // Double-click detected
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
            chrome.tabs.sendMessage(tabs[0].id, {action: "getCount"});
        });
        clickCnt = 0;
        clearTimeout(timer)
    } else {
        timer = setTimeout(function(){  
            // No clicked detected within (delay)ms, so consider this a single click 
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
                chrome.tabs.sendMessage(tabs[0].id, {action: "scrollToNext"});  
            });
            clickCnt = 0;
        }, delay);
    }
    return true;
});

chrome.contextMenus.create({
    "id": "log-selection",
    "title": "Toggle marking",
    "contexts": ["link"]
});
chrome.contextMenus.onClicked.addListener(clickEventInfo);


function clickEventInfo(info, tab) {

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
        chrome.tabs.sendMessage(tabs[0].id, {grayURL: info.linkUrl});  
    });
}


const isValidUrl = urlString=> {
      try { 
      	return Boolean(new URL(urlString)); 
      }
      catch(e){ 
      	return false; 
      }
  }

chrome.storage.onChanged.addListener((changes, namespace) => {
    chrome.tabs.query({}, (tabs) => tabs.forEach( tab => {
        if(isValidUrl(tab.url)) {
            const url = new URL(tab.url);
            console.log(url.hostname);
            chrome.tabs.sendMessage(tab.id, {newUrls: changes.urls.newValue});
        } else {
            console.log("Invalid", tab);
            console.log("Invalid", tab.url);

        }
    }));
    try { 
        chrome.runtime.sendMessage({newUrls: changes.urls.newValue});
    } catch(e) {
        console.log("The background is claiming that it can't connect to the options_ui");
    }
});
