var Promise = require('promise');
var request = require('request');
var path = require('path');
var url = require('url');

var i = 0;

function Stream(config) {
  var self = this;
  this.name = config.name || ('s' + ++i);
  this.url = config.url;
  this.content = null;
  this.baseUrl = path.dirname(this.url); // mad skills

  this.intervalRefresh = function (interval) {
    setTimeout(function () {
      self.refresh().then(function () {
        self.intervalRefresh(interval);
      }, function () {
        self.intervalRefresh(interval)
      });
    }, interval);
  }
}

/**
 * @returns {Promise}
 */
Stream.prototype.refresh = function () {
  var self = this;
  var promise = new Promise(function (resolve, reject) {
    request.get(self.url, {timeout: 1000}, function (err, response, body) {
      if (err) {
        reject(err);
        return;
      }
      if (response.statusCode !== 200) {
        reject(response.statusCode);
      }
      resolve(body);
    });
  });
  promise.then(function (value) {
    self.content = value.replace(/(.*\.ts)/g, self.baseUrl + "/$1");
    return self.content;
  });
  return promise;
};

module.exports = Stream;
