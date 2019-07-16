---
title: "iOS-真机调试Webview和查看真机沙盒文件"
date: 2019-07-16 15:00:56
[comment]: <> (文章简介，列表页显示)
introduction: iOS-真机调试Webview和查看真机沙盒文件
[comment]: <> - tagName
tag:
- iOS
- device
[comment]: <> [tagName1, tagName2]
tags: [iOS, device]
layout: post
project: false
[comment]: <> image url
feature: 
comments: true
---

### 查看真机沙盒文件

* 真机运行项目
* `Window` --> `Devices and Simulators`
* 在`Installed Apps`中选中项目
* 点击`小齿轮⚙`
* `Download Container...`保存文件
* `显示包内容`查看

### App内H5页面调试

H5调试是通过MacOS和iPhone的`Safari`进行调试的。

#### 设置Mac OS `Safari`

在`Safari`偏好设置中打开`开发菜单`

![01](/assets/images/2019-07-16-ios-zhenjitiaoshi-01.jpg)

#### 设置iPhone `Safari`

`设置` --> `Safari浏览器` --> `高级` --> `Web 检查器`

#### 调试

* 运行App并进入需要调试的H5页面。
* Mac OS端`Safari`选择`开发`
* 选择真机`xxx的iPhone`
* 点击要调试的页面`xxxx.html`
