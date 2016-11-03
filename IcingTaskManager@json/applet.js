'use strict';

// vim: expandtab shiftwidth=4 tabstop=8 softtabstop=4 encoding=utf-8 textwidth=99
/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */
// Cinnamon Window List
// Authors:
//   Kurt Rottmann <kurtrottmann@gmail.com>
//   Jason Siefken
//   Josh hess <jake.phy@gmail.com>
// Taking code from
// Copyright (C) 2011 R M Yorston
// Licence: GPLv2+
// http://intgat.tigress.co.uk/rmy/extensions/gnome-Cinnamon-frippery-0.2.3.tgz
/* jshint moz:true */
var Applet = imports.ui.applet;
var Clutter = imports.gi.Clutter;
var Lang = imports.lang;
var Cinnamon = imports.gi.Cinnamon;
var St = imports.gi.St;
var Main = imports.ui.main;
var Mainloop = imports.mainloop;
var Tweener = imports.ui.tweener;
var Meta = imports.gi.Meta;
var PopupMenu = imports.ui.popupMenu;
var Signals = imports.signals;
var DND = imports.ui.dnd;
var AppFavorites = imports.ui.appFavorites;
var Settings = imports.ui.settings;
var Gettext = imports.gettext;
var Gio = imports.gi.Gio;
var Gtk = imports.gi.Gtk;
var GLib = imports.gi.GLib;
//const Panel = imports.ui.panel
var clog = imports.applet.clog;

function _(str) {
  var resultConf = Gettext.dgettext('IcingTaskManager@json', str);
  if (resultConf != str) {
    return resultConf;
  }
  return Gettext.gettext(str);
}

// Load our applet so we can access other files in our extensions dir as libraries
var AppletDir = imports.ui.appletManager.applets['IcingTaskManager@json'];
var SpecialMenus = AppletDir.specialMenus;
var SpecialButtons = AppletDir.specialButtons;

var TitleDisplay = {
  None: 1,
  App: 2,
  Title: 3,
  Focused: 4
};
var NumberDisplay = {
  Smart: 1,
  Normal: 2,
  None: 3,
  All: 4
};

// Some functional programming tools
var dir = function dir(obj) {
  var props = [afor(a in obj)];
  props.concat(Object.getOwnPropertyNames(obj));
  return props;
};

var range = function range(a, b) {
  var ret = [];
  // if b is unset, we want a to be the upper bound on the range
  if (b === null || b === undefined) {
    var _ref = [0, a];
    a = _ref[0];
    b = _ref[1];
  }

  for (var _i = a; _i < b; _i++) {
    ret.push(_i);
  }
  return ret;
};

var zip = function zip(a, b) {
  var ret = [];
  for (var _i2 = 0; _i2 < Math.min(a.length, b.length); _i2++) {
    ret.push([a[_i2], b[_i2]]);
  }
  return ret;
};

var unzip = function unzip(a) {
  var ret1 = [],
      ret2 = [];
  a.forEach(function (tuple) {
    ret1.push(tuple[0]);
    ret2.push(tuple[1]);
  });

  return [ret1, ret2];
};

// Connects and keeps track of signal IDs so that signals
// can be easily disconnected

function SignalTracker() {
  this._init.apply(this, arguments);
}

SignalTracker.prototype = {
  _init: function _init() {
    this._data = [];
  },

  // params = {
  //              signalName: Signal Name
  //              callback: Callback Function
  //              bind: Context to bind to
  //              object: object to connect to
  // }
  connect: function connect(params) {
    var signalName = params.signalName;
    var callback = params.callback;
    var bind = params.bind;
    var object = params.object;
    var signalID = null;

    signalID = object.connect(signalName, Lang.bind(bind, callback));
    this._data.push({
      signalName: signalName,
      callback: callback,
      object: object,
      signalID: signalID,
      bind: bind
    });
  },

  disconnect: function disconnect(param) {},

  disconnectAll: function disconnectAll() {
    this._data.forEach(function (data) {
      data.object.disconnect(data.signalID);
      for (var prop in data) {
        data[prop] = null;
      }
    });
    this._data = [];
  }
};

function PinnedFavs() {
  this._init.apply(this, arguments);
}

PinnedFavs.prototype = {
  _init: function _init(applet) {
    this._applet = applet;
    this._favorites = {};
    this._applet.settings.connect('changed::pinned-apps', Lang.bind(this, function () {
      this._onFavsChanged();
    }));
    this._reload();
  },

  _onFavsChanged: function _onFavsChanged() {
    if (this._reload()) this.emit('changed');
  },

  _reload: function _reload() {
    var ids = this._applet.settings.getValue('pinned-apps');
    var appSys = Cinnamon.AppSystem.get_default();
    var apps = ids.map(function (id) {
      var app = appSys.lookup_app(id);
      return app;
    }).filter(function (app) {
      return app !== undefined && app !== null;
    });
    var needReaload = false;
    var keys = Object.keys(this._favorites);

    for (var _i3 = 0; _i3 < apps.length; _i3++) {
      var app = apps[_i3];
      var id = app.get_id();
      if (!this._favorites[id]) {
        this._favorites[id] = app;
        needReaload = true;
      } else {
        var index = keys.indexOf(id);
        if (index != -1) keys.splice(index, 1);
      }
    }
    if (keys.length > 0) {
      needReaload = true;
      for (var _i4 = 0; _i4 < keys.length; _i4++) {
        var key = keys[_i4];
        if (keys in this._favorites) delete this._favorites[key];
      }
    }
    return needReaload;
  },

  _getIds: function _getIds() {
    var ret = [];
    for (var id in this._favorites) {
      ret.push(id);
    }return ret;
  },

  getFavoriteMap: function getFavoriteMap() {
    return this._favorites;
  },

  getFavorites: function getFavorites() {
    var ret = [];
    for (var id in this._favorites) {
      ret.push(this._favorites[id]);
    }return ret;
  },

  isFavorite: function isFavorite(appId) {
    return appId in this._favorites;
  },

  _addFavorite: function _addFavorite(appId, pos) {
    if (appId in this._favorites) return false;

    var app = Cinnamon.AppSystem.get_default().lookup_app(appId);
    if (!app) app = Cinnamon.AppSystem.get_default().lookup_settings_app(appId);

    if (!app) return false;

    var ids = this._getIds();
    if (pos == -1) ids.push(appId);else ids.splice(pos, 0, appId);
    this._applet.settings.setValue('pinned-apps', ids);
    this._onFavsChanged();
    return true;
  },

  addFavoriteAtPos: function addFavoriteAtPos(appId, pos) {
    this._addFavorite(appId, pos);
  },

  addFavorite: function addFavorite(appId) {
    this.addFavoriteAtPos(appId, -1);
  },

  moveFavoriteToPos: function moveFavoriteToPos(appId, pos) {
    var ids = this._getIds();
    var old_index = ids.indexOf(appId);
    if (pos > old_index) pos = pos - 1;
    ids.splice(pos, 0, ids.splice(old_index, 1)[0]);
    this._applet.settings.setValue('pinned-apps', ids);
  },

  _removeFavorite: function _removeFavorite(appId) {
    if (!appId in this._favorites) return false;

    var ids = this._getIds().filter(function (id) {
      return id != appId;
    });
    this._applet.settings.setValue('pinned-apps', ids);
    this._onFavsChanged();
    return true;
  },

  removeFavorite: function removeFavorite(appId) {
    this._removeFavorite(appId);
  }
};
Signals.addSignalMethods(PinnedFavs.prototype);

function AppFromWMClass(appsys, applist, metaWindow) {
  function startup_class(wmclass) {
    var app_final = null;
    for (app in applist) {
      if (applist[app].wmClass == wmclass) {
        app_final = appsys.lookup_app(applist[app].id);
        if (!app_final) app_final = appsys.lookup_settings_app(applist[app].id);
        app_final.wmClass = wmclass;
      }
    }
    return app_final;
  }
  var wmClassInstance = metaWindow.get_wm_class_instance();
  var app = startup_class(wmClassInstance);
  return app;
}

// AppGroup is a container that keeps track
// of all windows of @app (all windows on workspaces
// that are watched, that is).

var __proto = Object; // This is needed to support the old cinnamon implementation
if (DND.LauncherDraggable) __proto = DND.LauncherDraggable;

function AppGroup() {
  this._init.apply(this, arguments);
}

AppGroup.prototype = {
  __proto__: __proto.prototype,
  _init: function _init(applet, appList, app, isFavapp) {
    if (DND.LauncherDraggable) DND.LauncherDraggable.prototype._init.call(this);
    this._applet = applet;
    this.appList = appList;

    this._deligate = this;
    this.launchersBox = applet; // This convert the applet class in a launcherBox(is requiere to be a launcher dragable object)
    // but you have duplicate object this._applet then...
    this.app = app;
    this.isFavapp = isFavapp;
    this.isNotFavapp = !isFavapp;
    this.orientation = applet.orientation;
    this.metaWindows = {};
    this.metaWorkspaces = {};
    this.actor = new St.Bin({
      reactive: true,
      can_focus: true,
      x_fill: true,
      y_fill: false,
      track_hover: true
    });
    this.actor._delegate = this;

    this.myactor = new St.BoxLayout({
      reactive: true
    });
    this.actor.set_child(this.myactor);

    this._appButton = new SpecialButtons.AppButton(this);

    this.myactor.add(this._appButton.actor);

    this._appButton.actor.connect('button-press-event', Lang.bind(this, this._onAppButtonRelease));
    // global.screen.connect('event', Lang.bind(this, this._onAppKeyPress))
    //        global.screen.connect('key-release-event', Lang.bind(this, this._onAppKeyReleased))
    // Set up the right click menu for this._appButton
    this.rightClickMenu = new SpecialMenus.AppMenuButtonRightClickMenu(this, this._appButton.actor);
    this._menuManager = new PopupMenu.PopupMenuManager(this);
    this._menuManager.addMenu(this.rightClickMenu);

    // Set up the hover menu for this._appButton
    this.hoverMenu = new SpecialMenus.AppThumbnailHoverMenu(this);
    this._hoverMenuManager = new SpecialMenus.HoverMenuController(this);
    this._hoverMenuManager.addMenu(this.hoverMenu);

    this._draggable = SpecialButtons.makeDraggable(this.actor);
    this._draggable.connect('drag-cancelled', Lang.bind(this, this._onDragCancelled));
    this._draggable.connect('drag-end', Lang.bind(this, this._onDragEnd));
    this.isDraggableApp = true;

    this.on_panel_edit_mode_changed();
    this.on_arrange_pinned();
    global.settings.connect('changed::panel-edit-mode', Lang.bind(this, this.on_panel_edit_mode_changed));
    this._applet.settings.connect('changed::arrange-pinnedApps', Lang.bind(this, this.on_arrange_pinned));
  },

  getId: function getId() {
    return this.app.get_id();
  },

  on_arrange_pinned: function on_arrange_pinned() {
    this._draggable.inhibit = !this._applet.settings.getValue('arrange-pinnedApps');
  },

  on_panel_edit_mode_changed: function on_panel_edit_mode_changed() {
    this._draggable.inhibit = global.settings.get_boolean('panel-edit-mode');
    this.actor.reactive = !global.settings.get_boolean('panel-edit-mode');
  },

  on_title_display_changed: function on_title_display_changed(metaWindow) {
    this._windowTitleChanged(metaWindow);
    var titleType = this._applet.settings.getValue('title-display');
    if (titleType == TitleDisplay.Title) {
      this.showAppButtonLabel(true);
    } else if (titleType == TitleDisplay.App) {
      this.showAppButtonLabel(true);
    } else if (titleType == TitleDisplay.None) {
      this.hideAppButtonLabel(true);
    }
  },

  _onDragEnd: function _onDragEnd() {
    this.rightClickMenu.close(false);
    this.hoverMenu.close(false);
    this.appList.myactorbox._clearDragPlaceholder();
  },

  _onDragCancelled: function _onDragCancelled() {
    this.rightClickMenu.close(false);
    this.hoverMenu.close(false);
    this.appList.myactorbox._clearDragPlaceholder();
  },

  handleDragOver: function handleDragOver(source, actor, x, y, time) {
    var IsLauncherDraggable = null;
    if (DND.LauncherDraggable) IsLauncherDraggable = source instanceof DND.LauncherDraggable;
    if (source instanceof AppGroup || source.isDraggableApp || IsLauncherDraggable) return DND.DragMotionResult.CONTINUE;

    if (typeof this.appList.dragEnterTime == 'undefined') {
      this.appList.dragEnterTime = time;
    } else {
      if (time > this.appList.dragEnterTime + 3000) {
        this.appList.dragEnterTime = time;
      }
    }

    if (time > this.appList.dragEnterTime + 300 && !(this.isFavapp || source.isDraggableApp)) {
      this._windowHandle(true);
    }
    return true;
  },

  getDragActor: function getDragActor() {
    return this.app.create_icon_texture(this._applet._panelHeight);
  },

  // Returns the original actor that should align with the actor
  // we show as the item is being dragged.
  getDragActorSource: function getDragActorSource() {
    return this.actor;
  },

  _setWatchedWorkspaces: function _setWatchedWorkspaces() {
    this._appButton._setWatchedWorkspaces(this.metaWorkspaces);
  },

  // Add a workspace to the list of workspaces that are watched for
  // windows being added and removed
  watchWorkspace: function watchWorkspace(metaWorkspace) {
    if (!this.metaWorkspaces[metaWorkspace]) {
      // We use connect_after so that the window-tracker time to identify the app, otherwise get_window_app might return null!
      var windowAddedSignal = metaWorkspace.connect_after('window-added', Lang.bind(this, this._windowAdded));
      var windowRemovedSignal = metaWorkspace.connect_after('window-removed', Lang.bind(this, this._windowRemoved));
      this.metaWorkspaces[metaWorkspace] = {
        workspace: metaWorkspace,
        signals: [windowAddedSignal, windowRemovedSignal]
      };
    }
    this._calcWindowNumber(metaWorkspace);
    this._applet.settings.connect('changed::number-display', Lang.bind(this, function () {
      this._calcWindowNumber(metaWorkspace);
    }));
    this._setWatchedWorkspaces();
  },

  // Stop monitoring a workspace for added and removed windows.
  // @metaWorkspace: if null, will remove all signals
  unwatchWorkspace: function unwatchWorkspace(metaWorkspace) {
    function removeSignals(obj) {
      var signals = obj.signals;
      for (var _i5 = 0; _i5 < signals.length; _i5++) {
        obj.workspace.disconnect(signals[_i5]);
      }
    }

    if (!metaWorkspace) {
      for (var k in this.metaWorkspaces) {
        removeSignals(this.metaWorkspaces[k]);
        delete this.metaWorkspaces[k];
      }
    } else if (this.metaWorkspaces[metaWorkspace]) {
      removeSignals(this.metaWorkspaces[metaWorkspace]);
      delete this.metaWorkspaces[metaWorkspace];
    } else {
      global.log('Warning: tried to remove watch on an unwatched workspace');
    }
    this._setWatchedWorkspaces();
  },

  hideAppButton: function hideAppButton() {
    this._appButton.actor.hide();
  },

  showAppButton: function showAppButton() {
    this._appButton.actor.show();
  },

  hideAppButtonLabel: function hideAppButtonLabel(animate) {
    this._appButton.hideLabel(animate);
  },

  showAppButtonLabel: function showAppButtonLabel(animate, targetWidth) {
    this._appButton.showLabel(animate, targetWidth);
  },

  _onAppButtonRelease: function _onAppButtonRelease(actor, event) {

    //      global.log(event.get_button())
    if (event.get_button() == 0x01 && this.isFavapp) {
      //        global.log('create window'); 
      this.app.open_new_window(-1);
      this._animate();
      return;
    }
    var workspaces = [global.screen.get_workspace_by_index(i), each(i in range(global.screen.n_workspaces))];
    var windowNum = this.app.get_windows().filter(function (win) {
      for (var _i6 = 0; _i6 < workspaces.length; _i6++) {
        if (win.get_workspace() == workspaces[_i6]) return workspaces[_i6];
      }
      return false;
    }).length;

    if (!this.lastFocused) return;

    if (event.get_button() == 0x02 && !this.isFavapp) {
      this.app.open_new_window(-1);
    } else if (event.get_button() == 0x01) {
      if (this._applet.onclickThumbs && windowNum > 1) {
        this.hoverMenu.shouldOpen = true;
        this.hoverMenu.shouldClose = false;
        this.hoverMenu.hoverOpen();
      } else this._windowHandle(false);
    }
  },

  _newAppKeyNumber: function _newAppKeyNumber(number) {
    if (this.hotKeyId) Main.keybindingManager.removeHotKey(this.hotKeyId);
    if (number < 10) {
      Main.keybindingManager.addHotKey('launch-app-key-' + number.toString(), '<Super>' + number.toString(), Lang.bind(this, this._onAppKeyPress));
      Main.keybindingManager.addHotKey('launch-new-app-key-' + number.toString(), '<Super><Shift>' + number.toString(), Lang.bind(this, this._onNewAppKeyPress));
      this.hotKeyId = 'launch-app-key-' + number.toString();
    }
  },

  _onAppKeyPress: function _onAppKeyPress() {
    if (this.isFavapp) {
      this.app.open_new_window(-1);
      this._animate();
    } else {
      this._windowHandle(false);
    }
  },

  _onNewAppKeyPress: function _onNewAppKeyPress(number) {
    this.app.open_new_window(-1);
    log(this.getId());
    this._animate();
  },

  _windowHandle: function _windowHandle(fromDrag) {
    var has_focus = this.lastFocused.has_focus();
    if (!this.lastFocused.minimized && !has_focus) {
      this.lastFocused.foreach_transient(function (child) {
        if (!child.minimized && child.has_focus()) {
          has_focus = true;
        }
      });
    }
    if (has_focus) {
      if (fromDrag) {
        return;
      }
      this.lastFocused.minimize(global.get_current_time());
      this.actor.remove_style_pseudo_class('focus');
    } else {
      if (this.lastFocused.minimized) {
        this.lastFocused.unminimize(global.get_current_time());
      }
      var ws = this.lastFocused.get_workspace().index();
      if (ws != global.screen.get_active_workspace_index()) {
        global.screen.get_workspace_by_index(ws).activate(global.get_current_time());
      }
      Main.activateWindow(this.lastFocused, global.get_current_time());
      this.actor.add_style_pseudo_class('focus');
      // this._removeAlerts(this.metaWindow)
    }
  },
  _getLastFocusedWindow: function _getLastFocusedWindow() {
    // Get a list of windows and sort it in order of last access
    var list = [];
    for (var win in this.metaWindows) {
      list.push([this.metaWindows[win].win.user_time, this.metaWindows[win].win]);
    }
    list.sort(function (a, b) {
      return a[0] - b[0];
    });

    if (list[0]) return list[0][1];else return null;
  },

  // updates the internal list of metaWindows
  // to include all windows corresponding to this.app on the workspace
  // metaWorkspace
  _updateMetaWindows: function _updateMetaWindows(metaWorkspace) {
    var _this = this;

    var tracker = Cinnamon.WindowTracker.get_default();
    // Get a list of all interesting windows that are part of this app on the current workspace
    var windowList = metaWorkspace.list_windows().filter(Lang.bind(this, function (metaWindow) {
      try {
        var app = AppFromWMClass(this.appList._appsys, this.appList.specialApps, metaWindow);
        if (!app) app = tracker.get_window_app(metaWindow);
        return app == this.app && tracker.is_window_interesting(metaWindow) && Main.isInteresting(metaWindow);
      } catch (e) {
        log(e.name + ': ' + e.message);
        return false;
      }
    }));
    this.metaWindows = {};
    windowList.forEach(function (win) {
      _this._windowAdded(metaWorkspace, win);
    });

    // When we first populate we need to decide which window
    // will be triggered when the app button is pressed
    if (!this.lastFocused) {
      this.lastFocused = this._getLastFocusedWindow();
    }
    if (this.lastFocused) {
      this._windowTitleChanged(this.lastFocused);
      this.rightClickMenu.setMetaWindow(this.lastFocused);
    }
  },

  _windowAdded: function _windowAdded(metaWorkspace, metaWindow) {
    var tracker = Cinnamon.WindowTracker.get_default();
    var app = AppFromWMClass(this.appList._appsys, this.appList.specialApps, metaWindow);
    if (!app) app = tracker.get_window_app(metaWindow);
    if (app == this.app && !this.metaWindows[metaWindow] && tracker.is_window_interesting(metaWindow)) {
      if (metaWindow) {
        this.lastFocused = metaWindow;
        this.rightClickMenu.setMetaWindow(this.lastFocused);
        this.hoverMenu.setMetaWindow(this.lastFocused);
      }
      var signals = [];
      this._applet.settings.connect('changed::title-display', Lang.bind(this, function () {
        this.on_title_display_changed(metaWindow);
        this._windowTitleChanged(metaWindow);
      }));
      signals.push(metaWindow.connect('notify::title', Lang.bind(this, this._windowTitleChanged)));
      signals.push(metaWindow.connect('notify::appears-focused', Lang.bind(this, this._focusWindowChange)));
      var data = {
        signals: signals
      };
      this.metaWindows[metaWindow] = { win: metaWindow, data: data };
      if (this.isFavapp) {
        this._isFavorite(false);
      }
      this._calcWindowNumber(metaWorkspace);
      // log(metaWindow.get_wm_class())
      // log(metaWindow.get_wm_class_instance())
    }
    if (app && app.wmClass && !this.isFavapp) this._calcWindowNumber(metaWorkspace);
  },

  _windowRemoved: function _windowRemoved(metaWorkspace, metaWindow) {
    var deleted = void 0;
    if (this.metaWindows[metaWindow]) deleted = this.metaWindows[metaWindow].data;
    if (deleted) {
      var signals = deleted.signals;
      // Clean up all the signals we've connected
      for (var _i7 = 0; _i7 < signals.length; _i7++) {
        metaWindow.disconnect(signals[_i7]);
      }
      delete this.metaWindows[metaWindow];

      // Make sure we don't leave our appButton hanging!
      // That is, we should no longer display the old app in our title
      var nextWindow = void 0;
      for (var _i8 in this.metaWindows) {
        nextWindow = this.metaWindows[_i8].win;
        break;
      }
      if (nextWindow) {
        this.lastFocused = nextWindow;
        this._windowTitleChanged(this.lastFocused);
        this.hoverMenu.setMetaWindow(this.lastFocused);
        this.rightClickMenu.setMetaWindow(this.lastFocused);
      }
      this._calcWindowNumber(metaWorkspace);
    }
    var tracker = Cinnamon.WindowTracker.get_default();
    var app = AppFromWMClass(this.appList._appsys, this.appList.specialApps, metaWindow);
    if (app && app.wmClass && !this.isFavapp) this._calcWindowNumber(metaWorkspace);
  },

  _windowTitleChanged: function _windowTitleChanged(metaWindow) {
    // We only really want to track title changes of the last focused app
    if (!this._appButton) {
      throw 'Error: got a _windowTitleChanged callback but this._appButton is undefined';
    }
    if (metaWindow != this.lastFocused || this.isFavapp) return;

    var titleType = this._applet.settings.getValue('title-display');
    var _ref2 = [metaWindow.get_title(), this.app.get_name()],
        title = _ref2[0],
        appName = _ref2[1];

    if (titleType == TitleDisplay.Title) {
      if (title) {
        this._appButton.setText(title);
        this.showAppButtonLabel(true);
      }
    } else if (titleType == TitleDisplay.Focused) {
      if (title) {
        this._appButton.setText(title);
        this._updateFocusedStatus(true);
      }
    } else if (titleType == TitleDisplay.App) {
      if (appName) {
        this._appButton.setText(appName);
        this.showAppButtonLabel(true);
      }
    } else if (titleType == TitleDisplay.None) {
      this._appButton.setText('');
    }
  },

  _focusWindowChange: function _focusWindowChange(metaWindow) {
    if (metaWindow.appears_focused) {
      this.lastFocused = metaWindow;
      this._windowTitleChanged(this.lastFocused);
      if (this._applet.sortThumbs == true) this.hoverMenu.setMetaWindow(this.lastFocused);
      this.rightClickMenu.setMetaWindow(this.lastFocused);
    }
    if (this._applet.settings.getValue('title-display') == TitleDisplay.Focused) this._updateFocusedStatus();
  },

  _updateFocusedStatus: function _updateFocusedStatus(force) {
    var changed = false;
    var focusState = void 0;
    for (var win in this.metaWindows) {
      if (this.metaWindows[win].win.appears_focused) {
        focusState = this.metaWindows[win].win;
        break;
      }
    }
    if (this.focusState != focusState || force) this._focusedLabel(focusState);
    this.focusState = focusState;
  },

  _focusedLabel: function _focusedLabel(focusState) {
    if (focusState) {
      this.showAppButtonLabel(true);
    } else {
      this.hideAppButtonLabel(true);
    }
  },

  _isFavorite: function _isFavorite(isFav) {
    this.isFavapp = isFav;
    this.wasFavapp = !isFav;
    this._appButton._isFavorite(isFav);
    this.rightClickMenu.removeItems();
    this.rightClickMenu._isFavorite(isFav);
    this.hoverMenu.appSwitcherItem._isFavorite(isFav);
    this._windowTitleChanged(this.lastFocused);
  },

  _calcWindowNumber: function _calcWindowNumber(metaWorkspace) {
    if (!this._appButton) {
      throw 'Error: got a _calcWindowNumber callback but this._appButton is undefined';
    }
    var windowNum = void 0;
    if (this.app.wmClass) windowNum = metaWorkspace.list_windows().filter(Lang.bind(this, function (win) {
      return this.app.wmClass == win.get_wm_class_instance() && Main.isInteresting(win);
    })).length;else windowNum = this.appList._getNumberOfAppWindowsInWorkspace(this.app, metaWorkspace);
    var numDisplay = this._applet.settings.getValue('number-display');
    this._appButton._numLabel.text = windowNum.toString();
    if (numDisplay == NumberDisplay.Smart) {
      if (windowNum <= 1) this._appButton._numLabel.hide();else this._appButton._numLabel.show();
    } else if (numDisplay == NumberDisplay.Normal) {
      if (windowNum <= 0) this._appButton._numLabel.hide();else this._appButton._numLabel.show();
    } else if (numDisplay == NumberDisplay.All) {
      this._appButton._numLabel.show();
    } else {
      this._appButton._numLabel.hide();
    }
  },

  _animate: function _animate() {
    this.actor.set_z_rotation_from_gravity(0.0, Clutter.Gravity.CENTER);
    Tweener.addTween(this.actor, {
      opacity: 70,
      time: 1.0,
      transition: 'linear',
      onCompleteScope: this,
      onComplete: function onComplete() {
        Tweener.addTween(this.actor, {
          opacity: 255,
          time: 0.5,
          transition: 'linear'
        });
      }
    });
  },

  destroy: function destroy() {
    var _this2 = this;

    var _loop = function _loop(_i9) {
      var metaWindow = _this2.metaWindows[_i9];
      metaWindow.data.signals.forEach(function (s) {
        metaWindow.win.disconnect(s);
      });
    };

    // Unwatch all workspaces before we destroy all our actors
    // that callbacks depend on

    for (var _i9 in this.metaWindows) {
      _loop(_i9);
    }
    this.unwatchWorkspace(null);
    this.rightClickMenu.destroy();
    this.hoverMenu.destroy();
    this._appButton.destroy();
    this.myactor.destroy();
    this.actor.destroy();
    /*this._appButton = null
    this.actor = null
    this.rightClickMenu = null
    this.hoverMenu = null;*/
  }
};
Signals.addSignalMethods(AppGroup.prototype);

// List of running apps

function AppList() {
  this._init.apply(this, arguments);
}

AppList.prototype = {
  _init: function _init(applet, metaWorkspace) {
    this._applet = applet;
    this.metaWorkspace = metaWorkspace;
    this.myactorbox = new SpecialButtons.MyAppletBox(this._applet);
    this.actor = this.myactorbox.actor;
    this._appList = {};
    this._tracker = Cinnamon.WindowTracker.get_default();
    this._appsys = Cinnamon.AppSystem.get_default();
    this.registeredApps = this._getSpecialApps();
    // Connect all the signals
    this._setSignals();
    this._refreshList();
  },

  on_panel_edit_mode_changed: function on_panel_edit_mode_changed() {
    this.actor.reactive = global.settings.get_boolean('panel-edit-mode');
  },

  on_orientation_changed: function on_orientation_changed(orientation) {
    this._refreshList();
    if (this._applet.orientation == St.Side.TOP) {
      this.actor.set_style_class_name('window-list-item-box window-list-box-top');
      this.actor.set_style('margin-top: 0px; padding-top: 0px;');
    } else {
      this.actor.set_style_class_name('window-list-item-box window-list-box-bottom');
      this.actor.set_style('margin-bottom: 0px; padding-bottom: 0px;');
    }
  },

  _setSignals: function _setSignals() {
    this.signals = [];
    // We use connect_after so that the window-tracker time to identify the app
    this.signals.push(this.metaWorkspace.connect_after('window-added', Lang.bind(this, this._windowAdded)));
    this.signals.push(this.metaWorkspace.connect_after('window-removed', Lang.bind(this, this._windowRemoved)));
    this._applet.pinned_app_contr().connect('changed', Lang.bind(this, this._refreshList));
    this._applet.settings.connect('changed::show-pinned', Lang.bind(this, this._refreshList));
    global.settings.connect('changed::panel-edit-mode', Lang.bind(this, this.on_panel_edit_mode_changed));
  },

  // Gets a list of every app on the current workspace
  _refreshApps: function _refreshApps() {
    // For each window, let's make sure we add it!
    this.metaWorkspace.list_windows().forEach(Lang.bind(this, function (win) {
      this._windowAdded(this.metaWorkspace, win);
    }));
  },

  _getSpecialApps: function _getSpecialApps() {
    this.specialApps = {};
    var apps = Gio.app_info_get_all();
    for (var _i10 = 0; _i10 < apps.length; _i10++) {
      var wmClass = apps[_i10].get_startup_wm_class();
      if (wmClass) {
        var id = apps[_i10].get_id();
        this.specialApps[id] = { id: id, wmClass: wmClass };
      }
    }
  },

  _refreshList: function _refreshList() {
    for (var _i11 in this._appList) {
      var list = this._appList[_i11];
      list.appGroup.destroy();
    }
    this._appList = {};
    this.registeredApps = this._getSpecialApps();
    this._loadFavorites();
    this._refreshApps();
  },

  _appGroupNumber: function _appGroupNumber(parentApp) {
    var i = 0;
    for (var l in this._appList) {
      var list = this._appList[l];
      ++i;
      if (list.appGroup.app == parentApp) break;
    }
    return i;
  },

  _refreshAppGroupNumber: function _refreshAppGroupNumber() {
    var i = 0;
    for (var l in this._appList) {
      var list = this._appList[l];
      i = i + 1;
      list.appGroup._newAppKeyNumber(i);
    }
  },

  _windowAdded: function _windowAdded(metaWorkspace, metaWindow, favapp, isFavapp) {
    // Check to see if the window that was added already has an app group.
    // If it does, then we don't need to do anything.  If not, we need to
    // create an app group.
    // let tracker = Cinnamon.WindowTracker.get_default()
    var tracker = this._tracker;
    var app = void 0;
    if (favapp) app = favapp;else app = AppFromWMClass(this._appsys, this.specialApps, metaWindow);
    if (!app) app = tracker.get_window_app(metaWindow);
    if (!app) return;
    if (!this._appList[app]) {
      var appGroup = new AppGroup(this._applet, this, app, isFavapp);
      appGroup._updateMetaWindows(metaWorkspace);
      appGroup.watchWorkspace(metaWorkspace);
      this.actor.add_actor(appGroup.actor);

      app.connect('windows-changed', Lang.bind(this, this._onAppWindowsChanged, app));

      this._appList[app] = {
        appGroup: appGroup
      };
      var appGroupNum = this._appGroupNumber(app);
      appGroup._newAppKeyNumber(appGroupNum);

      if (this._applet.settings.getValue('title-display') == TitleDisplay.Focused) appGroup.hideAppButtonLabel(false);
    }
  },

  _onAppWindowsChanged: function _onAppWindowsChanged(app) {
    var numberOfwindows = this._getNumberOfAppWindowsInWorkspace(app, this.metaWorkspace);
    if (numberOfwindows == 0) {
      this._removeApp(app);
      this._calcAllWindowNumbers();
    }
  },

  _calcAllWindowNumbers: function _calcAllWindowNumbers() {
    for (var l in this._appList) {
      var list = this._appList[l];
      list.appGroup._calcWindowNumber(this.metaWorkspace);
    }
  },

  _getNumberOfAppWindowsInWorkspace: function _getNumberOfAppWindowsInWorkspace(app, workspace) {
    var windows = app.get_windows();

    var result = 0;

    for (var i = 0; i < windows.length; i++) {
      var windowWorkspace = windows[i].get_workspace();
      if (windowWorkspace.index() == workspace.index()) {
        ++result;
      }
    }
    return result;
  },

  _removeApp: function _removeApp(app) {
    // This function may get called multiple times on the same app and so the app may have already been removed
    var appGroup = this._appList[app];
    if (appGroup) {
      if (appGroup.appGroup.wasFavapp || appGroup.appGroup.isFavapp) {
        appGroup.appGroup._isFavorite(true);
        appGroup.appGroup.hideAppButtonLabel(true);
        // have to delay to fix openoffice start-center bug 
        Mainloop.timeout_add(0, Lang.bind(this, this._refreshApps));
        return;
      }
      delete this._appList[app];
      appGroup.appGroup.destroy();
      Mainloop.timeout_add(15, Lang.bind(this, function () {
        this._refreshApps();
        this._refreshAppGroupNumber();
      }));
    }
  },

  _loadFavorites: function _loadFavorites() {
    if (!this._applet.settings.getValue('show-pinned')) return;
    var launchers = this._applet.settings.getValue('pinned-apps');
    for (var _i12 = 0; _i12 < launchers.length; ++_i12) {
      var app = this._appsys.lookup_app(launchers[_i12]);
      if (!app) app = this._appsys.lookup_settings_app(launchers[_i12]);
      if (!app) continue;
      this._windowAdded(this.metaWorkspace, null, app, true);
    }
  },

  _windowRemoved: function _windowRemoved(metaWorkspace, metaWindow) {

    // When a window is closed, we need to check if the app it belongs
    // to has no windows left.  If so, we need to remove the corresponding AppGroup
    // let tracker = Cinnamon.WindowTracker.get_default()
    var tracker = this._tracker;
    var app = AppFromWMClass(this._appsys, this.specialApps, metaWindow);
    if (!app) app = tracker.get_window_app(metaWindow);
    if (!app) return;

    var hasWindowsOnWorkspace = void 0;
    if (app.wmClass) hasWindowsOnWorkspace = metaWorkspace.list_windows().some(function (win) {
      return app.wmClass == win.get_wm_class_instance();
    });else hasWindowsOnWorkspace = app.get_windows().some(function (win) {
      return win.get_workspace() == metaWorkspace;
    });
    if (app && !hasWindowsOnWorkspace) {
      this._removeApp(app);
    }
  },

  destroy: function destroy() {
    this.signals.forEach(Lang.bind(this, function (s) {
      this.metaWorkspace.disconnect(s);
    }));
    for (var _i13 in this._appList) {
      this._appList[_i13].appGroup.destroy();
    }
    this._appList.destroy();
    this._appList = null;
  }
};

// Manages window/app lists and takes care of
// hiding/showing them and manages switching workspaces, etc.

function MyApplet(metadata, orientation, panel_height, instance_id) {
  this._init(metadata, orientation, panel_height, instance_id);
}

MyApplet.prototype = {
  __proto__: Applet.Applet.prototype,

  _init: function _init(metadata, orientation, panel_height, instance_id) {
    Applet.Applet.prototype._init.call(this, orientation, panel_height, instance_id);
    this.actor.set_track_hover(false);
    this.orientation = orientation;
    this.dragInProgress = false;
    try {
      this._uuid = metadata.uuid;
      this.execInstallLanguage();
      Gettext.bindtextdomain(this._uuid, GLib.get_home_dir() + '/.local/share/locale');
      this.settings = new Settings.AppletSettings(this, 'IcingTaskManager@json', instance_id);
      this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL, 'show-pinned', 'showPinned', null, null);
      this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL, 'show-alerts', 'showAlerts', null, null);
      this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL, 'arrange-pinnedApps', 'arrangePinned', null, null);
      this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL, 'enable-hover-peek', 'enablePeek', null, null);
      this.settings.bindProperty(Settings.BindingDirection.IN, 'onclick-thumbnails', 'onclickThumbs', null, null);
      this.settings.bindProperty(Settings.BindingDirection.IN, 'hover-peek-opacity', 'peekOpacity', null, null);
      this.settings.bindProperty(Settings.BindingDirection.IN, 'thumbnail-timeout', 'thumbTimeout', null, null);
      this.settings.bindProperty(Settings.BindingDirection.IN, 'thumbnail-size', 'thumbSize', null, null);
      this.settings.bindProperty(Settings.BindingDirection.IN, 'sort-thumbnails', 'sortThumbs', null, null);
      this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL, 'vertical-thumbnails', 'verticalThumbs', null, null);
      this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL, 'stack-thumbnails', 'stackThumbs', null, null);
      this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL, 'show-thumbnails', 'showThumbs', null, null);
      this.settings.bindProperty(Settings.BindingDirection.IN, 'number-display', 'numDisplay', null, null);
      this.settings.bindProperty(Settings.BindingDirection.IN, 'title-display', 'titleDisplay', null, null);
      this.settings.bindProperty(Settings.BindingDirection.IN, 'icon-padding', 'iconPadding', null, null);
      this.settings.bindProperty(Settings.BindingDirection.IN, 'enable-iconSize', 'enableIconSize', null, null);
      this.settings.bindProperty(Settings.BindingDirection.IN, 'icon-size', 'iconSize', null, null);
      this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL, 'pinned-apps', 'pinnedApps', null, null);
      this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL, 'pinned-recent', 'pinnedRecent', null, null);
      this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL, 'show-recent', 'showRecent', null, null);
      this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL, 'appmenu-width', 'appMenuWidth', null, null);
      this.settings.bindProperty(Settings.BindingDirection.IN, 'firefox-menu', 'firefoxMenu', null, null);
      this.settings.bindProperty(Settings.BindingDirection.IN, 'appmenu-number', 'appMenuNum', null, null);

      this._box = new St.Bin();

      this.actor.add(this._box);

      if (orientation == St.Side.TOP) {
        this.actor.style = 'margin-top: 0px; padding-top: 0px;';
      } else {
        this.actor.style = 'margin-bottom: 0px; padding-bottom: 0px;';
      }

      this.pinnedAppsContr = new PinnedFavs(this);

      this.recentManager = Gtk.RecentManager.get_default();
      this.recentItems = this.recentManager.get_items().sort(function (a, b) {
        return a.get_modified() - b.get_modified();
      }).reverse();
      this.recentManager.connect('changed', Lang.bind(this, this.on_recent_items_changed));

      this.metaWorkspaces = {};

      Main.keybindingManager.addHotKey('move-app-to-next-monitor', '<Shift><Super>Right', Lang.bind(this, this._onMoveToNextMonitor));
      Main.keybindingManager.addHotKey('move-app-to-prev-monitor', '<Shift><Super>Left', Lang.bind(this, this._onMoveToPrevMonitor));

      // Use a signal tracker so we don't have to keep track of all these id's manually!
      //  global.window_manager.connect('switch-workspace', Lang.bind(this, this._onSwitchWorkspace))
      //  global.screen.connect('notify::n-workspaces', Lang.bind(this, this._onWorkspaceCreatedOrDestroyed))
      //  Main.overview.connect('showing', Lang.bind(this, this._onOverviewShow))
      //  Main.overview.connect('hiding', Lang.bind(this, this._onOverviewHide))
      this.signals = new SignalTracker();
      this.signals.connect({
        object: global.window_manager,
        signalName: 'switch-workspace',
        callback: this._onSwitchWorkspace,
        bind: this
      });
      this.signals.connect({
        object: global.screen,
        signalName: 'notify::n-workspaces',
        callback: this._onWorkspaceCreatedOrDestroyed,
        bind: this
      });
      this.signals.connect({
        object: Main.overview,
        signalName: 'showing',
        callback: this._onOverviewShow,
        bind: this
      });
      this.signals.connect({
        object: Main.overview,
        signalName: 'hiding',
        callback: this._onOverviewHide,
        bind: this
      });
      this.signals.connect({
        object: Main.expo,
        signalName: 'showing',
        callback: this._onOverviewShow,
        bind: this
      });
      this.signals.connect({
        object: Main.expo,
        signalName: 'hiding',
        callback: this._onOverviewHide,
        bind: this
      });
      this._onSwitchWorkspace(null, null, global.screen.get_active_workspace_index());

      global.settings.connect('changed::panel-edit-mode', Lang.bind(this, this.on_panel_edit_mode_changed));
    } catch (e) {
      Main.notify('Error', e.message);
      global.logError(e);
    }
  },

  execInstallLanguage: function execInstallLanguage() {
    try {
      var _shareFolder = GLib.get_home_dir() + '/.local/share/';
      var _localeFolder = Gio.file_new_for_path(_shareFolder + 'locale/');
      var _moFolder = Gio.file_new_for_path(_shareFolder + 'cinnamon/applets/' + this._uuid + '/locale/mo/');
      var children = _moFolder.enumerate_children('standard::name,standard::type,time::modified', Gio.FileQueryInfoFlags.NONE, null);
      var info = void 0,
          child = void 0,
          _moFile = void 0,
          _moLocale = void 0,
          _moPath = void 0,
          _src = void 0,
          _dest = void 0,
          _modified = void 0,
          _destModified = void 0;
      while ((info = children.next_file(null)) != null) {
        _modified = info.get_modification_time().tv_sec;
        if (info.get_file_type() == Gio.FileType.REGULAR) {
          _moFile = info.get_name();
          if (_moFile.substring(_moFile.lastIndexOf('.')) == '.mo') {
            _moLocale = _moFile.substring(0, _moFile.lastIndexOf('.'));
            _moPath = _localeFolder.get_path() + '/' + _moLocale + '/LC_MESSAGES/';
            _src = Gio.file_new_for_path(String(_moFolder.get_path() + '/' + _moFile));
            _dest = Gio.file_new_for_path(String(_moPath + this._uuid + '.mo'));
            try {
              if (_dest.query_exists(null)) {
                _destModified = _dest.query_info('time::modified', Gio.FileQueryInfoFlags.NONE, null).get_modification_time().tv_sec;
                if (_modified > _destModified) {
                  _src.copy(_dest, Gio.FileCopyFlags.OVERWRITE, null, null);
                }
              } else {
                this._makeDirectoy(_dest.get_parent());
                _src.copy(_dest, Gio.FileCopyFlags.OVERWRITE, null, null);
              }
            } catch (e) {
              Main.notify('Error', e.message);
              global.logError(e);
            }
          }
        }
      }
    } catch (e) {
      Main.notify('Error', e.message);
      global.logError(e);
    }
  },

  _makeDirectoy: function _makeDirectoy(fDir) {
    if (!this._isDirectory(fDir)) this._makeDirectoy(fDir.get_parent());
    if (!this._isDirectory(fDir)) fDir.make_directory(null);
  },

  _isDirectory: function _isDirectory(fDir) {
    try {
      var info = fDir.query_filesystem_info('standard::type', null);
      if (info && info.get_file_type() != Gio.FileType.DIRECTORY) return true;
    } catch (e) {}
    return false;
  },

  on_applet_clicked: function on_applet_clicked(event) {},

  on_panel_edit_mode_changed: function on_panel_edit_mode_changed() {
    this.actor.reactive = global.settings.get_boolean('panel-edit-mode');
  },

  on_orientation_changed: function on_orientation_changed(orientation) {
    this.orientation = orientation;
    for (var workSpace in this.metaWorkspaces) {
      this.metaWorkspaces[workSpace].appList._refreshList();
    }
    if (orientation == St.Side.TOP) {
      this.actor.set_style('margin-top: 0px; padding-top: 0px;');
    } else {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = this.actor.get_children()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var child = _step.value;
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      this.actor.set_style('margin-bottom: 0px; padding-bottom: 0px;');
    }
  },

  on_panel_height_changed: function on_panel_height_changed() {
    for (var workSpace in this.metaWorkspaces) {
      this.metaWorkspaces[workSpace].appList._refreshList();
    }
  },

  pinned_app_contr: function pinned_app_contr() {
    var pinnedAppsContr = this.pinnedAppsContr;
    return pinnedAppsContr;
  },

  acceptNewLauncher: function acceptNewLauncher(path) {
    this.pinnedAppsContr.addFavorite(path);
  },

  removeLauncher: function removeLauncher(appGroup) {
    // Add code here to remove the launcher if you want.
  },

  recent_items_contr: function recent_items_contr() {
    return this.recentItems;
  },

  recent_items_manager: function recent_items_manager() {
    return this.recentManager;
  },

  _pinnedRecentChanged: function _pinnedRecentChanged() {
    return;
  },

  on_recent_items_changed: function on_recent_items_changed() {
    this.recentItems = this.recentManager.get_items().sort(function (a, b) {
      return a.get_modified() - b.get_modified();
    }).reverse();
  },

  _onWorkspaceCreatedOrDestroyed: function _onWorkspaceCreatedOrDestroyed() {
    var workspaces = [global.screen.get_workspace_by_index(i), each(i in range(global.screen.n_workspaces))];
    // We'd like to know what workspaces in this.metaWorkspaces have been destroyed and
    // so are no longer in the workspaces list.  For each of those, we should destroy them
    var toDelete = [];
    for (var workSpace in this.metaWorkspaces) {
      if (workspaces.indexOf(this.metaWorkspaces[workSpace].ws) == -1) {
        this.metaWorkspaces[workSpace].appList.destroy();
        toDelete.push(this.metaWorkspaces[workSpace].ws);
      }
    }
    for (var _i14 = 0; _i14 < toDelete.length; _i14++) {
      delete this.metaWorkspaces[toDelete[_i14]];
    }
  },

  _onSwitchWorkspace: function _onSwitchWorkspace(winManager, previousWorkspaceIndex, currentWorkspaceIndex) {
    var metaWorkspace = global.screen.get_workspace_by_index(currentWorkspaceIndex);
    // If the workspace we switched to isn't in our list,
    // we need to create an AppList for it
    if (!this.metaWorkspaces[metaWorkspace]) {
      var appList = new AppList(this, metaWorkspace);
      this.metaWorkspaces[metaWorkspace] = {
        ws: metaWorkspace,
        appList: appList
      };
    }

    // this.actor can only have one child, so setting the child
    // will automatically unparent anything that was previously there, which
    // is exactly what we want.
    var list = this.metaWorkspaces[metaWorkspace].appList;
    this._box.set_child(list.actor);
    list._refreshApps();
  },

  _onOverviewShow: function _onOverviewShow() {
    this.actor.hide();
  },

  _onOverviewHide: function _onOverviewHide() {
    this.actor.show();
  },

  _onMoveToNextMonitor: function _onMoveToNextMonitor() {
    this._onMoveToMonitor(1);
  },

  _onMoveToPrevMonitor: function _onMoveToPrevMonitor() {
    this._onMoveToMonitor(-1);
  },

  _onMoveToMonitor: function _onMoveToMonitor(modifier) {
    // Skip when we don't have multiple monitor.
    var monitors = Main.layoutManager.monitors;
    if (monitors.length <= 1) {
      return;
    }
    // Find the window to move.
    var metaWorkspace = global.screen.get_active_workspace();
    var metaWindow = null;
    metaWorkspace.list_windows().forEach(Lang.bind(this, function (win) {
      if (win.appears_focused) {
        metaWindow = win;
      }
    }));
    // Find the new monitor index.
    var monitorIndex = metaWindow.get_monitor();
    monitorIndex += modifier;
    if (monitorIndex < 0) monitorIndex = monitors.length - 1;else if (monitorIndex > monitors.length - 1) monitorIndex = 0;
    log(monitorIndex + '  ' + monitors.length);
    try {
      metaWindow.move_to_monitor(monitorIndex);
    } catch (e) {}
  },

  destroy: function destroy() {
    this.signals.disconnectAll();
    this.actor.destroy();
    this.actor = null;
  }
};

function main(metadata, orientation, panel_height, instance_id) {
  var myApplet = new MyApplet(metadata, orientation, panel_height, instance_id);
  return myApplet;
}