// Global dependencies
const _ = require('underscore');
const parseString = require('xml2js').parseString;
const moment = require('moment');

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
                var build = {};
                parseString(xml, function (err, result) {
                    if (!result.build) {
                        return;
                    }
                    var v = result.build.$;
                    build.id = v.id;
                    build.number = v.number;
                    build.name = (v.buildTypeId.split('_') || [])[0];
                    build.url = v.webUrl;
                    build.finished = moment(_.first(result.build.finishDate), "YYYY-MM-DDTHH:mmZZ").toDate();
                    build.started = moment(_.first(result.build.startDate), "YYYY-MM-DDTHH:mmZZ").toDate();
                    build.state = v.state;
                });
                return build;
            }
        },
        build: {
            onReceive: function(xml) {
                var build = {};
                parseString(xml, function (err, result) {
                    var v = result.build.$;
                    build.id = v.id;
                    build.number = v.number;
                    build.name = (v.buildTypeId.split('_') || [])[0];
                    build.url = v.webUrl;
                    build.finished = moment(_.first(result.build.finishDate), "YYYY-MM-DDTHH:mmZZ").toDate();
                    build.started = moment(_.first(result.build.startDate), "YYYY-MM-DDTHH:mmZZ").toDate();
                    build.state = v.state;
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
