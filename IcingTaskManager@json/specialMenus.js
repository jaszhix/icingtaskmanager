'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/* jshint moz:true */
var Clutter = imports.gi.Clutter;
var Cinnamon = imports.gi.Cinnamon;
var Lang = imports.lang;
var Main = imports.ui.main;
var Mainloop = imports.mainloop;
var Params = imports.misc.params;
var PopupMenu = imports.ui.popupMenu;
var Meta = imports.gi.Meta;
var Util = imports.misc.util;
var St = imports.gi.St;
var Gtk = imports.gi.Gtk;
var Gio = imports.gi.Gio;
var GLib = imports.gi.GLib;
var Gettext = imports.gettext;
var Tweener = imports.ui.tweener;
var Tooltips = imports.ui.tooltips;
var clog = imports.applet.clog;

var AppletDir = imports.ui.appletManager.applets['IcingTaskManager@json'];
var MainApplet = AppletDir.applet;
var SpecialButtons = AppletDir.specialButtons;
var SpecialMenuItems = AppletDir.specialMenuItems;
var FireFox = AppletDir.firefox;

var THUMBNAIL_ICON_SIZE = 16;
var OPACITY_OPAQUE = 255;

var FavType = {
  favorites: 0,
  pinnedApps: 1,
  none: 2
};

function _(str) {
  var resultConf = Gettext.dgettext('IcingTaskManager@json', str);
  if (resultConf != str) {
    return resultConf;
  }
  return Gettext.gettext(str);
}

function AppMenuButtonRightClickMenu() {
  this._init.apply(this, arguments);
}

AppMenuButtonRightClickMenu.prototype = {
  __proto__: PopupMenu.PopupMenu.prototype,

  _init: function _init(parent, actor) {
    var _this = this;

    // take care of menu initialization        
    PopupMenu.PopupMenu.prototype._init.call(this, parent.actor, 0.0, parent.orientation, 0);
    Main.uiGroup.add_actor(this.actor);

    this.actor.hide();
    this.metaWindow = parent.metaWindow;
    this._parentActor = actor;
    this._parentActor.connect('button-release-event', Lang.bind(this, this._onParentActorButtonRelease));

    actor.connect('key-press-event', Lang.bind(this, this._onSourceKeyPress));
    this.connect('open-state-changed', Lang.bind(this, this._onToggled));

    this.orientation = parent.orientation;
    this.app = parent.app;
    this.isFavapp = parent.isFavapp;
    this._applet = parent._applet;
    this.showCloseAll = this._applet.settings.getValue('closeall-menu-item');
    this.AppMenuWidth = this._applet.settings.getValue('appmenu-width');

    var PinnedFavorites = this._applet.pinned_app_contr();

    this.monitorItems = [];
    var monitors = Main.layoutManager.monitors;

    var setupMonitorMoveEvent = function setupMonitorMoveEvent(itemChangeMonitor) {
      itemChangeMonitor.connect('activate', function () {
        _this.metaWindow.move_to_monitor(itemChangeMonitor.index);
      });
    };

    if (monitors.length > 1) {
      for (var i = 0; i < monitors.length; i++) {
        var itemChangeMonitor = new SpecialMenuItems.IconNameMenuItem(this, _('Move to monitor %d').format(i + 1), 'view-fullscreen');
        itemChangeMonitor.index = i;
        setupMonitorMoveEvent(itemChangeMonitor);
        this.monitorItems.push(itemChangeMonitor);
      }
    }

    this.appInfo = this.app.get_app_info();

    // Pause for refresh of SpecialItems.
    this._applet.recentManager.connect('changed', Lang.bind(this, function () {
      Mainloop.timeout_add(15, Lang.bind(this, this._recent_items_changed));
    }));
    this._applet.settings.connect('changed::pinned-recent', Lang.bind(this, this._recent_items_changed));
    this._applet.settings.connect('changed::show-recent', Lang.bind(this, this._recent_items_changed));
    this._applet.settings.connect('changed::appmenu-width', Lang.bind(this, this._appMenu_width_changed));

    this.itemCloseAllWindow = new SpecialMenuItems.IconNameMenuItem(this, _('Close All'), 'window-close');
    this.itemCloseAllWindow.connect('activate', Lang.bind(this, this._onCloseAllActivate));

    this.itemCloseWindow = new SpecialMenuItems.IconNameMenuItem(this, _('Close'), 'window-close');
    this.itemCloseWindow.connect('activate', Lang.bind(this, this._onCloseWindowActivate));

    this.itemMinimizeWindow = new SpecialMenuItems.IconNameMenuItem(this, _('Minimize'));
    this.itemMinimizeWindow.connect('activate', Lang.bind(this, this._onMinimizeWindowActivate));

    this.itemMaximizeWindow = new SpecialMenuItems.IconNameMenuItem(this, _('Maximize'));
    this.itemMaximizeWindow.connect('activate', Lang.bind(this, this._onMaximizeWindowActivate));

    this.itemMoveToLeftWorkspace = new SpecialMenuItems.IconNameMenuItem(this, _('Move to left workspace'), 'back');
    this.itemMoveToLeftWorkspace.connect('activate', Lang.bind(this, this._onMoveToLeftWorkspace));

    this.itemMoveToRightWorkspace = new SpecialMenuItems.IconNameMenuItem(this, _('Move to right workspace'), 'next');
    this.itemMoveToRightWorkspace.connect('activate', Lang.bind(this, this._onMoveToRightWorkspace));

    this.itemOnAllWorkspaces = new SpecialMenuItems.IconNameMenuItem(this, _('Visible on all workspaces'), 'edit-copy');
    this.itemOnAllWorkspaces.connect('activate', Lang.bind(this, this._toggleOnAllWorkspaces));

    this.launchItem = new SpecialMenuItems.IconMenuItem(this, this.app.get_name(), this.app.create_icon_texture(16));
    this.launchItem.connect('activate', Lang.bind(this, function () {
      this.appInfo.launch([], null);
    }));
    // Settings in pinned apps menu
    this._settingsMenu();
    this.specialCont = new SpecialMenuItems.SubSection();
    this.specialCont.box = new St.BoxLayout({
      vertical: true
    });

    this.specialSection = new St.BoxLayout({
      vertical: true
    });
    this.specialCont.box.add(this.specialSection);
    this.specialCont.addActor(this.specialCont.box, {
      span: -1
    });
    this.addSpecialItems();

    this.favs = PinnedFavorites;
    this.favId = this.app.get_id();
    this.isFav = this.favs.isFavorite(this.favId);

    if (this._applet.showPinned != FavType.none) {
      if (this.isFav) {
        this.itemtoggleFav = new SpecialMenuItems.IconNameMenuItem(this, _('Unpin from Panel'), 'remove');
        this.itemtoggleFav.connect('activate', Lang.bind(this, this._toggleFav));
      } else {
        this.itemtoggleFav = new SpecialMenuItems.IconNameMenuItem(this, _('Pin to Panel'), 'bookmark-new');
        this.itemtoggleFav.connect('activate', Lang.bind(this, this._toggleFav));
      }
    }
    if (this.isFavapp) this._isFavorite(true);else this._isFavorite(false);
  },

  _settingsMenu: function _settingsMenu() {
    this.subMenuItem = new SpecialMenuItems.SubMenuItem(this, _('Settings'));
    var subMenu = this.subMenuItem.menu;

    this.reArrange = new SpecialMenuItems.SwitchMenuItem(this, _('ReArrange'), this._applet.arrangePinned);
    this.reArrange.connect('toggled', Lang.bind(this, function (item) {
      this._applet.arrangePinned = item.state;
    }));
    subMenu.addMenuItem(this.reArrange);

    this.showPinned = new SpecialMenuItems.SwitchMenuItem(this, _('Show Pinned'), this._applet.showPinned);
    this.showPinned.connect('toggled', Lang.bind(this, function (item) {
      this._applet.showPinned = item.state;
    }));
    subMenu.addMenuItem(this.showPinned);

    this.showThumbs = new SpecialMenuItems.SwitchMenuItem(this, _('Show Thumbs'), this._applet.showThumbs);
    this.showThumbs.connect('toggled', Lang.bind(this, function (item) {
      this._applet.showThumbs = item.state;
    }));
    subMenu.addMenuItem(this.showThumbs);

    this.stackThumbs = new SpecialMenuItems.SwitchMenuItem(this, _('Stack Thumbs'), this._applet.stackThumbs);
    this.stackThumbs.connect('toggled', Lang.bind(this, function (item) {
      this._applet.stackThumbs = item.state;
    }));
    this.subMenuItem.menu.addMenuItem(this.stackThumbs);

    this.enablePeek = new SpecialMenuItems.SwitchMenuItem(this, _('Hover to Peek'), this._applet.enablePeek);
    this.enablePeek.connect('toggled', Lang.bind(this, function (item) {
      this._applet.enablePeek = item.state;
    }));
    this.subMenuItem.menu.addMenuItem(this.enablePeek);

    this.showRecent = new SpecialMenuItems.SwitchMenuItem(this, _('Show Recent'), this._applet.showRecent);
    this.showRecent.connect('toggled', Lang.bind(this, function (item) {
      this._applet.showRecent = item.state;
    }));
    this.subMenuItem.menu.addMenuItem(this.showRecent);

    this.verticalThumbs = new SpecialMenuItems.SwitchMenuItem(this, _('Vertical Thumbs'), this._applet.verticalThumbs);
    this.verticalThumbs.connect('toggled', Lang.bind(this, function (item) {
      this._applet.verticalThumbs = item.state;
    }));
    this.subMenuItem.menu.addMenuItem(this.verticalThumbs);

    this.settingItem = new SpecialMenuItems.IconNameMenuItem(this, _('   Go to Settings'));
    this.settingItem.connect('activate', Lang.bind(this, this._settingMenu));
    subMenu.addMenuItem(this.settingItem);
  },

  show_recent_changed: function show_recent_changed() {
    if (this._applet.settings.getValue('show-recent')) {
      this.specialCont.actor.show();
      this._recent_items_changed();
    } else {
      this._recent_items_changed();
      this.specialCont.actor.hide();
    }
  },

  _recent_items_changed: function _recent_items_changed() {
    // Hack used the track_hover to force the popup to stay open while removing items
    this.specialCont.actor.track_hover = true;
    var children = this.specialSection.get_children();
    for (var i = 0; i < children.length; i++) {
      this.specialSection.remove_actor(children[i]);
      children[i].destroy();
    }
    this.addSpecialItems();
    this.specialCont.actor.track_hover = false;
  },

  _appMenu_width_changed: function _appMenu_width_changed() {
    this.AppMenuWidth = this._applet.settings.getValue('appmenu-width') || 295;
    var children = this.RecentMenuItems.filter(Lang.bind(this, function (child) {
      if (child instanceof PopupMenu.PopupSeparatorMenuItem) return false;else return true;
    }));
    for (var i = 0; i < children.length; i++) {
      var item = children[i];
      item.table.width = this.AppMenuWidth;
      item.label.width = this.AppMenuWidth - 26;
    }
    children = this.subMenuItem.menu.box.get_children().map(function (actor) {
      return actor._delegate;
    });
    for (var i = 0; i < children.length; i++) {
      var item = children[i];
      item.table.width = this.AppMenuWidth - 14;
      item.label.width = this.AppMenuWidth - 74;
    }
    children = this.box.get_children().map(function (actor) {
      return actor._delegate;
    }).filter(Lang.bind(this, function (child) {
      if (child instanceof SpecialMenuItems.IconNameMenuItem || child instanceof SpecialMenuItems.IconMenuItem || child instanceof SpecialMenuItems.SubMenuItem) return true;else return false;
    }));
    for (var i = 0; i < children.length; i++) {
      var item = children[i];
      item.table.width = this.AppMenuWidth;
      item.label.width = this.AppMenuWidth - 26;
    }
  },

  addSpecialItems: function addSpecialItems() {
    this.RecentMenuItems = [];
    if (!this._applet.showRecent) return;

    // Load Pinned
    var pinnedLength = this._listPinned() || 0;
    // Load Places
    if (this.app.get_id() == 'nemo.desktop' || this.app.get_id() == 'nemo-home.desktop') {
      var defualtPlaces = this._listDefaultPlaces();
      var bookmarks = this._listBookmarks();
      var devices = this._listDevices();
      var places = defualtPlaces.concat(bookmarks).concat(devices);
      for (var i = 0; i < places.length; i++) {
        var item = new SpecialMenuItems.PlaceMenuItem(this, places[i]);
        this.specialSection.add(item.actor);
        this.RecentMenuItems.push(item);
      }
      return;
    } else if (this.app.get_id() == 'firefox.desktop' || this.app.get_id() == 'firefox web browser.desktop') {
      var historys = FireFox.getFirefoxHistory(this._applet);

      if (historys === null) {
        var install = new SpecialMenuItems.IconNameMenuItem(this, _('Install Gda'));
        install.connect('activate', Lang.bind(this, function () {
          Util.spawnCommandLine('gnome-terminal -x bash -c "sudo apt-get install gir1.2-gda-5.0; echo "press enter and restart cinnamon"; read n1"');
        }));
        this.addActor(install.actor);
      } else if (historys.length) {
        try {
          historys.length = historys.length;
          for (var i = 0; i < historys.length; i++) {
            var history = historys[i];
            if (this.pinnedItemsUris.indexOf(history.uri) != -1) continue;
            var item = new SpecialMenuItems.FirefoxMenuItem(this, history);
            this.specialSection.add(item.actor);
            this.RecentMenuItems.push(item);
          }
        } catch (e) {}
      }
      this._loadActions();
      return;
    }
    // Load Recent Items
    this._listRecent(pinnedLength);
    // Load Actions
    this._loadActions();
  },

  _loadActions: function _loadActions() {
    if (!this.appInfo) return;
    var actions;
    try {
      actions = this.appInfo.list_actions();
    } catch (e) {
      log('Error:  This version of cinnamon does not support actions.');
      return;
    }
    if (actions.length && this.RecentMenuItems.length) {
      var seperator = new PopupMenu.PopupSeparatorMenuItem();
      this.specialSection.add(seperator.actor);
      this.RecentMenuItems.push(seperator);
    }
    for (var i = 0; i < actions.length; i++) {
      var action = actions[i];
      var actionItem = new SpecialMenuItems.IconNameMenuItem(this, this.appInfo.get_action_name(action), 'window-new');
      actionItem.connect('activate', Lang.bind(this, function () {
        this.appInfo.launch_action(action, global.create_app_launch_context());
        this.toggle();
      }));
      this.specialSection.add(actionItem.actor);
      this.RecentMenuItems.push(actionItem);
    }
  },

  _listPinned: function _listPinned(pattern) {
    this.pinnedItemsUris = [];
    var pinnedRecent = this._applet.pinnedRecent;
    var appName = this.app.get_name();
    var pinnedLength;
    if (pinnedRecent[appName]) {
      this.pinnedItems = pinnedRecent[appName].infos;
      pinnedLength = Object.keys(this.pinnedItems).length;
    }
    if (this.pinnedItems) {
      for (var i in this.pinnedItems) {
        var item = this.pinnedItems[i];
        // log(item.title)
        var recentMenuItem;
        if (item.title) recentMenuItem = new SpecialMenuItems.PinnedRecentItem(this, item.uri, 'list-remove', item.title);else recentMenuItem = new SpecialMenuItems.PinnedRecentItem(this, item.uri, 'list-remove');
        this.specialSection.add(recentMenuItem.actor);
        this.pinnedItemsUris.push(recentMenuItem.uri);
        this.RecentMenuItems.push(recentMenuItem);
      }
    }
    return pinnedLength;
  },

  _listRecent: function _listRecent(pinnedLength) {
    var recentItems = this._applet.recent_items_contr();
    var items = [];
    for (var id = 0; id < recentItems.length; id++) {
      var itemInfo = recentItems[id];
      var mimeType = itemInfo.get_mime_type();
      var appInfo = Gio.app_info_get_default_for_type(mimeType, false);
      if (appInfo && this.appInfo && appInfo.get_id() == this.appInfo.get_id() && this.pinnedItemsUris.indexOf(itemInfo.get_uri()) == -1) items.push(itemInfo);
    }
    var itemsLength = items.length;
    var num = this._applet.appMenuNum - pinnedLength;
    if (itemsLength > num) itemsLength = num;
    for (var i = 0; i < itemsLength; i++) {
      var item = items[i];
      var recentMenuItem = new SpecialMenuItems.RecentMenuItem(this, item, 'list-add');
      this.specialSection.add(recentMenuItem.actor);
      this.RecentMenuItems.push(recentMenuItem);
    }
  },

  _listDefaultPlaces: function _listDefaultPlaces(pattern) {
    var defaultPlaces = Main.placesManager.getDefaultPlaces();
    var res = [];
    for (var id = 0; id < defaultPlaces.length; id++) {
      if (!pattern || defaultPlaces[id].name.toLowerCase().indexOf(pattern) != -1) res.push(defaultPlaces[id]);
    }
    return res;
  },

  _listBookmarks: function _listBookmarks(pattern) {
    var bookmarks = Main.placesManager.getBookmarks();
    var res = [];
    for (var id = 0; id < bookmarks.length; id++) {
      if (!pattern || bookmarks[id].name.toLowerCase().indexOf(pattern) != -1) res.push(bookmarks[id]);
    }
    return res;
  },

  _listDevices: function _listDevices(pattern) {
    var devices = Main.placesManager.getMounts();
    var res = [];
    for (var id = 0; id < devices.length; id++) {
      if (!pattern || devices[id].name.toLowerCase().indexOf(pattern) != -1) res.push(devices[id]);
    }
    return res;
  },

  _isFavorite: function _isFavorite(isFav) {
    var showFavs = this._applet.showPinned;
    if (isFav) {
      this.box.add(this.subMenuItem.menu.actor);
      this.addMenuItem(this.subMenuItem);
      this._connectSubMenuSignals(this.subMenuItem, this.subMenuItem.menu);
      this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      if (this.RecentMenuItems.length) {
        this.box.add(this.specialCont.actor);
      }
      this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      this.addMenuItem(this.launchItem);
      this.addMenuItem(this.itemtoggleFav);
      this.isFavapp = true;
    } else if (this.orientation == St.Side.BOTTOM) {
      if (this.monitorItems.length) {
        this.monitorItems.forEach(function (item) {
          this.addMenuItem(item);
        }, this);
        this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      }
      this.addMenuItem(this.itemOnAllWorkspaces);
      this.addMenuItem(this.itemMoveToLeftWorkspace);
      this.addMenuItem(this.itemMoveToRightWorkspace);
      this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      if (this.RecentMenuItems.length) {
        this.box.add(this.specialCont.actor);
      }
      this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      this.addMenuItem(this.launchItem);
      if (showFavs) this.addMenuItem(this.itemtoggleFav);else this.addMenuItem(this.settingItem);
      // this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem())
      // this.addMenuItem(this.itemMinimizeWindow)
      // this.addMenuItem(this.itemMaximizeWindow)
      this.addMenuItem(this.itemCloseWindow);
      if (this.showCloseAll) {
        this.addMenuItem(this.itemCloseAllWindow);
      }
      this.isFavapp = false;
    } else {
      this.addMenuItem(this.itemCloseWindow);
      if (this.showCloseAll) {
        this.addMenuItem(this.itemCloseAllWindow);
      }
      // this.addMenuItem(this.itemMaximizeWindow)
      // this.addMenuItem(this.itemMinimizeWindow)
      // this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem())
      if (showFavs) this.addMenuItem(this.itemtoggleFav);else this.addMenuItem(this.settingItem);
      this.addMenuItem(this.launchItem);
      this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      if (this.RecentMenuItems.length) {
        this.box.add(this.specialCont.actor);
      }
      this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      this.addMenuItem(this.itemMoveToLeftWorkspace);
      this.addMenuItem(this.itemMoveToRightWorkspace);
      this.addMenuItem(this.itemOnAllWorkspaces);
      if (this.monitorItems.length) {
        this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.monitorItems.forEach(function (item) {
          this.addMenuItem(item);
        }, this);
      }
      this.isFavapp = false;
    }
  },

  _onParentActorButtonRelease: function _onParentActorButtonRelease(actor, event) {
    if (event.get_state() & Clutter.ModifierType.BUTTON1_MASK) {
      if (this.isOpen) {
        this.toggle();
      }
    } else if (event.get_state() & Clutter.ModifierType.BUTTON2_MASK) {
      this.close(false);
    } else if (event.get_state() & Clutter.ModifierType.BUTTON3_MASK && !global.settings.get_boolean('panel-edit-mode')) {
      this.mouseEvent = event;
      this.toggle();
    }
  },

  _onToggled: function _onToggled(actor, event) {
    if (!event || !this.metaWindow || !this.metaWindow.get_workspace()) return;

    if (this.metaWindow.is_on_all_workspaces()) {
      this.itemOnAllWorkspaces.label.text = _('Only on this workspace');
      this.itemMoveToLeftWorkspace.actor.hide();
      this.itemMoveToRightWorkspace.actor.hide();
    } else {
      this.itemOnAllWorkspaces.label.text = _('Visible on all workspaces');
      if (this.metaWindow.get_workspace().get_neighbor(Meta.MotionDirection.LEFT) != this.metaWindow.get_workspace()) this.itemMoveToLeftWorkspace.actor.show();else this.itemMoveToLeftWorkspace.actor.hide();

      if (this.metaWindow.get_workspace().get_neighbor(Meta.MotionDirection.RIGHT) != this.metaWindow.get_workspace()) this.itemMoveToRightWorkspace.actor.show();else this.itemMoveToRightWorkspace.actor.hide();
    }
    if (this.metaWindow.get_maximized()) {
      this.itemMaximizeWindow.label.text = _('Unmaximize');
    } else {
      this.itemMaximizeWindow.label.text = _('Maximize');
    }
    if (this.metaWindow.minimized) this.itemMinimizeWindow.label.text = _('Restore');else this.itemMinimizeWindow.label.text = _('Minimize');
  },

  _onWindowMinimized: function _onWindowMinimized(actor, event) {},

  _onCloseAllActivate: function _onCloseAllActivate(actor, event) {
    var workspace = this.metaWindow.get_workspace();
    var windows;
    if (this.app.wmClass) windows = metaWorkspace.list_windows().filter(Lang.bind(this, function (win) {
      return this.app.wmClass == win.get_wm_class_instance();
    }));else windows = this.app.get_windows();
    for (var i = 0; i < windows.length; i++) {
      windows[i].delete(global.get_current_time());
    }
  },

  _onCloseWindowActivate: function _onCloseWindowActivate(actor, event) {
    this.metaWindow.delete(global.get_current_time());
    // this.destroy()
  },

  _onMinimizeWindowActivate: function _onMinimizeWindowActivate(actor, event) {
    if (this.metaWindow.minimized) {
      this.metaWindow.unminimize(global.get_current_time());
      Main.activateWindow(this.metaWindow, global.get_current_time());
    } else {
      this.metaWindow.minimize(global.get_current_time());
    }
  },

  _onMaximizeWindowActivate: function _onMaximizeWindowActivate(actor, event) {
    if (this.metaWindow.get_maximized()) {
      this.metaWindow.unmaximize(Meta.MaximizeFlags.HORIZONTAL | Meta.MaximizeFlags.VERTICAL);
    } else {
      this.metaWindow.maximize(Meta.MaximizeFlags.HORIZONTAL | Meta.MaximizeFlags.VERTICAL);
    }
  },

  _onMoveToLeftWorkspace: function _onMoveToLeftWorkspace(actor, event) {
    var workspace = this.metaWindow.get_workspace().get_neighbor(Meta.MotionDirection.LEFT);
    if (workspace) {
      // this.actor.destroy()
      this.metaWindow.change_workspace(workspace);
      Main._checkWorkspaces();
    }
  },

  _onMoveToRightWorkspace: function _onMoveToRightWorkspace(actor, event) {
    var workspace = this.metaWindow.get_workspace().get_neighbor(Meta.MotionDirection.RIGHT);
    if (workspace) {
      // this.actor.destroy()
      this.metaWindow.change_workspace(workspace);
      Main._checkWorkspaces();
    }
  },

  _toggleOnAllWorkspaces: function _toggleOnAllWorkspaces(actor, event) {
    if (this.metaWindow.is_on_all_workspaces()) this.metaWindow.unstick();else this.metaWindow.stick();
  },

  _toggleFav: function _toggleFav(actor, event) {
    if (this.isFav) {
      // this.close(false)
      this.favs.removeFavorite(this.favId);
    } else {
      // this.close(false)
      this.favs.addFavorite(this.favId);
    }
  },

  _settingMenu: function _settingMenu() {
    Util.spawnCommandLine('cinnamon-settings applets IcingTaskManager@json');
  },

  removeItems: function removeItems() {
    this.blockSourceEvents = true;
    var children = this._getMenuItems();
    for (var i = 0; i < children.length; i++) {
      var item = children[i];
      this.box.remove_actor(item.actor);
    }
    this.blockSourceEvents = false;
  },

  destroy: function destroy() {
    var items = this.RecentMenuItems;
    for (var i = 0; i < items.length; i++) {
      items[i].destroy();
    }
    var children = this.subMenuItem.menu._getMenuItems();
    for (var i = 0; i < children.length; i++) {
      var item = children[i];
      this.box.remove_actor(item.actor);
      item.destroy();
    }
    this.subMenuItem.menu.destroy();
    children = this._getMenuItems();
    for (var i = 0; i < children.length; i++) {
      var item = children[i];
      // this.box.remove_actor(item.actor)
      // item.destroy()
    }
    this.box.destroy();
    this.actor.destroy();
  },

  _onSourceKeyPress: function _onSourceKeyPress(actor, event) {
    var symbol = event.get_key_symbol();
    if (symbol == Clutter.KEY_space || symbol == Clutter.KEY_Return) {
      this.menu.toggle();
      return true;
    } else if (symbol == Clutter.KEY_Escape && this.menu.isOpen) {
      this.menu.close();
      return true;
    } else if (symbol == Clutter.KEY_Down) {
      if (!this.menu.isOpen) this.menu.toggle();
      this.menu.actor.navigate_focus(this.actor, Gtk.DirectionType.DOWN, false);
      return true;
    } else return false;
  },

  setMetaWindow: function setMetaWindow(metaWindow) {
    this.metaWindow = metaWindow;
  }
};

function HoverMenuController(owner) {
  this._init(owner);
}

HoverMenuController.prototype = {
  __proto__: PopupMenu.PopupMenuManager.prototype,

  _onEventCapture: function _onEventCapture(actor, event) {
    return false;
  }
};

function AppThumbnailHoverMenu() {
  this._init.apply(this, arguments);
}

AppThumbnailHoverMenu.prototype = {
  __proto__: PopupMenu.PopupMenu.prototype,

  _init: function _init(parent) {
    PopupMenu.PopupMenu.prototype._init.call(this, parent.actor, 0.45, parent.orientation);
    this._applet = parent._applet;
    this.metaWindow = parent.metaWindow;
    this.app = parent.app;
    this.isFavapp = parent.isFavapp;
    // need to impliment this class or cinnamon outputs a bunch of errors
    this.actor.style_class = 'hide-arrow';

    this.box.style_class = 'thumbnail-popup-content';

    this.actor.hide();
    this.parentActor = parent.actor;

    Main.layoutManager.addChrome(this.actor, this.orientation);

    this.appSwitcherItem = new PopupMenuAppSwitcherItem(this);
    this.addMenuItem(this.appSwitcherItem);

    this.parentActor.connect('enter-event', Lang.bind(this, this._onEnter));
    this.parentActor.connect('leave-event', Lang.bind(this, this._onLeave));
    this.parentActor.connect('button-release-event', Lang.bind(this, this._onButtonPress));

    this.actor.connect('enter-event', Lang.bind(this, this._onMenuEnter));
    this.actor.connect('leave-event', Lang.bind(this, this._onMenuLeave));

    // this.actor.connect('button-release-event', Lang.bind(this, this._onButtonPress))
    this._applet.settings.connect('thumbnail-timeout', Lang.bind(this, function () {
      this.hoverTime = this._applet.settings.getValue('thumbnail-timeout');
    }));
    this.hoverTime = this._applet.settings.getValue('thumbnail-timeout');
  },

  _onButtonPress: function _onButtonPress(actor, event) {
    if (this._applet.onclickThumbs && this.appSwitcherItem.appContainer.get_children().length > 1) return;
    this.shouldOpen = false;
    this.shouldClose = true;
    Mainloop.timeout_add(this.hoverTime, Lang.bind(this, this.hoverClose));
  },

  _onMenuEnter: function _onMenuEnter() {
    this.shouldOpen = true;
    this.shouldClose = false;

    Mainloop.timeout_add(this.hoverTime, Lang.bind(this, this.hoverOpen));
  },

  _onMenuLeave: function _onMenuLeave() {
    this.shouldOpen = false;
    this.shouldClose = true;
    Mainloop.timeout_add(this.hoverTime, Lang.bind(this, this.hoverClose));
  },

  _onEnter: function _onEnter() {
    this.shouldOpen = true;
    this.shouldClose = false;

    Mainloop.timeout_add(this.hoverTime, Lang.bind(this, this.hoverOpen));
  },

  _onLeave: function _onLeave() {
    this.shouldClose = true;
    this.shouldOpen = false;

    Mainloop.timeout_add(this.hoverTime, Lang.bind(this, this.hoverClose));
  },

  hoverOpen: function hoverOpen() {
    if (this.shouldOpen && !this.isOpen) {
      this.open(true);
    }
  },

  hoverClose: function hoverClose() {
    if (this.shouldClose) {
      this.close(true);
    }
  },

  open: function open(animate) {
    // Refresh all the thumbnails, etc when the menu opens.  These cannot
    // be created when the menu is initalized because a lot of the clutter window surfaces
    // have not been created yet...
    this.appSwitcherItem._refresh();
    this.appSwitcherItem.actor.show();
    PopupMenu.PopupMenu.prototype.open.call(this, animate);
  },

  close: function close(animate) {
    PopupMenu.PopupMenu.prototype.close.call(this, animate);
    this.appSwitcherItem.actor.hide();
  },

  destroy: function destroy() {
    var children = this._getMenuItems();
    for (var i = 0; i < children.length; i++) {
      var item = children[i];
      this.box.remove_actor(item.actor);
      item.actor.destroy();
    }
    this.box.destroy();
    this.actor.destroy();
  },

  setMetaWindow: function setMetaWindow(metaWindow) {
    this.metaWindow = metaWindow;
    this.appSwitcherItem.setMetaWindow(metaWindow);
  }
};

// display a list of app thumbnails and allow
// bringing any app to focus by clicking on its thumbnail

function PopupMenuAppSwitcherItem() {
  this._init.apply(this, arguments);
}

PopupMenuAppSwitcherItem.prototype = {
  __proto__: PopupMenu.PopupBaseMenuItem.prototype,

  _init: function _init(parent, params) {
    params = Params.parse(params, {
      hover: false,
      activate: false
    });
    PopupMenu.PopupBaseMenuItem.prototype._init.call(this, params);

    this._applet = parent._applet;
    this.metaWindow = parent.metaWindow;
    this.app = parent.app;
    this.isFavapp = parent.isFavapp;
    this._parentContainer = parent;
    this.metaWindows = {};
    this.actor.style_class = '';

    this.box = new St.BoxLayout();
    this.box1 = new St.BoxLayout();
    this.box2 = new St.BoxLayout();
    this.box3 = new St.BoxLayout();

    this.appContainer = new St.BoxLayout({
      style_class: 'switcher-list'
    });
    // this.appContainer.style = "padding: 5px;"
    this.appContainer.add_style_class_name('thumbnail-row');

    this.appContainer2 = new St.BoxLayout({
      style_class: 'switcher-list'
    });

    // this.appContainer2.style = "padding: 5px;"
    this.appContainer2.add_style_class_name('thumbnail-row');
    this.appContainer2.hide();

    this.appContainer3 = new St.BoxLayout({
      style_class: 'switcher-list'
    });

    // this.appContainer3.style = "padding: 5px;"
    this.appContainer3.add_style_class_name('thumbnail-row');
    this.appContainer3.hide();

    this.appThumbnails = {};
    this.appThumbnails2 = {};
    this.appThumbnails3 = {};

    this._applet.settings.connect('changed::vertical-thumbnails', Lang.bind(this, this._setVerticalSetting));
    this._applet.settings.connect('changed::stack-thumbnails', Lang.bind(this, this._setStackThumbnailsSetting));
    this._setVerticalSetting();
    this.addActor(this.box);

    this._refresh();
  },

  _setVerticalSetting: function _setVerticalSetting() {
    var vertical = this._applet.settings.getValue('vertical-thumbnails');
    if (vertical) {
      if (this.box.get_children().length > 0) {
        this.box.remove_actor(this.appContainer3);
        this.box.remove_actor(this.appContainer2);
        this.box.remove_actor(this.appContainer);
        this.box.add_actor(this.appContainer);
        this.box.add_actor(this.appContainer2);
        this.box.add_actor(this.appContainer3);
      } else {
        this.box.add_actor(this.appContainer);
        this.box.add_actor(this.appContainer2);
        this.box.add_actor(this.appContainer3);
      }
    } else {
      if (this.box.get_children().length > 0) {
        this.box.remove_actor(this.appContainer3);
        this.box.remove_actor(this.appContainer2);
        this.box.remove_actor(this.appContainer);
        this.box.add_actor(this.appContainer3);
        this.box.add_actor(this.appContainer2);
        this.box.add_actor(this.appContainer);
      } else {
        this.box.add_actor(this.appContainer3);
        this.box.add_actor(this.appContainer2);
        this.box.add_actor(this.appContainer);
      }
    }
    this.appContainer.vertical = vertical;
    this.appContainer2.vertical = vertical;
    this.appContainer3.vertical = vertical;
    this.box.vertical = !vertical;
  },

  _setStackThumbnailsSetting: function _setStackThumbnailsSetting() {
    function removeChildren(parent, children) {
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        parent.remove_actor(child);
      }
      parent.hide();
    }
    var children = this.appContainer.get_children();
    var children2 = this.appContainer2.get_children();
    var children3 = this.appContainer3.get_children();
    removeChildren(this.appContainer, children);
    removeChildren(this.appContainer2, children2);
    removeChildren(this.appContainer3, children3);
    this.reAdd = true;
  },

  setMetaWindow: function setMetaWindow(metaWindow) {
    this.metaWindow = metaWindow;
  },

  _isFavorite: function _isFavorite(isFav) {
    if (isFav) {
      this.isFavapp = true;
    } else {
      this.isFavapp = false;
    }
  },

  getMetaWindows: function getMetaWindows() {
    if (this.metaWindow) this.metaWorkspace = this.metaWindow.get_workspace();else if (!this.metaWorkspace) return {};
    var windows;
    if (this.app.wmClass && metaWorkspace) windows = this.metaWorkspace.list_windows().filter(Lang.bind(this, function (win) {
      return this.app.wmClass == win.get_wm_class_instance();
    })).reverse();else windows = this.app.get_windows().filter(Lang.bind(this, function (win) {
      // var isDifferent = (win != this.metaWindow)
      var isSameWorkspace = win.get_workspace() == this.metaWorkspace && Main.isInteresting(win);
      return isSameWorkspace;
    })).reverse();
    return windows;
  },

  _refresh: function _refresh() {
    // Check to see if this.metaWindow has changed.  If so, we need to recreate
    // our thumbnail, etc.
    // Get a list of all windows of our app that are running in the current workspace
    var windows = this.getMetaWindows();

    if (this.metaWindowThumbnail && this.metaWindowThumbnail.needs_refresh()) this.metaWindowThumbnail = null;
    if (this.metaWindowThumbnail && this.metaWindowThumbnail.metaWindow == this.metaWindow) {
      this.metaWindowThumbnail._isFavorite(this.isFavapp);
    } else {
      if (this.metaWindowThumbnail) {
        this.metaWindowThumbnail.destroy();
      }
      // If our metaWindow is null, just move along
      if (this.isFavapp) {
        this.metaWindowThumbnail = new WindowThumbnail(this, this.metaWindow);
        this.appContainer.insert_actor(this.metaWindowThumbnail.actor, 0);
        Mainloop.timeout_add(0, Lang.bind(this, function () {
          this.setStyleOptions(null);
        }));
        // Update appThumbnails to remove old programs
        this.removeOldWindows(windows);
        return;
      }
    }
    // Update appThumbnails to include new programs
    this.addNewWindows(windows);
    // Update appThumbnails to remove old programs
    this.removeOldWindows(windows);
    // Set to true to readd the thumbnails; used for the sorting by last focused 
    this.reAdd = false;
    // used to make sure everything is on the stage
    Mainloop.timeout_add(0, Lang.bind(this, function () {
      this.setStyleOptions(windows);
    }));
  },
  addNewWindows: function addNewWindows(windows) {
    var ThumbnailWidth = Math.floor(Main.layoutManager.primaryMonitor.width / 70 * this._applet.thumbSize) + 16;
    var ThumbnailHeight = Math.floor(Main.layoutManager.primaryMonitor.height / 70 * this._applet.thumbSize) + 16;
    if (!this._applet.showThumbs) ThumbnailHeight /= 3;

    var moniterSize, thumbnailSize;
    if (this._applet.settings.getValue('vertical-thumbnails')) {
      moniterSize = Main.layoutManager.primaryMonitor.height;
      thumbnailSize = ThumbnailHeight;
    } else {
      moniterSize = Main.layoutManager.primaryMonitor.width;
      thumbnailSize = ThumbnailWidth;
    }
    if (thumbnailSize * windows.length + thumbnailSize >= moniterSize && this._applet.settings.getValue('stack-thumbnails')) {
      this.thumbnailsSpace = Math.floor((moniterSize - 100) / thumbnailSize);
      var firstLoop = this.thumbnailsSpace;
      var nextLoop = firstLoop + this.thumbnailsSpace;
      if (windows.length < firstLoop) firstLoop = windows.length;
      this.addWindowsLoop(0, firstLoop, this.appContainer, windows, 1);
      if (windows.length > nextLoop) {
        this.addWindowsLoop(firstLoop, nextLoop, this.appContainer2, windows, 2);
      } else if (windows.length > firstLoop) this.addWindowsLoop(firstLoop, windows.length, this.appContainer2, windows, 2);
      if (windows.length > nextLoop) this.addWindowsLoop(nextLoop, windows.length, this.appContainer3, windows, 3);
    } else {
      this.addWindowsLoop(0, windows.length, this.appContainer, windows, 1);
    }
  },

  addWindowsLoop: function addWindowsLoop(i, winLength, actor, windows, containerNum) {
    if (this._applet.sortThumbs && windows.length > 0) {
      var children = actor.get_children();
      for (var w = 0; w < children.length; w++) {
        actor.remove_actor(children[w]);
      }
      windows.sort(function (a, b) {
        return a.user_time - b.user_time;
      });
      this.reAdd = true;
    }
    for (i; i < winLength; i++) {
      var metaWindow = windows[i];
      if (this.appThumbnails[metaWindow]) {
        this.appThumbnails[metaWindow].thumbnail._isFavorite(this.isFavapp);
        if (this.reAdd) {
          if (this._applet.sortThumbs) actor.insert_actor(this.appThumbnails[metaWindow].thumbnail.actor, 0);else actor.add_actor(this.appThumbnails[metaWindow].thumbnail.actor);
        }
      } else {
        var thumbnail = new WindowThumbnail(this, metaWindow);
        this.appThumbnails[metaWindow] = {
          metaWindow: metaWindow,
          thumbnail: thumbnail,
          cont: containerNum
        };
        if (this._applet.sortThumbs) actor.insert_actor(this.appThumbnails[metaWindow].thumbnail.actor, 0);else actor.add_actor(this.appThumbnails[metaWindow].thumbnail.actor);
      }
    }
    actor.show();
  },
  setStyleOptions: function setStyleOptions(windows) {
    this.appContainer.style = null;
    this.box.style = null;
    var thumbnailTheme = this.appContainer.peek_theme_node();
    var padding = thumbnailTheme ? thumbnailTheme.get_horizontal_padding() : null;
    var thumbnailPadding = padding && padding > 1 && padding < 21 ? padding : 10;
    this.appContainer.style = 'padding:' + thumbnailPadding / 2 + 'px';
    this.appContainer2.style = 'padding:' + thumbnailPadding / 2 + 'px';
    this.appContainer3.style = 'padding:' + thumbnailPadding / 2 + 'px';
    var boxTheme = this.box.peek_theme_node();
    padding = boxTheme ? boxTheme.get_vertical_padding() : null;
    var boxPadding = padding && padding > 0 ? padding : 3;
    this.box.style = 'padding:' + boxPadding + 'px;';
    if (this.isFavapp) {
      this.metaWindowThumbnail.thumbnailIconSize();
      return;
    }
    if (windows == null) return;
    var winLength = windows.length;
    for (var i in this.appThumbnails) {
      if (this.appThumbnails[i].thumbnail) {
        this.appThumbnails[i].thumbnail.thumbnailIconSize();
      }
    }
  },

  removeOldWindows: function removeOldWindows(windows) {
    for (var win in this.appThumbnails) {
      if (windows.indexOf(this.appThumbnails[win].metaWindow) == -1) {
        if (this.appThumbnails[win].cont == 1) {
          this.appContainer.remove_actor(this.appThumbnails[win].thumbnail.actor);
        } else if (this.appThumbnails[win].cont == 2) {
          this.appContainer2.remove_actor(this.appThumbnails[win].thumbnail.actor);
        } else if (this.appThumbnails[win].cont == 3) {
          this.appContainer3.remove_actor(this.appThumbnails[win].thumbnail.actor);
        }
        this.appThumbnails[win].thumbnail.destroy();
        delete this.appThumbnails[win];
      }
    }
  },

  refreshRows: function refreshRows() {
    var appContLength = this.appContainer.get_children().length;
    var appContLength2 = this.appContainer2.get_children().length;
    if (appContLength < 1) {
      this._parentContainer.shouldOpen = false;
      this._parentContainer.shouldClose = true;
      this._parentContainer.hoverClose();
    }

    if (appContLength < this.thumbnailsSpace && appContLength2 > 0) {
      var children = this.appContainer2.get_children();
      var thumbsToMove = this.thumbnailsSpace - appContLength;
      for (var i = 0; i < thumbsToMove; i++) {
        var actor = children[i] ? children[i] : null;
        if (actor == null) break;
        this.appContainer2.remove_actor(actor);
        this.appContainer.add_actor(actor);
        this.appThumbnails[actor._delegate.metaWindow].cont = 1;
      }
    }

    appContLength2 = this.appContainer2.get_children().length;
    var appContLength3 = this.appContainer3.get_children().length;

    if (appContLength2 <= 0) this.appContainer2.hide();

    if (appContLength2 < this.thumbnailsSpace && appContLength3 > 0) {
      var children = this.appContainer3.get_children();
      var thumbsToMove = this.thumbnailsSpace - appContLength2;
      for (var i = 0; i < thumbsToMove; i++) {
        var actor = children[i] ? children[i] : null;
        if (actor == null) break;
        this.appContainer3.remove_actor(actor);
        this.appContainer2.add_actor(actor);
        this.appThumbnails[actor._delegate.metaWindow].cont = 2;
      }
    }

    if (this.appContainer3.get_children().length <= 0) this.appContainer3.hide();
  }
};

function WindowThumbnail() {
  this._init.apply(this, arguments);
}

WindowThumbnail.prototype = {
  _init: function _init(parent, metaWindow) {
    var _this2 = this;

    this._applet = parent._applet;
    this.metaWindow = metaWindow || null;
    this.app = parent.app;
    this.isFavapp = parent.isFavapp || false;
    this.wasMinimized = false;
    this._parent = parent;
    this._parentContainer = parent._parentContainer;
    this.thumbnailPadding = 16;

    // Inherit the theme from the alt-tab menu
    this.actor = new St.BoxLayout({
      style_class: 'item-box',
      reactive: true,
      track_hover: true,
      vertical: true
    });
    this.actor._delegate = this;
    // Override with own theme.
    this.actor.add_style_class_name('thumbnail-box');
    this.thumbnailActor = new St.Bin();

    this._container = new St.BoxLayout({
      style_class: 'thumbnail-iconlabel-cont'
    });

    var bin = new St.BoxLayout({
      style_class: 'thumbnail-label-bin'
    });

    this.icon = this.app.create_icon_texture(32);
    this.themeIcon = new St.BoxLayout({
      style_class: 'thumbnail-icon'
    });
    this.themeIcon.add_actor(this.icon);
    this._container.add_actor(this.themeIcon);
    this._label = new St.Label({
      style_class: 'thumbnail-label'
    });
    this._container.add_actor(this._label);
    this.button = new St.BoxLayout({
      style_class: 'thumbnail-close',
      reactive: true
    });
    // this._container.add_actor(this.button)
    this.button.hide();
    bin.add_actor(this._container);
    bin.add_actor(this.button);
    this.actor.add_actor(bin);
    this.actor.add_actor(this.thumbnailActor);

    if (this.isFavapp) this._isFavorite(true);else this._isFavorite(false);

    if (this.metaWindow) {
      this.metaWindow.connect('notify::title', function () {
        _this2._label.text = _this2.metaWindow.get_title();
      });
      this._updateAttentionGrabber(null, null, this._applet.showAlerts);
      this._applet.settings.connect('changed::show-alerts', Lang.bind(this, this._updateAttentionGrabber));
      var tracker = Cinnamon.WindowTracker.get_default();
      this._trackerSignal = tracker.connect('notify::focus-app', Lang.bind(this, this._onFocusChange));
    }
    this.actor.connect('enter-event', function () {
      if (!_this2.isFavapp) {
        var parent = _this2._parent._parentContainer;
        parent.shouldOpen = true;
        parent.shouldClose = false;
        _this2._hoverPeek(_this2._applet.peekOpacity, _this2.metaWindow);
        _this2.actor.add_style_pseudo_class('outlined');
        _this2.actor.add_style_pseudo_class('selected');
        _this2.button.show();
        if (_this2.metaWindow.minimized && _this2._applet.enablePeek) {
          _this2.metaWindow.unminimize();
          if (_this2.metaWindow.is_fullscreen()) _this2.metaWindow.unmaximize(global.get_current_time());
          _this2.wasMinimized = true;
        } else _this2.wasMinimized = false;
      }
    });
    this.actor.connect('leave-event', Lang.bind(this, function () {
      if (!this.isFavapp) {
        this._hoverPeek(OPACITY_OPAQUE, this.metaWindow);
        this.actor.remove_style_pseudo_class('outlined');
        this.actor.remove_style_pseudo_class('selected');
        this.button.hide();
        if (this.wasMinimized) {
          this.metaWindow.minimize(global.get_current_time());
        }
      }
    }));
    this.button.connect('button-release-event', Lang.bind(this, this._onButtonRelease));

    this.actor.connect('button-release-event', Lang.bind(this, this._connectToWindow));
  },

  _updateAttentionGrabber: function _updateAttentionGrabber(obj, oldVal, newVal) {
    if (newVal) {
      this._urgent_signal = global.display.connect('window-marked-urgent', Lang.bind(this, this._onWindowDemandsAttention));
      this._attention_signal = global.display.connect('window-demands-attention', Lang.bind(this, this._onWindowDemandsAttention));
    } else {
      if (this._urgent_signal) {
        global.display.disconnect(this._urgent_signal);
      }
      if (this._attention_signal) {
        global.display.disconnect(this._attention_signal);
      }
    }
  },

  _onWindowDemandsAttention: function _onWindowDemandsAttention(display, window) {
    if (this._needsAttention) return false;
    this._needsAttention = true;
    if (this.metaWindow == window) {
      this.actor.add_style_class_name('thumbnail-alerts');
      return true;
    }
    return false;
  },

  _onFocusChange: function _onFocusChange() {
    if (this._hasFocus()) {
      this.actor.remove_style_class_name('thumbnail-alerts');
    }
  },

  _hasFocus: function _hasFocus() {
    if (this.metaWindow.minimized) return false;

    if (this.metaWindow.has_focus()) return true;

    var transientHasFocus = false;
    this.metaWindow.foreach_transient(function (transient) {
      if (transient.has_focus()) {
        transientHasFocus = true;
        return false;
      }
      return true;
    });
    return transientHasFocus;
  },

  _isFavorite: function _isFavorite(isFav) {
    // Whether we create a favorite tooltip or a window thumbnail
    if (isFav) {
      // this.thumbnailActor.height = 0
      // this.thumbnailActor.width = 0
      this.thumbnailActor.child = null;
      var apptext = this.app.get_name();
      // not sure why it's 7
      this.ThumbnailWidth = THUMBNAIL_ICON_SIZE + Math.floor(apptext.length * 7.0);
      this._label.text = apptext;
      this.isFavapp = true;
      this.actor.style = 'border-width:2px;padding: 2px';
      this._container.style = 'width: ' + this.ThumbnailWidth + 'px';
    } else {
      this.actor.style = null;
      // HACK used to make sure everything is on the stage
      Mainloop.timeout_add(0, Lang.bind(this, function () {
        this.thumbnailPaddingSize();
      }));
      this._refresh();
    }
  },

  destroy: function destroy() {
    if (this._trackerSignal) {
      var tracker = Cinnamon.WindowTracker.get_default();
      tracker.disconnect(this._trackerSignal);
    }
    if (this._urgent_signal) {
      global.display.disconnect(this._urgent_signal);
    }
    if (this._attention_signal) {
      global.display.disconnect(this._attention_signal);
    }
    delete this._parent.appThumbnails[this.metaWindow];
    this.actor.destroy_children();
    this.actor.destroy();
  },

  needs_refresh: function needs_refresh() {
    return Boolean(this.thumbnail);
  },

  thumbnailIconSize: function thumbnailIconSize() {
    var thumbnailTheme = this.themeIcon.peek_theme_node();
    if (thumbnailTheme) {
      var width = thumbnailTheme.get_width();
      var height = thumbnailTheme.get_height();
      this.icon.set_size(width, height);
    }
  },

  thumbnailPaddingSize: function thumbnailPaddingSize() {
    var thumbnailTheme = this.actor.peek_theme_node();
    var padding = thumbnailTheme ? thumbnailTheme.get_horizontal_padding() : null;
    this.thumbnailPadding = padding && padding > 3 && padding < 21 ? padding : 12;
    this.actor.style = 'border-width:2px;padding:' + this.thumbnailPadding / 2 + 'px;';
  },

  _getThumbnail: function _getThumbnail() {
    // Create our own thumbnail if it doesn't exist
    var thumbnail = null;
    var muffinWindow = this.metaWindow.get_compositor_private();
    if (muffinWindow) {
      var windowTexture = muffinWindow.get_texture();

      var _windowTexture$get_si = windowTexture.get_size(),
          _windowTexture$get_si2 = _slicedToArray(_windowTexture$get_si, 2),
          width = _windowTexture$get_si2[0],
          height = _windowTexture$get_si2[1];

      var scale = Math.min(1.0, this.ThumbnailWidth / width, this.ThumbnailHeight / height);
      thumbnail = new Clutter.Clone({
        source: windowTexture,
        reactive: true,
        width: width * scale,
        height: height * scale
      });
    }

    return thumbnail;
  },

  _onButtonRelease: function _onButtonRelease(actor, event) {
    if (event.get_state() & Clutter.ModifierType.BUTTON1_MASK && actor == this.button) {
      this.destroy();
      this.stopClick = true;
      this._hoverPeek(OPACITY_OPAQUE, this.metaWindow);
      this._parentContainer.shouldOpen = false;
      this._parentContainer.shouldClose = true;
      Mainloop.timeout_add(2000, Lang.bind(this._parentContainer, this._parentContainer.hoverClose));
      this.metaWindow.delete(global.get_current_time());
      this._parent.refreshRows();
    }
  },

  _connectToWindow: function _connectToWindow(actor, event) {
    this.wasMinimized = false;
    if (event.get_state() & Clutter.ModifierType.BUTTON1_MASK && !this.stopClick && !this.isFavapp) {
      Main.activateWindow(this.metaWindow, global.get_current_time());
      var parent = this._parent._parentContainer;
      parent.shouldOpen = false;
      parent.shouldClose = true;
      Mainloop.timeout_add(parent.hoverTime, Lang.bind(parent, parent.hoverClose));
    } else if (event.get_state() & Clutter.ModifierType.BUTTON2_MASK && !this.stopClick) {
      this.stopClick = true;
      this.destroy();
      this._hoverPeek(OPACITY_OPAQUE, this.metaWindow);
      this._parentContainer.shouldOpen = false;
      this._parentContainer.shouldClose = true;
      Mainloop.timeout_add(3000, Lang.bind(this._parentContainer, this._parentContainer.hoverClose));
      this.metaWindow.delete(global.get_current_time());
      this._parent.refreshRows();
    }
    this.stopClick = false;
  },

  _refresh: function _refresh() {
    // Turn favorite tooltip into a normal thumbnail
    var moniter = Main.layoutManager.monitors[this.metaWindow.get_monitor()];
    this.ThumbnailHeight = Math.floor(moniter.height / 70) * this._applet.thumbSize;
    this.ThumbnailWidth = Math.floor(moniter.width / 70) * this._applet.thumbSize;
    // this.thumbnailActor.height = this.ThumbnailHeight
    this.thumbnailActor.width = this.ThumbnailWidth;
    this._container.style = 'width: ' + Math.floor(this.ThumbnailWidth - 16) + 'px';
    this.isFavapp = false;

    // Replace the old thumbnail
    var title = this.metaWindow.get_title();
    this._label.text = title;
    if (this._applet.showThumbs) {
      this.thumbnail = this._getThumbnail();
      this.thumbnailActor.child = this.thumbnail;
    } else {
      this.thumbnailActor.child = null;
    }
  },

  _hoverPeek: function _hoverPeek(opacity, metaWin) {
    var applet = this._applet;
    if (!applet.enablePeek) return;

    function setOpacity(window_actor, target_opacity) {
      Tweener.addTween(window_actor, {
        time: applet.peekTime * 0.001,
        transition: 'easeOutQuad',
        opacity: target_opacity
      });
    }

    var above_current = [];

    global.get_window_actors().forEach(function (wa) {
      var meta_win = wa.get_meta_window();
      if (metaWin == meta_win) return;

      if (meta_win.get_window_type() != Meta.WindowType.DESKTOP) setOpacity(wa, opacity);
    });
  }
};