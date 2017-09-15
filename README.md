Responsive / Mobile skin for Logitech media server / Squeezeserver

Installation

Copy m/ directory to skin directory, e.g. /usr/share/squeezeboxserver/HTML/m
cp -a m /usr/share/squeezeboxserver/HTML/m

Usage

Access through http://yourserver:9000/m/

lighttpd

To automatically redirect access to http://muzak (host on local network) to http://muzak:9000/m/ when accessed by a mobile client.

Development

It helps turning off the server HTML cache, by appending --nobrowsecache when starting squeezeboxserver.

The development directory can be mounted in a docker container for easy development.
Example:

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
 

