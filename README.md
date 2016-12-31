Icing Task Manager
=============

**Attention**
The Cinnamon Spices website is being moved to Github and applets cannot be updated currently. You can download the latest release from the repository in the mean time. Click the "X Releases" link in the Code tab.
Extract the file into your ~/.local/share/cinnamon/applets/IcingTaskManager@json directory.

This is a fork of the unfinished development branch of [Window List With App Grouping](https://github.com/jake-phy/WindowIconList/) applet, originally by jake-phy who forked the code from [GNOME Shell Window List](https://github.com/siefkenj/gnome-shell-windowlist/).

### Changes from the original version

See the [changelog](https://github.com/jaszhix/icingtaskmanager/blob/master/CHANGELOG.md).

### Importing pinned apps from the Window List With App Grouping applet

**Automatic**

  * Clone the repository or download ```importPinned.py```.
  * Run ```python importPinned.py```

**Manual**

  * Go to directory: ~/.cinnamon/configs/WindowListGroup@jake.phy@gmail.com
  * Open the JSON file with a text editor.
  * Go to line 55, or to a block that starts with "pinned-apps".
  * Select and copy the block beginning with "pinned-apps" and all of its contents between the brackets.
  * Go to directory: ~/.cinnamon/configs/IcingTaskManager@json
  * Open the JSON file, replace Icing configuration's "pinned-apps" block with the one you copied. Ensure only the key ("pinned-apps"), its brackets, and its contents are replaced. Make sure the ending bracket has a trailing comma. Do not change the filename.

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
*  Monitor logging output: ```tail -f -n100 ~/.cinnamon/glass.log```
