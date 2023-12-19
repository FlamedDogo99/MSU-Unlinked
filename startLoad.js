// Used to compare content script's copy of local storage to the background script when background broadcasts a change
var currentGrayList = null

// Iterates through document links and applies the grayMSUspecialTag class to them
function grayOut(jsonData) {
    
    var filter = jsonData
    var links = document.getElementsByTagName("a");

    var filteredArray = [...links].filter(x => filter.indexOf(x.href) >= 0); // Gets all links that match filter
    filteredArray.forEach(linked => linked.className += "grayMSUspecialTag"); // Applies tag to those links
    console.log("Graying out", filteredArray.length);
    chrome.runtime.sendMessage({badgeText: '' + filteredArray.length, iconText: 'Click to cycle links'}); // Send update to background script for badge
}

// Appends stylesheet and previous scroll variable to DOM
function createSaveElements() {
    var tagVar = document.createElement("a");
    tagVar.className = "grayMSUspecialTagVar";
    // This will randomly throw an error.
    try{
        tagVar.dataset.lastscroll = "0";

    } catch(error) {
        console.warn("For some reason 'tagVar.dataset.lastscroll = \"0\";' is throwing a typeError again. I have no idea why this happens occasionally, because it still sets it successfully")
    }
    document.documentElement.appendChild(tagVar);

    var grayStyle = document.createElement("style");
    grayStyle.textContent = `
        .grayMSUspecialTag {
            text-decoration: line-through !important;
            color: gray !important;
        }
    `;
    document.documentElement.appendChild(grayStyle);
}

// Sets up listener events, and calls the initial functions for setting up scripts 
function firstRun() {
    createSaveElements();
    chrome.storage.local.get('urls', function(data) {
        currentGrayList = data.urls
        grayOut(data.urls);
    });
    // If user navigates back to this page, it won't re-trigger the content scripts. Background still has connection so we just need to update the badge
    window.addEventListener('pageshow', function() {
        let grayLinks = document.getElementsByClassName("grayMSUspecialTag");
        chrome.runtime.sendMessage({badgeText: '' + grayLinks.length, iconText: 'Click to cycle links'});
    })
    // Handles messages from the background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // scrollToNext is called by background script when the extension is clicked
        if(message.action == "scrollToNext") {
            var grayLinks = document.getElementsByClassName("grayMSUspecialTag");
            var tagVar = document.getElementsByClassName("grayMSUspecialTagVar")[0];
            var selectedIndex = parseInt(tagVar.dataset.lastscroll);
            if(grayLinks.length > 0) {
                let x = (window.innerWidth) / 2 + window.scrollX;
                let y = (window.innerHeight) / 2 + window.scrollY;
                let minDististance = 50000;
                let minDistanceID = null;
                for (let i = 0; i < grayLinks.length; i++) {
                    let targetNode = grayLinks[i];
                    let centerX = targetNode.offsetLeft + targetNode.offsetWidth / 2;
                    let centerY = targetNode.offsetTop + targetNode.offsetHeight / 2;
                    let distance = Math.abs(x - centerX) + Math.abs(y - centerY);
                    if (distance < minDististance) {
                            minDististance = distance;
                            minDistanceID = i;
                    }
                }
                if(minDistanceID == selectedIndex) {
                    if(selectedIndex >= grayLinks.length) {
                        selectedIndex = 0;
                    } else {
                        selectedIndex += 1;
                    }
                } else {
                    selectedIndex = minDistanceID
                }
                // Either scrolls to the next occurrence of a grayed out link, or finds the closest one
                tagVar.dataset.lastscroll = '' + selectedIndex;
                grayLinks[selectedIndex].scrollIntoView({behavior: 'smooth', block: "center"});
                chrome.runtime.sendMessage({badgeText: '#' + (selectedIndex + 1), iconText: 'Double click to reset', actionCount: 'selected'});
            }
        }
        // getCount is called by the background when the user double taps the extension. Uses two sendMessage's because sendReply was being weird
        if(message.action == "getCount") {
            var grayLinks = document.getElementsByClassName("grayMSUspecialTag");
            chrome.runtime.sendMessage({badgeText: '' + grayLinks.length, iconText: 'Click to cycle links'});
        }
        // If the background script detects that local storage is changed, it pings the other tabs so they can compare their values
        if(message.newUrls != null) {
            console.log("received update from background");
            // Compares the two arrays. Since it will always be an array of strings, JSON.stringify works well enough
            if(JSON.stringify(message.newUrls) != JSON.stringify(currentGrayList)) {
                console.log("... and it had different content")
                currentGrayList = message.newUrls;
                let taggedUrlsDOM = document.getElementsByClassName('grayMSUspecialTag')
                let taggedUrls = [...taggedUrlsDOM]
                taggedUrls.forEach(x => x.classList.remove('grayMSUspecialTag'));
                grayOut(message.newUrls);
            }
        }
        // When a context menu selects a link, the background sends back the selected link
        if(message.grayURL != null) {
            chrome.storage.local.get('urls', function(data) {
                currentGrayList = data.urls3 //Updates content script copy for comparison

                var contentUrls = data.urls;
                let removeIndex = contentUrls.indexOf(message.grayURL);
                links = document.getElementsByTagName("a");
                // Updates DOM
                for(var i = 0; i < links.length; i++) {
                    if(links[i].href == message.grayURL) {
                        if(removeIndex > -1) {
                            links[i].classList.remove('grayMSUspecialTag')
                        } else {
                            links[i].classList += 'grayMSUspecialTag'
                        }
                    }
                }
                // Updates local storage
                if(removeIndex > -1) {
                    contentUrls.splice(removeIndex, 1)
                } else {
                    contentUrls.unshift(message.grayURL)
                }

                currentGrayList = contentUrls
                chrome.storage.local.set({ urls: contentUrls })
                let grayLinks = document.getElementsByClassName("grayMSUspecialTag");
                chrome.runtime.sendMessage({badgeText: '' + grayLinks.length, iconText: 'Click to cycle links'});
            });
        }
    });
}
// When content script is first loaded
firstRun();
