# docker-oracle-jet-run-live-reload
This repository defines a Docker container that takes a GitHub URL and builds and runs the Oracle JET application in the designated repository. Upon changes, a live reload of the application can be performed.


docker build -t "ojet-run-live-reload:0.1" .

docker run --name jet-app -p 3006:3000 -p 4510:4500  -e GITHUB_URL=https://github.com/lucasjellema/webshop-portal-soaring-through-the-cloud-native-sequel -e APPLICATION_ROOT_DIRECTORY=src -d ojet-run-live-reload:0.1
