// Global dependencies
const _ = require('underscore');
const parseString = require('xml2js').parseString;
const moment = require('moment-timezone');

const constants = require('./constants');

const getProjectName = function(teamcityVCSURL) {
    var match = teamcityVCSURL.match(/github\.com\:(.*)\.git/);
    return match ? match[1] : undefined;
};

const getGithubRepo = function(teamcityVCSURL, version) {
    var match = teamcityVCSURL.match(/github\.com\:(.*)\.git/);
    if (!match) {
        return undefined;
    }
    const repoURL = `${constants.GITHUB_BASE_URL}/${match[1]}`;
    return version ? `${repoURL}/commit/${version}` : repoURL;
};

var _mapBuildResponse = (result) => {
    if (!result.build) {
        return undefined;
    }

    var v = result.build.$;
    var triggeredBy = _.first(_.last(result.build.triggered).user).$;
    var build = {};
    build.id = v.id;
    build.number = v.number;
    build.name = (v.buildTypeId.split('_') || [])[0];
    build.url = v.webUrl;
    build.finished = _.first(result.build.finishDate) ? moment(_.first(result.build.finishDate), "YYYY-MM-DDTHH:mmZZ").unix() : null;
    build.started = _.first(result.build.startDate) ? moment(_.first(result.build.startDate), "YYYY-MM-DDTHH:mmZZ").unix() : null;
    build.percentageComplete = result.build.percentageComplete || undefined;
    build.triggeredByUsername = triggeredBy.username;
    build.triggeredByFullName = triggeredBy.name;
    build.state = v.state;
    return build;
};

module.exports = {
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
            },
            onReceive: function(xml) {
                var build;
                parseString(xml, function (err, result) {
                    var builds = result.builds.build;
                    build =  _.first(builds).$;
                });
                return build;
            }
        },
        build: {
            onReceive: function(xml) {
                var build;
                parseString(xml, function (err, result) {
                    build = _mapBuildResponse(result);
                });
                return build;
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
                    change.username = _.first(v.user).$.username;
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
