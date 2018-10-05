var path = require('path');
const http = require('http');
const url = require('url');
const fs = require('fs');
const octokit = require('@octokit/rest')()  //https://github.com/octokit/rest.js and https://octokit.github.io/rest.js/
const shell = require('shelljs');

var APP_VERSION = "0.0.14";

var JETWebComponentLoader = {}

module.exports = JETWebComponentLoader

JETWebComponentLoader.init = function (app) {
  console.log(`JETWebComponentLoader Module (version ${APP_VERSION}) has been loaded and is initializing`)

  console.log("Register handler for path /aboutCustom")
  app.get('/aboutJETWebComponentLoader', function (req, res) {
    var about = {
      "about": "about operation on JETWebComponentLoader",
      "PORT": process.env.PORT,
      "APP_VERSION ": APP_VERSION
      , "JET_WEB_COMPONENTS_CONFIG": jetWebComponentsConfig
    }
    res.json(about);
  })

  var jetWebComponentsConfigExists = false

  var jetWebComponentsConfig = {}
  const jetWebComponentsBasePath = '/js/jet-composites/'

  loadJETWebComponentsConfig();
  if (jetWebComponentsConfigExists) {
    // loop over entries in config and create handler for fetching each jet-composites with phase run from live endpoint
    jetWebComponentsConfig.forEach(function (webComponent) {
      console.log("register reload handler for path " + "/update/" + webComponent.name
        + " for Git source " + webComponent.github.owner + "/" + webComponent.github.repo + (webComponent.github.componentPath ? webComponent.github.componentPath : jetWebComponentsBasePath))
      // any request at /js/jet-composites/<name of jet web component>
      // should intercepted by a handler function that is registered next
      app.get("/update/" + webComponent.name, getJETWebComponentReloaderFromGit(webComponent))

      if (webComponent.phase === "run" && webComponent['live-endpoint']) {
        console.log("register live handler for path " + jetWebComponentsBasePath + webComponent.name + " for endpoint " + webComponent['live-endpoint'])
        // any request at /js/jet-composites/<name of jet web component>
        // should intercepted by a handler function that is registered next
        app.get(jetWebComponentsBasePath + webComponent.name + "/*", getJETWebComponentRequestHandler(webComponent['live-endpoint'], webComponent.name))
      }
    })
    const GITHUB_WEBHOOK_PATH = '/github/push'
    app.post("GITHUB_WEBHOOK_PATH", getHandleGitHubWebHookTrigger())


    // create GitHub authentication token
    var gitToken = process.env.GITHUB_TOKEN || "0bceb8a6b23eebd87369418b5854d5f434436901"
    octokit.authenticate({
      type: 'token',
      token: gitToken
    })
  }


  /*
  TODO:
   - handle GitHub WebHook Push - to also reload a Jet WebComponent when one of its source was changed
  */


  // respond to a GitHub WebHook trigger (see: https://technology.amis.nl/2018/03/20/handle-a-github-push-event-from-a-web-hook-trigger-in-a-node-application/)
  // When it receives such a request, it will perform a Git pull in the app sub directory (from where this application runs) 
  function getHandleGitHubWebHookTrigger() {
    function handleGitHubWebHookTrigger(req, res) {
      console.log("Received GitHub WebHook Trigger event ")
      var githubEvent = req.body
      // - githubEvent.head_commit is the last (and frequently the only) commit
      // - githubEvent.pusher is the user of the pusher pusher.name and pusher.email
      // - timestamp of final commit: githubEvent.head_commit.timestamp
      // - branch:  githubEvent.ref (refs/heads/master)


      // test for each of the configured JET Web Components if they are involved in the commit and if so, update them
      jetWebComponentsConfig.forEach(function (webComponent) {
        var jetWebComponentSourcePath =   webComponent.github.componentPath ? webComponent.github.componentPath : "src/js/jet-composites/" + webComponent.name

        var commits = {}
        if (githubEvent.commits)
          commits = githubEvent.commits.reduce(
            function (agg, commit) {
              agg.messages = agg.messages + commit.message + ";"
              agg.filesTouched = agg.filesTouched.concat(commit.added).concat(commit.modified).concat(commit.removed)
                .filter(file => file.indexOf(jetWebComponentSourcePath) > -1)
              return agg
            }
            , { "messages": "", "filesTouched": [] })

        var push = {
          "finalCommitIdentifier": githubEvent.after,
          "pusher": githubEvent.pusher,
          "timestamp": githubEvent.head_commit.timestamp,
          "branch": githubEvent.ref,
          "finalComment": githubEvent.head_commit.message,
          "commits": commits
        }
        console.log("WebHook Push Event: " + JSON.stringify(push))
        if (push.commits.filesTouched.length > 0) {
          console.log("This commit involves changes to the "+jetWebComponent.name+" component, so let's update the JET WebComponent for it ")
          // now go and reload
          installComposite(jetWebComponent, "./public/js/jet-composites/" + jetWebComponent.name)
        }
      })
    }
    return handleGitHubWebHookTrigger

  }

  function loadJETWebComponentsConfig() {
    console.log("loading config")
    const configFilePath = './public/js/jet-composites/jet-composites.json'
    if (fs.existsSync(configFilePath)) {
      try {
        var data = fs.readFileSync(configFilePath, 'utf8')
        jetWebComponentsConfig = JSON.parse(data);
        console.log('jet-composites.json was found and correctly loaded')
        jetWebComponentsConfigExists = true

      } catch (e) {
        console.log(`Error getting the file: ${e}.`);
        jetWebComponentsConfigExists = false
      }
    }
    else
      jetWebComponentsConfigExists = false
    console.log("JET Config " + JSON.stringify(jetWebComponentsConfig))
  }

  function getJETWebComponentReloaderFromGit(jetWebComponent) {
    var jetWebComponent = jetWebComponent;
    function JETWebComponentReloaderFromGit(req, res) {
      var about = {
        "about": "Reloading JET WebComponent " + jetWebComponent.name + " from " + jetWebComponent.github.repo
      }
      res.json(about);
      // now go and reload
      installComposite(jetWebComponent, "./public/js/jet-composites/" + jetWebComponent.name)
    }
    return JETWebComponentReloaderFromGit
  }

  function getJETWebComponentRequestHandler(endpoint, jetWebComponentName) {
    var jetWebComponentLiveEndpoint = endpoint
    var jetWebComponentName = jetWebComponentName
    var basePathLength = (jetWebComponentsBasePath + jetWebComponentName).length + 1
    function handleResourceRequest(req, res) {
      var requestedResource = req.url.substr(basePathLength)
      console.log("request composite resource " + requestedResource)
      console.log(`${req.method} ${requestedResource}`);
      // parse URL
      const parsedUrl = url.parse(requestedResource);
      // extract URL path
      let pathname = `${parsedUrl.pathname}`;
      // maps file extention to MIME types
      const mimeType = {
        '.ico': 'image/x-icon',
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.eot': 'appliaction/vnd.ms-fontobject',
        '.ttf': 'aplication/font-sfnt'
      };

      //  handleResourceFromLocalFileSystem(res,mimeType,   compositeBasePath + pathname)
      handleResourceFromCompositesServer(res, mimeType, pathname, jetWebComponentLiveEndpoint)
      //http://127.0.0.1:3100/jet-composites/input-country/view.html

    }
    return handleResourceRequest
  }


  async function handleResourceFromCompositesServer(res, mimeType, requestedResource, jetWebComponentLiveEndpoint) {
    var reqUrl = jetWebComponentLiveEndpoint + "/" + requestedResource
    console.log(reqUrl)
    // fetch resource and return
    var options = url.parse(reqUrl);
    options.method = "GET";
    options.agent = false;

    //   options.headers['host'] = options.host;
    http.get(reqUrl, function (serverResponse) {
      console.log('<== Received res for', serverResponse.statusCode, reqUrl);
      console.log('\t-> Request Headers: ', options);
      console.log(' ');
      console.log('\t-> Response Headers: ', serverResponse.headers);

      serverResponse.pause();

      serverResponse.headers['access-control-allow-origin'] = '*';

      switch (serverResponse.statusCode) {
        // pass through.  we're not too smart here...
        case 200: case 201: case 202: case 203: case 204: case 205: case 206:
        case 304:
        case 400: case 401: case 402: case 403: case 404: case 405:
        case 406: case 407: case 408: case 409: case 410: case 411:
        case 412: case 413: case 414: case 415: case 416: case 417: case 418:
          res.writeHeader(serverResponse.statusCode, serverResponse.headers);
          serverResponse.pipe(res, { end: true });
          serverResponse.resume();
          break;

        // fix host and pass through.  
        case 301:
        case 302:
        case 303:
          serverResponse.statusCode = 303;
          serverResponse.headers['location'] = 'http://localhost:' + PORT + '/' + serverResponse.headers['location'];
          console.log('\t-> Redirecting to ', serverResponse.headers['location']);
          res.writeHeader(serverResponse.statusCode, serverResponse.headers);
          serverResponse.pipe(res, { end: true });
          serverResponse.resume();
          break;

        // error everything else
        default:
          var stringifiedHeaders = JSON.stringify(serverResponse.headers, null, 4);
          serverResponse.resume();
          res.writeHeader(500, {
            'content-type': 'text/plain'
          });
          res.end(process.argv.join(' ') + ':\n\nError ' + serverResponse.statusCode + '\n' + stringifiedHeaders);
          break;
      }

      console.log('\n\n');
    });
  }
}

function handleResourceFromLocalFileSystem(res, mimeType, requestedResource) {
  var resourcePath = './public' + compositeBasePath + requestedResource
  console.log(`resourcepath ${resourcePath}`)
  fs.exists(resourcePath, function (exist) {
    if (!exist) {
      // if the file is not found, return 404
      res.statusCode = 404;
      res.end(`File ${resourcePath} not found!`);
      return;
    }
    // if is a directory, then look for index.html
    if (fs.statSync(resourcePath).isDirectory()) {
      resourcePath += '/index.html';
    }
    // read file from file system
    fs.readFile(resourcePath, function (err, data) {
      if (err) {
        res.statusCode = 500;
        res.end(`Error getting the file: ${err}.`);
      } else {
        // based on the URL path, extract the file extention. e.g. .js, .doc, ...
        const ext = path.parse(resourcePath).ext;
        // if the file is found, set Content-type and send data
        res.setHeader('Content-type', mimeType[ext] || 'text/plain');
        res.end(data);
      }
    });
  });
}


const targetDirectory = "" // at runtime this is public instead of src

async function installComposite(composite, targetProjectDirectory) {
  var repo = composite.github.repo;
  var nameComposite = composite.name
  var path = composite.github.componentPath ? composite.github.componentPath : "src/js/jet-composites/" + nameComposite
  var owner = composite.github.owner
  // TODO:
  // - present a pretty report of what was created/updated
  // - print instructions on including composite component in the application
  //   * add 'jet-composites/<composite name>/loader to define section in viewModel'
  //   * check component.json for all properties to set (especially mandatory ones) (perhaps even list a summary from component.json)
  // commit supersedes tag supersedes branch if they are all defined
  var ref = composite.github.commit ? composite.github.commit : (composite.github.tag ? composite.github.tag : (composite.github.branch ? composite.github.branch : 'master'))

  console.log(`Installing Composite ${composite.name} 
  from ${ path} on ${ref} in ${composite.github.owner}\\${composite.github.repo} 
  into ${targetProjectDirectory + targetDirectory}`
  )
  // the assumption is that the JET WebComponent is located in the path /js/jet-composites/<name of component>  
  processGithubDirectory(owner, repo, ref
    , path, path
    , targetProjectDirectory)
}

// let's assume that if the name ends with one of these extensions, we are dealing with a binary file:
const binaryExtensions = ['png', 'jpg', 'tiff', 'wav', 'mp3', 'doc', 'pdf']
var maxSize = 1000000;

// (recursively) download contents of directory path from GitHub owner/repo into targetRoot  
function processGithubDirectory(owner, repo, ref, path, sourceRoot, targetRoot) {
  console.log(`##### processGithubDirectory  path: ${path} sourceroot: ${sourceRoot}
  , targetRoot ${targetRoot}`)
  octokit.repos.getContent({ "owner": owner, "repo": repo, "path": path, "ref": ref })
    .then(result => {
      var targetDir = targetRoot + targetDirectory + path.substr(sourceRoot.length) // strip off sourceroot  
      // check if targetDir exists 
      checkDirectorySync(targetDir)
      result.data.forEach(item => {
        if (item.type == "dir") {
          processGithubDirectory(owner, repo, ref, item.path, sourceRoot, targetRoot)
        } // if directory
        if (item.type == "file") {
          var target = `${targetRoot + targetDirectory + item.path.substr(sourceRoot.length)}`
          if (item.size > maxSize) {
            var sha = item.sha
            octokit.gitdata.getBlob({ "owner": owner, "repo": repo, "sha": item.sha }
            ).then(result => {
              fs.writeFile(target
                , Buffer.from(result.data.content, 'base64').toString('utf8'), function (err, data) { })
            })
              .catch((error) => { console.log("ERROR BIGGA" + error) })
            return;
          }// if bigga
          //  console.log(`get content ${owner}, ${repo}, ${item.path}. ${ref}`)

          octokit.repos.getContent({ "owner": owner, "repo": repo, "path": item.path, "ref": ref })
            .then(result => {
              // write file to targetProjectRoot/nameComposite/path of item
              // if result.meta.content-type indicates a binary type, then do something else...

              if (binaryExtensions.includes(item.path.slice(-3))) {
                fs.writeFile(target
                  , Buffer.from(result.data.content, 'base64'), function (err, data) { reportFile(item, target) })
              } else
                fs.writeFile(target
                  , Buffer.from(result.data.content, 'base64').toString('utf8'), function (err, data) { if (!err) reportFile(item, target); else console.log('Fuotje ' + err) })
            })
            .catch((error) => { console.log("ERROR " + error) })
        }// if file
      })
    }).catch((error) => { console.log("ERROR XXX" + error) })
}//processGithubDirectory

function reportFile(item, target) {
  console.log(`- installed ${item.name} (${item.size} bytes )in ${target}`)
}

function checkDirectorySync(directory) {
  console.log("Check directory " + directory)
  try {
    fs.statSync(directory);
  } catch (e) {
    //        fs.mkdirSync(directory);
    // creates full directory path, including any intermediate nested folders
    shell.mkdir('-p', directory);

    console.log("Created directory: " + directory)
  }
}


