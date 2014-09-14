'use strict';
(function(window) {
    window.SS = window.SS || {};
    var BG = SS.BG = {
        isRunning: false
        , autoupdates: {}
        , events: {}
        , popup: null
        , updateInterval: 60000
        , updates: 0
        , init: function() {
            //Api and BG share same window obj
            $(window).on('apiready', BG.handleApiReady);                    
            
            //faking triggers between pages            
            sub('formaddquestion', BG.handleAddQuestion);                    
            sub('formreset', BG.handleFormReset);                    
            sub('formquestionread', BG.handleQuestionRead);                    
            sub('forminit', BG.handleFormInit);
            sub('formupdatemonitor', BG.handleUpdateMonitor);
            sub('bgupdatedisplay', BG.handleUpdateDisplay);
        }
        , apiGetSuccess: function (resp) {
            var i, newq, oldq, len;
            for (i = 0, len = resp.questions.length; i < len; i++) {
                newq = resp.questions[i];
                oldq = SS.Api.sites[resp.site.api_site_parameter].questions[newq.question_id];                
                if (oldq) {
                    if (!oldq.updated) { //if the question isn't already marked as updated
                        if (BG.questionIsUpdated(oldq, newq)) {
                            BG.updates++;
                            newq.updated = true;
                        } else {
                            newq.updated = false;
                        }
                    } else {
                        newq.updated = true;
                    }
                }
                SS.Api.updateQuestion(newq);
            }
            pub('bgquestionsupdated');
            BG.trigger('bgupdatedisplay');                        
        }   
        , getPopup: function () {
            var url = chrome.extension.getURL('popup.html')
                , views = chrome.extension.getViews() || []
                , i, view
            ;
            BG.popup = null;
            for (i = 0; i < views.length; i++) {
                view = views[i];
                if (view.location.href === url) {
                    BG.popup = view;
                    break;
                }
            }
        }
        , getQuestionsToUpdate: function() {
            var questions = {}
                , prop, site, list, i, len, keys, ids, q
            ;
            for (prop in SS.Api.sites) {
                site = SS.Api.sites[prop];
                list = site.questions;
                keys = Object.keys(list);
                if (keys.length) {                    
                    ids = [];
                    for (i = 0, len = keys.length; i < len; i++) {
                        q = list[keys[i]];
                        if (q.autoupdate) {
                            ids.push(q.question_id);                            
                        }
                    }
                    if (ids.length) {
                        questions[prop] = ids;
                    }                    
                }
            }
            BG.autoupdates = questions;
        }
        , getUpdatedQuestionCount: function() {
            var count = 0
                , prop, site, list, i, len, keys, q
            ;
            for (prop in SS.Api.sites) {
                site = SS.Api.sites[prop];
                list = site.questions;
                keys = Object.keys(list);
                len = keys.length;
                if (len) {                    
                    for (i = 0; i < len; i++) {
                        q = list[keys[i]];
                        if (q.updated) {
                            count++;
                        }
                    }                    
                }
            }
            return count;
        }
        , handleAddQuestion: function() {
            BG.getQuestionsToUpdate();
            BG.updateQuestions();
            BG.trigger('bgupdatedisplay');            
        }
        , handleApiReady: function() {
            //run an update first, then start timer
            BG.getQuestionsToUpdate();
            BG.runAutoUpdates() && BG.updateQuestions();

            //find unread questions, update count if there are any
            BG.updates = BG.getUpdatedQuestionCount();

            BG.trigger('bgupdatedisplay');            
        }
        , handleError: function (data) {
            console.log('bg error!', data);
        }
        , handleFormInit: function() {
            BG.updateQuestions();            
        }
        , handleFormReset: function() {
            BG.getQuestionsToUpdate();
            BG.resetBadge();            
            BG.isRunning = false;
            BG.trigger('bgupdatedisplay');
        }
        , handleUpdateDisplay: function() {
            BG.updateBadge();
            BG.updateIcon();
        }
        , handleUpdateMonitor: function() {
            BG.getQuestionsToUpdate();
            BG.updateQuestions();
            BG.trigger('bgupdatedisplay');                
        }
        , handleQuestionRead: function() {
            BG.updates--;
            BG.trigger('bgupdatedisplay');            
        } 
        , questionIsUpdated: function (oldq, newq) {
            if (oldq.updated) { return true; }
            if (oldq.answer_count !== newq.answer_count) { return true; }
            if (oldq.score !== newq.score) { return true; }
            if (oldq.is_accepted !== newq.is_accepted) { return true; }
            if (oldq.comment_count !== newq.comment_count) { return true; }
            return false;
        }
        , resetBadge: function () {
            BG.updates = 0;
            BG.trigger('bgupdatedisplay');            
        }
        , runAutoUpdates: function () {
            var siteparms = Object.keys(BG.autoupdates)
                , i, len, key
            ;
            if (siteparms.length) {
                for (i = 0, len = siteparms.length; i < len; i++) {
                    key = siteparms[i];
                    SS.Api.getQuestions(SS.Api.sites[key], BG.autoupdates[key]).done(BG.apiGetSuccess).fail(BG.handleError);
                }                
            }
            return !!siteparms.length;
        }
        , trigger: function(action, data) {
            //data optional
            typeof BG.events[action] === 'function' && BG.events[action](data);
        }
        , updateBadge: function () {
            if (BG.updates > 0) {
                chrome.browserAction.setBadgeText({ 'text': '' + BG.updates + '' });
                chrome.browserAction.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
            } else {
                chrome.browserAction.setBadgeText({ 'text': '' });
                BG.updates = 0; //prevent negs
            }
        }
        , updateIcon: function () {
            if (BG.isRunning) {
                chrome.browserAction.setIcon({ 'path': 'images/icon.png' });
            } else {
                chrome.browserAction.setIcon({ 'path': 'images/icon-off.png' });
            }
        }
        , updateQuestions: function () {
            var runUpdate;
            if (!BG.isRunning) {
                BG.isRunning = true;
                runUpdate = setInterval(function () {
                    if (!BG.runAutoUpdates()) {
                        clearInterval(runUpdate);
                        BG.isRunning = false;                        
                    }
                    BG.trigger('bgupdatedisplay');                                        
                }, BG.updateInterval);
            }
        }
    };

    BG.init();

    function pub(action) {
        BG.getPopup();
        BG.popup && BG.popup.SS.Form.trigger(action);
    }

    function sub(action, handler) {        
        BG.events[action] = handler;
    }

})(window);