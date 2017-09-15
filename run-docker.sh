#!/bin/bash

CONTAINER=lms
IMAGE=molobrakos/$CONTAINER:latest

DIR=$HOME/.docker-$CONTAINER

CONFIG_DIR=$DIR/config
CACHE_DIR=$DIR/cache
LOG_DIR=$DIR/logs
MUSIC_DIR=$DIR/music

mkdir -p $CONFIG_DIR
mkdir -p $CACHE_DIR
mkdir -p $LOG_DIR
mkdir -p $MUSIC_DIR

docker stop $CONTAINER
docker rm $CONTAINER
docker pull $IMAGE

docker run -d --name $CONTAINER \
       -p 9000:9000 \
       -p 3483:3483 \
       -p 3483:3483/udp \
       -v /etc/localtime:/etc/localtime:ro \
       -v $CONFIG_DIR:/config \
       -v $CACHE_DIR:/cache \
       -v $LOG_DIR:/logs \
       -v $MUSIC_DIR:/music \
       -v $HOME/src/lms-mobileskin/m:/usr/share/squeezeboxserver/HTML/m:ro \
       $IMAGE \
       --nobrowsecache

