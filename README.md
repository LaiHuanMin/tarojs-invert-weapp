# tarojs-invert-weapp

[![](https://img.shields.io/node/v/@tarojs/cli.svg?style=flat-square)](https://www.npmjs.com/package/@tarojs/cli)
[![](https://img.shields.io/npm/v/@tarojs/taro.svg?style=flat-square)](https://www.npmjs.com/package/@tarojs/taro)
[![](https://img.shields.io/npm/l/@tarojs/taro.svg?style=flat-square)](https://www.npmjs.com/package/@tarojs/taro)
[![](https://img.shields.io/npm/dt/@tarojs/taro.svg?style=flat-square)](https://www.npmjs.com/package/@tarojs/taro)
[![](https://img.shields.io/travis/NervJS/taro.svg?style=flat-square)](https://www.npmjs.com/package/@tarojs/taro)

> 👽 Taro['tɑ:roʊ]，泰罗·奥特曼，宇宙警备队总教官，实力最强的奥特曼。

## 简介

本工具通过babel相关工具链的AST解析方式，能最大程度地帮助用户将微信小程序转换为TaroJS，并在H5/小程序/RN三端运行。目前该工具还处于开发阶段中，已实现部分解析功能，等初步功能实现了就上传npm进行公网使用，欢迎star！

## 开发任务

- [x] 命令行调用接口，支持-i,-o的文件夹指令，完成template的下载解压功能，将项目大体文件都依照依赖进行拷贝，使用的是Less
- [x] 解析AppJS/Page为React Component的形式，将json配置文件赋值到类的config属性，将微信小程序的生命周期名称转换为TaroJS的名称
- [x] 添加TaroJS Component以及相关文件的ES6 import语句，export default语句
- [x] 读取WXML文件并添加到render方法作为JSX语句返回，将<!-- -->修改为JSX的注释形式
- [ ] 将Component的组件作为React Component的形式(准备通过各个page的useComponent作为入口依次解析)
- [ ] 将render的WXML文件JSX语句进行解析，变量解析，组件解析，wxs等特性的解析
- [ ] 解析less的rpx内容，将微信小程序的CSS单位和相关规范，转换为TaroJS所需要的规范
- [ ] 在出现wx对象的文件顶部添加相关wx的import语句，期望不更改wx对象的调用，而是使用import的形式进行实现

## License

MIT License

Copyright (c) 2018 O2Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.