const child_process = require(`child_process`);
const fs = require(`fs`);
const which = require('which')

const yargs = require('yargs');
const { hideBin } = require('yargs/helpers')

const buildArgs = yargs(hideBin(process.argv)).argv

// previous store: electron-builder -c ./package-build-store.json -p never
// previous dist: electron-builder -c ./package-build.json -p always

const commitHash = child_process.execSync(`git rev-parse --short HEAD`).toString().trim();

const config = {
    "appId": "dev.sylviiu.ezytdl",
    "productName": "ezytdl",
    "artifactName": "${productName}-${platform}.${ext}",
    "portable": {
        "artifactName": "${productName}-${platform}-portable.${ext}"
    },
    "compression": "normal",
    "win": {
        "icon": "res/packageIcons/icon-512x512.ico",
        "target": [
            "nsis"
        ]
    },
    "linux": {
        "icon": "res/packageIcons/icon-512x512.png",
        "category": "Utility",
        "target": [
            "tar.gz",
            "AppImage",
            "flatpak"
        ]
    },
    "mac": {
        "icon": "res/packageIcons/icon.icns",
        "category": "public.app-category.utilities",
        "target": [
            "dmg",
        ]
    },
    "flatpak": {
        base: "org.electronjs.Electron2.BaseApp",
        baseVersion: "23.08",
        runtime: "org.freedesktop.Platform",
        runtimeVersion: "23.08",
        finishArgs: [
            "--socket=wayland", 
            "--socket=x11", 
            "--share=ipc", 
            "--device=dri",  
            "--socket=pulseaudio", 
            "--filesystem=home", 
            "--share=network", 
            "--talk-name=org.freedesktop.Notifications", 
            "--filesystem=xdg-videos:ro",
            "--filesystem=xdg-pictures:ro",
            "--filesystem=xdg-download",
            "--talk-name=org.kde.StatusNotifierWatcher",
            "--talk-name=com.canonical.AppMenu.Registrar",
            "--talk-name=com.canonical.indicator.application",
            "--talk-name=com.canonical.Unity.LauncherEntry",
            "--own-name=org.kde.*",
        ],
        modules: [
            {
                "name" : "libvips",
                "builddir" : true,
                "buildsystem" : "meson",
                "config-opts" : [
                    "--buildtype=release",
                    "-Ddeprecated=false",
                    "-Dmodules=disabled"
                ],
                "sources" : [
                    {
                        "type" : "git",
                        "url" : "https://github.com/libvips/libvips.git",
                        "commit" : "74adb395b2ab3a15f4ec8dd734bcbd40811516fd"
                    }
                ]
            }
        ],
    },
    "beforePack": "./build/beforePack.js",
    "afterPack": "./build/afterPack.js",
    "asar": true,
    "asarUnpack": [],
    "files": [
        "html/*.html",
        "html/*.js",
        "html/assets/**/*",
        "html/lib/*",
        "html/topjs/*",
        "html/afterload/*",
        "html/util/*",
        "html/pagescripts/*",
        "html/tabs/*",
        "html/scripts/*",
        "node_modules/**/*",
        "res/*.*",
        "res/trayIcons/*",
        "res/img/*",
        "res/packageIcons/*",
        "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
        "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
        "!**/node_modules/*.d.ts",
        "!**/node_modules/*.bin",
        "!**/node_modules/*.exe",
        "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
        "!.editorconfig",
        "!**/._*",
        "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
        "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}",
        "!**/{appveyor.yml,.travis.yml,circle.yml}",
        "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}",
        "res/*.mp4",
        "dist/trayIcons/*",
        "package.json",
        "index.js",
        "init.js",
        "build-init.json",
        "init/*.js",
        "server.js",
        "getConfig.js",
        "defaultConfig.json",
        "configStrings.json",
        "configDescriptions.json",
        "util/*.js",
        "util/*.json",
        "util/*/*.js",
        "core/*.js",
        "core/*.json",
        "core/ipc/*/*.js",
        "core/authentication/*.js",
        "core/depcheck/*/*.js",
        "core/depcheck/*.js",
        "core/*.js",
        "devscripts/testrun.js",
        "devscripts/*/*.js",
        "checks/*.js"
    ],
    "extraMetadata": {
        commitHash,
        fullCommitHash: child_process.execSync(`git rev-parse HEAD`).toString().trim(),
        buildNumber: buildArgs.buildNumber || -1,
    },
};

const pkg = JSON.parse(fs.readFileSync(`./package.json`).toString());

which(`npm`).then(async npm => {
    const spawnProc = (path, cwd, testrun) => {
        const spawnPath = path == `npm` ? npm : path;

        console.log(`Spawning ${spawnPath} at cwd ${cwd}`);

        const proc = child_process.spawn(spawnPath, path == `npm` ? [`run`, `s`, `--`, ...(testrun ? [`--testrun`] : [])] : [...(testrun ? [`--testrun`] : [])], { cwd });

        let passed = false;

        const data = data => {
            const str = data.toString().trim();
            console.log(str);

            if(str.includes(`TESTRUN PASSED.`)) {
                console.log(`Passed testrun!`);
                passed = true;
            }
        }

        proc.stdout.on(`data`, data);
        proc.stderr.on(`data`, data);

        proc.on(`error`, (err) => {
            console.log(`Testrun errored with ${err}`);
            global.quitting = true;
            process.exit(1);
        })

        proc.on(`close`, (code) => {
            const exitWithCode = passed ? 0 : 1
            console.log(`Testrun closed with code ${code}; exiting with code ${exitWithCode}`);
            global.quitting = true;
            process.exit(exitWithCode);
        });
    }

    const start = async (testrun) => {
        if(process.argv.find(s => s == `--from-source`)) {
            console.log(`Running from source...`)
            spawnProc(`npm`, __dirname, testrun)
        } else {
            if(process.platform == `darwin`) {
                spawnProc(require(`path`).join(__dirname, `dist`, `mac`, `${config.productName}.app`, `Contents`, `MacOS`, `${config.productName}`), require(`path`).join(__dirname, `dist`), testrun)
            } else {
                const folder = fs.readdirSync(`./dist`).find(s => s.endsWith(`-unpacked`) && fs.existsSync(`./dist/` + s + `/`));
            
                if(!folder) {
                    console.log(`No unpacked folder found!`);
                    process.exit(1);
                } else {
                    console.log(`Found unpacked folder ${folder}!`);
            
                    const file = fs.readdirSync(`./dist/${folder}/`).find(s => s.startsWith(`ezytdl`));
            
                    if(!file) {
                        console.log(`No file found!`);
                        process.exit(1);
                    } else {
                        console.log(`Found file ${file}!`);
            
                        const cwd = require(`path`).join(__dirname, `dist`, folder)
                        const path = require(`path`).join(cwd, file);
            
                        spawnProc(path, cwd, testrun)
                    }
                }
            }
        }
    };

    const build = () => new Promise(async res => {
        if(process.argv.find(s => s == `--from-source`)) {
            console.log(`packing (not building)...`)
            child_process.execFileSync(await which(`node`), [`build`, `nopack`, `nightly`, `--build-number`, `1`], { stdio: "inherit" });
            console.log(`packed!`);
            res();
        } else {
            console.log(`packing...`)
            child_process.execFileSync(await which(`node`), [`build`, `pack`, `nightly`, `--build-number`, `1`], { stdio: "inherit" });
            console.log(`packed!`);
            res();
        }
    })

    if(process.argv.find(s => s == `start`)) {
        console.log(`running start`)
        build().then(() => start(false))
    } else if(process.argv.find(s => s == `test`)) {
        console.log(`running test`)
        build().then(() => start(true))
    } else {
        console.log(`Building for ${process.platform}... (${process.env["CSC_LINK"] && process.env["CSC_KEY_PASSWORD"] ? "SIGNED" : "UNSIGNED"})`);
        
        if(process.argv.find(s => s == `store`)) {
            console.log(`Using store compression...`);
            config.compression = "store";
        };
        
        if(process.argv.find(s => s == `noasar`)) {
            console.log(`Disabling asar...`);
            config.asar = false;
        }
        
        if(process.argv.find(s => s == `publish`)) {
            console.log(`Publishing...`);
            config.publish = {
                "provider": "github",
                "owner": "sylviiu",
                "repo": "ezytdl",
                "vPrefixedTagName": false,
                "releaseType": "draft"
            };
        } else if(process.argv.find(s => s == `nightly`)) {
            console.log(`Using nightly build...`);

            if(!buildArgs.buildNumber) {
                console.log(`No build number found! (--build-number)`);
                process.exit(1);
            }
        
            config.extraMetadata.version = `${pkg.version}-dev.${buildArgs.buildNumber}`;
        
            //config.productName += `nightly`;
        
            //config.appId += `nightly`;
            
            config.publish = {
                "provider": "github",
                "owner": "sylviiu",
                "repo": "ezytdl",
                "vPrefixedTagName": false,
                "releaseType": "draft"
            };
        }

        console.log(`Building:\n| ${config.productName} (${config.appId})\n| version: ${config.extraMetadata.version}\n| commit: ${config.extraMetadata.commitHash}\n| full commit: ${config.extraMetadata.fullCommitHash}\n| build number: ${config.extraMetadata.buildNumber}`)

        if(process.argv.find(s => s == `pack`)) {
            console.log(`Pack flag found (removing targets)...`);

            config.win.target = [];
            config.linux.target = [];
            config.mac.target = [];
        }

        if(process.argv.find(s => s == `nopack`) || process.argv.find(s => s == `pack`)) {
            console.log(`Not fully building, removing signatures...`);
            
            delete process.env["CSC_LINK"];
            delete process.env["CSC_KEY_PASSWORD"];
        }

        if(!process.argv.find(s => s == `nopack`)) {
            config.extraMetadata.buildDate = Date.now();

            fs.writeFileSync(`./build.json`, JSON.stringify(config, null, 4));
            
            console.log(`Wrote config!`);
            
            console.log(`Spawning npm at ${npm}`);

            const procArgs = [`run`, `electron-builder`, `--`, `-c`, `./build.json`, ...(process.argv.find(s => s == `pack`) ? [`--dir`] : []), ...(config.publish ? [`-p`, `always`] : [`-p`, `never`])]

            console.log(`Spawning npm with args "${procArgs.join(` `)}"`);
            
            const proc = child_process.spawn(npm, procArgs, { stdio: "inherit" });
            
            proc.on(`close`, (code) => {
                console.log(`Build closed with code ${code}`);
            
                if(fs.existsSync(`./build.json`)) fs.unlinkSync(`./build.json`);
            })
        } else {
            console.log(`Not packing (nopack arg sent)`);
            process.exit(0);
        }
    }
})