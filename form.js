'use strict';
var Form = {
    bgPage: null    
    , init: function () {
        //get bgpage and clear out updates
        Form.bgPage = chrome.extension.getBackgroundPage();
        setTimeout(Form.renderQuestions, 100);
        Form.renderAddThisLink();
        //Form.bgPage.BG.updateQuestions();

        //bind
        $('#wrapper')
            .on('click', '.title a', Form.handleTitleClick)
            .on('click', '.actions .delete', Form.handleDeleteClick)
            .on('click', '.actions .monitor', Form.handleMonitorClick)
            .on('click', '.markread', Form.handleMarkReadClick)
            .on('click', '.clear', Form.handleClearClick)
            .on('click', '.addthis', Form.handleAddClick)
        ;
    }
    , getQuestion: function(data) {
        var template = $('#template .q').clone()
            , actions = template.find('.actions')
            , site = Api.sites[data.site].site
            , answers, views
        ;        

        template.data({site: data.site, questionId: data.question_id});

        if (data.updated) {
            template.addClass('updated');
            actions.find('.monitor').parent().after('<li><button class="markread" title="Mark as read">Mark as read</button></li>');
        }

        if (data.autoupdate) {
            actions.find('.monitor').attr('title', 'Monitoring. Click to disable monitoring.');
        } else {
            actions.find('.monitor').attr('title', 'Not monitoring. Click to enable monitoring.').addClass('off');
        }

        template.find('.votes .count').text(truncateNumber(data.score));
        
        answers = template.find('.answers');
        !data.answer_count && answers.addClass('unanswered');
        data.accepted_answer_id && answers.addClass('accepted');
        answers.find('.count').text(data.answer_count);

        views = template.find('.views');
        data.view_count >= 1000 && views.attr('title', 'Actual views: ' + data.view_count);
        views.find('.count').text(truncateNumber(data.view_count));

        template.find('.title a').attr({href: data.link, id: data.question_id}).html(data.title);

        template.find('.questioncomments').text(data.comment_count);

        template.find('figure img').attr({src: site.icon_url, alt: site.name, title: site.name});

        return template;
    }
    , handleAddClick: function (e) {
        var button = $(this);
        e.preventDefault();  
        button.after('<img src="images/loading.gif" alt="Loading..." class="loading" />');
        Api.addQuestion(function() {
            Form.renderQuestions();
            button.hide();
        });
    }
    , handleClearClick: function(e) {
        e.preventDefault();
        confirm('Are you sure?') && Form.reset();
    }
    , handleDeleteClick: function(e) {
        e.preventDefault();
        var q = $(this).parents('.q');
        Api.removeQuestion(q.data('site'), q.data('questionId'));
        q.remove();
    }
    , handleError: function (msg) {
        $('.error').text(msg).show().delay(3000).fadeOut('fast');
        $('.loading').remove();
    }
    , handleMarkReadClick: function(e) {
        var button = $(this);
        e.preventDefault();
        Form.markAsRead(button.parents('.q'));
        button.hide();
    }
    , handleMonitorClick: function(e) {
        e.preventDefault();
        Form.toggleMonitor($(this));
    }
    , handleTitleClick: function(e) {
        e.preventDefault();
        Form.navigate($(this));
    }
    , navigate: function (link) {
        var row = link.parents('.q')
            , url = link.attr('href')
        ;
        Form.markAsRead(row);
        chrome.tabs.query({url: url}, function (result) {
            var tabExists = false
                , i, len
            ;
            for (i = 0, len = result.length; i < len; i++) {
                if (result[i].url.indexOf(url) > -1) {
                    chrome.tabs.update(result[i].id, { selected: true, url: result[i].url });
                    tabExists = true;
                    break;
                }
            }
            !tabExists && chrome.tabs.create({ url: url });
        });
    }
    , markAsRead: function (qBody) {
        var data = Api.sites[qBody.data('site')].questions[qBody.data('questionId')];
        qBody.removeClass('updated');
        data.updated = false;
        
        Api.updateQuestion(data);
        qBody.replaceWith(Form.getQuestion(data));

        // Form.bgPage.BG.updates--;
        // Form.bgPage.BG.updateBadge();
    }
    , renderAddThisLink: function () {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabArr) {
            var isFollowing = false
                , tab = tabArr[0]
                , id = tab.url.replace('http://', '').split('/')[2] //follows "questions"
                , param = getApiParam(tab.url)
                , add = $('#wrapper .addthis')
            ;

            if (tab.url.indexOf('questions') > -1 && param) {
                isFollowing = Api.sites[param] && Api.sites[param].questions[id];

                if (isFollowing) {
                    $('#wrapper').off('click', '.addthis', Form.handleAddClick);
                    add.html('You are following this question.');
                } else {
                    add.find('span').text(id);
                }                
            } else {
                //not on SE site
                add.hide();
            }
        });
    }
    , renderQuestions: function () {
        var allQs, param, site, q;
        allQs = $('#questions').empty().hide();
        for (param in Api.sites) {
            site = Api.sites[param];
            for (q in site.questions) {
                allQs.append(Form.getQuestion(site.questions[q]));
            }
        }
        allQs.show();
        $('.loading').remove();
    }
    , reset: function () {
        Api.empty();
        $('#questions').empty();
    }
    , toggleMonitor: function (button) {
        var qBody = button.parents('.q')
            , data = Api.sites[qBody.data('site')].questions[qBody.data('questionId')]
        ;
        button.toggleClass('off');
        data.autoupdate = !button.is('.off');

        Api.updateQuestion(data);
        qBody.replaceWith(Form.getQuestion(data));
    }
};

$(function() {
    Form.init();
});

function truncateNumber(num) {
    num = +num;
    return num > 1000 ? (num / 1000).toFixed(0) + 'k' : num;
}