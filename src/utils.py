import subprocess
import os
import json
import sys
import random
from collections import OrderedDict

cli = sys.argv

# Work in progress (experimental) transient window handler.

def handleCli():

    if cli[1] == 'get_process':
        try:
            process = subprocess.check_output('cat /proc/'+cli[2]+'/cmdline', shell=True)

            if '.exe' in process:
                if 'Z:' in process:
                    process = process.split('Z:')[1]

                process = process.replace('\\', '/')
                process = process.split('.exe')[0] + '.exe'
                process = 'wine '+process.replace(' ', '\ ')

            process = json.dumps(process)

            if '\u0000' in process:
                process = process.replace('\u0000', ' ')

            process = json.loads(process)

            if not '.exe' in process:

                process = process[:-1]

            if process == 'python mainwindow.py':
                process = 'playonlinux'

            path = os.getenv('HOME')+'/.cinnamon/configs/IcingTaskManager@json'

            try:
                configName = [f for f in os.listdir(path) if os.path.isfile(os.path.join(path, f))]
                configPath = path+'/'+configName[0]

                with open(configPath) as data:    
                    config = json.load(data)
                    
                    try:
                        orderedConfig = OrderedDict([
                            ('WindowList', config['WindowList']), 
                            ('seperator1', config['seperator1']), 
                            ('number-display', config['number-display']), 
                            ('title-display', config['title-display']),
                            ('pinned-apps', config['pinned-apps']),
                            ('pinned-recent', config['pinned-recent']),
                            ('show-alerts', config['show-alerts']),
                            ('show-pinned', config['show-pinned']),
                            ('arrange-pinnedApps', config['arrange-pinnedApps']),
                            ('icon-padding', config['icon-padding']),
                            ('enable-iconSize', config['enable-iconSize']),
                            ('icon-size', config['icon-size']),
                            ('Space1', config['Space1']),
                            ('HoverPeek', config['HoverPeek']),
                            ('seperator2', config['seperator2']),
                            ('enable-hover-peek', config['enable-hover-peek']),
                            ('hover-peek-time', config['hover-peek-time']),
                            ('hover-peek-opacity', config['hover-peek-opacity']),
                            ('Space2', config['Space2']),
                            ('Thumbnails', config['Thumbnails']),
                            ('seperator3', config['seperator3']),
                            ('thumbnail-timeout', config['thumbnail-timeout']),
                            ('thumbnail-size', config['thumbnail-size']),
                            ('show-thumbnails', config['show-thumbnails']),
                            ('vertical-thumbnails', config['vertical-thumbnails']),
                            ('stack-thumbnails', config['stack-thumbnails']),
                            ('sort-thumbnails', config['sort-thumbnails']),
                            ('onclick-thumbnails', config['onclick-thumbnails']),
                            ('Space3', config['Space3']),
                            ('AppMenu', config['AppMenu']),
                            ('show-recent', config['show-recent']),
                            ('closeall-menu-item', config['closeall-menu-item']),
                            ('appmenu-width', config['appmenu-width']),
                            ('firefox-menu', config['firefox-menu']),
                            ('appmenu-number', config['appmenu-number']),
                            ('__md5__', config['__md5__']),
                            ])


                        procArray = process.split('/')
                        paLen = len(procArray)
                        processName = procArray[paLen - 1].title()

                        gMenu = '[Desktop Entry]\n' \
                                'Type=Application\n' \
                                'Encoding=UTF-8\n' \
                                'Name='+processName+'\n' \
                                'Comment='+processName+'\n' \
                                'Exec='+process+'\n' \
                                'Terminal=false\n' \

                        desktopFile = 'icing-'+str(random.random()).split('.')[1]+'.desktop'
                        desktopPath = os.getenv('HOME')+'/.local/share/applications/'+desktopFile

                        with open(desktopPath, 'w') as desktop:
                            desktop.write(gMenu)

                            orderedConfig['pinned-apps']['value'].append(desktopFile)

                            subprocess.check_output('chmod +x '+desktopPath, shell=True)

                            with open(configPath, 'w') as data: 
                                data.write(json.dumps(orderedConfig))

                    except KeyError:
                        print('KeyError')
                        return
            except OSError:
                print('OSError')
                return

        except KeyError:
            ':('
            return

    else:
        subprocess.call('gnome-terminal', shell=True)

handleCli()

