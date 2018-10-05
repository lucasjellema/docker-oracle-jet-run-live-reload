const octokit = require('@octokit/rest')()  //https://github.com/octokit/rest.js and https://octokit.github.io/rest.js/
const fs = require('fs');
const shell = require('shelljs');
var gitToken = "YOUR GITHUB TOKEN"

octokit.authenticate({
    type: 'token',
    token: gitToken
})

//the jet-composites.json is found as follows:
//1st commandline parameter
//1st commandline parameter/jet-composites.json
//1st commandline parameter/src/js/jet-composites/jet-composites.json
//current-directory/src/js/jet-composites/jet-composites.json

//the root direcory of the target project is found as follows:
//2nd command line parameter
//1st command line parameter (if that refers to a directory that contains a src subdirectory)
//current directory

console.log("command line input " + process.argv[2])
console.log("current workind dir " + process.cwd())
console.log("2nd command line input " + process.argv[3])

var sourceProjectRoot = "src/"
var compositesDirectory = "js/jet-composites/"
const targetDirectory = "/src/" // at runtime this is public instead of src
// NOTE: at runtime this is public instead of src



function deriveJETCompositeConfig(cmdLine, currentWD) {
    //check if cmdline refers to a file [that contains jet-composites configs] 
    //check if cmdline/jet-composites.json does
    //check if cmdline/src/js/jet-composites/jet-composites.json does
    //check if currentWD/jet-composites/jet-composites.json does
    //check if currentWD/src/js/jet-composites/jet-composites.json does
    if (checkIfFile(cmdLine)) { return cmdLine }
    else if (checkIfFile(cmdLine + '/jet-composites.json')) { return cmdLine + '/jet-composites.json' }
    else if (checkIfFile(cmdLine + '/src/js/jet-composites/jet-composites.json')) { return cmdLine + '/src/js/jet-composites/jet-composites.json' }
    else if (checkIfFile(currentWD + '/jet-composites.json')) { return currentWD + '/jet-composites.json' }
    else if (checkIfFile(currentWD + '/src/js/jet-composites/jet-composites.json')) { return currentWD + '/src/js/jet-composites/jet-composites.json' }
    else process.exit(1)
        ;
}

function deriveTargetProjectRoot(cmdLine1, cmdLine2, currentWD) {
    //check if command line parameter exists and refers to an existing directory that contains a src subdirectory)
    // else chck 1st command line parameter (if that refers to a directory that contains a src subdirectory)
    //else current directory

    if (fs.existsSync(cmdLine2) && fs.existsSync(cmdLine2+"/src")) { return cmdLine2 }
    else if (fs.existsSync(cmdLine1) && fs.existsSync(cmdLine1+"/src")) { return cmdLine1 }
    return currentWD
        ;
}


function checkIfFile(fileReference) {
    console.log(`fileReference: ${fileReference}`)
    if (fs.existsSync(fileReference)) {
        try {
            var data = fs.readFileSync(fileReference, 'utf8')
            var compositesRegistry = JSON.parse(data);
            console.log('file was found!!')
            return true

        } catch (e) {
            console.log(`Error getting the file: ${e}.`);
            return false;
        }
    }
    else return false
}//checkIfFile

var compositesRegistry = {}


async function install() {
    var jetCompositesConfig = deriveJETCompositeConfig(process.argv[2], process.cwd())
    console.log("jetCompositesConfig " + jetCompositesConfig)
    var targetProjectDirectory = deriveTargetProjectRoot(process.argv[2], process.argv[3], process.cwd())
    console.log("targetProjectDirectory " + targetProjectDirectory)
    fs.exists(jetCompositesConfig, function (exist) {
        fs.readFile(jetCompositesConfig, 'utf8', function (err, data) {
            if (err) {
                console.log(`Error getting the file: ${err}.`);
            } else {
                // based on the URL path, extract the file extention. e.g. .js, .doc, ...
                //            console.log(JSON.stringify(data))
                compositesRegistry = JSON.parse(data);
                console.log("read from file " + data)
                compositesRegistry.forEach(async function (composite) {
                    let r = await installComposite(composite, targetProjectDirectory)
                })

            }

        })
    })
}

async function installComposite(composite,targetProjectDirectory) {
    var repo = composite.github.repo;
    var nameComposite = composite.name
    var path = composite.github.componentPath? composite.github.componentPath:"src/js/jet-composites/"+nameComposite
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
    into ${targetProjectDirectory + targetDirectory + compositesDirectory}`
    )
    // the assumption is that the JET WebComponent is located in the path /js/jet-composites/<name of component>  
    processGithubDirectory(owner, repo, ref
        ,  path
        , targetProjectDirectory )
}

// let's assume that if the name ends with one of these extensions, we are dealing with a binary file:
const binaryExtensions = ['png', 'jpg', 'tiff', 'wav', 'mp3', 'doc', 'pdf']
var maxSize = 1000000;

// (recursively) download contents of directory path from GitHub owner/repo into targetRoot  
function processGithubDirectory(owner, repo, ref, path, targetRoot) {
    console.log(`##### processGithubDirectory  path: ${path} 
    , targetRoot ${targetRoot}`)
    octokit.repos.getContent({ "owner": owner, "repo": repo, "path": path, "ref": ref })
        .then(result => {
            var targetDir = targetRoot + targetDirectory + path.substr(4) // strip off src; note: +src becomes public for runtime  
            // check if targetDir exists 
            checkDirectorySync(targetDir)
            result.data.forEach(item => {
                if (item.type == "dir") {
                    processGithubDirectory(owner, repo, ref, item.path, targetRoot)
                } // if directory
                if (item.type == "file") {
                    var target = `${targetRoot + targetDirectory + item.path.substr(4)}`
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
    console.log("Check directory "+directory)
    try {
        fs.statSync(directory);
    } catch (e) {
//        fs.mkdirSync(directory);
        // creates full directory path, including any intermediate nested folders
        shell.mkdir('-p', directory);

        console.log("Created directory: " + directory)
    }
}


install().then(console.log("Done installing"))


getTimestampAsString = function (theDate) {
    var sd = theDate ? theDate : new Date();
    try {
        var ts = sd.getUTCFullYear() + '-' + (sd.getUTCMonth() + 1) + '-' + sd.getUTCDate() + 'T' + sd.getUTCHours() + ':' + sd.getUTCMinutes() + ':' + sd.getSeconds();
        return ts;
    } catch (e) { "getTimestampAsString exception " + JSON.stringify(e) }
}
