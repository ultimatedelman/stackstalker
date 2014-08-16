'use strict';

/*
    sites structure (example):

    sites: {
        stackoverflow: {
            questions: {
                [id]: { data }
                ...
                , [id]: { data }    
            }
            , site: { data}
        }
        , ux: {
            questions: {
                [id]: { data }
                ...
                , [id]: { data }    
            }
            , site: { data}
        }
        ...
    }
*/

var Api = {
    key: 'XIlKRyP9jUyL5p-LkZtcpw'
    , version: '2.2'
    , sites: {}
    , init: function() {
        chrome.storage.sync.get('sites', function(items) {
            Api.sites = items.sites;
        });
    }
    , addQuestion: function() {
        var apiParam;
        chrome.tabs.query({active: true, currentWindow: true}, function (tabArr) {
            var tab = tabArr[0]
                , url = tab.url.replace('http://', '')
                , id = url.split('/')[2] //follows "questions"
                , site
            ;
            if (url.indexOf('stackexchange') > -1) {
                //if stackexchange site, format is xxxx.stackexchange.com/questions/[id]/[slug]
                 apiParam = url.split('.stackexchange')[0];
            } else {
                if (isMainSite(url)) {
                    apiParam = url.split('.com')[0];                    
                } else {
                    //no api param
                    return;
                }
            }
            
            site = Api.sites[apiParam];
            if (site) {
                if (!site.questions[id]) {
                    Api.getQuestions(site, [id]).done(doAdd);
                }
                //else - question already added, will auto update on its own
            } else {
                //get site, add to site list
                Api.getSite(apiParam).done(function() {
                    //get question, add to site
                    Api.getQuestions(Api.sites[apiParam], [id]).done(doAdd);
                });
            }
        });
        
        function doAdd(data) {
            Api.sites[apiParam].questions[data.questions[0].question_id] = data.questions[0];
            chrome.storage.sync.set({sites: Api.sites});
        }
    }
    , getQuestions: function(data, ids) {
        //data should be property (site) of Api.sites
        //ids is optional. if provided, should be array. otherwise, function will pull all ids from data arg
        var url;
        ids = ids || $.map(data.questions, function(elem, key) { return key; });

        //to see what is being filtered:
        //https://api.stackexchange.com/docs/questions-by-ids#order=desc&sort=activity&ids=12452275%3B20511168&filter=!-Kh(Q.0gxbkCKhAfn49DKcR6NISntjfRO&site=stackoverflow&run=true
        url = 'https://api.stackexchange.com/' + Api.version + '/questions/' + ids.join(';') + '?site=' + data.site.api_site_parameter + '&filter=!-Kh(Q.0gxbkCKhAfn49DKcR6NISntjfRO';
        return $.ajax(url, {type: 'GET'})
            .then(function(resp) {
                return { questions: resp.items, site: data };
            })
        ;
    }
    , getSite: function(apiParam) {
        //to see what is being filtered:
        //https://api.stackexchange.com/docs/sites#pagesize=1000&filter=!)QmDpcIl)2PARZSfYk9uc*lK&run=true
        return $.ajax('https://api.stackexchange.com/' + Api.version + '/info?site=' + apiParam + '&filter=!)5FwpfJMpKy93kVbMYKqm1GbwTga', {type: 'GET'})
            .done(function(resp) {            
                Api.sites[apiParam] = {site: resp.items[0].site, questions: {}};
                chrome.storage.sync.set({sites: Api.sites});            
            })
            .fail(function() {
                throw new Error('Could not access sites API');
            })
        ;
    }
};

Api.init();

function isMainSite(url) {
    //not very scalable, but so far i think these are the only ones with their own url. this may require maintenance, not sure how else to do it
    var mainSites = ['stackoverflow', 'serverfault', 'superuser', 'askubuntu', 'stackapps', 'mathoverflow']
        , i, len
    ;
    for (i = 0, len = mainSites.length; i < len; i++) {
        if (url.indexOf(mainSites[i]) > -1) {
            return true;
        }
    }
    return false;
}