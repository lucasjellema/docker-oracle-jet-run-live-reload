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
    #start  both the reload app (in the background) and (using nodemon) the actual Node app
    cd /tmp/reloader
    echo "starting reload app and nodemon"
    (echo "start reload";npm start; echo "reload app finished") & 
    cd /tmp/jet-on-node; 
    echo "starting nodemon for JET app copied to /tmp/jet-on-node/public";
    nodemon
else
    echo "-- Not first container startup --"
    cd /tmp/reloader
    (echo "start reload";npm start; echo "reload app finished") &
    cd /tmp/jet-on-node; 
    echo "starting nodemon for JET app copied to /tmp/jet-on-node/public";
    nodemon
fi

