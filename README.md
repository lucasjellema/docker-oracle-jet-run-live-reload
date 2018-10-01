# docker-oracle-jet-run-live-reload
This repository defines a Docker container that takes a GitHub URL and builds and runs the Oracle JET application in the designated repository. Note: the assumption is that the Oracle JET application can run with with Oracle JET 5.2 and that the ojet cli was used for developing the JET application (no support yet for grunt based projects).

Upon changes, a live reload of the application can be performed - either by explicitly invoking the reload endpoint or by configuring a GitHub WebHook.

To build the container image:

docker build -t "ojet-run-live-reload:0.2" .

docker tag ojet-run-live-reload:0.2 lucasjellema/ojet-run-live-reload:0.2
docker push lucasjellema/ojet-run-live-reload:0.2

Run with image in local registry:

docker run --name jet-app -p 3006:3000 -p 4510:4500  -e GITHUB_URL=https://github.com/lucasjellema/webshop-portal-soaring-through-the-cloud-native-sequel -e APPLICATION_ROOT_DIRECTORY=  -e CUSTOM_NODE_MODULE=appcustom -d ojet-run-live-reload:0.2


After pushing the image to Docker Hub

docker run --name jet-app -p 3006:3000 -p 4510:4500  -e GITHUB_URL=https://github.com/lucasjellema/webshop-portal-soaring-through-the-cloud-native-sequel -e APPLICATION_ROOT_DIRECTORY= -d lucasjellema/ojet-run-live-reload:0.2


docker logs jet-app --follow

http://192.168.188.112:3006/

and to reload:
http://192.168.188.112:4510/reload


To peek inside the container:

docker exec -it jet-app /bin/bash


Example:
=========
Running a random Oracle JET sample application (created with ojet CLI) - from GitHub repo https://github.com/vijayveluchamy/ojet-exp-manager

docker run --name jet-app -p 3008:3000 -p 4515:4500  -e GITHUB_URL=https://github.com/vijayveluchamy/ojet-exp-manager -e APPLICATION_ROOT_DIRECTORY= -d lucasjellema/ojet-run-live-reload:0.1

And access the JET application at:
http://192.168.188.112:3008/


Note:
Image lucasjellema/ojet-run-live-reload:0.1 was created using Oracle JET 5.2.0. When the image is built again, the latest available version of Oracle JET is installed. 


https://github.com/gregja/ojetdiscovery

docker run --name jet-app -p 3008:3000 -p 4515:4500  -e GITHUB_URL=https://github.com/gregja/ojetdiscovery -e APPLICATION_ROOT_DIRECTORY= -d lucasjellema/ojet-run-live-reload:0.1



Custom Node Module
==================
This container allows JET applications to influence the server side action of the Node application that serves the JET resources.

Any files in the src/jet-on-node directory in the JET application are copied to /tmp/jet-on-node - where the app module lives that handles resource requests.

The environment variable CUSTOM_NODE_MODULE can be set with the name of a file in this directory that should be loaded by app during startup. If the file indicated by CUSTOM_NODE_MODULE exists, the module is loaded. A call is made to the init function on the custom module and the app module instance is passed as a parameter. This allows the custom module for example to create additional request handlers:

exports.init = function (app) {
  console.log(`Custom Module (version ${APP_VERSION}) has been loaded and is initializing`)

  console.log("Register handler for path /aboutCustom")
  app.get('/aboutCustom', function (req, res) {
    var about = {
      "about": "about operation on soaring portal backend"
      , "APP_VERSION ": APP_VERSION
    }
    res.json(about);
  })
}

Note: at this point there is no mechanism to influence the package.json of the Node application.