const _ = require('underscore');
const api = require('./api');

api.pendingChanges().then(function(projectChanges) {
    if (_.isEmpty(projectChanges)) {
        return;
    }

    var attachments = [];
    _.each(projectChanges, function(v, k) {
        var changes = v,
            projectURL = _.first(changes).projectURL,
            changeTexts = _.map(changes, function(change) {
                return `\`<${change.url}|${change.version.substring(0, 8)}>\` ${change.title} - ${change.user}`;
            });

        attachments.push({
            'color': '#eee',
            'title': `<${projectURL}|${k}>`,
            'text': changeTexts.join("\n"),
            'mrkdwn_in': ['title', 'text']
        });
    });

    console.dir(attachments);
    // api.slack.post({
    //     'text': `*<${api.Config.changesUrl}|Pending Changes>*`,
    //     'attachments': attachments
    // }).then(function(data) {
    //     console.dir(data);
    // });
});
