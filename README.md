Icing Task Manager
=============

This is a fork of the unfinished development branch of [Window List With App Grouping](https://github.com/jake-phy/WindowIconList/) applet, originally by jake-phy who forked the code from [GNOME Shell Window List](https://github.com/siefkenj/gnome-shell-windowlist/). This applet is one of the reasons I continue to use Cinnamon, and after seeing the development branch quietly having many more features and being unreleased for months, I decided to try to continue the work with a hard fork.

### Changes from the original version

  * Ability to move windows between monitors is now fixed.
  * More theme-agnostic close button than the one found on the development branch.
  * Integrated a [pull request](https://github.com/jake-phy/WindowIconList/pull/155) by mswiszcz, added optional icon size control.
  * Formatting of code for readability.

See more changes in the [changelog](https://github.com/jaszhix/icingtaskmanager/blob/master/CHANGELOG.md).

### Importing pinned apps from the Window List With App Grouping applet

  * Go to directory: ~/.cinnamon/configs/WindowListGroup@jake.phy@gmail.com
  * Open the JSON file with a text editor.
  * Go to line 55, or to a block that starts with "pinned-apps".
  * Select and copy the block beginning with "pinned-apps" and all of its contents between the brackets.
  * Go to directory: ~/.cinnamon/configs/IcingTaskManager@json
  * Open the JSON file, replace Icing configuration's "pinned-apps" block with the one you copied. Ensure only the key ("pinned-apps"), its brackets, and its contents are replaced. Make sure the ending bracket has a trailing comma. Do not change the filename.

### Firefox history

You will need to install the gir1.2-gda-5.0 package to have Firefox's history show up in its context menu. Afterwards, you will need to restart Cinnamon for the changes to come into effect.

### Usage

You can install the applet from the [Cinnamon Spices](https://cinnamon-spices.linuxmint.com/applets/view/269) website.

### Contributing

*  Use [Node 6.x](https://github.com/nodesource/distributions).
```sh
curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
sudo apt-get install -y nodejs
```
*  Install node modules: ```npm install```
*  Install gulp globally if you haven't already. ```sudo npm install -g gulp```
*  Start transpile watch task: ```gulp spawn-watch```
*  Open the run dialogue with ALT+F2 and type ```lg``` to open the Looking Glass. After you make an edit, go to the Extensions tab, right-click Icing Task Manager, and click "Reload Code".