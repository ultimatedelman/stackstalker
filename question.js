'use strict';
var isIncremented = false;
var Question = {
    //create a question based on JSON received from the api
    init: function (q, site) {
        var ansComments = 0;
        for (var i = 0, len = q.answer_count; i < len; i++) {
            ansComments += q.answers[i].comments.length;
        }
        return {
            'answer_count': q.answer_count
            , 'answer_comments_count': ansComments
			, 'app_id': site + '|' + q.question_id //format: so|1234, how the q is found internally
			, 'autoupdate': true
            , 'comment_count': q.comments.length
			, 'is_accepted': !!q.accepted_answer_id
			, 'last_activity_date': q.last_activity_date
			, 'question_id': q.question_id
			, 'site': site
			, 'score': q.score
			, 'title': q.title
			, 'updated': false
			, 'url': Api.getApiById(site).url
			, 'view_count': q.view_count
        };
    }
    , format: function (q) {
        var template = $('#template .q').clone(true).addClass(q.site);
        template.attr('id', q.app_id);
        template.find('.votes .count').text(q.score);
        template.find('.answers .count').text(q.answer_count);
        !q.answer_count && template.find('.answers').addClass('unanswered');
        q.is_accepted && template.find('.answers').addClass('accepted');

        var views = template.find('.views .count');
        q.view_count < 1000 ? views.text(q.view_count) : views.text((q.view_count / 1000).toFixed(0) + 'k');
        views.attr('title', 'Actual views: ' + q.view_count);

        template.find('.title a').text(q.title).attr('id', q.question_id);
        template.find('.questioncomments').text(q.comment_count);
        template.find('.answercomments').text(q.answer_comments_count);
        !q.autoupdate && template.find('.actions .monitor').addClass('off').attr('title', 'Not monitoring. Click to enable monitoring.');

        q.updated ? template.addClass('updated') : template.removeClass('updated').find('.markread').hide();
        template.show();
        return template;
    }
    , getIdFromInput: function (url) {
        var bits = url.split('/')
            , i, len
        ;
        if (isNumeric(url)) {
            return url; //if an id is entered, just return that
        } 
        if (isNumeric(bits[4])) {
            return bits[4]; //where the id generally is
        } else {
            for (i = 0, len = bits.length; i < len; i++) {
                if (isNumeric(bits[i])) {
                    return bits[i];
                }
            }
        }
        return false;
    }
    , getQuestionsFromApi: function (ids, callback, site) {
        $.ajax({
            url: Api.getApiById(site).apiUrl() + 'questions/' + ids + '?answers=true&comments=true&key=' + Api.key
		    , success: function (data) { 
                typeof callback === 'function' && callback(data, site); 
            }
		    , error: function (err) {
		        var data = {
		            'error': err
                    , 'url': Api.getApiById(site).apiUrl() + 'questions/' + ids + '?key=' + Api.key
                    , 'ids': ids
                    , 'callback': callback
                    , 'site': site
		        };
		        Question.handleError(data);
		    }
		    , complete: function () {
		        $('.loading').remove();
		    }
		    , dataType: 'json'
        });
    }
    , handleError: function (data) {
        var msg = 'There has been a problem reaching the API. If a new API version has come out, please be patient and this extension will update itself soon.';
        if (!isIncremented) { //if not working, increment by .1 and try again. still not working, default to 1.0
            $('img.loading').before('<strong class="loading">New API detected!</strong>');
            isIncremented = true;
            Api.version = (parseFloat(Api.version) + 0.1) + ''; //increment then re-stringify
            Question.getQuestionsFromApi(data.ids, data.callback, data.site);
        } else {
            Api.version = '2.2';
            try {
                Form.handleError(msg);
            } catch (ex) {
                BG.getPopup();
                BG.popup && BG.popup.Form.handleError(msg);
            }
            console.log('errorz!', data);
        }
    }
    , isUpdated: function (oldq, newq) {
        if (oldq.updated) { return true; }
        if (oldq.answer_count !== newq.answer_count) { return true; }
        if (oldq.score !== newq.score) { return true; }
        if (oldq.is_accepted !== newq.is_accepted) { return true; }
        if (oldq.answer_comments_count !== newq.answer_comments_count) { return true; }
        if (oldq.comment_count !== newq.comment_count) { return true; }
        return false;
    }
    , store: function (q) {
        localStorage.removeItem(q.app_id);
        localStorage.setItem(q.app_id, JSON.stringify(q));
    }
    , remove: function (id) {
        localStorage.removeItem(id);
    }
    , removeAll: function () {
        for (var id in localStorage) {
            id.indexOf('|') !== -1 && Question.remove(id);
        }
    }
    , retrieve: function (id) {
        return JSON.parse(localStorage[id]);
    }
};

function isNumeric(value) {
    return (value - 0) === value && value.length > 0;
}