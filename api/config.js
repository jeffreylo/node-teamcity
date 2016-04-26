const _ = require('underscore');

const PENDING_CHANGES_BASE_URL = 'https://teamcity.omakasecorp.com/viewType.html';
const BUILD_TYPE_ID = 'Production_BuildAndDeploy';

module.exports = function(username, password) {
    var config = {
        username: username || process.env.TEAMCITY_USERNAME,
        password: password || process.env.TEAMCITY_PASSWORD,
        webhook: process.env.HAIBI_SLACK_WEBHOOK,
        channel: process.env.HAIBI_SLACK_CHANNEL,
        changesUrl: `${PENDING_CHANGES_BASE_URL}?buildTypeId=${BUILD_TYPE_ID}&tab=pendingChangesDiv`,
        build: BUILD_TYPE_ID
    };
    config.isValid = _.all([config.username, config.password]);
    return config;
};
