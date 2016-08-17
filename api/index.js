// The CI server has a self-signed cert.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Global dependencies
const _ = require('underscore');
const _request = require('request-promise');
const sprintf = require('sprintf-js').sprintf;

// Local dependencies
const config = require('./config')();
const actions = require('./actions');
const constants = require('./constants');

const authHeaders = {
    'auth': {
        'user': config.username,
        'pass': config.password
    }
};

const request = function(url) {
    return _request(url, authHeaders);
};

const api = {
    Config: config,
    teamcity: {
        builds: {
            getLatest: function() {
                return request(
                    `${constants.TEAMCITY_API_BASE_URL}/buildTypes/id:${config.build}/builds/`
                ).then(
                    actions.teamcity.builds.onReceiveLatest,
                    actions.error
                );
            }
        },
        change: {
            get: function(changeId) {
                return request(`${constants.TEAMCITY_API_BASE_URL}/changes/id:${changeId}`).then(
                    actions.teamcity.change.onReceive,
                    actions.error
                );
            }
        },
        changes: {
            get: function(buildId) {
                return request(`${constants.TEAMCITY_API_BASE_URL}/changes?build=id:${buildId}`).then(
                    actions.teamcity.changes.onReceive,
                    actions.error
                );
            }
        },
        pendingChanges: {
            get: function(changeId) {
                return request(
                    `${constants.TEAMCITY_API_BASE_URL}/changes?buildType=id:${config.build}&sinceChange=${changeId}`
                ).then(
                    actions.teamcity.pendingChanges.onReceive,
                    actions.error
                );
            }
        }
    },
    pendingChanges: function() {
        return new Promise(function(resolve, reject) {
            api.teamcity.builds.getLatest().then(function(latestBuild) {
                api.teamcity.changes.get(latestBuild.id).then(function(latestChange) {
                    api.teamcity.pendingChanges.get(latestChange.id).then(function(pendingChanges) {
                        Promise.all(_.map(pendingChanges, function(v) {
                            return api.teamcity.change.get(v.id);
                        })).then(function(vs) {
                            resolve(_.groupBy(vs, 'project'));
                        });
                    });
                });
            });
        });
    }
};

module.exports = api;
