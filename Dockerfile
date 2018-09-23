FROM node:10
#copy the Node Reload server - exposed at port 4500
COPY reloader /tmp/reloader
COPY jet-on-node /tmp/jet-on-node
RUN cd /tmp/reloader && npm install
RUN cd /tmp/jet-on-node && npm install
EXPOSE 4500
RUN npm install -g nodemon
RUN npm install -g @oracle/ojet-cli
COPY startUpScript.sh /tmp
COPY gitRefresh.sh /tmp
CMD ["chmod", "+x",  "/tmp/startUpScript.sh"]
RUN /bin/bash -c 'chmod +x /tmp/gitRefresh.sh'
ENTRYPOINT ["sh", "/tmp/startUpScript.sh"]