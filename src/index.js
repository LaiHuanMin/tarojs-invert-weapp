// system
var fs = require('fs');
var path = require('path');
var process = require('process')
var packageJson = require('../package.json')
// utils
var get = require('get');
var _ = require('lodash');
var ora = require('ora');
var sh = require('shelljs')
var unzip = require('unzipper');
// babel
var babelrc = readJson(path.resolve(path.normalize(path.join(__dirname, '..', '.babelrc'))));
var parser = require("@babel/parser");
var core = require('@babel/core')
var traverse = require('@babel/traverse').default;
var generate = require('@babel/generator').default;
var types = require('@babel/types')
var {transform} = core;
function readJson(file) {
    var ctn = fs.readFileSync(file, "UTF-8");
    return JSON.parse(ctn);
}


var utils = {

    ora(text) {
        return ora(text).start();
    },
    makeOraChange(oraref, text, methodFuncName) {
        oraref.color = 'red';
        oraref.text = text;
        oraref[methodFuncName]();
    },
    checkTargetDir(targetWeappSourceDir) {
        var oraref = utils.ora("正在检查传入的文件夹参数")
        if (_.isEmpty((targetWeappSourceDir)) || !fs.existsSync(targetWeappSourceDir)) {
            utils.makeOraChange(oraref, '文件夹不存在，无法继续', 'fail')
            process.exit(ERRCODE.NODIREXIST);
        }
        if (!utils.isDir(targetWeappSourceDir)) {
            utils.makeOraChange(oraref, '目标是一个文件，不是文件夹！请指定微信小程序项目的根目录(比如说app.js、app.json那一层的父目录)', 'fail')
        }
        utils.makeOraChange(oraref, `找到目标文件夹，接下来进行转换处理工作: ${targetWeappSourceDir}`, 'succeed')
    },
    sleep(times) {
        return new Promise((r) => {
            setTimeout(r, times)
        })
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
        })
        cmdmap[crtCmdNameWhichPushingArr] = tmparrForCrtCmd;
        return cmdmap;
    }
}

var ERRCODE = {
    NODIREXIST: -10,
    HASEXIST: -11,
    DOWNLOADFAILED: -12,
    MULTIPLEERROR: -13
}

// entry func
async function entryfunc() {
    var cmdmap = utils.getCmdMap();
    if (_.isEmpty(cmdmap) || (_.size(cmdmap) === 1 && !_.isNil(cmdmap["-h"]))) {

        var infostr = `欢迎使用${packageJson.name}(${packageJson.version})，以下是具体命令：

    -h 使用帮助
    -i 微信小程序源码存放位置(目录)。因为文件命名与目录架构有N种可能，同时也考虑了约定优于配置的设计思想，本工具主要参考官方demo(https://github.com/wechat-miniprogram/miniprogram-demo)
    -o TaroJS的存放位置(目录且未创建)。为了避免命令(taro init)多参数以及未来不确定因素的干扰，本工具使用git clone的方式进行代码的存放，如果你想要版本高可以根据tarojs官方进行升级改造

`
        console.log(infostr);
        process.exit()
    }
    await handleWeapp({
        cmdmap,
    })
}

// handle weapp
async function handleWeapp({cmdmap}) {
    var targetWeappSourceDir = _.first(cmdmap["-i"]);
    var targetWeappDestDir = _.first(cmdmap['-o'])
    if (!_.isEmpty(targetWeappDestDir)) {
        targetWeappDestDir = path.resolve(targetWeappDestDir);
    }
    if (!_.isEmpty(targetWeappSourceDir)) {
        targetWeappSourceDir = path.resolve(targetWeappSourceDir);
    }
    utils.checkTargetDir(
        targetWeappSourceDir,
    );
    if (fs.existsSync(targetWeappDestDir)) {
        utils.ora("转换后存放目录已经存在，请重新输入").fail();
        process.exit(ERRCODE.HASEXIST)
    }
    if (_.isEmpty(targetWeappDestDir)) {
        var tmpval = 1;
        do {
            targetWeappDestDir = path.normalize(path.join(targetWeappSourceDir, '..', 'tarojsinvert' + tmpval));
            tmpval++;
        } while (fs.existsSync(targetWeappDestDir) || fs.existsSync(targetWeappDestDir + "tmp"));
    }

    utils.ora(`转换后存放路径为:${targetWeappDestDir}`).succeed()
    var downloadStr = `https://codeload.github.com/LaiHuanMin/tarojs-invert-template/zip/master`;
    var downloadFileName = targetWeappDestDir + '.zip';
    var tmpTargetWeappDestDir = targetWeappDestDir + "tmp";
    var templateFolderName = `tarojs-invert-template-master`;
    var oraref4download = utils.ora('正在下载TaroJS官方Template，请保持网络畅通')
    try {
        await new Promise((resolve, reject) => {
            get(downloadStr).toDisk(downloadFileName, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            })
        })
        utils.makeOraChange(oraref4download, '下载完毕，准备解压', 'succeed')
        await new Promise((r, n) => {
            var stream = fs.createReadStream(downloadFileName);
            stream.pipe(unzip.Extract({
                path: tmpTargetWeappDestDir,
            })).promise().then(r, n);
        })
        sh.rm('-rf', downloadFileName);
        sh.mv(path.join(tmpTargetWeappDestDir, templateFolderName), targetWeappDestDir);
        utils.ora("解压完毕，正在解析处理中").succeed();
        fs.rmdirSync(tmpTargetWeappDestDir);
        await invertWeappGlobalInfo({
            targetWeappDestDir,
            targetWeappSourceDir
        })
    // sh.exec("rm tarojsinvert* -rf")
    } catch (fail) {
        utils.makeOraChange(oraref4download, fail.message, 'fail') ;
        process.exit(ERRCODE.MULTIPLEERROR)
    }
}


var invertUtils = {
    createInfoMap({sourcefiles, dir}) {
        var sourcefilesmap = {};
        _.forEach(sourcefiles, (x, d, n) => {
            var crtpath = path.normalize(path.join(dir, ...x));
            sourcefilesmap[_.join(x, ',')] = {
                path: crtpath,
                getctn: () => {
                    return fs.readFileSync(crtpath, "UTF-8");
                },
                exists() {
                    return fs.existsSync(crtpath);
                }
            }
        })
        return sourcefilesmap;
    }
}

async function invertWeappGlobalInfo({targetWeappDestDir, targetWeappSourceDir}) {
    var sourcefiles = [
        ['app.js'],
        ['app.json'],
        ['project.config.json']
    ];
    var sourcefilesmap = invertUtils.createInfoMap({
        sourcefiles,
        dir: targetWeappSourceDir
    })

    // appjson and other json
    var projectConfigJsonDetail = sourcefilesmap['project.config.json'];
    if (projectConfigJsonDetail.exists()) {
        var projectConfJsonObj = require(projectConfigJsonDetail.path);
        _.set(projectConfJsonObj, 'miniprogramRoot', './dist');
        utils.ora("已复制project.config.json并配置配置相关属性").succeed();
        var jsonObjPath = projectConfigJsonDetail.path;
        var outputpath = path.join(targetWeappDestDir, path.basename(jsonObjPath));
        fs.writeFileSync(outputpath, JSON.stringify(projectConfJsonObj));
    }
    sh.cp(sourcefilesmap['app.json'].path, path.join(targetWeappDestDir, "app.json"));

    // make app js
    var appjsDetail = sourcefilesmap['app.js'];
    var appjsAst = parser.parse(appjsDetail.getctn(), {
        allowImportExportEverywhere: true,
        sourceType: 'module',
        strictMode: false
    });
    var appjsResult = generate(appjsAst);
    console.log(appjsResult)
    debugger;
}

// invoke entry func
// entryfunc();

//test
// invertWeappGlobalInfo({
//     targetWeappDestDir: path.resolve(path.join('.',"test111")),
//     targetWeappSourceDir: path.resolve(path.join('.','mydemo'))
// });



var str = `
const openIdUrl = require('./config').openIdUrl

App({
  onLaunch(opts) {
    console.log('App Launch', opts)
  },
  onShow(opts) {
    console.log('App Show', opts)
  },
  onHide() {
    console.log('App Hide')
  },
  globalData: {
    hasLogin: false,
    openid: null
  },
  // lazy loading openid
  getUserOpenId(callback) {
    const self = this

    if (self.globalData.openid) {
      callback(null, self.globalData.openid)
    } else {
      wx.login({
        success(data) {
          wx.request({
            url: openIdUrl,
            data: {
              code: data.code
            },
            success(res) {
              console.log('拉取openid成功', res)
              self.globalData.openid = res.data.openid
              callback(null, self.globalData.openid)
            },
            fail(res) {
              console.log('拉取用户openid失败，将无法正常使用开放接口等服务', res)
              callback(res)
            }
          })
        },
        fail(err) {
          console.log('wx.login 接口调用失败，将无法正常使用开放接口等服务', err)
          callback(err)
        }
      })
    }
  }
})




`
str = `
    var str = props => <div>sdfsdf</div>;
    console.log(str);  



class C {
  @enumerable(false)
  method() { }
}

function enumerable(value) {
  return function (target, key, descriptor) {
     descriptor.enumerable = value;
     return descriptor;
  }
}

`

debugger;
// parser.parse(str, babelrc);
debugger;

var state = core.transform(str, babelrc);
console.log(state);
debugger;