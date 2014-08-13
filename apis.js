var Api = {
    key: 'XIlKRyP9jUyL5p-LkZtcpw'
    , sites: [
        {
            "name": "metastackoverflow"
            , "id": "mso"
            , "url": "http://meta.stackoverflow.com/"
            , "apiUrl": getApiUrl
        }
        , {
            "name": "serverfault"
            , "id": "sf"
            , "url": "http://serverfault.com/"
            , "apiUrl": getApiUrl
        }
        , {
            "name": "stackapps"
            , "id": "sa"
            , "url": "http://stackapps.com/"
            , "apiUrl": getApiUrl
        }
        , {
            "name": "stackoverflow"
            , "id": "so"
            , "url": "http://stackoverflow.com/"
            , "apiUrl": getApiUrl
        }
        , {
            "name": "superuser"
            , "id": "su"
            , "url": "http://superuser.com/"
            , "apiUrl": getApiUrl
        }
    ]
    , version: "1.0"
    , getApiById: function (id) {
        for (var i = 0, len = Api.sites.length; i < len; i++) {
            var api = Api.sites[i];
            if (api.id == id) return api;
        }
    }
};

function getApiUrl() {
    return this.url.replace('http://','http://api.') + Api.version + '/';
    }