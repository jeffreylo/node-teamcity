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
        'user': config.teamcityUsername,
        'pass': config.teamcityPassword
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
                    `${config.teamcityApiUrl}/buildTypes/id:${config.teamcityBuildId}/builds/`
                ).then(
                    actions.teamcity.builds.onReceiveLatest,
                    actions.error
                );
            },
            getRunning: function() {
                return request(
                    `${config.teamcityApiUrl}/buildTypes/id:${config.teamcityBuildId}/builds?locator=running:true`
                ).then(
                    actions.teamcity.builds.onReceive,
                    actions.error
                );
            }
        },
        change: {
            get: function(changeId) {
                return request(`${config.teamcityApiUrl}/changes/id:${changeId}`).then(
                    actions.teamcity.change.onReceive,
                    actions.error
                );
            }
        },
        changes: {
            get: function(buildId) {
                return request(`${config.teamcityApiUrl}/changes?build=id:${buildId}`).then(
                    actions.teamcity.changes.onReceive,
                    actions.error
                );
            }
        },
        pendingChanges: {
            get: function(changeId) {
                return request(
                    `${config.teamcityApiUrl}/changes?buildType=id:${config.teamcityBuildId}&sinceChange=${changeId}`
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
    },
    status: function() {
        return new Promise(function(resolve, reject) {
            api.teamcity.builds.getRunning().then(function(runningBuild) {
                return resolve(runningBuild);
            });
        });
    }
};

module.exports = api;
