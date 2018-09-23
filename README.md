# docker-oracle-jet-run-live-reload
This repository defines a Docker container that takes a GitHub URL and builds and runs the Oracle JET application in the designated repository. Note: the assumption is that the Oracle JET application can run with with Oracle JET 5.2 and that the ojet cli was used for developing the JET application (no support yet for grunt based projects).

Upon changes, a live reload of the application can be performed - either by explicitly invoking the reload endpoint or by configuring a GitHub WebHook.

To build the container image:

docker build -t "ojet-run-live-reload:0.1" .

docker tag ojet-run-live-reload:0.1 lucasjellema/ojet-run-live-reload:0.1
docker push lucasjellema/ojet-run-live-reload:0.1

Run with image in local registry:

docker run --name jet-app -p 3006:3000 -p 4510:4500  -e GITHUB_URL=https://github.com/lucasjellema/webshop-portal-soaring-through-the-cloud-native-sequel -e APPLICATION_ROOT_DIRECTORY= -d ojet-run-live-reload:0.1


After pushing the image to Docker Hub

docker run --name jet-app -p 3006:3000 -p 4510:4500  -e GITHUB_URL=https://github.com/lucasjellema/webshop-portal-soaring-through-the-cloud-native-sequel -e APPLICATION_ROOT_DIRECTORY= -d lucasjellema/ojet-run-live-reload:0.1


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
