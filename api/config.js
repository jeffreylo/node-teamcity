const _ = require('underscore');

module.exports = function(username, password) {
  var config = {
    teamcityApiUrl: process.env.TEAMCITY_API_URL,
    teamcityBuildId: process.env.TEAMCITY_BUILD_ID,
    teamcityUsername: username || process.env.TEAMCITY_USERNAME,
    teamcityPassword: password || process.env.TEAMCITY_PASSWORD
  };
  config.isValid = _.all(_.values(config));
  return config;
};
