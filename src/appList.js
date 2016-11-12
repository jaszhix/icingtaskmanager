const Lang = imports.lang
const Cinnamon = imports.gi.Cinnamon
const St = imports.gi.St
const Mainloop = imports.mainloop
const Gio = imports.gi.Gio
const _ = imports.applet._
const clog = imports.applet.clog

const AppletDir = imports.ui.appletManager.applets['IcingTaskManager@json']
const App = AppletDir.applet
const AppGroup = AppletDir.appGroup
const SpecialButtons = AppletDir.specialButtons

// List of running apps

function AppList () {
  this._init.apply(this, arguments)
}

/*



MyApplet._init, signal (switch-workspace) -> _onSwitchWorkspace -> AppList



*/

AppList.prototype = {
  _init: function (applet, metaWorkspace) {
    this._applet = applet
    this.metaWorkspace = metaWorkspace
    this.myactorbox = new SpecialButtons.MyAppletBox(this._applet)
    this.actor = this.myactorbox.actor
    this._appsys = Cinnamon.AppSystem.get_default()
    this.registeredApps = []

    this.appList = []

    // Connect all the signals
    this._setSignals()
    this._refreshList(true)
  },

  on_panel_edit_mode_changed: function () {
    this.actor.reactive = global.settings.get_boolean('panel-edit-mode')
  },

  on_orientation_changed: function (orientation) {
    this._refreshList()
    if (this._applet.orientation === St.Side.TOP) {
      this.actor.set_style_class_name('window-list-item-box window-list-box-top')
      this.actor.set_style('margin-top: 0px; padding-top: 0px;')
    } else {
      this.actor.set_style_class_name('window-list-item-box window-list-box-bottom')
      this.actor.set_style('margin-bottom: 0px; padding-bottom: 0px;')
    }
  },

  _setSignals: function () {
    this.signals = []
    // We use connect_after so that the window-tracker time to identify the app
    this.signals.push(this.metaWorkspace.connect_after('window-added', Lang.bind(this, this._windowAdded)))
    this.signals.push(this.metaWorkspace.connect_after('window-removed', Lang.bind(this, this._windowRemoved)))

    this._applet.settings.connect('changed::show-pinned', Lang.bind(this, this._refreshList))
    global.settings.connect('changed::panel-edit-mode', Lang.bind(this, this.on_panel_edit_mode_changed))
  },

  // Gets a list of every app on the current workspace

  _getSpecialApps: function () {
    this.specialApps = []
    let apps = Gio.app_info_get_all()

    for (let i = 0, len = apps.length; i < len; i++) {
      let wmClass = apps[i].get_startup_wm_class()
      if (wmClass) {
        let id = apps[i].get_id()
        this.specialApps.push({ id: id, wmClass: wmClass })
      }
    }
  },

  _refreshList: function (init=null) {
    for (let i = 0, len = this.appList.length; i < len; i++) {
      this.appList[i].appGroup.destroy()
    }

    this.appList = []
    this.registeredApps = this._getSpecialApps()
    this._loadFavorites(init)
    this._refreshApps(init)
  },

  _loadFavorites: function (init) {
    if (!this._applet.settings.getValue('show-pinned')) {
      return
    }
    let launchers =  this._applet.pinned_app_contr()._getIds()

    for (let i = 0, len = launchers.length; i < len; i++) {
      let app = this._appsys.lookup_app(launchers[i])
      if (!app) {
        app = this._appsys.lookup_settings_app(launchers[i])
      }
      if (!app) {
        continue
      }
      this._windowAdded(this.metaWorkspace, null, app, true, init)
    }
  },

  _refreshApps: function (init) {
    var windows = this.metaWorkspace.list_windows()

    for (let i = 0, len = windows.length; i < len; i++) {
      this._windowAdded(this.metaWorkspace, windows[i], null, null, init)
    }
  },

  _windowAdded: function (metaWorkspace, metaWindow, favapp, isFavapp, init) {
    // Check to see if the window that was added already has an app group.
    // If it does, then we don't need to do anything.  If not, we need to
    // create an app group.
    let app
    if (favapp) {
      app = favapp
    } else {
      app = App.appFromWMClass(this._appsys, this.specialApps, metaWindow)
    }
    if (!app) {
      app = this._applet.tracker.get_window_app(metaWindow)
    }
    if (!app) {
      return
    }

    var appId = app.get_id()
    var refApp = _.findIndex(this.appList, {id: appId})

    if (refApp === -1) {
      let appGroup = new AppGroup.AppGroup(this._applet, this, app, isFavapp)
      appGroup._updateMetaWindows(metaWorkspace)
      appGroup.watchWorkspace(metaWorkspace)
      this.actor.add_actor(appGroup.actor)

      app.connect('windows-changed', Lang.bind(this, this._onAppWindowsChanged, app))

      this.appList.push({
        id: appId,
        appGroup: appGroup
      })
      this.appList = this.appList

      let appGroupNum = this._appGroupNumber(app)
      appGroup._newAppKeyNumber(appGroupNum)

      if (this._applet.settings.getValue('title-display') == App.TitleDisplay.Focused) {
        appGroup.hideAppButtonLabel(false)
      }
    }
  },

  _appGroupNumber: function (parentApp) {
    var result
    for (let i = 0, len = this.appList.length; i < len; i++) {
      if (this.appList[i].appGroup.app === parentApp) {
        result = i+1
        break
      }
    }
    return result
  },

  _onAppWindowsChanged: function (app) {
    let numberOfwindows = this._getNumberOfAppWindowsInWorkspace(app, this.metaWorkspace)
    if (!numberOfwindows || numberOfwindows === 0) {
      this._removeApp(app)
      this._calcAllWindowNumbers()
    }
  },

  _calcAllWindowNumbers: function () {
    for (let i = 0, len = this.appList.length; i < len; i++) {
      this.appList[i].appGroup._calcWindowNumber(this.metaWorkspace)
    }
  },

  _getNumberOfAppWindowsInWorkspace: function (app, workspace) {
    var windows = app.get_windows()

    let result = 0

    for (let i = 0, len = windows.length; i < len; i++) {
      let windowWorkspace = windows[i].get_workspace()
      if (windowWorkspace.index() === workspace.index()) {
        ++result
      }
    }
    return result
  },

  _refreshAppGroupNumber: function () {
    for (let i = 0, len = this.appList.length; i < len; i++) {
      this.appList[i].appGroup._newAppKeyNumber(i+1)
    }
  },

  _windowRemoved: function (metaWorkspace, metaWindow) {
    
    // When a window is closed, we need to check if the app it belongs
    // to has no windows left.  If so, we need to remove the corresponding AppGroup
    let app = App.appFromWMClass(this._appsys, this.specialApps, metaWindow)

    if (!app){
      app = this._applet.tracker.get_window_app(metaWindow)
    }
    if (!app) {
      return
    }
    let hasWindowsOnWorkspace
    if (app.wmClass) {
      hasWindowsOnWorkspace = metaWorkspace.list_windows().some(function (win) {
        return app.wmClass == win.get_wm_class_instance()
      })
    } else {
      hasWindowsOnWorkspace = app.get_windows().some(function (win) {
        return win.get_workspace() == metaWorkspace
      })
    }
      
    if (app && !hasWindowsOnWorkspace) {
      this._removeApp(app)
    }
  },

  _removeApp: function (app) {
    // This function may get called multiple times on the same app and so the app may have already been removed
    var refApp = _.findIndex(this.appList, {id: app.get_id()})
    if (refApp !== -1) {
      if (this.appList[refApp].appGroup.wasFavapp || this.appList[refApp].appGroup.isFavapp) {
        this.appList[refApp].appGroup._isFavorite(true)
        this.appList[refApp].appGroup.hideAppButtonLabel(true)
        // have to delay to fix openoffice start-center bug // TBD 
        Mainloop.timeout_add(0, Lang.bind(this, this._refreshApps))
        return
      }

      this.appList[refApp].appGroup.destroy()
      _.pullAt(this.appList, refApp)

      Mainloop.timeout_add(15, Lang.bind(this, function () {
        //this._refreshApps()
        this._refreshAppGroupNumber()
      }))
    }
  },

  destroy: function () {
    this.signals.forEach(Lang.bind(this, function (s) {
      this.metaWorkspace.disconnect(s)
    }))
    for (let i = 0, len = this.appList.length; i < len; i++) {
      this.appList[i].appGroup.destroy()
    }
    this.appList.destroy()
    this.appList = null
  }
}