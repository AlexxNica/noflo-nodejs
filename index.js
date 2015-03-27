var fs = require('fs');
var path = require('path');
var os = require('os');

exports.getLibraryConfig = function () {
  var packagePath = path.resolve(__dirname, 'package.json');
  return JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
};

// user settings
exports.getDefaultsPath = function () {
  var dirs = [process.env.HOME, process.env.HOMEPATH, process.env.USERPROFILE];
  for (var i = 0; i < dirs.length; i++) {
    if (typeof(dirs[i]) !== 'undefined' && fs.existsSync(dirs[i])) {
      return path.resolve(dirs[i], '.flowhub.json');
    }
  }
};
exports.getDefaults = function () {
  var defaults = {};
  var defaultsPath = exports.getDefaultsPath();
  if (fs.existsSync(defaultsPath)) {
    var storedDefaults = JSON.parse(fs.readFileSync(defaultsPath));
    for (var name in storedDefaults) {
      defaults[name] = storedDefaults[name];
    }
  }

  // Defaults from env vars
  if (!defaults.user && process.env.FLOWHUB_USER_ID) {
    defaults.user = process.env.FLOWHUB_USER_ID;
  }
  if (!defaults.port && process.env.PORT) {
    stored.port = process.env.PORT;
  }

  // Built-in defaults
  if (!defaults.port) {
    defaults.port = 3569;
  }
  if (!defaults.host) {
    defaults.host = 'autodetect';
  }
  if (!defaults.ide) {
    defaults.ide = 'http://app.flowhub.io';
  }
  return defaults;
};
exports.saveDefaults = function (values) {
  var defaultsPath = exports.getDefaultsPath();
  if (defaultsPath) {
    fs.writeFileSync(defaultsPath, JSON.stringify(values, null, 2), 'utf-8');
  }
};

// flowhub registration
exports.getStoredPath = function () {
  var root = process.env.PROJECT_HOME || process.cwd();
  return path.resolve(root, 'flowhub.json');
};
exports.getStored = function (program) {
  var stored = {};
  var storedPath = exports.getStoredPath();
  if (fs.existsSync(storedPath)) {
    stored = JSON.parse(fs.readFileSync(storedPath));
  }

  // Let commandline args override
  if (program) {
    var options = ["host", "port", "secret", "ide"];
    for (var i in options) {
      var name = options[i]
      if (program[name]) {
        stored[name] = program[name];
      }
    }
  }
  
  // Set defaults for missing values
  var defaults = exports.getDefaults();
  for (var name in defaults) {
    if (!stored[name]) {
      stored[name] = defaults[name];
    }
  }

  // Run host autodetections
  var match;
  if (stored.host === 'autodetect') {
    stored.host = exports.discoverHost();
  } else if (match = /autodetect\(([a-z0-9]+)\)/.exec(stored.host)) {
    stored.host = exports.discoverHost(match[1]);
  }

  return stored;
};
exports.saveStored = function (values) {
  var storedPath = exports.getStoredPath();
  fs.writeFileSync(storedPath, JSON.stringify(values, null, 2), 'utf-8');
};
exports.discoverHost = function (preferred_iface) {
  var ifaces = os.networkInterfaces();
  var address, int_address;
  
  var filter = function (connection) {
    if (connection.family !== 'IPv4') {
      return;
    }
    if (connection.internal) {
      int_address = connection.address;
    } else {
      address = connection.address;
    }
  };

  if (typeof(preferred_iface)==='string' && preferred_iface in ifaces) {
    ifaces[preferred_iface].forEach(filter);
  } else {
    for (var device in ifaces) {
      ifaces[device].forEach(filter);
    }
  }
  return address || int_address;
};
