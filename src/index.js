// system
var fs = require("fs");
var path = require("path");
var process = require("process");
var packageJson = require("../package.json");
// utils
var get = require("get");
var _ = require("lodash");
var ora = require("ora");
var sh = require("shelljs");
var unzip = require("unzipper");
// babel
var babelrc = readJson(
    path.resolve(path.normalize(path.join(__dirname, "..", ".babelrc")))
);
var parser = require("@babel/parser");
var core = require("@babel/core");
var traverse = require("@babel/traverse").default;
var generate = require("@babel/generator").default;
var types = require("@babel/types");
var {transform} = core;
function readJson(file) {
    var ctn = fs.readFileSync(file, "UTF-8");
    return JSON.parse(ctn);
}


function isClassPropertyAndThatName(path, propertyName) {
    return invertUtils.isThatType(path, "ClassProperty") &&
        _.get(path, "node.key.name") === propertyName;
}

const taro_wx_methodname_map = {
    onLaunch: {
        name: "componentWillMount"
    },
    onShow: {
        name: "componentDidShow"
    },
    onHide: {
        name: "componentDidHide"
    }
};

var utils = {
    ora(text) {
        return ora(text).start();
    },
    makeOraChange(oraref, text, methodFuncName) {
        oraref.color = "red";
        oraref.text = text;
        oraref[methodFuncName]();
    },
    checkTargetDir(targetWeappSourceDir) {
        var oraref = utils.ora("正在检查传入的文件夹参数");
        if (
            _.isEmpty(targetWeappSourceDir) ||
            !fs.existsSync(targetWeappSourceDir)
        ) {
            utils.makeOraChange(oraref, "文件夹不存在，无法继续", "fail");
            process.exit(ERRCODE.NODIREXIST);
        }
        if (!utils.isDir(targetWeappSourceDir)) {
            utils.makeOraChange(
                oraref,
                "目标是一个文件，不是文件夹！请指定微信小程序项目的根目录(比如说app.js、app.json那一层的父目录)",
                "fail"
            );
        }
        utils.makeOraChange(
            oraref,
            `找到目标文件夹，接下来进行转换处理工作: ${targetWeappSourceDir}`,
            "succeed"
        );
    },
    sleep(times) {
        return new Promise(r => {
            setTimeout(r, times);
        });
    },
    isDir(dir) {
        var statInfo = fs.lstatSync(dir);
        return statInfo.isDirectory();
    },
    getCmdMap() {
        var remainPosArr = _.drop(process.argv, 2);
        if (_.isEmpty(remainPosArr)) {
            return null;
        }
        var cmdmap = {};
        var tmparrForCrtCmd = null;
        var crtCmdNameWhichPushingArr = null;
        _.forEach(remainPosArr, (x, d, n) => {
            if (_.startsWith(x, "-")) {
                if (!_.isNil(tmparrForCrtCmd)) {
                    cmdmap[crtCmdNameWhichPushingArr] = tmparrForCrtCmd;
                }
                tmparrForCrtCmd = [];
                crtCmdNameWhichPushingArr = x;
            } else {
                tmparrForCrtCmd.push(x);
            }
        });
        cmdmap[crtCmdNameWhichPushingArr] = tmparrForCrtCmd;
        return cmdmap;
    }
};

var ERRCODE = {
    NODIREXIST: -10,
    HASEXIST: -11,
    DOWNLOADFAILED: -12,
    MULTIPLEERROR: -13
};

// entry func
async function entryfunc() {
    var cmdmap = utils.getCmdMap();
    if (_.isEmpty(cmdmap) || (_.size(cmdmap) === 1 && !_.isNil(cmdmap["-h"]))) {
        var infostr = `欢迎使用${packageJson.name}(${
      packageJson.version
    })，以下是具体命令：

    -h 使用帮助
    -i 微信小程序源码存放位置(目录)。因为文件命名与目录架构有N种可能，同时也考虑了约定优于配置的设计思想，本工具主要参考官方demo(https://github.com/wechat-miniprogram/miniprogram-demo)
    -o TaroJS的存放位置(目录且未创建)。为了避免命令(taro init)多参数以及未来不确定因素的干扰，本工具使用git clone的方式进行代码的存放，如果你想要版本高可以根据tarojs官方进行升级改造

`;
        console.log(infostr);
        process.exit();
    }
    await handleWeapp({
        cmdmap
    });
}

// handle weapp
async function handleWeapp({cmdmap}) {
    var targetWeappSourceDir = _.first(cmdmap["-i"]);
    var targetWeappDestDir = _.first(cmdmap["-o"]);
    if (!_.isEmpty(targetWeappDestDir)) {
        targetWeappDestDir = path.resolve(targetWeappDestDir);
    }
    if (!_.isEmpty(targetWeappSourceDir)) {
        targetWeappSourceDir = path.resolve(targetWeappSourceDir);
    }
    utils.checkTargetDir(targetWeappSourceDir);
    if (fs.existsSync(targetWeappDestDir)) {
        utils.ora("转换后存放目录已经存在，请重新输入").fail();
        process.exit(ERRCODE.HASEXIST);
    }
    if (_.isEmpty(targetWeappDestDir)) {
        var tmpval = 1;
        do {
            targetWeappDestDir = path.normalize(
                path.join(targetWeappSourceDir, "..", "tarojsinvert" + tmpval)
            );
            tmpval++;
        } while (
            fs.existsSync(targetWeappDestDir) ||
            fs.existsSync(targetWeappDestDir + "tmp")
        );
    }

    utils.ora(`转换后存放路径为:${targetWeappDestDir}`).succeed();
    var downloadStr = `https://codeload.github.com/LaiHuanMin/tarojs-invert-template/zip/master`;
    var downloadFileName = targetWeappDestDir + ".zip";
    var tmpTargetWeappDestDir = targetWeappDestDir + "tmp";
    var templateFolderName = `tarojs-invert-template-master`;
    var oraref4download = utils.ora("正在下载TaroJS官方Template，请保持网络畅通");
    try {
        await new Promise((resolve, reject) => {
            get(downloadStr).toDisk(downloadFileName, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
        utils.makeOraChange(oraref4download, "下载完毕，准备解压", "succeed");
        await new Promise((r, n) => {
            var stream = fs.createReadStream(downloadFileName);
            stream
                .pipe(
                    unzip.Extract({
                        path: tmpTargetWeappDestDir
                    })
            )
                .promise()
                .then(r, n);
        });
        sh.rm("-rf", downloadFileName);
        sh.mv(
            path.join(tmpTargetWeappDestDir, templateFolderName),
            targetWeappDestDir
        );
        utils.ora("解压完毕，正在解析处理中").succeed();
        fs.rmdirSync(tmpTargetWeappDestDir);
        await invertWeappGlobalInfo({
            targetWeappDestDir,
            targetWeappSourceDir
        });
    // sh.exec("rm tarojsinvert* -rf")
    } catch (fail) {
        utils.makeOraChange(oraref4download, fail.message, "fail");
        process.exit(ERRCODE.MULTIPLEERROR);
    }
}

var invertUtils = {
    // findchildren(path, findfunc) {
    //     var getnodebody = path => _.get(path, 'node.body', []);
    //     var body = getnodebody(path);
    //     if (!_.isEmpty(body)) {
    //         for (let i = 0; i < _.size(body); i++) {
    //             var eachchildpath = _.get(body, i);
    //             var result = findfunc(eachchildpath);
    //             if (!_.isNil(result)) {
    //                 return result;
    //             } else {
    //                 var eachchild_body = getnodebody(eachchildpath);
    //                 var childresult = this.findchildren(eachchildpath, findfunc);
    //                 if( (childresult) ) {
    //                     return childresult;
    //                 }
    //             }
    //         }
    //     } else {
    //         return null;
    //     }
    // },
    getCalcAstValue(strobj) {
        var ast = core.parse(`a = ${strobj}`, babelrc);
        return _.get(ast, "program.body.0.expression.right");
    },
    traverseAst(targetappjsast, enterfunc, mergearg) {
        traverse(
            targetappjsast,
            _.merge(
                {
                    enter: enterfunc
                },
                mergearg
            )
        );
    },
    isthatname(path, name) {
        return _.isEqual(_.get(path, `node.id.name`), name);
    },
    isThatType(path, typeval) {
        return _.isEqual(_.get(path, `node.type`), typeval);
    },
    ast2str(targetappjsast, options) {
        return core.transformFromAst(targetappjsast, options);
    },
    createInfoMap({sourcefiles, dir}) {
        var sourcefilesmap = {};
        _.forEach(sourcefiles, (x, d, n) => {
            var crtpath = path.normalize(path.join(dir, ...x));
            sourcefilesmap[_.join(x, ",")] = {
                path: crtpath,
                getctn: () => {
                    return fs.readFileSync(crtpath, "UTF-8");
                },
                exists() {
                    return fs.existsSync(crtpath);
                }
            };
        });
        return sourcefilesmap;
    }
};

async function invertWeappGlobalInfo({targetWeappDestDir, targetWeappSourceDir}) {
    var {sourcefilesmap, target_appjs_ast, sourceAppJsAst, target_appjs_detail} = getSourceAndTargetFilesMapInfo(targetWeappSourceDir, targetWeappDestDir);

    // appjson and other json
    var project_configjson_detail = sourcefilesmap["project.config.json"];
    if (project_configjson_detail.exists()) {
        var project_configjson_obj = require(project_configjson_detail.path);
        _.set(project_configjson_obj, "miniprogramRoot", "./dist");
        utils.ora("已复制project.config.json并配置配置相关属性").succeed();
        var jsonpath = project_configjson_detail.path;
        var outputpath = path.join(targetWeappDestDir, path.basename(jsonpath));
        fs.writeFileSync(outputpath, JSON.stringify(project_configjson_obj));
    }

    // no app.json direct copy, in fact i make it into target appjs ast which at config class attributes
    // NOUSE: sh.cp(sourcefilesmap['app.json'].path, path.join(targetWeappDestDir, "app.json"));
    var targetappjson_ctn = sourcefilesmap["app.json"].getctn();
    var calc_astvalue_for_appjson = invertUtils.getCalcAstValue(
        targetappjson_ctn
    );
    var targetAppJsClzast = null;
    var targetAppJsFirstNotImportAst = null;
    invertUtils.traverseAst(target_appjs_ast, function(path) {
        if (types.isProgram(path)) {
            path.traverse({
                enter(cpath) {
                    if (targetAppJsFirstNotImportAst) {
                        return;
                    }
                    if (!types.isImportDeclaration(cpath) && types.isProgram(cpath.parent) && !targetAppJsFirstNotImportAst) {
                        targetAppJsFirstNotImportAst = cpath;
                    }
                }
            })
        }

        if (
            isClassPropertyAndThatName(path, "config")
        ) {
            _.set(path, "node.value", calc_astvalue_for_appjson);
        }
        var mapClassName = 'App'
        var isMapClassAndThatName = isClassAndThatName({
            path,
            mapClassName
        });
        if (isMapClassAndThatName) {
            targetAppJsClzast = path;
        }
    });




    // get create args, which is object expression
    var otherExpressArrWhichInSource = [];
    invertUtils.traverseAst(sourceAppJsAst, path => {

        insertEachMethodsAndPropertiesIntoMainClass({
            path,
            targetAppJsClzast,
            taro_wx_methodname_map
        });

        if (types.isProgram(path.parent) && !(
            types.isExpressionStatement(path) && types.isCallExpression(path.node.expression) && _.get(path, 'node.expression.callee.name') === "App"
            )) {
            // not app, and other expression, so i will make this express into the top of the target ast  
            otherExpressArrWhichInSource.push(path.node)
        }
    });
    targetAppJsFirstNotImportAst.replaceWithMultiple(otherExpressArrWhichInSource.concat([
        targetAppJsFirstNotImportAst.node
    ]));

    // ready write target appjs files, which is invertUtils.ast2str(target_appjs_ast)
    // TODO: 

    fs.writeFileSync(target_appjs_detail.path, invertUtils.ast2str(target_appjs_ast).code);
}

function isClassAndThatName({path, mapClassName}) {
    return types.isClassDeclaration(path) && invertUtils.isthatname(path, mapClassName);
}

function insertEachMethodsAndPropertiesIntoMainClass({path, targetAppJsClzast, taro_wx_methodname_map, mainClassName="App"}) {
    var isSourceAppFunc = path => _.isEqual(_.get(path, "node.callee.name"), mainClassName);
    if (isSourceAppFunc(path)) {
        if (types.isCallExpression(path)) {
            var sourceCreateArgs = _.get(path, "node.arguments.0.properties");
            if (!_.isNil(targetAppJsClzast)) {
                var mapNameToCtnFunc = x => {
                    return {
                        name: x.key.name,
                        value: x
                    };
                };
                var filterForConfigOrRenderFunc = (x, d) => {
                    return d !== "config" && d !== "render";
                };
                var source_methods_map = _.chain(sourceCreateArgs)
                    .map(mapNameToCtnFunc)
                    .mapKeys(x => x.name)
                    .filter(filterForConfigOrRenderFunc)
                    .value();
                var target_methods_astarr = _.get(targetAppJsClzast, "node.body.body", []);
                var target_methods_map = _.chain(target_methods_astarr)
                    .map(mapNameToCtnFunc)
                    .mapKeys(x => x.name)
                    .filter(filterForConfigOrRenderFunc)
                    .value();
                _.forEach(source_methods_map, (x, d, n) => {
                    var wxtaro_mapname = taro_wx_methodname_map[x.name];
                    var mergeobj = {};
                    if (!_.isNil(wxtaro_mapname)) {
                        _.set(mergeobj, "key.name", wxtaro_mapname.name);
                    }
                    if (x.value.type === "ObjectProperty") {
                        _.set(mergeobj, "type", "ClassProperty");
                    }
                    if (x.value.type === "ObjectMethod") {
                        _.set(mergeobj, "type", "ClassMethod");
                    }
                    var finishvalue = _.merge({}, x.value, mergeobj);
                    target_methods_astarr.push(finishvalue);
                });
            }
        }
    }
}

function getSourceAndTargetFilesMapInfo(targetWeappSourceDir, targetWeappDestDir) {
    var sourcefiles = [["app.js"], ["app.json"], ["project.config.json"]];
    var sourcefilesmap = invertUtils.createInfoMap({
        sourcefiles,
        dir: targetWeappSourceDir
    });
    var source_appjs_detail = sourcefilesmap["app.js"];
    var sourceAppJsAst = core.parse(source_appjs_detail.getctn(), {
        plugins: babelrc.plugins
    });
    var targetfiles = [["src", "app.js"]];
    var targetfilesmap = invertUtils.createInfoMap({
        sourcefiles: targetfiles,
        dir: targetWeappDestDir
    });
    // get target appjs, and will save json into the appjs ast tree
    var target_appjs_detail = targetfilesmap["src,app.js"];
    var target_appjs_ast = core.parse(target_appjs_detail.getctn(), {
        plugins: babelrc.plugins
    });
    return {
        sourcefilesmap,
        target_appjs_ast,
        sourceAppJsAst,
        target_appjs_detail
    };
}

async function copyProjectCodeIntoTargetFolder({targetWeappDestDir, targetWeappSourceDir}) {
    utils.ora("正在复制源项目代码到存放目录中").info();
    var listfiles = _.filter(sh.ls((targetWeappSourceDir)), x => {
        var lowercasetext = _.toLower(x);
        return ['app.js', 'project.config.json'].indexOf(lowercasetext) === -1;
    });
    _.forEach(listfiles, (x, d, n) => {
        sh.cp('-r', path.join(targetWeappSourceDir, x), path.join(targetWeappDestDir, 'src'))
    })
    var appwxssfilepath = path.join(targetWeappDestDir, 'src', 'app.wxss');
    var appcssfilepath = path.join(targetWeappDestDir, 'src', 'app.css');
    sh.mv(appwxssfilepath, appcssfilepath);
    utils.ora("复制项目代码完毕").succeed();
}

async function invertWeappPageContentByAppJsonConfig({targetWeappDestDir, targetWeappSourceDir}) {
    var {sourcefilesmap, target_appjs_ast, sourceAppJsAst, target_appjs_detail} = getSourceAndTargetFilesMapInfo(targetWeappSourceDir, targetWeappDestDir);
    var appJson = readJson(sourcefilesmap['app.json'].path);
    var {pages} = appJson;

    _.forEach(pages, (pageItem, pageIndex) => {
        var ref = utils.ora(`正在处理${pageItem}的相关代码`);
        pageItem = _.replace(pageItem, /\.[\w\W]*?$/, '');
        var targetPageJsWithoutTypeNamePath = path.resolve(path.normalize(path.join(targetWeappDestDir, 'src', pageItem)));
        var targetPageFolder = path.normalize(path.join(targetPageJsWithoutTypeNamePath, '..'));
        var targetPageBaseName = path.basename(targetPageJsWithoutTypeNamePath);
        var createTargetFunc = filetype => path.join(targetPageFolder, targetPageBaseName + "." + filetype);
        var targetPageJsPath = targetPageJsWithoutTypeNamePath + ".js"
        var targetPageJsonPath = createTargetFunc("json");
        var targetPageWxmlPath = createTargetFunc("wxml")
        var targetPageWxssPath = createTargetFunc("wxss")
        // mv wxss to page css
        sh.mv(targetPageWxssPath, _.replace(targetPageWxssPath, /\.wxss/, '.css'));
        var targetPageCssPath = createTargetFunc('css');

        var astOptions = {
            plugins: babelrc.plugins
        };
        var jsonCtn = null;
        if (fs.existsSync(targetPageJsonPath)) {
            jsonCtn = require(targetPageJsonPath);
        }
        var jsCtn = fs.readFileSync(targetPageJsPath, "UTF-8");
        var jsAst = core.parse(jsCtn, astOptions);
        var mapClassNameList = ['Page', 'Component']
        // transform to classname
        invertUtils.traverseAst(jsAst, (path) => {
            var crtClzName = _.get(path, 'node.callee.name');
            if (types.isCallExpression(path) && mapClassNameList.indexOf(crtClzName) !== -1) {
                var properties = path.node.arguments[0].properties;
                var classBodyArr = _.map(properties, (propertyVal) => {
                    if (types.isObjectProperty(propertyVal)) {
                        propertyVal.type = "ClassProperty"
                    }
                    if (types.isObjectMethod(propertyVal)) {
                        propertyVal.type = "ClassMethod";
                    }
                    return propertyVal;
                });
                var clzBody = types.classBody(classBodyArr);
                var newClz = types.classDeclaration(types.identifier(crtClzName), types.identifier('TaroComponent'), clzBody);
                var importStr = `
                import Taro, { Component as TaroComponent } from '@tarojs/taro'
                import './${require('path').basename(targetPageWxssPath)+".css"}' 
                `
                var importAstCtn = core.parse(importStr, astOptions);
                path.replaceWithMultiple([
                    ...importAstCtn.program.body,
                    newClz
                ])
            }
        })
        var clzJsCtn = invertUtils.ast2str(jsAst).code;

        invertUtils.traverseAst(jsAst, (path) => {
            if (
                isClassPropertyAndThatName(path, "config")
                && jsonCtn
            ) {
                _.set(path, "node.value", jsonCtn);
            }

            // var isMapClassAndThatName = isClassAndThatName({
            //     path,
            //     mapClassName: crtClzName
            // });
            // if (isMapClassAndThatName) {
            //     path.find(cpath => {
            //         // console.log(cpath);
            //     })
            // }

        })
        var jsAstCode = invertUtils.ast2str(jsAst).code;
        fs.writeFileSync(targetPageJsPath, jsAstCode);
        utils.makeOraChange(ref, `处理${pageItem}的相关代码完毕`, 'succeed')
    })
}

// invoke entry func
// entryfunc();


//test 
sh.exec("rsync -avz test112/ test111/ --delete")

//test
invertWeappGlobalInfo({
    targetWeappDestDir: path.resolve(path.join(".", "test111")),
    targetWeappSourceDir: path.resolve(path.join(".", "mydemo"))
});
copyProjectCodeIntoTargetFolder({
    targetWeappDestDir: path.resolve(path.join(".", "test111")),
    targetWeappSourceDir: path.resolve(path.join(".", "mydemo"))
});
invertWeappPageContentByAppJsonConfig({
    targetWeappDestDir: path.resolve(path.join(".", "test111")),
    targetWeappSourceDir: path.resolve(path.join(".", "mydemo"))
});


