/* jshint moz:true */
const Clutter = imports.gi.Clutter
const AppletManager = imports.ui.appletManager;
const Lang = imports.lang
const Main = imports.ui.main
const Mainloop = imports.mainloop
const Params = imports.misc.params
const PopupMenu = imports.ui.popupMenu
const Meta = imports.gi.Meta
const Util = imports.misc.util
const St = imports.gi.St
const Gio = imports.gi.Gio
const Gettext = imports.gettext
const Tweener = imports.ui.tweener
const Applet = imports.ui.applet;
const clog = imports.applet.clog
const setTimeout = imports.applet.setTimeout

const AppletDir = AppletManager.applets['IcingTaskManager@json']
const _ = AppletDir.lodash._
const FireFox = AppletDir.firefox

const THUMBNAIL_ICON_SIZE = 16
const OPACITY_OPAQUE = 255

const FavType = {
  favorites: 0,
  pinnedApps: 1,
  none: 2
}

const ffOptions = [
  {id: 1, label: 'Most Visited'},
  {id: 2, label: 'Recent History'},
  {id: 3, label: 'Bookmarks'},
]

function t (str) {
  var resultConf = Gettext.dgettext('IcingTaskManager@json', str)
  if (resultConf != str) {
    return resultConf
  }
  return Gettext.gettext(str)
}

function AppMenuButtonRightClickMenu () {
  this._init.apply(this, arguments)
}

AppMenuButtonRightClickMenu.prototype = {
  __proto__: Applet.AppletPopupMenu.prototype,

  _init: function(launcher, metaWindow, metaWindows, orientation) {
    Applet.AppletPopupMenu.prototype._init.call(this, launcher, orientation);

    this._applet = launcher._applet;
    this._launcher = launcher;
    this.connect('open-state-changed', Lang.bind(this, this._onToggled));

    this.app = launcher.app;
    this.appId = launcher.appId;
    this.appInfo = this.app.get_app_info()
    this.isFavapp = launcher.isFavapp;
    this.orientation = orientation;
    this.isFavapp = launcher.isFavapp;
    this.favs = this._applet.pinned_app_contr()
    this.metaWindow = metaWindow;
    this.metaWindows = metaWindows;
    this.autostartIndex = launcher.autostartIndex;
    this.actor.style = 'width: 500px;'
  },

  setMetaWindow: function (metaWindow, metaWindows) {
    // Last focused
    this.metaWindow = metaWindow

    // Window list from appGroup
    this.metaWindows = metaWindows
  },

  _populateMenu: function() {
    if (!this.metaWindow) {
      this.metaWindow = this._launcher._getLastFocusedWindow()
    }

    var mw = this.metaWindow;
    var item;
    var length;
    var hasWindows = this.metaWindows.length > 0

    if (hasWindows) {

      /*
        Monitors
      */

      if (Main.layoutManager.monitors.length > 1) {
        var connectMonitorEvent = (item, mw, i)=>{
          item.connect('activate', ()=>{
            if (this._applet.monitorMoveAllWindows) {
              for (let z = 0, len = this.metaWindows.length; z < len; z++) {
                var focused = 0;
                this.metaWindows[z].win.move_to_monitor(i)
                if (this.metaWindows[z].win.has_focus()) {
                  ++focused
                }
                if (z === len - 1 && focused === 0) {
                  this.app.activate(this.metaWindows[z].win, global.get_current_time())
                }
              }
            } else {
              mw.move_to_monitor(i)
              this.app.activate(mw, global.get_current_time())
            }
          })
        }
        for (let i = 0, len = Main.layoutManager.monitors.length; i < len; i++) {
          if (i === mw.get_monitor()) {
            continue;
          }
          item = new PopupMenu.PopupMenuItem(t(Main.layoutManager.monitors.length === 2 ? 'Move to the other monitor' : `Move to monitor ${i+1}`));
          connectMonitorEvent(item, mw, i)
          this.addMenuItem(item);
        }
      }

      /*
        Workspace
      */

      if ((length = global.screen.n_workspaces) > 1) {
        if (mw.is_on_all_workspaces()) {
          item = new PopupMenu.PopupMenuItem(t('Only on this workspace'));
          item.connect('activate', function() {
            mw.unstick();
          });
          this.addMenuItem(item);
        } else {
          item = new PopupMenu.PopupMenuItem(t('Visible on all workspaces'));
          item.connect('activate', function() {
            mw.stick();
          });
          this.addMenuItem(item);

          item = new PopupMenu.PopupSubMenuMenuItem(t('Move to another workspace'));
          this.addMenuItem(item);

          var connectWorkspaceEvent = (ws, j)=>{
            ws.connect('activate', function() {
              mw.change_workspace(global.screen.get_workspace_by_index(j));
            });
          }
          for (let i = 0; i < length; i++) {
            // Make the index a local variable to pass to function
            let j = i;
            let name = Main.workspace_names[i] ? Main.workspace_names[i] : Main._makeDefaultWorkspaceName(i);
            let ws = new PopupMenu.PopupMenuItem(name);

            if (i === this._launcher._applet.currentWs) {
              ws.setSensitive(false);
            }

            connectWorkspaceEvent(ws, j)
            item.menu.addMenuItem(ws);
          }

        }
      }

      this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    }

    this.recentMenuItems = []
    if (this._applet.showRecent) {

      /*
        Places
      */

      if (this.appId === 'nemo.desktop' || this.appId === 'nemo-home.desktop') {
        let subMenu = new PopupMenu.PopupSubMenuMenuItem(t('Places'));
        this.addMenuItem(subMenu);

        var defualtPlaces = this._listDefaultPlaces()
        var bookmarks = this._listBookmarks()
        var devices = this._listDevices()
        var places = defualtPlaces.concat(bookmarks).concat(devices)
        var handlePlaceLaunch = (item, i)=>item.connect('activate', ()=>places[i].launch())
        for (let i = 0, len = places.length; i < len; i++) {
          item = new PopupMenu.PopupIconMenuItem(t(places[i].name), 'folder', St.IconType.SYMBOLIC)
          handlePlaceLaunch(item, i)
          this.recentMenuItems.push(item)
          subMenu.menu.addMenuItem(item);
        }
        this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      }

      /*
        History
      */

      if (this.appId === 'firefox.desktop' || this.appId === 'firefox web browser.desktop') {
        let subMenu = new PopupMenu.PopupSubMenuMenuItem(t(_.find(ffOptions, {id: this._applet.firefoxMenu}).label));
        this.addMenuItem(subMenu);

        var histories = FireFox.getFirefoxHistory(this._applet)
        if (histories) {
          try {
            var handleHistoryLaunch = (item, i)=>item.connect('activate', ()=>Gio.app_info_launch_default_for_uri(histories[i].uri, global.create_app_launch_context()))
            for (let i = 0, len = histories.length; i < len; i++) {
              item = new PopupMenu.PopupIconMenuItem(t(histories[i].title), 'go-next', St.IconType.SYMBOLIC)
              handleHistoryLaunch(item, i)
              this.recentMenuItems.push(item)
              subMenu.menu.addMenuItem(item);
            }
          } catch (e) {}
        }
        this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem()); 
      }

      /*
        Recent Files
      */

      var recentItems = this._applet.recentItems
      var items = []

      for (let i = 0, len = recentItems.length; i < len; i++) {
        var mimeType = recentItems[i].get_mime_type()
        var appInfo = Gio.app_info_get_default_for_type(mimeType, false)
        if (appInfo && this.appInfo && appInfo.get_id() === this.appId) {
          items.push(recentItems[i])
        }
      }
      var itemsLength = items.length

      if (itemsLength > 0) {
        let subMenu = new PopupMenu.PopupSubMenuMenuItem(t('Recent'));
        this.addMenuItem(subMenu);
        var num = this._applet.appMenuNum > 10 ? 10 : this._applet.appMenuNum
        if (itemsLength > num) {
          itemsLength = num
        }
        var handleRecentLaunch = (item, i)=>item.connect('activate', ()=>Gio.app_info_launch_default_for_uri(items[i].get_uri(), global.create_app_launch_context()))
        for (let i = 0; i < itemsLength; i++) {
          item = new PopupMenu.PopupIconMenuItem(t(items[i].get_short_name()), 'list-add', St.IconType.SYMBOLIC)
          handleRecentLaunch(item, i)
          this.recentMenuItems.push(item)
          subMenu.menu.addMenuItem(item);
        }
        this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      }
    }

    /*
      Preferences
    */

    let subMenu = new PopupMenu.PopupSubMenuMenuItem(t('Preferences'));
    this.addMenuItem(subMenu);

    if (!this.app.is_window_backed()) {
      if (this._applet.autoStart) {
        if (this.autostartIndex !== -1) {
          item = new PopupMenu.PopupIconMenuItem(t('Remove from Autostart'), 'process-stop', St.IconType.SYMBOLIC)
          item.connect('activate', Lang.bind(this, this._toggleAutostart))
        } else {
          item = new PopupMenu.PopupIconMenuItem(t('Add to Autostart'), 'insert-object', St.IconType.SYMBOLIC)
          item.connect('activate', Lang.bind(this, this._toggleAutostart))
        }
        subMenu.menu.addMenuItem(item);
      }
      if (this._applet.showPinned !== FavType.none) {
        if (this.isFavapp) {
          item = new PopupMenu.PopupIconMenuItem(t('Unpin from Panel'), 'list-remove', St.IconType.SYMBOLIC)
          item.connect('activate', Lang.bind(this, this._toggleFav))
        } else {
          item = new PopupMenu.PopupIconMenuItem(t('Pin to Panel'), 'bookmark-new', St.IconType.SYMBOLIC)
          item.connect('activate', Lang.bind(this, this._toggleFav))
        }
        subMenu.menu.addMenuItem(item);
      }
    } else {
      item = new PopupMenu.PopupIconMenuItem(t('Create Shortcut'), 'list-add', St.IconType.SYMBOLIC)
      item.connect('activate', Lang.bind(this, this._createShortcut))
      subMenu.menu.addMenuItem(item);
    }

    item = new PopupMenu.PopupIconMenuItem(t('About...'), 'dialog-question', St.IconType.SYMBOLIC);
    item.connect('activate', Lang.bind(this._applet, this._applet.openAbout));
    subMenu.menu.addMenuItem(item);

    item = new PopupMenu.PopupIconMenuItem(t('Configure...'), 'system-run', St.IconType.SYMBOLIC);
    item.connect('activate', Lang.bind(this._applet, this._applet.configureApplet));
    subMenu.menu.addMenuItem(item);

    item = new PopupMenu.PopupIconMenuItem(t(`Remove 'Icing Task Manager'`), 'edit-delete', St.IconType.SYMBOLIC);
    item.connect('activate', Lang.bind(this, function() {
      AppletManager._removeAppletFromPanel(this._applet._uuid, this._applet.instance_id);
    }));
    subMenu.menu.addMenuItem(item);

    /*
      Actions
    */

    var actions = null
    try {
      actions = this.appInfo.list_actions()
      if (this.appInfo && actions) {
        this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        var handleAction = (action)=>{
          item = new PopupMenu.PopupIconMenuItem(t(this.appInfo.get_action_name(action)), 'document-new', St.IconType.SYMBOLIC)
          item.connect('activate', ()=>this.appInfo.launch_action(action, global.create_app_launch_context()))
          this.recentMenuItems.push(item)
        }

        for (let i = 0, len = actions.length; i < len; i++) {
          handleAction(actions[i])
          this.addMenuItem(item);
        }
        this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      }
    } catch (e) {
      if (this.app.is_window_backed()) {
        this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      }
    }

    /*
      Close all/others
    */

    if (hasWindows) {
      if (this.metaWindows.length > 1) {
        item = new PopupMenu.PopupIconMenuItem(t('Close all'), 'application-exit', St.IconType.SYMBOLIC);
        item.connect('activate', Lang.bind(this, function() {
          _.each(this.metaWindows, (metaWindow)=>{
            if (!metaWindow.win._needsAttention) {
              metaWindow.win.delete(global.get_current_time);
            }
          })
        }));
        this.addMenuItem(item);
        item = new PopupMenu.PopupIconMenuItem(t('Close others'), 'window-close', St.IconType.SYMBOLIC);
        item.connect('activate', Lang.bind(this, function() {
          _.each(this.metaWindows, (metaWindow)=>{
            if (!_.isEqual(metaWindow.win, mw) && !metaWindow.win._needsAttention) {
              metaWindow.win.delete(global.get_current_time);
            }
          })
        }));
        this.addMenuItem(item);
        this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      }

      /*
        Miscellaneous
      */

      if (mw.get_compositor_private().opacity != 255) {
        item = new PopupMenu.PopupMenuItem(t('Restore to full opacity'));
        item.connect('activate', function() {
          mw.get_compositor_private().set_opacity(255);
        });
        this.addMenuItem(item);
      }

      if (mw.minimized) {
        item = new PopupMenu.PopupIconMenuItem(t('Restore'), 'view-sort-descending', St.IconType.SYMBOLIC);
        item.connect('activate', function() {
          Main.activateWindow(mw, global.get_current_time());
        });
      } else {
        item = new PopupMenu.PopupIconMenuItem(t('Minimize'), 'view-sort-ascending', St.IconType.SYMBOLIC);
        item.connect('activate', function() {
          mw.minimize(global.get_current_time());
        });
      }
      this.addMenuItem(item);

      if (mw.get_maximized()) {
        item = new PopupMenu.PopupIconMenuItem(t('Unmaximize'), 'view-restore', St.IconType.SYMBOLIC);
        item.connect('activate', function() {
          mw.unmaximize(Meta.MaximizeFlags.HORIZONTAL | Meta.MaximizeFlags.VERTICAL);
        });
      } else {
        item = new PopupMenu.PopupIconMenuItem(t('Maximize'), 'view-fullscreen', St.IconType.SYMBOLIC);
        item.connect('activate', function() {
          mw.maximize(Meta.MaximizeFlags.HORIZONTAL | Meta.MaximizeFlags.VERTICAL);
        });
      }
      this.addMenuItem(item);

      item = new PopupMenu.PopupIconMenuItem(t('Close'), 'edit-delete', St.IconType.SYMBOLIC);
      item.connect('activate', function() {
        mw.delete(global.get_current_time());
      });
      this.addMenuItem(item);

      this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    }
  },

  _onToggled: function(actor, isOpening) {
    if (this.isOpen) {
      this._applet._menuOpen = true;
    } else {
      this._applet._menuOpen = false;
    }

    if (!isOpening) {
      return;
    }
    this.removeAll();
    this._populateMenu();
  },

  _toggleAutostart(){
    if (this.autostartIndex !== -1) {
      this._applet.autostartApps[this.autostartIndex].file.delete(null)
      this._applet.removeAutostartApp(this.autostartIndex)
      this.autostartIndex = -1
    } else {
      var filePath = this.appInfo.get_filename()
      Util.trySpawnCommandLine(`bash -c 'cp ${filePath} ${this._applet.autostartStrDir}'`)
      setTimeout(()=>{
        this._applet.getAutostartApps()
        this.autostartIndex = this._applet.autostartApps.length - 1
      }, 500)
    }
  },

  _toggleFav: function (actor, event) {
    if (this.isFavapp) {
      this.favs.removeFavorite(this.appId)
    } else {
      if (!this.app.is_window_backed()) {
        this.favs._addFavorite({appId: this.appId, app: this.app, pos: -1})
      }
    }
  },

  _createShortcut: function (actor, event) {
    var proc = this.app.get_windows()[0].get_pid()
    var cmd = `bash -c 'python ~/.local/share/cinnamon/applets/IcingTaskManager@json/utils.py get_process ${proc.toString()}'`
    Util.trySpawnCommandLine(cmd)
  },

  _listDefaultPlaces: function (pattern) {
    var defaultPlaces = Main.placesManager.getDefaultPlaces()
    var res = []
    for (let i = 0, len = defaultPlaces.length; i < len; i++) {
      if (!pattern || defaultPlaces[i].name.toLowerCase().indexOf(pattern) != -1) {
        res.push(defaultPlaces[i])
      }
    }
    return res
  },

  _listBookmarks: function (pattern) {
    var bookmarks = Main.placesManager.getBookmarks()
    var res = []
    for (let i = 0, len = bookmarks.length; i < len; i++) {
      if (!pattern || bookmarks[i].name.toLowerCase().indexOf(pattern) != -1) {
        res.push(bookmarks[i])
      }
    }
    return res
  },

  _listDevices: function (pattern) {
    var devices = Main.placesManager.getMounts()
    var res = []
    for (let i = 0, len = devices.length; i < len; i++) {
      if (!pattern || devices[i].name.toLowerCase().indexOf(pattern) != -1) {
        res.push(devices[i])
      }
    }
    return res
  },
};

function HoverMenuController (owner) {
  this._init(owner)
}

HoverMenuController.prototype = {
  __proto__: PopupMenu.PopupMenuManager.prototype,

  _onEventCapture: function (actor, event) {
    return false
  }
}

function AppThumbnailHoverMenu () {
  this._init.apply(this, arguments)
}

AppThumbnailHoverMenu.prototype = {
  __proto__: PopupMenu.PopupMenu.prototype,

  _init: function (parent) {
    this._applet = parent._applet
    if (parent._applet.c32) {
      PopupMenu.PopupMenu.prototype._init.call(this, parent.actor, parent.orientation, 0.5)
    } else {
      PopupMenu.PopupMenu.prototype._init.call(this, parent.actor, 0.5, parent.orientation)
    }

    this.metaWindow = parent.metaWindow
    this.metaWindows = []

    this.app = parent.app
    this.isFavapp = parent.isFavapp


    // need to implement this class or cinnamon outputs a bunch of errors // TBD
    this.actor.style_class = 'hide-arrow'

    this.box.style_class = 'thumbnail-popup-content'

    this.actor.hide()
    this.parentActor = parent.actor

    Main.layoutManager.addChrome(this.actor, this.orientation)

    this.appSwitcherItem = new PopupMenuAppSwitcherItem(this)
    this.addMenuItem(this.appSwitcherItem)

    this.parentActor.connect('enter-event', Lang.bind(this, this._onEnter))
    this.parentActor.connect('leave-event', Lang.bind(this, this._onLeave))
    this.parentActor.connect('button-release-event', Lang.bind(this, this._onButtonPress))

    this.actor.connect('enter-event', Lang.bind(this, this._onMenuEnter))
    this.actor.connect('leave-event', Lang.bind(this, this._onMenuLeave))
    this.actor.connect('key-release-event', (actor, e)=>this._onKeyRelease(actor, e))

    this.lastKeySymbol = null
  },
    
  _onButtonPress: function (actor, event) {
    if (this._applet.onclickThumbs && this.appSwitcherItem.appContainer.get_children().length > 1) {
      return
    }
    this.shouldOpen = false
    this.shouldClose = true
    setTimeout(()=>this.hoverClose(), this._applet.thumbTimeout)
  },

  _onMenuEnter: function () {
    this.shouldOpen = true
    this.shouldClose = false

    setTimeout(()=>this.hoverOpen(), this._applet.thumbTimeout)
  },

  _onMenuLeave: function () {
    this.shouldOpen = false
    this.shouldClose = true
    setTimeout(()=>this.hoverClose(), this._applet.thumbTimeout)
  },

  _onEnter: function () {
    this.shouldOpen = true
    this.shouldClose = false

    setTimeout(()=>this.hoverOpen(), this._applet.thumbTimeout)
  },

  _onLeave: function () {
    this.shouldClose = true
    this.shouldOpen = false

    setTimeout(()=>this.hoverClose(), this._applet.thumbTimeout)
  },

  _onKeyRelease: function(actor, event) {
    let symbol = event.get_key_symbol();
    if (this.isOpen && (symbol === Clutter.KEY_Super_L || symbol === Clutter.KEY_Super_R)) {
      // close this menu, if opened by super+#
      this.close();
      return true;
    }
  },

  hoverOpen: function () {
    if (this.shouldOpen && !this.isOpen) {
      this.open()
    }
  },
  
  hoverClose: function () {
    if (this.shouldClose) {
      this.close()
    }
  },

  open: function (animate) {
    // Refresh all the thumbnails, etc when the menu opens.  These cannot
    // be created when the menu is initalized because a lot of the clutter window surfaces
    // have not been created yet...
    setTimeout(()=>this.appSwitcherItem._refresh(), 0)
    this.appSwitcherItem.actor.show()
    PopupMenu.PopupMenu.prototype.open.call(this, this._applet.animateThumbs)
  },

  close: function (animate) {
    PopupMenu.PopupMenu.prototype.close.call(this, this._applet.animateThumbs)
    this.appSwitcherItem.actor.hide()
  },

  destroy: function () {
    var children = this._getMenuItems()
    for (var i = 0; i < children.length; i++) {
      var item = children[i]
      this.box.remove_actor(item.actor)
      item.actor.destroy()
    }
    this.box.destroy()
    this.actor.destroy()
  },

  setMetaWindow: function (metaWindow, metaWindows) {
    // Last focused
    this.metaWindow = metaWindow
    this.metaWindows = metaWindows
    this.appSwitcherItem.setMetaWindow(metaWindow, metaWindows)
  }
}

// display a list of app thumbnails and allow
// bringing any app to focus by clicking on its thumbnail

function PopupMenuAppSwitcherItem () {
  this._init.apply(this, arguments)
}

PopupMenuAppSwitcherItem.prototype = {
  __proto__: PopupMenu.PopupBaseMenuItem.prototype,

  _init: function (parent, params) {
    params = Params.parse(params, {
      hover: false,
      activate: false
    })
    PopupMenu.PopupBaseMenuItem.prototype._init.call(this, params)

    this._applet = parent._applet
    this.metaWindow = parent.metaWindow
    this.metaWindows = []
    this.app = parent.app
    this.isFavapp = parent.isFavapp
    this._parentContainer = parent
    this.actor.style_class = ''

    this.box = new St.BoxLayout()

    this.appContainer = new St.BoxLayout({
      style_class: 'switcher-list'
    })

    this.appContainer.add_style_class_name('thumbnail-row')

    this.appThumbnails = []

    this._applet.settings.connect('changed::vertical-thumbnails', Lang.bind(this, this._setVerticalSetting))
    this._setVerticalSetting()
    this.addActor(this.box)
  },

  _setVerticalSetting: function () {
    var children = this.box.get_children()

    if (children.length > 0) {
      this.box.remove_actor(this.appContainer)
      this.box.add_actor(this.appContainer)
    } else {
      this.box.add_actor(this.appContainer)
    }

    this.appContainer.vertical = this._applet.verticalThumbs
    this.box.vertical = !this._applet.verticalThumbs
  },

  setMetaWindow: function (metaWindow, metaWindows) {
    this.metaWindow = metaWindow
    this.metaWindows = metaWindows
    if (this.metaWindowThumbnail !== undefined && this.metaWindowThumbnail) {
      this.metaWindowThumbnail.setMetaWindow(metaWindow, metaWindows)
    }
  },

  _isFavorite: function (isFav) {
    this.isFavapp = isFav
  },

  getMetaWindows: function () {
    if (this.metaWindow) {
      if (!this._applet.groupApps) {
        return [this.metaWindow]
      }
      this.metaWorkspace = this.metaWindow.get_workspace()
    } else if (!this.metaWorkspace) {
      return {}
    }
    return _.map(this.metaWindows, 'win')
  },

  handleUnopenedPinnedApp(metaWindow, windows, appClosed=false){
    if (this.metaWindowThumbnail) {
      this.metaWindowThumbnail.destroy()
    }
    var isPinned = windows.length === 0 && !metaWindow && this.isFavapp
    if (isPinned || (windows.length === 0 && !this.metaWindowThumbnail)) {
      this.metaWindowThumbnail = new WindowThumbnail(this, metaWindow, windows)
      this.appContainer.insert_actor(this.metaWindowThumbnail.actor, 0)
      setTimeout(()=>this.setStyleOptions(null), 0)
      // Update appThumbnails to remove old programs
      this.removeStaleWindowThumbnails(windows)
    }
    return isPinned
    
  },

  _refresh: function () {
    // Check to see if this.metaWindow has changed.  If so, we need to recreate
    // our thumbnail, etc.
    // Get a list of all windows of our app that are running in the current workspace
    var windows = _.map(this.metaWindows, 'win')


    if (this.metaWindowThumbnail && this.metaWindowThumbnail.needs_refresh()) {
      this.metaWindowThumbnail = null
    }
    if (this.metaWindowThumbnail && _.isEqual(this.metaWindowThumbnail.metaWindow, this.metaWindow)) {
      this.metaWindowThumbnail._isFavorite(this.isFavapp)
    } else if (this.handleUnopenedPinnedApp(this.metaWindow, windows)) {
      return
    }
    // Update appThumbnails to include new programs
    this.addWindowThumbnails(windows)
    // Update appThumbnails to remove old programs
    this.removeStaleWindowThumbnails(windows)
    // Set to true to readd the thumbnails; used for the sorting by last focused 
    this.reAdd = false
    // used to make sure everything is on the stage
    setTimeout(()=>this.setStyleOptions(windows), 0)
  },

  addWindowThumbnails: function (windows) {
    if (this._applet.sortThumbs && windows.length > 0) {
      var children = this.appContainer.get_children()
      for (let w = 0, len = children.length; w < len; w++) {
        this.appContainer.remove_actor(children[w])
      }
      this.appThumbnails = _.orderBy(this.appThumbnails, ['metaWindow.user_time'], ['asc'])
      this.reAdd = true
    }

    for (let i = 0, len = windows.length; i < len; i++) {
      var metaWindow = windows[i]
      if (this.appThumbnails[i] !== undefined && this.appThumbnails[i]) {
        if (this.reAdd) {
          if (this._applet.sortThumbs) {
            this.appContainer.insert_actor(this.appThumbnails[i].thumbnail.actor, 0)
          } else {
            this.appContainer.add_actor(this.appThumbnails[i].thumbnail.actor)
          }
        }
      } else {
        if (this.metaWindowThumbnail) {
          this.metaWindowThumbnail.destroy()
        }
        var thumbnail = new WindowThumbnail(this, metaWindow, windows)
        thumbnail.setMetaWindow(metaWindow, windows)
        this.appThumbnails.push({
          metaWindow: metaWindow,
          thumbnail: thumbnail
        })
        if (this._applet.sortThumbs) {
          this.appContainer.insert_actor(this.appThumbnails[i].thumbnail.actor, 0)
        } else {
          this.appContainer.add_actor(this.appThumbnails[i].thumbnail.actor)
        }
      }
    }
    this.appContainer.show()
  },
  setStyleOptions: function (windows) {
    this.appContainer.style = null
    this.box.style = null
    var thumbnailTheme = this.appContainer.peek_theme_node()
    var padding = thumbnailTheme ? thumbnailTheme.get_horizontal_padding() : null
    var thumbnailPadding = (padding && (padding > 1 && padding < 21) ? padding : 10)
    this.appContainer.style = 'padding:' + (thumbnailPadding / 2) + 'px'
    var boxTheme = this.box.peek_theme_node()
    padding = boxTheme ? boxTheme.get_vertical_padding() : null
    var boxPadding = (padding && (padding > 0) ? padding : 3)
    this.box.style = 'padding:' + boxPadding + 'px;'
    if (this.isFavapp) {
      this.metaWindowThumbnail.thumbnailIconSize()
      return
    }
    if (windows === null) {
      return
    }
    for (let i = 0, len = this.appThumbnails.length; i < len; i++) {
      if (this.appThumbnails[i].thumbnail) {
        this.appThumbnails[i].thumbnail.thumbnailIconSize()
      }
    }
  },

  removeStaleWindowThumbnails: function (windows) {
    for (let i = 0, len = this.appThumbnails.length; i < len; i++) {  
      if (this.appThumbnails[i] !== undefined && windows.indexOf(this.appThumbnails[i].metaWindow) === -1) {
        if (this.appThumbnails[i].thumbnail) {
          this.appContainer.remove_actor(this.appThumbnails[i].thumbnail.actor)
          this.appThumbnails[i].thumbnail.destroy()
        }
        _.pullAt(this.appThumbnails, i)
      }
    }
  }
}

function WindowThumbnail () {
  this._init.apply(this, arguments)
}

WindowThumbnail.prototype = {
  _init: function (parent, metaWindow, metaWindows) {
    this._applet = parent._applet
    this.metaWindow = metaWindow || null
    this.metaWindows = metaWindows
    this.app = parent.app
    this.isFavapp = parent.isFavapp || false
    this.wasMinimized = false
    this._parent = parent
    this._parentContainer = parent._parentContainer
    this.thumbnailPadding = 16

    // Inherit the theme from the alt-tab menu
    this.actor = new St.BoxLayout({
      style_class: 'item-box',
      reactive: true,
      track_hover: true,
      vertical: true
    })
    this.actor._delegate = this
    // Override with own theme.
    this.actor.add_style_class_name('thumbnail-box')
    this.thumbnailActor = new St.Bin()

    this._container = new St.BoxLayout({
      style_class: this._applet.thumbCloseBtnStyle ? 'thumbnail-iconlabel' : 'thumbnail-iconlabel-cont'
    })

    this.bin = new St.BoxLayout({
      style_class: 'thumbnail-label-bin'
    })

    this.icon = this.app.create_icon_texture(32)
    this.themeIcon = new St.BoxLayout({
      style_class: 'thumbnail-icon'
    })
    this.themeIcon.add_actor(this.icon)
    this._container.add_actor(this.themeIcon)
    this._label = new St.Label({
      style_class: 'thumbnail-label'
    })
    this._container.add_actor(this._label)
    this.button = new St.BoxLayout({
      style_class: this._applet.thumbCloseBtnStyle ? 'window-close' : 'thumbnail-close',
      style: this._applet.thumbCloseBtnStyle ? 'padding: 0px; width: 16px; height: 16px; max-width: 16px; max-height: 16px;' : null,
      reactive: true
    })

    this.button.hide()
    this.bin.add_actor(this._container)
    this.bin.add_actor(this.button)
    this.actor.add_actor(this.bin)
    this.actor.add_actor(this.thumbnailActor)

    this._isFavorite(this.isFavapp, this.metaWindow, this.metaWindows)

    if (this.metaWindow) {
      this.metaWindow.connect('notify::title', ()=> {
        this._label.text = this.metaWindow.get_title()
      })
      this.metaWindow.connect('notify::appears-focused', Lang.bind(this, this._focusWindowChange))
      this._updateAttentionGrabber(null, null, this._applet.showAlerts)
      this._applet.settings.connect('changed::show-alerts', Lang.bind(this, this._updateAttentionGrabber))
      this.tracker = this._applet.tracker
      this._trackerSignal = this.tracker.connect('notify::focus-app', Lang.bind(this, this._onFocusChange))
    }
    this.actor.connect('enter-event', ()=>{
      if (!this.isFavapp) {
        var parent = this._parent._parentContainer
        parent.shouldOpen = true
        parent.shouldClose = false
        this._hoverPeek(this._applet.peekOpacity, this.metaWindow, true)
        this.actor.add_style_pseudo_class('outlined')
        this.actor.add_style_pseudo_class('selected')
        this.button.show()
        if (this.metaWindow.minimized && this._applet.enablePeek  && this.app.get_name() !== 'Steam') {
          this.metaWindow.unminimize()
          if (this.metaWindow.is_fullscreen()) {
            this.metaWindow.unmaximize(global.get_current_time())
          }
          this.wasMinimized = true
        } else {
          this.wasMinimized = false
        }
      }
    })
    this.actor.connect('leave-event', ()=>{
      if (!this.isFavapp) {
        this._hoverPeek(OPACITY_OPAQUE, this.metaWindow, false)
        this.actor.remove_style_pseudo_class('outlined')
        this._focusWindowChange();
        this.button.hide()
        if (this.wasMinimized) {
          this.metaWindow.minimize(global.get_current_time())
        }
      }
    })
    this.button.connect('button-release-event', Lang.bind(this, this._onButtonRelease))

    this.actor.connect('button-release-event', Lang.bind(this, this._connectToWindow))
    //update focused style
    setTimeout(()=>this._focusWindowChange(),0)
  },

  setMetaWindow: function (metaWindow, metaWindows) {
    this.metaWindow = metaWindow
    this.metaWindows = metaWindows
  },

  _updateAttentionGrabber: function (obj, oldVal, newVal) {
    if (newVal) {
      this._urgent_signal = global.display.connect('window-marked-urgent', Lang.bind(this, this._onWindowDemandsAttention))
      this._attention_signal = global.display.connect('window-demands-attention', Lang.bind(this, this._onWindowDemandsAttention))
    } else {
      if (this._urgent_signal) {
        global.display.disconnect(this._urgent_signal)
      }
      if (this._attention_signal) {
        global.display.disconnect(this._attention_signal)
      }
    }
  },

  _onWindowDemandsAttention: function (display, window) {
    if (this._needsAttention) {
      return false
    }
    this._needsAttention = true
    if (_.isEqual(this.metaWindow, window)) {
      this.actor.add_style_class_name('thumbnail-alerts')
      return true
    }
    return false
  },

  _onFocusChange: function () {
    if (this._hasFocus()) {
      this.actor.remove_style_class_name('thumbnail-alerts')
    }
  },

  _focusWindowChange: function () {
    if (this._hasFocus()) {
      this.actor.add_style_pseudo_class('selected')
    }else{
      this.actor.remove_style_pseudo_class('selected')
    }
  },

  _hasFocus: function () {
    if (!this.metaWindow) {
      return false
    }

    if (this.metaWindow.minimized) {
      return false
    }

    if (this.metaWindow.has_focus()) {
      return true
    }

    var transientHasFocus = false
    this.metaWindow.foreach_transient(function (transient) {
      if (transient.has_focus()) {
        transientHasFocus = true
        return false
      }
      return true
    })
    return transientHasFocus
  },

  _isFavorite: function (isFav, metaWindow=this.metaWindow, windows=this.metaWindows) {
    // Whether we create a favorite tooltip or a window thumbnail
    if (isFav) {
      // this.thumbnailActor.height = 0
      // this.thumbnailActor.width = 0
      this.thumbnailActor.child = null
      var apptext = this.app.get_name()
      // not sure why it's 7
      this.thumbnailWidth = THUMBNAIL_ICON_SIZE + Math.floor(apptext.length * 7.0)
      this._label.text = apptext
      this.isFavapp = true
      this.actor.style = 'border-width:2px;padding: 2px'
    } else {
      this.actor.style = null
      // HACK used to make sure everything is on the stage
      setTimeout(()=>this.thumbnailPaddingSize(), 0)
      this._refresh(metaWindow, windows)
    }
  },

  needs_refresh: function () {
    return Boolean(this.thumbnail)
  },

  thumbnailIconSize: function () {
    var thumbnailTheme = this.themeIcon.peek_theme_node()
    if (thumbnailTheme) {
      var width = thumbnailTheme.get_width()
      var height = thumbnailTheme.get_height()
      this.icon.set_size(width, height)
    }
  },

  thumbnailPaddingSize: function () {
    var thumbnailTheme = this.actor.peek_theme_node()
    var padding = thumbnailTheme ? thumbnailTheme.get_horizontal_padding() : null
    this.thumbnailPadding = (padding && (padding > 3 && padding < 21) ? padding : 12)
    this.actor.style = 'border-width:2px;padding:' + ((this.thumbnailPadding / 2)) + 'px;'
  },

  _getThumbnail: function () {
    // Create our own thumbnail if it doesn't exist
    var thumbnail = null
    var muffinWindow = this.metaWindow.get_compositor_private()
    if (muffinWindow) {
      var windowTexture = muffinWindow.get_texture()
      let [width, height] = windowTexture.get_size()
      var scale = Math.min(1.0, this.thumbnailWidth / width, this.thumbnailHeight / height)
      thumbnail = new Clutter.Clone({
        source: windowTexture,
        reactive: true,
        width: width * scale,
        height: height * scale
      })
    }

    return thumbnail
  },

  handleAfterClick(delay){
    this.stopClick = true
    this.destroy()
    this._hoverPeek(OPACITY_OPAQUE, this.metaWindow, false)
    this._parentContainer.shouldOpen = false
    this._parentContainer.shouldClose = true
    Mainloop.timeout_add(delay, Lang.bind(this._parentContainer, this._parentContainer.hoverClose))
    this.metaWindow.delete(global.get_current_time())
  },

  _onButtonRelease: function (actor, event) {
    if (event.get_state() & Clutter.ModifierType.BUTTON1_MASK && actor == this.button) {
      this.handleAfterClick(2000)
    }
  },

  _connectToWindow: function (actor, event) {
    this.wasMinimized = false
    if (event.get_state() & Clutter.ModifierType.BUTTON1_MASK && !this.stopClick && !this.isFavapp) {
      Main.activateWindow(this.metaWindow, global.get_current_time())
      var parent = this._parent._parentContainer
      parent.shouldOpen = false
      parent.shouldClose = true
      Mainloop.timeout_add(parent.hoverTime, Lang.bind(parent, parent.hoverClose))
    } else if (event.get_state() & Clutter.ModifierType.BUTTON2_MASK && !this.stopClick) {
      this.handleAfterClick(3000)
    }
    this.stopClick = false
  },

  _refresh: function (metaWindow=this.metaWindow, metaWindows=this.metaWindows) {
    // Turn favorite tooltip into a normal thumbnail
    var monitor = Main.layoutManager.primaryMonitor

    var setThumbSize = (divider=70, offset=16)=>{
      this.thumbnailWidth = Math.floor((monitor.width / divider) * this._applet.thumbSize) + offset
      this.thumbnailHeight = Math.floor((monitor.height / divider) * this._applet.thumbSize) + offset

      var monitorSize, thumbnailSize
      if (this._applet.verticalThumbs) {
        monitorSize = monitor.height
        thumbnailSize = this.thumbnailHeight
      } else {
        monitorSize = monitor.width
        thumbnailSize = this.thumbnailWidth
      }

      if (this.metaWindows.length === 0) {
        metaWindows = this.app.get_windows()
      }

      if ((thumbnailSize * metaWindows.length) + thumbnailSize > monitorSize) {
        setThumbSize(divider * 1.1, 16)
        return
      } else {
        this.thumbnailActor.width = this.thumbnailWidth
        this._container.style = 'width: ' + Math.floor(this.thumbnailWidth - 16) + 'px'
        
        this.isFavapp = false

        // Replace the old thumbnail
        var title = this.metaWindow.get_title()
        this._label.text = title
        if (this._applet.showThumbs) {
          this.thumbnail = this._getThumbnail()
          this.thumbnailActor.child = this.thumbnail
        } else {
          this.thumbnailActor.child = null
        }
      }
    };

    setThumbSize()
  },

  _hoverPeek: function (opacity, metaWin, enterEvent) {
    var applet = this._applet
    if (!applet.enablePeek) {
      return
    }

    function setOpacity (window_actor, target_opacity) {
      Tweener.addTween(window_actor, {
        time: applet.peekTime * 0.001,
        transition: 'easeOutQuad',
        opacity: target_opacity
      })
    }
    var monitorOrigin = metaWin.get_monitor()
    var wa = global.get_window_actors()
    for (let i = 0, len = wa.length; i < len; i++) {
      var waWin = wa[i].get_meta_window()
      if (metaWin === waWin || waWin.get_monitor() !== monitorOrigin) {
        continue
      }

      if (waWin.get_window_type() !== Meta.WindowType.DESKTOP) {
        setOpacity(wa[i], opacity)
      }
    }
  },

  destroy(){
    try {
      if (this._trackerSignal) {
        this.tracker.disconnect(this._trackerSignal)
      }
      if (this._urgent_signal) {
        global.display.disconnect(this._urgent_signal)
      }
      if (this._attention_signal) {
        global.display.disconnect(this._attention_signal)
      }
    } catch (e) {
      /* Signal is invalid */
    }
    var refThumb = _.findIndex(this._parent.appThumbnails, (thumb)=>{
      return _.isEqual(thumb.metaWindow, this.metaWindow)
    })
    if (refThumb !== -1) {
      _.pullAt(this._parent.appThumbnails, refThumb)
    }

    this._container.destroy_children()
    this._container.destroy()
    this.bin.destroy_children()
    this.bin.destroy()
    this.actor.destroy_children()
    this.actor.destroy()

  }
}
