const Clutter = imports.gi.Clutter
const Lang = imports.lang
const Params = imports.misc.params
const PopupMenu = imports.ui.popupMenu
const Cinnamon = imports.gi.Cinnamon
const St = imports.gi.St
const Tweener = imports.ui.tweener
const Meta = imports.gi.Meta
const DND = imports.ui.dnd
const Mainloop = imports.mainloop
const _ = imports.applet._
const clog = imports.applet.clog

const BUTTON_BOX_ANIMATION_TIME = 0.5
const MAX_BUTTON_WIDTH = 150 // Pixels
const FLASH_INTERVAL = 500

const AppletDir = imports.ui.appletManager.applets['IcingTaskManager@json']

const TitleDisplay = {
  None: 1,
  App: 2,
  Title: 3,
  Focused: 4
}

// Creates a button with an icon and a label.
// The label text must be set with setText
// @icon: the icon to be displayed

function IconLabelButton () {
  this._init.apply(this, arguments)
}

IconLabelButton.prototype = {
  _init: function (parent) {
    if (parent.icon === null) {
      throw 'IconLabelButton icon argument must be non-null'
    }
    this._parent = parent
    this._applet = parent._applet
    this._icon = parent.icon
    this.actor = new St.Bin({
      style_class: 'window-list-item-box app-list-item-box',
      reactive: true,
      can_focus: true,
      x_fill: true,
      y_fill: false,
      track_hover: true
    })
    this.actor.height = parent._applet._panelHeight
    this.actor._delegate = this

    // We do a fancy layout with icons and labels, so we'd like to do our own allocation
    // in a Cinnamon.GenericContainer
    this._container = new Cinnamon.GenericContainer({
      name: 'iconLabelButton'
    })
    this.actor.set_child(this._container)
    this._container.connect('get-preferred-width', Lang.bind(this, this._getPreferredWidth))
    this._container.connect('get-preferred-height', Lang.bind(this, this._getPreferredHeight))
    this._container.connect('allocate', Lang.bind(this, this._allocate))

    this._label = new St.Label({
      style_class: 'app-button-label'
    })
    this._numLabel = new St.Label({
      style_class: 'window-list-item-label window-icon-list-numlabel'
    })


    this._container.add_actor(this._icon)
    this._container.add_actor(this._label)
    this._container.add_actor(this._numLabel)

    this.setIconPadding()
    this.setIconSize()

    global.settings.connect('changed::panel-edit-mode', Lang.bind(this, this.on_panel_edit_mode_changed))
    this._applet.settings.connect('changed::icon-padding', Lang.bind(this, this.setIconPadding))
    this._applet.settings.connect('changed::icon-size', Lang.bind(this, this.setIconSize))
    this._applet.settings.connect('changed::enable-iconSize', Lang.bind(this, this.setIconSize))
  },

  on_panel_edit_mode_changed: function () {
    this.actor.reactive = !global.settings.get_boolean('panel-edit-mode')
  },

  setIconPadding: function () {
    if (this._applet.orientation === St.Side.TOP || this._applet.orientation == St.Side.BOTTOM) {
      this.actor.style = `padding-bottom: 0px;padding-top:0px; padding-left: ${this._applet.iconPadding}px;padding-right: ${this._applet.iconPadding - 5}px;`
    }
  },

  setIconSize: function () {
    var size = this._applet.iconSize
    if (this._applet.enableIconSize) {
      this._icon.set_size(size, size)
    }
  },

  setText: function (text) {
    if (text) {
      this._label.text = text
    }
  },

  setStyle: function (name) {
    if (name) {
      this.actor.set_style_class_name(name)
    }
  },

  getAttention: function () {
    if (this._needsAttention) {
      return false
    }

    this._needsAttention = true
    var counter = 0
    this._flashButton(counter)
    return true
  },

  _flashButton: function (counter) {
    if (!this._needsAttention) {
      return
    }

    this.actor.add_style_class_name('window-list-item-demands-attention')
    if (counter < 4) {
      Mainloop.timeout_add(FLASH_INTERVAL, Lang.bind(this, function () {
        if (this.actor.has_style_class_name('window-list-item-demands-attention')) {
          this.actor.remove_style_class_name('window-list-item-demands-attention')
        }
        Mainloop.timeout_add(FLASH_INTERVAL, Lang.bind(this, function () {
          this._flashButton(++counter)
        }))
      }))
    }
  },

  _getPreferredWidth: function (actor, forHeight, alloc) {
    let [iconMinSize, iconNaturalSize] = this._icon.get_preferred_width(forHeight)
    let [labelMinSize, labelNaturalSize] = this._label.get_preferred_width(forHeight)
        // The label text is starts in the center of the icon, so we should allocate the space
        // needed for the icon plus the space needed for(label - icon/2)
    alloc.min_size = iconMinSize
    if (this._applet.titleDisplay == 3 && !this._parent.isFavapp) {
      alloc.natural_size = MAX_BUTTON_WIDTH
    }
    else {
      alloc.natural_size = Math.min(iconNaturalSize + Math.max(0, labelNaturalSize), MAX_BUTTON_WIDTH)
    }
  },

  _getPreferredHeight: function (actor, forWidth, alloc) {
    let [iconMinSize, iconNaturalSize] = this._icon.get_preferred_height(forWidth)
    let [labelMinSize, labelNaturalSize] = this._label.get_preferred_height(forWidth)
    alloc.min_size = Math.min(iconMinSize, labelMinSize)
    alloc.natural_size = Math.max(iconNaturalSize, labelNaturalSize)
  },

  _allocate: function (actor, box, flags) {
        // returns [x1,x2] so that the area between x1 and x2 is
        // centered in length

    function center (length, naturalLength) {
      var maxLength = Math.min(length, naturalLength)
      var x1 = Math.max(0, Math.floor((length - maxLength) / 2))
      var x2 = Math.min(length, x1 + maxLength)
      return [x1, x2]
    }
    var allocWidth = box.x2 - box.x1
    var allocHeight = box.y2 - box.y1
    var childBox = new Clutter.ActorBox()
    var direction = this.actor.get_text_direction()

        // Set the icon to be left-justified (or right-justified) and centered vertically
    let [iconNaturalWidth, iconNaturalHeight] = this._icon.get_preferred_size();
    [childBox.y1, childBox.y2] = center(allocHeight, iconNaturalHeight)
    if (direction == Clutter.TextDirection.LTR) {
      [childBox.x1, childBox.x2] = [0, Math.min(iconNaturalWidth, allocWidth)]
    } else {
      [childBox.x1, childBox.x2] = [Math.max(0, allocWidth - iconNaturalWidth), allocWidth]
    }
    this._icon.allocate(childBox, flags)
        //        log('allocateA ' + [childBox.x1<0, childBox.x2<0, childBox.y1, childBox.y2] + ' ' + [childBox.x2-childBox.x1, childBox.y2-childBox.y1])
        // Set the label to start its text in the left of the icon
    var iconWidth = childBox.x2 - childBox.x1;
    var [naturalWidth, naturalHeight] = this._label.get_preferred_size();
    [childBox.y1, childBox.y2] = center(allocHeight, naturalHeight)
    if (direction == Clutter.TextDirection.LTR) {
      childBox.x1 = iconWidth
      childBox.x2 = Math.min(allocWidth, MAX_BUTTON_WIDTH)
    } else {
      childBox.x2 = Math.min(allocWidth - iconWidth, MAX_BUTTON_WIDTH)
      childBox.x1 = Math.max(0, childBox.x2 - naturalWidth)
    }
    this._label.allocate(childBox, flags)
        //        log('allocateB ' + [childBox.x1<0, childBox.x2<0, childBox.y1, childBox.y2] + ' ' + [childBox.x2-childBox.x1, childBox.y2-childBox.y1])
    if (direction == Clutter.TextDirection.LTR) {
      childBox.x1 = -3
      childBox.x2 = childBox.x1 + this._numLabel.width
      childBox.y1 = box.y1 - 2
      childBox.y2 = box.y2 - 1
    } else {
      childBox.x1 = -this._numLabel.width
      childBox.x2 = childBox.x1 + this._numLabel.width
      childBox.y1 = box.y1
      childBox.y2 = box.y2 - 1
    }
    this._numLabel.allocate(childBox, flags)
  },
  showLabel: function (animate, targetWidth) {
        // need to turn width back to preferred.
    var setToZero
    if (this._label.width < 2) {
      this._label.set_width(-1)
      setToZero = true
    } else if (this._label.width < (this._label.text.length * 7) - 5 || this._label.width > (this._label.text.length * 7) + 5) {
      this._label.set_width(-1)
    }
    let naturalWidth = this._label.get_preferred_width(-1)
    var width = Math.min(targetWidth || naturalWidth, 150)
    if (setToZero) {
      this._label.width = 1
    }
    if (!animate) {
      this._label.width = width
      return
    }
    this._label.show()
    Tweener.addTween(this._label, {
      width: width,
      time: BUTTON_BOX_ANIMATION_TIME,
      transition: 'easeOutQuad'
    })
  },

  hideLabel: function (animate) {
    if (!animate) {
      this._label.width = 1
      this._label.hide()
      return
    }

    Tweener.addTween(this._label, {
      width: 1,
      time: BUTTON_BOX_ANIMATION_TIME,
      transition: 'easeOutQuad',
      onCompleteScope: this,
      onComplete: function () {
        this._label.hide()
      }
    })
  }
}

// Button with icon and label.  Click events
// need to be attached manually, but automatically
// highlight when a window of app has focus.

function AppButton () {
  this._init.apply(this, arguments)
}

AppButton.prototype = {
  __proto__: IconLabelButton.prototype,

  _init: function (parent) {
    this.icon_size = Math.floor(parent._applet._panelHeight - 4)
    this.app = parent.app
    this.icon = this.app.create_icon_texture(this.icon_size)
    this._applet = parent._applet
    this._parent = parent
    this.isFavapp = parent.isFavapp
    IconLabelButton.prototype._init.call(this, this)

    if (this.isFavapp) {
      this._isFavorite(true)
    }

    this.metaWorkspaces = {}

    this._trackerSignal = this._applet.tracker.connect('notify::focus-app', Lang.bind(this, this._onFocusChange))
    this._updateAttentionGrabber(null, null, this._applet.showAlerts)
    this._applet.settings.connect('changed::show-alerts', Lang.bind(this, this._updateAttentionGrabber))
  },

  _onFocusChange: function () {
        // If any of the windows associated with our app have focus,
        // we should set ourselves to active
    if (this._hasFocus()) {
      this.actor.add_style_pseudo_class('focus')
      this.actor.remove_style_class_name('window-list-item-demands-attention')
      this.actor.remove_style_class_name('window-list-item-demands-attention-top')
      this._needsAttention = false
    } else {
      this.actor.remove_style_pseudo_class('focus')
    }
  },

  _setWatchedWorkspaces: function (workspaces) {
    this.metaWorkspaces = workspaces
  },

  _hasFocus: function () {
    var workspaceIds = []

    _.each(this.metaWorkspaces, function(metaWorkspace){
      workspaceIds.push(metaWorkspace.workspace.index())
    })

    var windows = _.filter(this.app.get_windows(), function(win){
      return workspaceIds.indexOf(win.get_workspace().index()) >= 0
    })

    var hasTransient = false
    var handleTransient = function(transient){
      if (transient.has_focus()) {
        hasTransient = true
        return false
      }
      return true
    };

    for (let i = 0, len = windows.length; i < len; i++) {
      if (windows[i].minimized) {
        continue
      }
      if (windows[i].has_focus()) {
        return true
      }
      windows[i].foreach_transient(handleTransient)
    }
    return hasTransient
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
    var windows = this.app.get_windows()
    for (let i = 0, len = windows.length; i < len; i++) {
      if (_.isEqual(windows[i], window)) {
        this.getAttention()
        return true
      }
    }
    return false
  },

  _isFavorite: function (isFav) {
    this.isFavapp = isFav
    if (isFav) {
      this.setStyle('panel-launcher app-is-favorite')
      this._label.text = ''
    } else {
      this.setStyle('window-list-item-box app-list-item-box')
      if (this._applet.orientation == St.Side.TOP) {
        this.actor.add_style_class_name('window-list-item-box-top')
      } else if (this._applet.orientation == St.Side.BOTTOM) {
        this.actor.add_style_class_name('window-list-item-box-bottom')
      } else if (this._applet.orientation == St.Side.LEFT) {
        this.actor.add_style_class_name('window-list-item-box-left')
      } else if (this._applet.orientation == St.Side.RIGHT) {
        this.actor.add_style_class_name('window-list-item-box-right')
      }
    }
  },

  destroy: function () {
    this._applet.tracker.disconnect(this._trackerSignal)
    this._container.destroy_children()
    this._container.destroy()
    this.actor.destroy()
    if (this._urgent_signal) {
      global.display.disconnect(this._urgent_signal)
    }
    if (this._attention_signal) {
      global.display.disconnect(this._attention_signal)
    }
  }
}

// Button tied to a particular metaWindow.  Will raise
// the metaWindow when clicked and the label will change
// when the title changes.

function WindowButton () {
  this._init.apply(this, arguments)
}

WindowButton.prototype = {
  __proto__: IconLabelButton.prototype,

  _init: function (params) {
    params = Params.parse(params, {
      parent: null,
      isFavapp: false,
      metaWindow: null
    })
    var parent = params.parent
    this._applet = parent._applet
    this.appList = parent.appList
    this.metaWindow = params.metaWindow
    this.app = parent.app
    this.isFavapp = params.isFavapp
    this.orientation = parent.orientation
    if (!this.app) {
      this.app = this._applet.tracker.get_window_app(this.metaWindow)
    }
    this.icon_size = Math.floor(this._applet._panelHeight - 4)
    this.icon = this.app.create_icon_texture(this.icon_size)
    this.iconLabelButton = IconLabelButton.prototype._init.call(this, this)
    this.signals = []
    this._numLabel.hide()
    if (this.isFavapp) {
      this.setStyle('panel-launcher')
    }

    this.actor.connect('button-release-event', Lang.bind(this, this._onButtonRelease))
        // We need to keep track of the signals we add to metaWindow so we can delete them when we are
        // destroyed. Signals we add to any of our actors will get destroyed in the destroy() function automatically
    if (this.metaWindow) {
      this.signals.push(this.metaWindow.connect('notify::appears-focused', Lang.bind(this, this._onFocusChange)))
      this.signals.push(this.metaWindow.connect('notify::title', Lang.bind(this, this._onTitleChange)))
      this._applet.settings.connect('changed::title-display', Lang.bind(this, function () {
          this._onTitleChange();
      }));

      this._onFocusChange()
    }

    this._onTitleChange()
        // Set up the right click menu
    this.rightClickMenu = new AppletDir.specialMenus.AppMenuButtonRightClickMenu(this, this.actor)
    this._menuManager = new PopupMenu.PopupMenuManager(this)
    this._menuManager.addMenu(this.rightClickMenu)
  },

  destroy: function () {
    if (this.metaWindow) {
      this.signals.forEach(Lang.bind(this, function (s) {
        this.metaWindow.disconnect(s)
      }))
      if (this._urgent_signal) {
        global.display.disconnect(this._urgent_signal)
      }
      if (this._attention_signal) {
        global.display.disconnect(this._attention_signal)
      }
    }
    this.rightClickMenu.destroy()
    this._container.destroy_children()
    this._container.destroy()
    this.actor.destroy()
  },

  _onButtonRelease: function (actor, event) {
    if (event.get_state() & Clutter.ModifierType.BUTTON1_MASK && this.isFavapp || event.get_state() & Clutter.ModifierType.SHIFT_MASK && event.get_state() & Clutter.ModifierType.BUTTON1_MASK) {
      this.app.open_new_window(-1)
      this._animate()
      return
    }
    if (event.get_state() & Clutter.ModifierType.BUTTON1_MASK) {
      this._windowHandle(false)
    }
    if (event.get_state() & Clutter.ModifierType.BUTTON2_MASK && !this.isFavapp) {
      if (this.rightClickMenu && this.rightClickMenu.isOpen) {
        this.rightClickMenu.toggle()
      }

      this.app.open_new_window(-1)
    }
  },

  handleDragOver: function (source, actor, x, y, time) {
    if (this.isFavapp) {
      return false
    }
    else if (source instanceof WindowButton) {
      return DND.DragMotionResult.CONTINUE
    }

    if (typeof (this.appList.dragEnterTime) == 'undefined') {
      this.appList.dragEnterTime = time
    } else {
      if (time > (this.appList.dragEnterTime + 3000)) {
        this.appList.dragEnterTime = time
      }
    }

    if (time > (this.appList.dragEnterTime + 300)) {
      this._windowHandle(true)
    }
    return false
  },

  acceptDrop: function (source, actor, x, y, time) {
    return false
  },

  _windowHandle: function (fromDrag) {
    if (this.metaWindow.has_focus()) {
      if (fromDrag) {
        return
      }
      this.metaWindow.minimize(global.get_current_time())
    } else {
      if (this.metaWindow.minimized) {
        this.metaWindow.unminimize(global.get_current_time())
      }
      this.metaWindow.activate(global.get_current_time())
    }
  },

  _onFocusChange: function () {
    if (this._hasFocus()) {
      this.actor.add_style_pseudo_class('focus')
      this.actor.remove_style_class_name('window-list-item-demands-attention')
      this.actor.remove_style_class_name('window-list-item-demands-attention-top')
    } else {
      this.actor.remove_style_pseudo_class('focus')
    }
  },

  _hasFocus: function () {
    if (this.metaWindow.minimized) {
      return false
    }

    if (this.metaWindow.has_focus()) {
      return true
    }

    var transientHasFocus = false
    var handleTransient = function(transient){
      if (transient.has_focus()) {
        transientHasFocus = true
        return false
      }
      return true
    };
    this.metaWindow.foreach_transient(handleTransient)
    return transientHasFocus
  },

  _animate: function () {
    Tweener.addTween(this.actor, {
      opacity: 70,
      time: 1.0,
      transition: 'linear',
      onCompleteScope: this,
      onComplete: function () {
        Tweener.addTween(this.actor, {
          opacity: 255,
          time: 0.5,
          transition: 'linear'
        })
      }
    })
  },

  _onTitleChange: function () {
    var title = ''
    var appName = ''
    if (!this.isFavapp) {
      title = this.metaWindow.get_title()
      appName = this.app.get_name()
    }
    var titleType = this._applet.settings.getValue('title-display')
    if (titleType === TitleDisplay.Title) {
      // Some apps take a long time to set a valid title.  We don't want to error
      // if title is null
      if (title) {
        this.setText(title)
      } else {
        this.setText(appName)
      }
      return
    } else if (titleType === TitleDisplay.App) {
      if (appName) {
        this.setText(appName)
        return
      }
    } else {
      this.setText('')
    }
  }
}

// A box that will hold a bunch of buttons

function ButtonBox () {
  this._init.apply(this, arguments)
}

ButtonBox.prototype = {
  _init: function (params) {
    params = Params.parse(params, {})
    this.actor = new St.BoxLayout({
      style_class: 'window-icon-list-buttonbox'
    })
    this.actor._delegate = this
  },

  add: function (button) {
    this.actor.add_actor(button.actor)
    this.hidefav()
  },

  remove: function (button) {
    this.actor.remove_actor(button.actor)
    this.hidefav()
  },

  clear: function () {
    this.actor.destroy_children()
  },

  hidefav: function () {
    var child = this.actor.get_children()
    if (child.length == 1) {
      child[0].show()
    } else {
      child[0].hide()
    }
  },

  destroy: function () {
    this.actor.get_children().forEach(Lang.bind(this, function (button) {
      button._delegate.destroy()
    }))
    this.actor.destroy()
    this.actor = null
  }
}

function _Draggable (actor, params) {
  this._init(actor, params)
}

_Draggable.prototype = {
  __proto__: DND._Draggable.prototype,

  _grabActor: function () {
        // Clutter.grab_pointer(this.actor);
    this._onEventId = this.actor.connect('event', Lang.bind(this, this._onEvent))
  },
  _onButtonPress: function (actor, event) {
    if (this.inhibit) {
      return false;
    }

    if (event.get_button() != 2) {
      return false;
    }

    if (Tweener.getTweenCount(actor)) {
      return false;
    }

    this._buttonDown = true;
    this._grabActor();

    let [stageX, stageY] = event.get_coords();
    this._dragStartX = stageX;
    this._dragStartY = stageY;

    return false;
  },
}

function makeDraggable (actor, params) {
  return new _Draggable(actor, params)
}