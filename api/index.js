// The CI server has a self-signed cert.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Global dependencies
const _ = require('underscore');
const _request = require('request-promise');
const parseString = require('xml2js').parseString;
const sprintf = require('sprintf-js').sprintf;

// Local dependencies
const config = require('./config')();

// SOAP API
const API_BASE_URL = 'https://teamcity.omakasecorp.com/httpAuth/app/rest';

const authHeaders = {
    'auth': {
        'user': config.username,
        'pass': config.password
    }
};

const request = function(url) {
    return _request(url, authHeaders);
};

const GITHUB_BASE_URL = 'https://github.com';
const getProjectName = function(teamcityVCSURL) {
    var match = teamcityVCSURL.match(/github\.com\:(.*)\.git/);
    return match ? match[1] : undefined;
}
const getGithubRepo = function(teamcityVCSURL, version) {
    var match = teamcityVCSURL.match(/github\.com\:(.*)\.git/);
    if (!match) {
        return undefined;
    }
    const repoURL = `${GITHUB_BASE_URL}/${match[1]}`;
    return version ? `${repoURL}/commit/${version}` : repoURL;
};

const apiActions = {
    error: function(err) {
        console.error(err);
    },
    teamcity: {
        builds: {
            onReceiveLatest: function(xml) {
                var latestBuild;
                parseString(xml, function (err, result) {
                    var builds = result.builds.build;
                    latestBuild =  _.first(builds).$;
                });
                return latestBuild;
            }
        },
        change: {
            onReceive: function(xml) {
                var change;
                parseString(xml, function(err, result) {
                    var v = result.change,
                        vcsName = _.first(v.vcsRootInstance).$.name;
                    change = {};
                    change.id = v.$.id;
                    change.version = v.$.version;
                    change.project = getProjectName(vcsName);
                    change.url = getGithubRepo(vcsName, change.version);
                    change.projectURL = `https://github.com/${change.project}`;
                    change.user = _.first(v.user).$.name;
                    change.title = _.first(v.comment).split('\n')[0];
                });
                return change;
            }
        },
        changes: {
            onReceive: function(xml) {
                var latestChange;
                parseString(xml, function (err, result) {
                    var changes = result.changes.change;
                    latestChange =  _.first(changes).$;
                });
                return latestChange;
            }
        },
        pendingChanges: {
            onReceive: function(xml) {
                var pendingChanges;
                parseString(xml, function (err, result) {
                    var changes = result.changes.change;
                    pendingChanges = _.map(changes, function(v) { return v.$; });
                });
                return pendingChanges;
            }
        }
    }
};

const api = {
    Config: config,
    teamcity: {
        builds: {
            getLatest: function() {
                return request(
                    `${API_BASE_URL}/buildTypes/id:${config.build}/builds/`
                ).then(
                    apiActions.teamcity.builds.onReceiveLatest,
                    apiActions.error
                );
            }
        },
        change: {
            get: function(changeId) {
                return request(`${API_BASE_URL}/changes/id:${changeId}`).then(
                    apiActions.teamcity.change.onReceive,
                    apiActions.error
                );
            }
        },
        changes: {
            get: function(buildId) {
                return request(`${API_BASE_URL}/changes?build=id:${buildId}`).then(
                    apiActions.teamcity.changes.onReceive,
                    apiActions.error
                );
            }
        },
        pendingChanges: {
            get: function(changeId) {
                return request(
                    `${API_BASE_URL}/changes?buildType=id:${config.build}&sinceChange=${changeId}`
                ).then(
                    apiActions.teamcity.pendingChanges.onReceive,
                    apiActions.error
                );
            }
        }
    },
    slack: {
        post: function(payload) {
            payload = _.extend({
                'username': 'haibibotto',
                'channel': config.channel,
                'icon_emoji': ':rocket:'
            }, payload);

            return _request({
                uri: config.webhook,
                method: 'POST',
                body: payload,
                json: true
            });
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
