'use strict';
(function(window, $) {
    window.SS = window.SS || {};
    
    //get bgpage and clear out updates
    var bgPage = chrome.extension.getBackgroundPage()            
    , Form = SS.Form = {
        events: {} 
        , init: function () {
            
            //bind Form's Api reference to one loaded on BG page
            SS.Api = SS.Api || bgPage.SS.Api;

            Form.renderQuestions();
            Form.renderAddThisLink();            
            
            sub('bgquestionsupdated', Form.handleBGQuestionsUpdated);
            pub('forminit');

            //bind
            $('#wrapper')
                .on('click', '.title a', Form.handleTitleClick)
                .on('click', '.actions .delete', Form.handleDeleteClick)
                .on('click', '.actions .monitor', Form.handleMonitorClick)
                .on('click', '.markread', Form.handleMarkReadClick)
                .on('click', '.clear', Form.handleClearClick)
                .on('click', '.js-add', Form.handleAddClick)
                .on('click', '.empty a', Form.handleEmptyClick)
            ;
        }
        , getQuestion: function(data) {
            var template = $('#template .q').clone()
                , actions = template.find('.actions')
                , site = SS.Api.sites[data.site].site
                , answers, views
            ;        

            template.attr({'data-site': data.site, 'data-question-id': data.question_id});

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

            template.find('figure img').attr({src: site.icon_url, alt: site.name, title: $('<div />').html(site.name).text()});

            return template;
        }
        , handleAddClick: function (e) {
            var button = $(this);
            e.preventDefault();  
            button.after('<img src="images/loading.gif" alt="Loading..." class="loading" />');
            SS.Api.addQuestion(function() {
                Form.renderQuestions();
                pub('formaddquestion');                
                button.hide();
            });
        }
        , handleBGQuestionsUpdated: function() {
            Form.renderQuestions();
        }
        , handleClearClick: function(e) {
            e.preventDefault();
            confirm('Are you sure?') && Form.reset();
        }
        , handleDeleteClick: function(e) {
            var link = $(this)
                , q = link.parents('.q')
            ;
            e.preventDefault();
            SS.Api.removeQuestion(q.data('site'), q.data('questionId'), function() {
                q.remove();
                !SS.Api.totalQuestions && Form.reset();
                Form.renderAddThisLink();
            });
        }
        , handleEmptyClick: function(e) {
            e.preventDefault();
            chrome.tabs.create({url: this.href });
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
            var data = SS.Api.sites[qBody.data('site')].questions[qBody.data('questionId')];
            qBody.removeClass('updated');
            data.updated = false;
            
            SS.Api.updateQuestion(data);
            qBody.replaceWith(Form.getQuestion(data));

            pub('formquestionread');
        }
        , renderAddThisLink: function () {
            chrome.tabs.query({active: true, currentWindow: true}, function (tabArr) {
                var isFollowing = false
                    , tab = tabArr[0]
                    , id = tab.url.replace(/https?:\/\//, '').split('/')[2] //follows "questions"
                    , param = SS.Api.getApiParam(tab.url)
                    , add = $('#template .addthis').clone()
                    , actions = $('#actions')
                    , questions = $('#questions')
                ;
                actions.find('.addthis').remove();
                if (tab.url.indexOf('questions') > -1 && param) {
                    isFollowing = SS.Api.sites[param] && SS.Api.sites[param].questions[id];

                    if (isFollowing) {                    
                        add.html('You are following this question.').removeClass('js-add');
                    } else {
                        add.find('span').text(id);
                        if (!SS.Api.totalQuestions) {
                            add.addClass('demo');
                            questions.html($('#template').find('.helper').clone());
                        }
                    }
                    actions.prepend(add);
                } else {
                    //not on SE site
                    actions.find('.addthis').remove();
                }
            });
        }
        , renderQuestions: function () {
            var allQs, param, site, q;
            if (SS.Api.totalQuestions) {
                allQs = $('#questions').empty().hide();
                for (param in SS.Api.sites) {
                    site = SS.Api.sites[param];
                    for (q in site.questions) {
                        allQs.append(Form.getQuestion(site.questions[q]));
                    }
                }
                allQs.show();
                $('.loading').remove();            
            } else {
                Form.reset();
            }
        }
        , reset: function () {
            SS.Api.empty();
            $('#questions').empty().append($('#template').find('.empty').clone());
            Form.renderAddThisLink();
            pub('formreset');
        }
        , toggleMonitor: function (button) {
            var qBody = button.parents('.q')
                , data = SS.Api.sites[qBody.data('site')].questions[qBody.data('questionId')]
            ;
            button.toggleClass('off');
            data.autoupdate = !button.is('.off');

            SS.Api.updateQuestion(data, function() {
                qBody.replaceWith(Form.getQuestion(data));
                pub('formupdatemonitor');                
            });
        }
        , trigger: function(action, data) {
            //data optional
            typeof Form.events[action] === 'function' && Form.events[action](data);
        }
    };
    
    $(function() {
        Form.init();
    });

    function sub(action, handler) {        
        Form.events[action] = handler;
    }

    function pub(action) {
        bgPage && bgPage.SS.BG.trigger(action);
    }
    
})(window, jQuery);

function truncateNumber(num) {
    num = +num;
    return num > 1000 ? (num / 1000).toFixed(0) + 'k' : num;
}