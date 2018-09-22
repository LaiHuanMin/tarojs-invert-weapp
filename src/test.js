var result = core.transform(str, {
    plugins: [
        {
            visitor: {
                Identifier(path) {
                    if (path.node.name === 'openIdUrl') {
                        debugger;
                    }
                },
                CallExpression(path) {
                    if (_.isEqual(_.get(path, "node.callee.name"), "App")) {
                        debugger;
                    }
                }
            }
        }
    ]
})

console.log(result);
debugger;



var generate = require('@babel/generator').default;
var template = require('@babel/template').default;
var t = require('@babel/types');

debugger;

const fn = template`
  var IMPORT_NAME = require('${"my-module"}');
`;

const ast = fn({
    IMPORT_NAME: t.identifier("myModule")
});

console.log(generate(ast).code);



// // system
// var fs = require('fs');
// var path = require('path');
// var process = require('process')
// var packageJson = require('../package.json')
// // utils
// var get = require('get');
// var _ = require('lodash');
// var ora = require('ora');
// var sh = require('shelljs')
// var unzip = require('unzipper');
// // babel
// var parser = require("@babel/parser");
// var core = require('@babel/core')
// var {transform} = core;
//
//
//


// var shelljs = require('shelljs')
// debugger;
// var ora = require('ora');
// async function n() {
//     ora('Loading unicorns').start();
//     await new Promise((e) => {
//         setTimeout(e, 3000)
//     })
//     ora('Loading unicornsjskdflsdf').start();
// }
// n();

// var targetfile = path.join(__dirname, "..", "mydemo", "app.js");
// var targetfilectn = fs.readFileSync(targetfile, "UTF-8");
// var parseconfig = {
//     allowImportExportEverywhere: true,
//     sourceFilename: true,
//     strictMode: false
// }
// var astTreeCtn = parser.parse(targetfilectn, parseconfig);


// console.log(targetfilectn);
// console.log(targetfile);
// var astResult = core.transformSync(targetfilectn, {});
// // var returncode = core.transformFromAstSync(astTreeCtn);
//
//
// // debugger;
// // var codeFrame = require('@babel/code-frame').default
// // const rawLines = `class Foo {
// //   constructor()
// // }`;
// // const lineNumber = 2;
// // const colNumber = 16;
//
// // const result = codeFrame(rawLines, lineNumber, colNumber, { /* options */ });

