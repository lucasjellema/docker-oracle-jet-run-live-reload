#!/bin/sh
CONTAINER_ALREADY_STARTED="CONTAINER_ALREADY_STARTED_PLACEHOLDER"
TARGET_DIR=${APPLICATION_ROOT_DIRECTORY-''}
if [ ! -e $CONTAINER_ALREADY_STARTED ]; then
    touch $CONTAINER_ALREADY_STARTED
    echo "-- First container startup --"
    # this branch is only executed when the container is first started
    cd /tmp
    # prepare the actual JET app from GitHub
    mkdir app
    git clone $GITHUB_URL app
    echo "GIT repo with Oracle JET application was cloned to /tmp/app/${TARGET_DIR}"
    cd /tmp/app/$TARGET_DIR
    #install dependencies for the JET application app
    npm install
    #build the deployable JET application from the sources
    ojet build
    #copy built JET application to /tmp/jet-on-node/public
    cp -a ./web/. /tmp/jet-on-node/public
    #copy files in ./web/jet-on-node to /tmp/jet-on-node to extend server side JET handling
    cp -a ./web/jet-on-node/. /tmp/jet-on-node
    #start  both the reload app (in the background) and (using nodemon) the actual Node app
    cd /tmp/reloader
    echo "starting reload app and nodemon"
    (echo "start reload";npm start; echo "reload app finished") &
    cd /tmp/jet-on-node;
    echo "starting nodemon for JET app copied to /tmp/jet-on-node/public";
    nodemon --delay 2.5 --watch public
else
    echo "-- Not first container startup --"
    cd /tmp/reloader
    (echo "start reload";npm start; echo "reload app finished") &
    cd /tmp/jet-on-node;
    echo "starting nodemon for JET app copied to /tmp/jet-on-node/public";
    nodemon --delay 2.5 --watch public
fi
