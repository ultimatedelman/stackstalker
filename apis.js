//the /sites SE API response is really large. have to store in storage.local because there isn't much space to store in storage.sync
//http://stackoverflow.com/questions/12452275/error-during-storage-set-quota-exceeded-in-chrome-extension-developing
'use strict';
var Api = {
    key: 'XIlKRyP9jUyL5p-LkZtcpw'    
    , version: '2.2'
    , sites: []
};

function updateSites() {
    //run on load. check to see if sites have been accessed today. if not, update.
    if (Api.sites.length) { return; }

    chrome.storage.local.get('lastAccessDate', function(items) {
        var today = (new Date()).toDateString();
        if (!items.lastAccessDate || items.lastAccessDate !== today) {
            chrome.storage.local.set({lastAccessDate: today});
            getSites();
        } else {
            chrome.storage.local.get('sites', function(items) {
                Api.sites = items.sites;
            });
        }
    });
}

function getSites() {
    $.ajax('https://api.stackexchange.com/' + Api.version + '/sites?pagesize=1000&filter=!.Hms49Eso)lC8)lvMoCKvJFY5yBjx', {type: 'GET'})
        .done(function(resp) {            
            Api.sites = resp.items;
            chrome.storage.local.set({sites: resp.items});            
        })
        .fail(function() {
            throw new Error('Could not access sites API');
        })
    ;
}

updateSites();