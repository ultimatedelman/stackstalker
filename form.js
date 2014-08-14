'use strict';
var Form = {
    bgPage: null
    , questions: []
	, tabUrl: ''
    , init: function () {
        //get bgpage and clear out updates
        Form.bgPage = chrome.extension.getBackgroundPage();
        Form.renderQuestions();
        Form.renderAddThisLink();
        Form.bgPage.BG.updateQuestions();

        //bind
        $('.title a').on('click', Form.navigate);
        $('.actions .delete').on('click', Form.deleteQuestion);
        $('.actions .monitor').on('click', Form.toggleMonitor);
        $('.markread').on('click', function () {
            var link = $(this);
            Form.markAsRead(link.parents('.q'));
            link.hide();
        });
        $('.clear').click(Form.reset);
        $('.addthis').on('click', Form.addQuestion);
    }
    , addQuestion: function () {
        var link = $(this)
            , site = link.attr('class').replace('addthis', '').replace(' ','')
            , id
        ;
        if (site.length) {
            link.after('<img src="images/loading.gif" alt="Loading..." class="loading" />');
            id = site + '|' + Question.getIdFromInput(Form.tabUrl);
            if (!(id in localStorage)) {
                Question.getQuestionsFromApi(id.split('|')[1], Form.getQSuccess, site);
            } else {
                Form.handleError('You\'ve already added this question!');
            }
        }
    }
    , appendQuestion: function (q) {
        $('#questions').append(Question.format(q));
    }
    , deleteQuestion: function () {
        var q = $(this).parents('.q')
            , id = q.attr('id')
        ;
        q.remove();
        Question.remove(id);
    }
    , getQSuccess: function (result, site) {
        if (result) {
            var q = Question.init(result.questions[0], site);
            console.log(result);
            Question.store(q);
            Form.appendQuestion(q);
            Form.bgPage.BG.updateQuestions();
        } else {
            Form.handleError('An error occurred trying to reach the API');
        }
    }
    , getTabUrl: function () {
        chrome.tabs.getSelected(null, function (tab) {
            Form.tabUrl = tab.url;
        });
    }
    , handleError: function (msg) {
        $('.error').text(msg).show().delay(3000).fadeOut('fast');
        $('.loading').remove();
    }
    , loadQuestions: function () {
        var id;
        Form.questions = [];
        for (id in localStorage) {
            if (id.indexOf('|') !== -1) {
                Form.questions.push(Question.retrieve(id));  //load questions locally, convert to indexable array
            }
        }
        Form.questions.sort(function (a, b) { //puts updated highest, monitoring next, unmonitored last
            if (b.updated === a.updated) {
                if (b.autoupdate === a.autoupdate) {
                    return b.last_activity_date - a.last_activity_date;
                } else {
                    return b.autoupdate - a.autoupdate;                
                }
            } else {
                return b.updated - a.updated;
            }
        });
    }
    , navigate: function () {
        var link = $(this)
            , row = link.parents('.q')
            , appId = row.attr('id').split('|')
            , qTabUrl = Api.getApiById(appId[0]).url + 'questions/' + appId[1]
        ;
        Form.markAsRead(row);
        chrome.tabs.getAllInWindow(null, function (result) {
            var tabExists = false
                , i, len
            ;
            for (i = 0, len = result.length; i < len; i++) {
                if (result[i].url.indexOf(qTabUrl) > -1) {
                    chrome.tabs.update(result[i].id, { selected: true, url: result[i].url });
                    tabExists = true;
                    break;
                }
            }
            !tabExists && chrome.tabs.create({ url: qTabUrl });
        });
    }
    , markAsRead: function (body) {
        var id = body.attr('id')
            , q = Question.retrieve(id)
        ;
        q.updated = false;
        Question.store(q);
        body.removeClass('updated');
        Form.bgPage.BG.updates--;
        Form.bgPage.BG.updateBadge();
    }
    , renderAddThisLink: function () {
        chrome.tabs.getSelected(null, function (tab) {
            var isFollowing = false
                , id, i, len, add, onSite, site
            ;
            Form.tabUrl = tab.url;
            id = Question.getIdFromInput(Form.tabUrl);
            for (i = 0, len = Form.questions.length; i < len; i++) {
                if (Form.questions[i].question_id === id) {
                    isFollowing = true;
                    break;
                }
            }
            add = $('#actions a.addthis');
            if (!isFollowing) {
                onSite = false;
                if (id) {
                    for (i = 0, len = Api.sites.length; i < len; i++) {
                        site = Api.sites[i];
                        if (Form.tabUrl.indexOf(site.url + 'questions') !== -1) {
                            add.addClass(site.id);
                            add.find('span').text('#' + id);
                            onSite = true;
                            break;
                        }
                    }
                }
                !onSite && add.hide();
            } else {
                //for some reason .die() won't work, so working around in the click handler
                add.html('You are following this question.').removeAttr('href');
            }
        });
    }
    , renderQuestions: function () {
        var allQs;
        Form.loadQuestions();
        allQs = $('#questions').empty().hide();
        for (var i = 0, len = Form.questions.length; i < len; i++) {
            Form.appendQuestion(Form.questions[i]);
        }
        allQs.show();
    }
    , reset: function () {
        Question.removeAll();
        Form.questions = [];
        $('#questions').empty();
    }
    , toggleMonitor: function () {
        var link = $(this)
            , qBody = link.parents('.q')
            , id = qBody.attr('id')
            , q = Question.retrieve(id)
        ;
        
        if (link.hasClass('off')) {
            link.removeClass('off').attr('title', 'Monitoring. Click to disable monitoring.');
            q.autoupdate = true;
            Form.bgPage.BG.updateQuestions();
        } else {
            link.addClass('off').attr('title', 'Not monitoring. Click to enable monitoring.');
            q.autoupdate = false;
        }
        Question.store(q);
    }
};

$(function() {
    Form.init();
});