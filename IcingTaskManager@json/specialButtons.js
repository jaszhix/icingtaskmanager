'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

// vim: expandtab shiftwidth=4 tabstop=8 softtabstop=4 encoding=utf-8 textwidth=99
/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */
// Some app-buttons that display an icon
// and an label
/* jshint moz:true */
var Clutter = imports.gi.Clutter;
var Lang = imports.lang;
var Params = imports.misc.params;
var PopupMenu = imports.ui.popupMenu;
var Cinnamon = imports.gi.Cinnamon;
var St = imports.gi.St;
var Tweener = imports.ui.tweener;
var Meta = imports.gi.Meta;
var DND = imports.ui.dnd;
var Gettext = imports.gettext;
var Mainloop = imports.mainloop;

var BUTTON_BOX_ANIMATION_TIME = 0.5;
var MAX_BUTTON_WIDTH = 150; // Pixels
var FLASH_INTERVAL = 500;

var AppletDir = imports.ui.appletManager.applets['IcingTaskManager@json'];
var Applet = AppletDir.applet;

var TitleDisplay = {
  None: 1,
  App: 2,
  Title: 3
};

function _(str) {
  var resultConf = Gettext.dgettext('IcingTaskManager@json', str);
  if (resultConf != str) {
    return resultConf;
  }
  return Gettext.gettext(str);
}

// Creates a button with an icon and a label.
// The label text must be set with setText
// @icon: the icon to be displayed

function IconLabelButton() {
  this._init.apply(this, arguments);
}

IconLabelButton.prototype = {
  _init: function _init(parent) {
    if (parent.icon === null) throw 'IconLabelButton icon argument must be non-null';
    this._parent = parent;
    this._applet = parent._applet;
    this._icon = parent.icon;
    this.actor = new St.Bin({
      style_class: 'window-list-item-box app-list-item-box',
      reactive: true,
      can_focus: true,
      x_fill: true,
      y_fill: false,
      track_hover: true
    });
    this.actor.height = parent._applet._panelHeight;
    if (this._applet.orientation == St.Side.TOP) this.actor.add_style_class_name('window-list-item-box-top');else this.actor.add_style_class_name('window-list-item-box-bottom');
    this.actor._delegate = this;

    // We do a fancy layout with icons and labels, so we'd like to do our own allocation
    // in a Cinnamon.GenericContainer
    this._container = new Cinnamon.GenericContainer({
      name: 'iconLabelButton'
    });
    this.actor.set_child(this._container);
    this._container.connect('get-preferred-width', Lang.bind(this, this._getPreferredWidth));
    this._container.connect('get-preferred-height', Lang.bind(this, this._getPreferredHeight));
    this._container.connect('allocate', Lang.bind(this, this._allocate));

    // this._icon.set_child(parent.icon);
    this._label = new St.Label();
    this._numLabel = new St.Label({
      style_class: 'window-list-item-label window-icon-list-numlabel'
    });

    this._container.add_actor(this._icon);
    this._container.add_actor(this._label);
    this._container.add_actor(this._numLabel);

    this.setIconPadding();
    this.setIconSize(this._applet.iconSize);

    this._applet.settings.connect('changed::icon-padding', Lang.bind(this, this.setIconPadding));
  },

  setIconPadding: function setIconPadding() {
    this.actor.style = 'padding-bottom: 0px;padding-top:0px; padding-left: ' + this._applet.iconPadding + 'px;padding-right:' + this._applet.iconPadding + 'px;';
  },

  setIconSize: function setIconSize(val) {
    if (this._applet.enableIconSize) {
      this._icon.set_size(val, val);
    }
  },

  setText: function setText(text) {
    if (text) this._label.text = text;
  },

  setStyle: function setStyle(name) {
    if (name) this.actor.set_style_class_name(name);
  },

  getAttention: function getAttention() {
    if (this._needsAttention) return false;

    this._needsAttention = true;
    var counter = 0;
    this._flashButton(counter);
    return true;
  },

  _flashButton: function _flashButton(counter) {
    if (!this._needsAttention) return;

    this.actor.add_style_class_name('window-list-item-demands-attention');
    if (counter < 4) {
      Mainloop.timeout_add(FLASH_INTERVAL, Lang.bind(this, function () {
        if (this.actor.has_style_class_name('window-list-item-demands-attention')) {
          this.actor.remove_style_class_name('window-list-item-demands-attention');
        }
        Mainloop.timeout_add(FLASH_INTERVAL, Lang.bind(this, function () {
          this._flashButton(++counter);
        }));
      }));
    }
  },

  _getPreferredWidth: function _getPreferredWidth(actor, forHeight, alloc) {
    var _icon$get_preferred_w = this._icon.get_preferred_width(forHeight),
        _icon$get_preferred_w2 = _slicedToArray(_icon$get_preferred_w, 2),
        iconMinSize = _icon$get_preferred_w2[0],
        iconNaturalSize = _icon$get_preferred_w2[1];

    var _label$get_preferred_ = this._label.get_preferred_width(forHeight),
        _label$get_preferred_2 = _slicedToArray(_label$get_preferred_, 2),
        labelMinSize = _label$get_preferred_2[0],
        labelNaturalSize = _label$get_preferred_2[1];
    // The label text is starts in the center of the icon, so we should allocate the space
    // needed for the icon plus the space needed for(label - icon/2)


    alloc.min_size = iconMinSize;
    if (this._applet.titleDisplay == 3 && !this._parent.isFavapp) alloc.natural_size = MAX_BUTTON_WIDTH;else alloc.natural_size = Math.min(iconNaturalSize + Math.max(0, labelNaturalSize), MAX_BUTTON_WIDTH);
  },

  _getPreferredHeight: function _getPreferredHeight(actor, forWidth, alloc) {
    var _icon$get_preferred_h = this._icon.get_preferred_height(forWidth),
        _icon$get_preferred_h2 = _slicedToArray(_icon$get_preferred_h, 2),
        iconMinSize = _icon$get_preferred_h2[0],
        iconNaturalSize = _icon$get_preferred_h2[1];

    var _label$get_preferred_3 = this._label.get_preferred_height(forWidth),
        _label$get_preferred_4 = _slicedToArray(_label$get_preferred_3, 2),
        labelMinSize = _label$get_preferred_4[0],
        labelNaturalSize = _label$get_preferred_4[1];

    alloc.min_size = Math.min(iconMinSize, labelMinSize);
    alloc.natural_size = Math.max(iconNaturalSize, labelNaturalSize);
  },

  _allocate: function _allocate(actor, box, flags) {
    // returns [x1,x2] so that the area between x1 and x2 is
    // centered in length

    function center(length, naturalLength) {
      var maxLength = Math.min(length, naturalLength);
      var x1 = Math.max(0, Math.floor((length - maxLength) / 2));
      var x2 = Math.min(length, x1 + maxLength);
      return [x1, x2];
    }
    var allocWidth = box.x2 - box.x1;
    var allocHeight = box.y2 - box.y1;
    var childBox = new Clutter.ActorBox();
    var direction = this.actor.get_text_direction();

    // Set the icon to be left-justified (or right-justified) and centered vertically

    var _icon$get_preferred_s = this._icon.get_preferred_size(),
        _icon$get_preferred_s2 = _slicedToArray(_icon$get_preferred_s, 4),
        iconMinWidth = _icon$get_preferred_s2[0],
        iconMinHeight = _icon$get_preferred_s2[1],
        iconNaturalWidth = _icon$get_preferred_s2[2],
        iconNaturalHeight = _icon$get_preferred_s2[3];

    var _center = center(allocHeight, iconNaturalHeight);

    var _center2 = _slicedToArray(_center, 2);

    childBox.y1 = _center2[0];
    childBox.y2 = _center2[1];

    if (direction == Clutter.TextDirection.LTR) {
      var _ref = [0, Math.min(iconNaturalWidth, allocWidth)];
      childBox.x1 = _ref[0];
      childBox.x2 = _ref[1];
    } else {
      var _ref2 = [Math.max(0, allocWidth - iconNaturalWidth), allocWidth];
      childBox.x1 = _ref2[0];
      childBox.x2 = _ref2[1];
    }
    this._icon.allocate(childBox, flags);
    //        log('allocateA ' + [childBox.x1<0, childBox.x2<0, childBox.y1, childBox.y2] + ' ' + [childBox.x2-childBox.x1, childBox.y2-childBox.y1])
    // Set the label to start its text in the left of the icon
    var iconWidth = childBox.x2 - childBox.x1;

    var _label$get_preferred_5 = this._label.get_preferred_size();

    var _label$get_preferred_6 = _slicedToArray(_label$get_preferred_5, 4);

    minWidth = _label$get_preferred_6[0];
    minHeight = _label$get_preferred_6[1];
    naturalWidth = _label$get_preferred_6[2];
    naturalHeight = _label$get_preferred_6[3];

    var _center3 = center(allocHeight, naturalHeight);

    var _center4 = _slicedToArray(_center3, 2);

    childBox.y1 = _center4[0];
    childBox.y2 = _center4[1];

    if (direction == Clutter.TextDirection.LTR) {
      childBox.x1 = iconWidth;
      childBox.x2 = Math.min(allocWidth, MAX_BUTTON_WIDTH);
    } else {
      childBox.x2 = Math.min(allocWidth - iconWidth, MAX_BUTTON_WIDTH);
      childBox.x1 = Math.max(0, childBox.x2 - naturalWidth);
    }
    this._label.allocate(childBox, flags);
    //        log('allocateB ' + [childBox.x1<0, childBox.x2<0, childBox.y1, childBox.y2] + ' ' + [childBox.x2-childBox.x1, childBox.y2-childBox.y1])
    if (direction == Clutter.TextDirection.LTR) {
      childBox.x1 = -3;
      childBox.x2 = childBox.x1 + this._numLabel.width;
      childBox.y1 = box.y1 - 2;
      childBox.y2 = box.y2 - 1;
    } else {
      childBox.x1 = -this._numLabel.width;
      childBox.x2 = childBox.x1 + this._numLabel.width;
      childBox.y1 = box.y1;
      childBox.y2 = box.y2 - 1;
    }
    this._numLabel.allocate(childBox, flags);
  },
  showLabel: function showLabel(animate, targetWidth) {
    // need to turn width back to preferred.
    var setToZero;
    if (this._label.width < 2) {
      this._label.set_width(-1);
      setToZero = true;
    } else if (this._label.width < this._label.text.length * 7 - 5 || this._label.width > this._label.text.length * 7 + 5) {
      this._label.set_width(-1);
    }

    var _label$get_preferred_7 = this._label.get_preferred_width(-1),
        _label$get_preferred_8 = _slicedToArray(_label$get_preferred_7, 2),
        minWidth = _label$get_preferred_8[0],
        naturalWidth = _label$get_preferred_8[1];

    var width = Math.min(targetWidth || naturalWidth, 150);
    if (setToZero) this._label.width = 1;
    if (!animate) {
      this._label.width = width;
      return;
    }
    this._label.show();
    Tweener.addTween(this._label, {
      width: width,
      time: BUTTON_BOX_ANIMATION_TIME,
      transition: 'easeOutQuad'
    });
  },

  hideLabel: function hideLabel(animate) {
    if (!animate) {
      this._label.width = 1;
      this._label.hide();
      return;
    }

    Tweener.addTween(this._label, {
      width: 1,
      // FIXME: if this is set to 0, a whole bunch of "Clutter-CRITICAL **: clutter_paint_volume_set_width: assertion `width >= 0.0f' failed" messages appear
      time: BUTTON_BOX_ANIMATION_TIME,
      transition: 'easeOutQuad',
      onCompleteScope: this,
      onComplete: function onComplete() {
        this._label.hide();
      }
    });
  }
};

// Button with icon and label.  Click events
// need to be attached manually, but automatically
// highlight when a window of app has focus.

function AppButton() {
  this._init.apply(this, arguments);
}

AppButton.prototype = {
  __proto__: IconLabelButton.prototype,

  _init: function _init(parent) {
    this.icon_size = Math.floor(parent._applet._panelHeight - 4);
    this.app = parent.app;
    this.icon = this.app.create_icon_texture(this.icon_size);
    this._applet = parent._applet;
    this._parent = parent;
    this.isFavapp = parent.isFavapp;
    IconLabelButton.prototype._init.call(this, this);
    if (this.isFavapp) this._isFavorite(true);

    this.metaWorkspaces = {};

    var tracker = Cinnamon.WindowTracker.get_default();
    this._trackerSignal = tracker.connect('notify::focus-app', Lang.bind(this, this._onFocusChange));
    this._updateAttentionGrabber(null, null, this._applet.showAlerts);
    this._applet.settings.connect('changed::show-alerts', Lang.bind(this, this._updateAttentionGrabber));
  },

  _onFocusChange: function _onFocusChange() {
    // If any of the windows associated with our app have focus,
    // we should set ourselves to active

    if (this._hasFocus()) {
      this.actor.add_style_pseudo_class('focus');
      this.actor.remove_style_class_name('window-list-item-demands-attention');
      this.actor.remove_style_class_name('window-list-item-demands-attention-top');
      this._needsAttention = false;
    } else {
      this.actor.remove_style_pseudo_class('focus');
    }
  },

  _setWatchedWorkspaces: function _setWatchedWorkspaces(workspaces) {
    this.metaWorkspaces = workspaces;
  },

  _hasFocus: function _hasFocus() {
    var workspaceIds = [];
    for (var w in this.metaWorkspaces) {
      workspaceIds.push(this.metaWorkspaces[w].workspace.index());
    }
    var windows = this.app.get_windows().filter(function (win) {
      return workspaceIds.indexOf(win.get_workspace().index()) >= 0;
    });
    var hasTransient = false;
    for (var w in windows) {
      var window = windows[w];
      if (window.minimized) continue;
      if (window.has_focus()) return true;

      window.foreach_transient(function (transient) {
        if (transient.has_focus()) {
          hasTransient = true;
          return false;
        }
        return true;
      });
    }
    return hasTransient;
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
    var windows = this._parent.metaWindows;
    for (var w in windows) {
      if (windows[w].win == window) {
        this.getAttention();
        return true;
      }
    }
    return false;
  },

  _isFavorite: function _isFavorite(isFav) {
    this.isFavapp = isFav;
    if (isFav) {
      this.setStyle('panel-launcher app-is-favorite');
      this._label.text = '';
    } else {
      this.setStyle('window-list-item-box app-list-item-box');
      if (this._applet.orientation == St.Side.TOP) this.actor.add_style_class_name('window-list-item-box-top');else this.actor.add_style_class_name('window-list-item-box-bottom');
    }
  },

  destroy: function destroy() {
    var tracker = Cinnamon.WindowTracker.get_default();
    tracker.disconnect(this._trackerSignal);
    this._container.destroy_children();
    this._container.destroy();
    this.actor.destroy();
    if (this._urgent_signal) {
      global.display.disconnect(this._urgent_signal);
    }
    if (this._attention_signal) {
      global.display.disconnect(this._attention_signal);
    }
  }
};

// Button tied to a particular metaWindow.  Will raise
// the metaWindow when clicked and the label will change
// when the title changes.

function WindowButton() {
  this._init.apply(this, arguments);
}

WindowButton.prototype = {
  __proto__: IconLabelButton.prototype,

  _init: function _init(params) {
    params = Params.parse(params, {
      parent: null,
      isFavapp: false,
      metaWindow: null
    });
    var parent = params.parent;
    this._applet = parent._applet;
    this.appList = parent.appList;
    this.metaWindow = params.metaWindow;
    this.app = parent.app;
    this.isFavapp = params.isFavapp;
    this.orientation = parent.orientation;
    if (!this.app) {
      var tracker = Cinnamom.WindowTracker.get_default();
      this.app = tracker.get_window_app(metaWindow);
    }
    this.icon_size = Math.floor(this._applet._panelHeight - 4);
    this.icon = this.app.create_icon_texture(this.icon_size);
    IconLabelButton.prototype._init.call(this, this);
    this.signals = [];
    this._numLabel.hide();
    if (this.isFavapp) this.setStyle('panel-launcher');

    this.actor.connect('button-release-event', Lang.bind(this, this._onButtonRelease));
    // We need to keep track of the signals we add to metaWindow so we can delete them when we are
    // destroyed. Signals we add to any of our actors will get destroyed in the destroy() function automatically
    if (this.metaWindow) {
      this.signals.push(this.metaWindow.connect('notify::appears-focused', Lang.bind(this, this._onFocusChange)));
      this.signals.push(this.metaWindow.connect('notify::title', Lang.bind(this, this._onTitleChange)));
      this._updateAttentionGrabber(null, null, this._applet.showAlerts);
      this._applet.settings.connect('changed::show-alerts', Lang.bind(this, this._updateAttentionGrabber));
      this._applet.settings.connect('changed::title-display', Lang.bind(this, function () {
        this._onTitleChange();
      }));

      this._onFocusChange();
    }
    this._onTitleChange();
    // Set up the right click menu
    this.rightClickMenu = new AppletDir.specialMenus.AppMenuButtonRightClickMenu(this, this.actor);
    this._menuManager = new PopupMenu.PopupMenuManager(this);
    this._menuManager.addMenu(this.rightClickMenu);
  },

  destroy: function destroy() {
    if (this.metaWindow) {
      this.signals.forEach(Lang.bind(this, function (s) {
        this.metaWindow.disconnect(s);
      }));
      if (this._urgent_signal) {
        global.display.disconnect(this._urgent_signal);
      }
      if (this._attention_signal) {
        global.display.disconnect(this._attention_signal);
      }
    }
    this.rightClickMenu.destroy();
    this._container.destroy_children();
    this._container.destroy();
    this.actor.destroy();
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
    if (this.metaWindow == window) {
      this.getAttention();
      return true;
    }
    return false;
  },

  _onButtonRelease: function _onButtonRelease(actor, event) {
    if (event.get_state() & Clutter.ModifierType.BUTTON1_MASK && this.isFavapp || event.get_state() & Clutter.ModifierType.SHIFT_MASK && event.get_state() & Clutter.ModifierType.BUTTON1_MASK) {
      this.app.open_new_window(-1);
      this._animate();
      return;
    }
    if (event.get_state() & Clutter.ModifierType.BUTTON1_MASK) {
      this._windowHandle(false);
    }
    if (event.get_state() & Clutter.ModifierType.BUTTON2_MASK && !this.isFavapp) {
      if (this.rightClickMenu && this.rightClickMenu.isOpen) {
        this.rightClickMenu.toggle();
      }
      this.app.open_new_window(-1);
    }
  },

  handleDragOver: function handleDragOver(source, actor, x, y, time) {
    if (this.isFavapp) return false;else if (source instanceof WindowButton) return DND.DragMotionResult.CONTINUE;

    if (typeof this.appList.dragEnterTime == 'undefined') {
      this.appList.dragEnterTime = time;
    } else {
      if (time > this.appList.dragEnterTime + 3000) {
        this.appList.dragEnterTime = time;
      }
    }

    if (time > this.appList.dragEnterTime + 300) {
      this._windowHandle(true);
    }
    return false;
  },

  acceptDrop: function acceptDrop(source, actor, x, y, time) {
    return false;
  },

  _windowHandle: function _windowHandle(fromDrag) {
    if (this.metaWindow.has_focus()) {
      if (fromDrag) {
        return;
      }
      this.metaWindow.minimize(global.get_current_time());
    } else {
      if (this.metaWindow.minimized) {
        this.metaWindow.unminimize(global.get_current_time());
      }
      this.metaWindow.activate(global.get_current_time());
    }
  },

  _onFocusChange: function _onFocusChange() {
    if (this._hasFocus()) {
      this.actor.add_style_pseudo_class('focus');
      this.actor.remove_style_class_name('window-list-item-demands-attention');
      this.actor.remove_style_class_name('window-list-item-demands-attention-top');
    } else {
      this.actor.remove_style_pseudo_class('focus');
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

  _animate: function _animate() {
    // this.actor.set_z_rotation_from_gravity(0.0, Clutter.Gravity.CENTER)
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

  _onTitleChange: function _onTitleChange() {
    var title = null,
        appName = null;

    if (this.isFavapp) {
      ;
      title = '';
      appName = '';
    } else {
      ;
      var _ref3 = [this.metaWindow.get_title(), this.app.get_name()];
      title = _ref3[0];
      appName = _ref3[1];
    }var titleType = this._applet.settings.getValue('title-display');
    if (titleType === TitleDisplay.Title) {
      // Some apps take a long time to set a valid title.  We don't want to error
      // if title is null
      if (title) {
        this.setText(title);
      } else {
        this.setText(appName);
      }
      return;
    } else if (titleType === TitleDisplay.App) {
      if (appName) {
        this.setText(appName);
        return;
      }
    } else this.setText('');
  }
};

// A box that will hold a bunch of buttons

function ButtonBox() {
  this._init.apply(this, arguments);
}

ButtonBox.prototype = {
  _init: function _init(params) {
    params = Params.parse(params, {});
    this.actor = new St.BoxLayout({
      style_class: 'window-icon-list-buttonbox'
    });
    this.actor._delegate = this;
  },

  add: function add(button) {
    this.actor.add_actor(button.actor);
    this.hidefav();
  },

  remove: function remove(button) {
    this.actor.remove_actor(button.actor);
    this.hidefav();
  },

  clear: function clear() {
    this.actor.destroy_children();
  },

  hidefav: function hidefav() {
    var child = this.actor.get_children();
    if (child.length == 1) {
      child[0].show();
    } else {
      child[0].hide();
    }
  },

  destroy: function destroy() {
    this.actor.get_children().forEach(Lang.bind(this, function (button) {
      button._delegate.destroy();
    }));
    this.actor.destroy();
    this.actor = null;
  }
};

function _Draggable(actor, params) {
  this._init(actor, params);
}

_Draggable.prototype = {
  __proto__: DND._Draggable.prototype,

  _grabActor: function _grabActor() {
    // Clutter.grab_pointer(this.actor);
    this._onEventId = this.actor.connect('event', Lang.bind(this, this._onEvent));
  }
};

function makeDraggable(actor, params) {
  return new _Draggable(actor, params);
}

function MyAppletBox(applet) {
  this._init(applet);
}

MyAppletBox.prototype = {
  _init: function _init(applet) {
    this.actor = new St.BoxLayout({
      style_class: 'window-list-box'
    });
    this.actor._delegate = this;

    this._applet = applet;

    this._dragPlaceholder = null;
    this._dragPlaceholderPos = -1;
    this._animatingPlaceholdersCount = 0;
  },

  handleDragOver: function handleDragOver(source, actor, x, y, time) {
    if (!(source.isDraggableApp || source instanceof DND.LauncherDraggable)) return DND.DragMotionResult.NO_DROP;

    var children = this.actor.get_children();
    var windowPos = children.indexOf(source.actor);

    var pos = 0;

    for (var i in children) {
      if (x > children[i].get_allocation_box().x1 + children[i].width / 2) pos = i;
    }

    if (pos != this._dragPlaceholderPos) {
      this._dragPlaceholderPos = pos;

      // Don't allow positioning before or after self
      if (windowPos != -1 && pos == windowPos) {
        if (this._dragPlaceholder) {
          this._dragPlaceholder.animateOutAndDestroy();
          this._animatingPlaceholdersCount++;
          this._dragPlaceholder.actor.connect('destroy', Lang.bind(this, function () {
            this._animatingPlaceholdersCount--;
          }));
        }
        this._dragPlaceholder = null;

        return DND.DragMotionResult.CONTINUE;
      }

      // If the placeholder already exists, we just move
      // it, but if we are adding it, expand its size in
      // an animation
      var fadeIn;
      if (this._dragPlaceholder) {
        this._dragPlaceholder.actor.destroy();
        fadeIn = false;
      } else {
        fadeIn = true;
      }

      var childWidth;
      var childHeight;
      if (source.isDraggableApp) {
        childWidth = 30;
        childHeight = 24;
      } else {
        childWidth = source.actor.width;
        childHeight = source.actor.height;
      }
      this._dragPlaceholder = new DND.GenericDragPlaceholderItem();
      this._dragPlaceholder.child.width = childWidth;
      this._dragPlaceholder.child.height = childHeight;
      this.actor.insert_actor(this._dragPlaceholder.actor, this._dragPlaceholderPos);
      if (fadeIn) this._dragPlaceholder.animateIn();
    }

    return DND.DragMotionResult.MOVE_DROP;
  },

  acceptDrop: function acceptDrop(source, actor, x, y, time) {
    if (!(source.isDraggableApp || source instanceof DND.LauncherDraggable)) return false;

    if (!(source.isFavapp || source.wasFavapp || source.isDraggableApp || source instanceof DND.LauncherDraggable) || source.isNotFavapp) {
      this.actor.move_child(source.actor, this._dragPlaceholderPos);
      this._clearDragPlaceholder();
      actor.destroy();
      return true;
    }
    this.actor.move_child(source.actor, this._dragPlaceholderPos);
    var app = source.app;

    // Don't allow favoriting of transient apps
    if (!app || app.is_window_backed()) {
      return false;
    }

    var id;
    if (source instanceof DND.LauncherDraggable) id = source.getId();else id = app.get_id();
    var favorites = this._applet.pinned_app_contr().getFavoriteMap();
    var srcIsFavorite = id in favorites;
    var favPos = this._dragPlaceholderPos;

    Meta.later_add(Meta.LaterType.BEFORE_REDRAW, Lang.bind(this, function () {
      var appFavorites = this._applet.pinned_app_contr();
      this._clearDragPlaceholder();
      if (srcIsFavorite) appFavorites.moveFavoriteToPos(id, favPos);else appFavorites.addFavoriteAtPos(id, favPos);
      return false;
    }));
    this._clearDragPlaceholder();
    actor.destroy();
    return true;
  },

  _clearDragPlaceholder: function _clearDragPlaceholder() {
    if (this._dragPlaceholder) {
      this._dragPlaceholder.animateOutAndDestroy();
      this._dragPlaceholder = null;
      this._dragPlaceholderPos = -1;
    }
  }
};