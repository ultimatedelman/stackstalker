// 'use strict';

// var BG = {
//     autoupdate: {}
//     , isRunning: false
//     , popup: null
//     , updateInterval: 60000
//     , updates: 0
//     , version: '3.0'
//     , init: function () {
//         BG.firstRunUpdate();
//         BG.getQsToUpdate(); //will run again in BG.updateQuestions, but has some functionality that should run off the bat
//         BG.autoupdate.total && BG.runUpdates(); //run an update first, then start timer
//         BG.updateQuestions();
//     }
//     , apiGetSuccess: function (data, site) {
//         var i, j, newq, oldq, len, ilen;
//         if (data) {
//             for (i = 0, len = data.questions.length; i < len; i++) {
//                 newq = Question.init(data.questions[i], site);
//                 oldq = BG.autoupdate[site][i];
//                 if (newq.question_id === oldq.question_id) {
//                     checkUpdateAndStore(oldq, newq);
//                 } else { //don't match up for some reason
//                     for (j = 0, ilen = BG.autoupdate[site].length; j < ilen; j++) {
//                         oldq = BG.autoupdate[site][j];
//                         if (newq.question_id === oldq.question_id) {
//                             checkUpdateAndStore(oldq, newq);
//                             break;
//                         }
//                     }
//                 }
//             }
//             BG.getPopup();
//             BG.popup && BG.popup.Form.renderQuestions(); //if the popup is visible, update it
//             BG.updateBadge();
//         } else {
//             BG.handleError(data);
//         }

//         function checkUpdateAndStore(oq, nq) {
//             if (!oq.updated) { //if the question isn't already marked as updated
//                 if (Question.isUpdated(oq, nq)) {
//                     BG.updates++;
//                     nq.updated = true;
//                 } else {
//                     nq.updated = false;
//                 }
//             } else {
//                 nq.updated = true;                    
//             }

//             Question.store(nq);
//         }
//     }
//     , firstRunUpdate: function () {
//         if (localStorage['version'] === null || localStorage['version'] < BG.version) {
//             console.log('updating from old version!');
//             localStorage.setItem('version', BG.version);
//             console.log('version is now: ', localStorage['version']);
//         }
//     }
//     , getPopup: function () {
//         var url = chrome.extension.getURL('popup.html')
//             , views = chrome.extension.getViews()
//             , i, view
//         ;
//         for (i = 0; i < views.length; i++) {
//             view = views[i];
//             if (view.location.href === url) {
//                 BG.popup = view;
//                 break;
//             }
//         }
//     }
//     , getQsToUpdate: function () {
//         BG.autoupdate = {
//             mso: []
//             , sa: []
//             , sf: []
//             , so: []
//             , su: []
//             , total: 0
//         };
//         var updateCount = 0;
//         for (var key in localStorage) {
//             if (key.indexOf('|') !== -1) {
//                 var q = Question.retrieve(key);
//                 updateCount += q.updated;
//                 if (q.autoupdate) {
//                     BG.autoupdate[q.site].push(q);
//                     BG.autoupdate.total++;
//                 }
//             }
//         }
//         BG.updates = updateCount;
//         BG.updateBadge();
//         BG.updateIcon();
//     }
//     , handleError: function (data) {
//         console.log('bg error!', data);
//     }
//     , resetBadge: function () {
//         BG.updates = 0;
//         BG.updateBadge();
//     }
//     , runUpdates: function () {
//         var site;
//         for (site in BG.autoupdate) {
//             var list = BG.autoupdate[site];
//             if (list && list.length) {
//                 var ids = [];
//                 for (var i = 0, len = list.length; i < len; i++) {
//                     ids.push(list[i].question_id);
//                 }
//                 Question.getQuestionsFromApi(ids.join(';'), BG.apiGetSuccess, site);
//             }
//         }
//     }
//     , updateBadge: function () {
//         if (BG.updates > 0) {
//             chrome.browserAction.setBadgeText({ 'text': '' + BG.updates + '' });
//             chrome.browserAction.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
//         } else {
//             chrome.browserAction.setBadgeText({ 'text': '' });
//             BG.updates = 0; //prevent negs
//         }
//     }
//     , updateIcon: function () {
//         if (BG.autoupdate.total) {
//             chrome.browserAction.setIcon({ 'path': 'images/icon.png' });
//         } else {
//             chrome.browserAction.setIcon({ 'path': 'images/icon-off.png' });
//         }
//     }
//     , updateQuestions: function () {
//         var runUpdate;
//         if (!BG.isRunning) {
//             BG.isRunning = true;
//             runUpdate = setInterval(function () {
//                 BG.getQsToUpdate();
//                 if (!BG.autoupdate.total) {
//                     clearInterval(runUpdate);
//                     BG.isRunning = false;
//                     console.log('No items to update!');
//                 } else {
//                     console.log('Updating!');
//                     BG.runUpdates();
//                 }
//             }, BG.updateInterval);
//         }
//     }
// };

// BG.init();    
