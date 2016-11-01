'use strict';

/* jshint moz:true */
var Gda = void 0;
var GLib = imports.gi.GLib;
var Gettext = imports.gettext;

function _(str) {
  var resultConf = Gettext.dgettext('IcingTaskManager@json', str);
  if (resultConf != str) {
    return resultConf;
  }
  return Gettext.gettext(str);
}

try {
  Gda = imports.gi.Gda;
} catch (e) {}

function getFirefoxHistory(applet) {
  var history = [];

  if (!Gda) {
    log(' Gda Library not found install gir1.2-gda package');
    return null;
  }

  var cfgPath = GLib.build_filenamev([GLib.get_home_dir(), '.mozilla', 'firefox']);

  var iniPath = GLib.build_filenamev([cfgPath, 'profiles.ini']);

  var profilePath = void 0;

  if (GLib.file_test(iniPath, GLib.FileTest.EXISTS)) {
    var iniFile = new GLib.KeyFile();
    var groups = void 0,
        nGroups = void 0;

    iniFile.load_from_file(iniPath, GLib.KeyFileFlags.NONE)[(groups, nGroups)] = iniFile.get_groups();

    for (var i = 0; i < nGroups; i++) {
      var isRelative = void 0,
          profileName = void 0,
          profileDir = void 0;

      try {
        isRelative = iniFile.get_integer(groups[i], 'IsRelative');
        profileName = iniFile.get_string(groups[i], 'Name');
        profileDir = iniFile.get_string(groups[i], 'Path');
      } catch (e) {
        continue;
      }

      if (profileName == 'default') {
        if (isRelative) {
          profilePath = GLib.build_filenamev([cfgPath, profileDir]);
        } else {
          profilePath = profileDir;
        }
      }
    }
  }

  if (!profilePath) {
    return history;
  }

  var filePath = GLib.build_filenamev([profilePath, 'places.sqlite']);

  if (!GLib.file_test(filePath, GLib.FileTest.EXISTS)) {
    return history;
  }

  var con = void 0,
      result = void 0;

  try {
    con = Gda.Connection.open_from_string('SQLite', 'DB_DIR=' + profilePath + ';DB_NAME=places.sqlite', null, Gda.ConnectionOptions.READ_ONLY);
  } catch (e) {
    logError(e);
    return history;
  }

  try {
    if (applet.firefoxMenu == 1) result = con.execute_select_command('SELECT title,url FROM moz_places WHERE title IS NOT NULL ORDER BY visit_count DESC');else if (applet.firefoxMenu == 2) result = con.execute_select_command('SELECT title,url FROM moz_places WHERE title IS NOT NULL ORDER BY last_visit_date DESC');else result = con.execute_select_command('SELECT moz_bookmarks.title,moz_places.url FROM (moz_bookmarks INNER JOIN moz_places ON moz_bookmarks.fk=moz_places.id) WHERE moz_bookmarks.parent IS NOT 1 AND moz_bookmarks.parent IS NOT 2 AND moz_bookmarks.title IS NOT NULL ORDER BY moz_bookmarks.lastModified DESC');
  } catch (e) {
    log(e);
    con.close();
    return history;
  }

  var nRows = result.get_n_rows();
  var num = applet.appMenuNum;
  if (nRows > num) {
    nRows = num;
  }

  for (var row = 0; row < nRows; row++) {
    var title = void 0,
        uri = void 0;

    try {
      title = result.get_value_at(0, row);
      uri = result.get_value_at(1, row);
    } catch (e) {
      logError(e);
      continue;
    }
    history.push({ uri: uri, title: title });
  }

  con.close();
  return history;
}