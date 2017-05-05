'use strict';

/*
    sites structure in memory (example):

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

    data structure for chrome.storage.sync
    - needs to be broken up like this to avoid memory constraints
    - https://developer.chrome.com/extensions/storage#property-sync

    {
        [site_sitename]: {
            {data}
        }
    }

    {
        [sitename_questionId]: { data }
    }    
*/
(function(window, $) {
    window.SS = window.SS || {};

    var Api = SS.Api = {
        key: 'E*SVgMUlGvyMBrRucMfILA(('
        , version: '2.2'
        , sites: {}
        , totalQuestions: 0
        , init: function() {
            //pass in null arg to get all values in sync
            chrome.storage.sync.get(null, function(items) {
                var datum, props;
                for (datum in items) {
                    //fold storage format into memory format
                    props = datum.split('_');
                    if (props[0] === 'site') {
                        //hit question first somehow, fill in site, leave questions
                        if (!Api.sites[props[1]]) {
                            Api.sites[props[1]] = { questions: {}};                    
                        }
                        Api.sites[props[1]].site = items[datum];
                    } else {
                        if (!Api.sites[props[0]]) {
                            //hit question first somehow, get site later
                            Api.sites[props[0]] = {site: {}, questions: {}};
                        }
                        Api.sites[props[0]].questions[props[1]] = items[datum]; 
                        Api.totalQuestions++;
                    }                
                }
                $(window).trigger('apiready');
            });
        }
        , addQuestion: function(callback) {
            var apiParam;
            callback = callback || $.noop;
            chrome.tabs.query({active: true, currentWindow: true}, function (tabArr) {
                var tab = tabArr[0]
                    , url = tab.url.replace(/https?:\/\//, '')
                    , id = url.split('/')[2] //follows "questions"
                    , site
                ;
                apiParam = Api.getApiParam(url);
                
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
                var q = data.questions[0]
                    , storeQ = {}
                ;                
                
                Api.sites[apiParam].questions[q.question_id] = q;
                storeQ[[apiParam, q.question_id].join('_')] = q;

                chrome.storage.sync.set(storeQ, callback);
                Api.totalQuestions++;
            }
        }
        , empty: function() {
            //go through questions for sites and delete
            var apiParam, site, question;
            for (apiParam in Api.sites) {
                site = Api.sites[apiParam];
                for (question in site.questions) {
                    chrome.storage.sync.remove([apiParam, question].join('_'));
                    delete site.questions[question];
                }
            }
            Api.totalQuestions = 0;
        }
        , getApiParam: function(url) {
            url = url.replace(/https?:\/\//, '');
            if (url.indexOf('stackexchange') > -1) {
                //if stackexchange site, format is xxxx.stackexchange.com/questions/[id]/[slug]
                 return url.split('.stackexchange')[0];
            } else {
                if (isMainSite(url)) {
                    return url.split('.com')[0];                    
                } else {
                    //no api param
                    throw {
                        name: 'NoApiParam'
                        , message: 'Could not find API parameter'
                        , url: url
                    };
                }
            }
        }
        , getQuestions: function(data, ids) {
            //data should be property (site) of Api.sites
            //ids is optional. if provided, should be array. otherwise, function will pull all ids from data arg
            var url;
            ids = ids || $.map(data.questions, function(elem, key) { return key; });

            //to see what is being filtered:
            //https://api.stackexchange.com/docs/questions-by-ids#order=desc&sort=activity&ids=12452275%3B20511168&filter=!-Kh(Q.0gxbkCOEWx3OgG_bJrd4ml-QyMG&site=stackoverflow&run=true
            url = 'https://api.stackexchange.com/' + Api.version + '/questions/' + ids.join(';') + '?site=' + data.site.api_site_parameter + '&filter=!-Kh(Q.0gxbkCOEWx3OgG_bJrd4ml-QyMG&key=' + Api.key;
            return $.ajax(url, {type: 'GET'})
                .then(function(resp) {
                    var i, len, arr = [];
                    for (i = 0, len = resp.items.length; i < len; i++) {
                        arr.push(prepQuestion(resp.items[i], data.site.api_site_parameter));
                    }
                    return { questions: arr, site: data.site };
                })
            ;
        }
        , getSite: function(apiParam) {
            //to see what is being filtered:
            //https://api.stackexchange.com/docs/sites#pagesize=1000&filter=!)QmDpcIl)2PARZSfYk9uc*lK&run=true
            return $.ajax('https://api.stackexchange.com/' + Api.version + '/info?site=' + apiParam + '&filter=!)5FwpfJMpKy93kVbMYKqm1GbwTga&key=' + Api.key, {type: 'GET'})
                .done(function(resp) {
                    var storeSite = {};
                    Api.sites[apiParam] = {site: resp.items[0].site, questions: {}};
                    storeSite[['site', apiParam].join('_')] = resp.items[0].site;
                    chrome.storage.sync.set(storeSite);            
                })
                .fail(function() {
                    throw new Error('Could not access sites API');
                })
            ;
        }
        , removeQuestion: function(apiParam, id, callback) {
            callback = callback || $.noop;
            delete Api.sites[apiParam].questions[id];
            Api.totalQuestions--;
            chrome.storage.sync.remove([apiParam, id].join('_'), callback);
        }
        , updateQuestion: function(data, callback) {
            var storeQ = {};
            callback = callback || $.noop;
            Api.sites[data.site].questions[data.question_id] = data;
            storeQ[[data.site, data.question_id].join('_')] = data;
            chrome.storage.sync.set(storeQ, callback);
        }
    };

    Api.init();

    function prepQuestion(q, apiParam) {
        q.autoupdate = true;
        q.updated = false;
        q.comment_count = q.comment_count || 0;
        q.site = apiParam;
        return q;
    }

})(window, jQuery);

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