Changelog

### 3.2.3

  * Re-implemented the ability to un-group apps. Because a lot of code dealing with this was removed from the original version for whatever reason, I found a different solution to achieve this. For now, consider this option a beta mode, and please report issues on the [Github repo](https://github.com/jaszhix/icingtaskmanager/issues).

### 3.2.2

  * Fixed the applet orientation not updating when moving between vertical and horizontal panels.
  * Hover peek shows windows on all monitors again, but only opacifies windows on the monitor the shown window belongs to.
  * Fixed icon sizes not updating on panel height change.
  * The vertical thumbnails option will now be automatically toggled when moving the applet between vertical or horizontal panels, but if the setting is changed, it will stay until the applet is moved to a different orientation again.
  * Unlimited instances of the applet can now be enabled.
  * Partial fix for off-center CSS on vertical panels.

### 3.2.1

  * Fixed a bug causing window backed app buttons to become unresponsive on non-bottom orientation panels in Cinnamon 3.2.

### 3.2.0

  * Added the ability to create shortcuts for window backed apps with a generated icon. This means you can now pin Wine apps, and other apps Cinnamon doesn't know how to relaunch. You must have gnome-exe-thumbnailer installed for icon generation to work. Shortcuts are added to ```~/.local/share/applications```, and icons are saved to ```~/.local/share/icons/hicolor/48x48/apps```. After a shortcut is created and pinned, you must relaunch the app with the pinned launcher to not see duplicate icons.
    * Wine apps running from a non-default prefix is not tested.
  * Fixed a critical bug in importPinned.py.

### 3.1.3

  * Fixed a bug preventing the extension from seeing the last focused window.

### 3.1.2

  * Fixed the wrong window number being displayed after closing an app, when the number display option is Normal or All.
  * Specific fix for Steam in Big Picture Mode, clicking its thumbnail would make it impossible to activate the window through the hover menu while hover peek was on.
  * Removed the "Install Gda" option in the Firefox context menu as FF history feature from the old fork is not known to be working currently, and may be removed later.
  * Enabling the "Enable icon size" option now updates the icon sizes. Disabling requires a Cinnamon restart or extension reload currently.
  * App icons now do not leave the panel area when they are being dragged.

### 3.1.1

  * Fixed a regression causing double icons to appear after switching workspaces.
  * Fixed the right-click menu settings not updating persistently.

### 3.1.0

  * Apps are now draggable using the middle mouse button.
  * Added vertical panel support for Cinnamon 3.2, along with various internal changes for compatibility.
  * Limited recent items in the context menu to 10 items.

### 3.0.10

  * Rewrote parts of the window list handling. 
  * Performance improvements.
  * Localization fixes by [Pandiora](https://github.com/jaszhix/icingtaskmanager/pull/27)

### 3.0.9

  * Fixed app button notification indication.
  * Fixed text not showing beside the app button icons when title display is enabled.
  * Fixed super key + 1 command opening the second pinned app.
  * Quick setting sub-menu icon no longer leaves its allocated area.
  * Changing the icon size setting now updates the applet, and no longer requires restarting Cinnamon.
  * Adjusted the icon padding so icons are more centered.
  * Transient windows that cannot be pinned do not have a pinned option anymore. This may be changed later.

### 3.0.8

  * Partial rewrite of app list and pinned app handling.
  * Added minimize and maximize menu options.
  * Moving windows to monitors through the context menu now brings them to the foreground.
  * Hover Peek now only opacifies windows on the primary monitor.
  * Added a utility to the repository allowing users to import their pinned apps automatically from the original fork.

### 3.0.7

  * Improved the behavior of app button window toggling.
  * Clicking "Move to monitor" now will move all of an app's windows to the specified monitor if more than one is open.
  * Removed option to move an app's windows to the monitor its already on.

### 3.0.6

  * Added ability to toggle an application's window by clicking on its app button.

### 3.0.5

  * German translation added by [Pandiora](https://github.com/jaszhix/icingtaskmanager/pull/4)

### 3.0.4

  * Fixed number display regression.

### 3.0.3

  * Added French translation by [ncelerier](https://github.com/jake-phy/WindowIconList/pull/165)
  * Corrected punctuation and grammatical errors in the settings dialogue.
  * Changed the default option for the number display setting to "Smart".

### 3.0.2

  * Added Russian translation by [magnetx](https://github.com/mswiszcz/WindowIconList/pull/1)

### 3.0.1

  * Disabled hover peek by default. It is a more conservative default setting, and the effect can be overwhelming on multi-monitor setups.

### 3.0.0

  * Ability to move windows between monitors is now fixed.
  * More theme-agnostic close button than the one found on the development branch.
  * Integrated a [pull request](https://github.com/jake-phy/WindowIconList/pull/155) by mswiszcz, added optional icon size control.
  * Formatting of code for readability.

### Original Fork

2.8.0
Added windows 7 styled right click menu. 
	Added firefox appmenu.
Can pin and unpin items without the appmenu closing.
Can now close thumbnails without the thumbnail controller closing.  :)
_____
2.7.5
Themeing
	Fixed a bunch of padding and spacing issue's.
Updated to the new Cinnamon settings
	Added settings to ajust Icon padding allows for larger panel size.
	Added Stackable thumbnails (in right click menu of pinned apps)
	Added vertical Thumbnails (doesn't order right,  made to use when show thumbnails is off)(in right click menu of pinned apps)
	Added show thumbnails (if off use vertical thumbnails for best effect)(in right click menu of pinned apps)
	Added ReArrange (need to enable to arrange apps in different order)(in right click menu of pinned apps)
	Removed ability to use menu favorites.  not compatible with cinnamon settings.
different bug fixes.
Added Stacking Thumbnails :) (right now limited to three rows)
ReAdded KeyBindings using Cinnamon's KeyBindings.
Future Projects:  would like to add windows 7 right click menu functionality (don't promise anything but at the moment it looks possible).
_____
2.7.1
removed keybindings will readd when cinnamon 1.8 comes out.
fixed some of the gshema problems
still some bugs
_____
2.7

Added Highlighting for activity in windows 
Added Keybindings for launching Favorites
___________
2.6.1

fixed cinnamon crashing when schema not loaded
____
2.6 
added option for pinned-apps which are seperate from the menu favorites 
fixed a drag and drop bug
_________
2.5.2

fixed app buttons not closing
fixed title not showing when apps are not grouped
____
2.5.1

fixed openoffice bug
fixed thumbnail bug
____
2.5

Lots of Bugfixes

___________

2.4

added gesettings
added option to sort thumbnail by when they were opened & set option to default
fixed problem with windows in favorite groups not focusing right after resarting cinnamon

___________

2.2

fixed cinnamon freezing
updated to work in gnome 3.4

___________

2.1

Added a hover peek feature
Stuck all the options in a seperate file
Bugfixes

___________

2.0

switched base extension to "Window List" by siefkenj for the app-grouping
Added a window number when grouped.
Thumbnail Preveiws:  major bug fixes and a facelift
Favorites:  made them act like Window 7's Pinned Apps

___________

1.5

created more options for thumbnails ( in thumbnailPreveiw.js)
made favorites fully drag and drop compatible with main menu
enabled favorites

-------------------

1.4.2

changed file permissions
updated to cinnamon 1.4
added exit button to window previews
disabled favorites(couldn't get it working in cinnamon 1.4)

-------------------

1.4.1x

added  option to turn favorites on and off in applet.js
and fixed some bugs

-------------------

1.4x

updated window preview style
added favorites actor
intergrated favorites into windowlist right click list

-------------------

 

1.1

added window previews
added,  middle click to close window
changed style to work with cinnamon theme there has to be a better style but i don't know
