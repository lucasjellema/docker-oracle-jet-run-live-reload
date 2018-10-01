#!/bin/sh
cd /tmp/app
git pull
#install dependencies for the Node app
npm install
#rebuild JET application
ojet build
#copy built JET application to /tmp/jet-on-node/public
cp -a ./web/. /tmp/jet-on-node/public
#copy files in ./web/jet-on-node to /tmp/jet-on-node to extend server side JET handling
cp -a ./web/jet-on-node/. /tmp/jet-on-node
