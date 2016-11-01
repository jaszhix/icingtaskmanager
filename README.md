Icing Task Manager
=============

This is a fork of the unfinished development branch of [Window List With App Grouping](https://github.com/jake-phy/WindowIconList/) applet, originally by jake-phy who forked the code from [GNOME Shell Window List](https://github.com/siefkenj/gnome-shell-windowlist/). This applet is one of the reasons I continue to use Cinnamon, and after seeing the development branch quietly having many more features and being unreleased for months, I decided to try to continue the work with a hard fork.

### Changes from the original version

  * Ability to move windows between monitors is now fixed.
  * More theme-agnostic close button than the one found on the development branch.
  * Integrated a [pull request](https://github.com/jake-phy/WindowIconList/pull/155) by mswiszcz, added optional icon size control.
  * Formatting of code for readability.

See more changes in the [changelog](https://github.com/jaszhix/icingtaskmanager/blob/master/CHANGELOG.md).

Importing pinned apps from the Window List With App Grouping applet
--------------
  * Go to directory: ~/.cinnamon/configs/WindowListGroup@jake.phy@gmail.com
  * Open the JSON file with a text editor.
  * Go to line 55, or to a block that starts with "pinned-apps".
  * Select and copy the block beginning with "pinned-apps" and all of its contents between the brackets.
  * Go to directory: ~/.cinnamon/configs/IcingTaskManager@json
  * Open the JSON file, replace Icing configuration's "pinned-apps" block with the one you copy. Ensure only the key ("pinned-apps"), its brackets, and its contents are replaced. Make sure the ending bracket has a trailing comma. Do not change the filename.

Firefox history
--------------
You will need to install the gir1.2-gda-5.0 package to have Firefox's history show up in its context menu.

Changelog

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