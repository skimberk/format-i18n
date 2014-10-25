var callsite = require('callsite');
var path = require('path');
var dir = require('node-dir');
var wrench = require('wrench');
var yaml = require('js-yaml');
var fs = require('fs');

if(!global.Intl) {
  require('intl');
}

var IntlMessageFormat = require('intl-messageformat');

var iterateThroughObject = function(object, objectName, eachString) {
  for(var key in object) {
    if(object.hasOwnProperty(key)) {
      var value = object[key];

      var innerObjectName = objectName + '.' + key;

      if(typeof value === 'string') {
        eachString(value, innerObjectName)
      }
      else if(!!value && value.constructor === Object) {
        iterateThroughObject(value, innerObjectName, eachString);
      }
    }
  }
};

module.exports = function(i18nDirectory) {
  var callPath = path.dirname(callsite()[1].getFileName()) + path.sep;
  var properPath = path.normalize(callPath + i18nDirectory);

  var messages = {};

  var allFilePaths = wrench.readdirSyncRecursive(properPath);

  for(var i = 0, len = allFilePaths.length; i < len; ++i) {
    var filePathRelative = allFilePaths[i];
    var filePathAbsolute = path.normalize(properPath + path.sep + filePathRelative);

    if(fs.lstatSync(filePathAbsolute).isFile() && path.extname(filePathRelative) === '.yaml') {
      var fileContent = fs.readFileSync(filePathAbsolute, 'utf8');
      var fileContentObject = yaml.safeLoad(fileContent);

      var fileName = path.basename(filePathRelative, '.yaml');
      var fileDirNames = filePathRelative.split(path.sep);
      var langCode = fileDirNames.shift();
      fileDirNames.pop();

      var beginning = fileDirNames.join('/') + (fileDirNames.length >= 1 ? '/' : '') + fileName;

      if(!messages.hasOwnProperty(langCode)) {
        messages[langCode] = {};
      }

      iterateThroughObject(fileContentObject, '', function(value, objectName) {
        messages[langCode][beginning + objectName] = new IntlMessageFormat(value.replace(/^\s+|\s+$/g, ''), langCode);
      });
    }
  }

  return function(key, langCode, data) {
    if(messages.hasOwnProperty(langCode) && messages[langCode].hasOwnProperty(key)) {
      return messages[langCode][key].format(data);
    }
    else {
      return key;
    }
  };
};
