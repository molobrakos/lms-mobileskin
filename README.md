# Responsive / Mobile skin for Slimserver (Logitech media server)

**N.B: Not actively developed/maintained.
Deprecated in favor of the superior https://github.com/CDrummond/lms-material skin/plugin which are more actively developed/maintained.**

![ScreenShot](screenshots/screenshot_01.png)
![ScreenShot](screenshots/screenshot_02.png)

## Installation

Either:

1. Open the LMS GUI
2. Click on Settings
3. Select the Plugins tab
4. At bottom of the page add the repo URL: https://raw.githubusercontent.com/molobrakos/lms-mobileskin/master/public.xml
5. Install the plugin and enable as usual

Or:

1. Download release.zip from https://github.com/molobrakos/lms-mobileskin/releases/latest
2. Check on the information-page in the LMS-settings for your plugin-folders
3. Copy (or symlink) the ```m/``` directory to server skin directory (e.g. ```/usr/share/squeezeboxserver/HTML/m```)
Example
```
cp -a m /usr/share/squeezeboxserver/HTML/m
```
4. Restart LMS

Or:

1. Check or the source from github with git clone
2. etc.

## Usage

1. Access the skin through ```http://<yourserver>:9000/m/```.
2. Select "Add to start screen" in your device, if supported.

## Device compatibility

See wiki here: https://github.com/molobrakos/lms-mobileskin/wiki/Device-compatibility
Please add any device missing.

## Bugs

Please add bugs/issues here https://github.com/molobrakos/lms-mobileskin/issues

## Development

It helps turning off the server HTML cache, by appending ```--nobrowsecache``` when starting squeezeboxserver.

The development directory can be mounted in a docker container for easy development.
Example:

```
docker pull molobrakos:lms
docker run -d --name lms \
       -p 9000:9000 \
       -p 3483:3483 \
       -p 3483:3483/udp \
       -v /etc/localtime:/etc/localtime:ro \
       -v $CONFIG_DIR:/config \
       -v $CACHE_DIR:/cache \
       -v $LOG_DIR:/logs \
       -v $MUSIC_DIR:/music \
       -v $HOME/src/lms-mobileskin/m:/usr/share/squeezeboxserver/HTML/m:ro \
       molobrakos:lms \
       --nobrowsecache
```

## Community

For discussions, errors and feature requests: http://forums.slimdevices.com/showthread.php?107988-Mobile-responsive-skin

## FAQ

Q: I selected the mobile skin as default skin and now I can not go back

A: Visit http://<server>:9000/Default and change back to the default skin
