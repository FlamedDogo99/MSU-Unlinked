// On first install
chrome.runtime.onInstalled.addListener(function(details){
    if(details.reason == "install"){
        const url = chrome.runtime.getURL('initialURLS.json');
        fetch(url)
            .then((response) => response.json()) //assuming file contains json
            .then((data) => {
                chrome.storage.local.set({ urls: data.urls });
            });
        chrome.tabs.create({ url: chrome.runtime.getURL("instructions.html") });
    }
});

const isValidUrl = urlString=> {
    try { 
        return Boolean(new URL(urlString)); 
    } catch(e) { 
        return false; 
    }
}

function requestUpdateAll() {
    console.log("Sending update request to all tabs");
    chrome.tabs.query({}, (tabs) => tabs.forEach( tab => {
        if(isValidUrl(tab.url)) {
            const url = new URL(tab.url);
            chrome.tabs.sendMessage(tab.id, {type: "updateRequest"}, () => chrome.runtime.lastError);
        }
    }));
    chrome.runtime.sendMessage({type: "optionsUpdateRequest"}, () => chrome.runtime.lastError);
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch(message.type) {
        case "requestData":
            console.log("Received " + message.data.length + " urls from content script at", sender.url);
             chrome.storage.local.get('urls', function(storageData) {
                let storage = storageData.urls;
                let sentUrls = message.data;
                let matchingUrls = storage.filter(x => sentUrls.indexOf(x) > -1);
                chrome.tabs.sendMessage(sender.tab.id, {type: "data", data: matchingUrls}, () => chrome.runtime.lastError);
                chrome.action.setBadgeText({
                    tabId: sender.tab.id,
                    text: '' + matchingUrls.length,
                }, () => chrome.runtime.lastError);
            chrome.action.setBadgeBackgroundColor({
                color: '#00205B',
                tabId: sender.tab.id
            }, () => chrome.runtime.lastError);
            chrome.action.setBadgeTextColor({
                color: '#fff',
                tabId: sender.tab.id
            }, () => chrome.runtime.lastError);
             });
        break;
        case "badge":
             chrome.action.setBadgeText({
                tabId: sender.tab.id,
                text: '' + message.data,
            }, () => chrome.runtime.lastError);
            chrome.action.setBadgeBackgroundColor({
                color: (message.display == "count") ? '#00205B' : '#B9975B',
                tabId: sender.tab.id
            }, () => chrome.runtime.lastError);
            chrome.action.setTitle({
                tabId: sender.tab.id,
                title: (message.display == "count") ? 'Click to cycle links' : 'Double click to reset',
            }, () => chrome.runtime.lastError);

        break;
        case "remove":
             chrome.storage.local.get('urls', function(storageData) {
                let storage = storageData.urls;
                let sentUrls = message.data;
                let filteredUrls = storage.filter(x => sentUrls.indexOf(x) < 0);
                chrome.storage.local.set({ urls: filteredUrls }).then(() => {
                    requestUpdateAll();
                });

            });
        break;
        case "add":
             chrome.storage.local.get('urls', function(storageData) {
                let storage = storageData.urls; // Array
                let sentUrls = message.data; // Array
                let joinedUrls = sentUrls.concat(storage); // Places new urls at beginning
                let filteredUrls = joinedUrls.filter((item, index) => joinedUrls.indexOf(item) === index); //Removing duplicates
                chrome.storage.local.set({ urls: filteredUrls }).then(() => {
                    requestUpdateAll();
                });
            });

        break;
    default:
        console.error("Unknown message", message)
    }
});

chrome.contextMenus.create({
    "id": "grayMSUcontextMenu",
    "title": "Toggle marking",
    "contexts": ["link"]
});



chrome.contextMenus.onClicked.addListener(contextMenuEvent);

function contextMenuEvent(info, tab) {
    let newUrl = info.linkUrl
    console.log("Received url from context menu:", newUrl);
    chrome.storage.local.get('urls', function(storageData) {
        let storage = storageData.urls;
        let urlIndex = storage.indexOf(newUrl);
        if(urlIndex > -1) {
            storage.splice(urlIndex, 1); // removes url from array
        } else {
            storage.unshift(newUrl); // adds url to top
        }
        chrome.storage.local.set({ urls: storage }).then(() => {
            requestUpdateAll();
        });
    });
}

var clickCount = 0;
var clickDelay = 250;
var timer;
chrome.action.onClicked.addListener(function(tab){
    clickCount++; 
    if(clickCount > 1){
        // Double-click
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
            chrome.tabs.sendMessage(tabs[0].id, {type: "doubleClick"}, () => chrome.runtime.lastError);
        });
        clickCount = 0;
        clearTimeout(timer)
    } else {
        timer = setTimeout(function(){  
            // Single Click
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
                chrome.tabs.sendMessage(tabs[0].id, {type: "click"}, () => chrome.runtime.lastError);
            });
            clickCount = 0;
        }, clickDelay);
    }
    return true;
});
