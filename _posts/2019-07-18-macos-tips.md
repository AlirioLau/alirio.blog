---
title: "MacOS 使用技巧笔记"
date: 2019-07-18 15:01:03
[comment]: <> (文章简介，列表页显示)
introduction: MacOS 常用的，容易忘记的小技巧。
[comment]: <> - tagName
tag:
[comment]: <> [tagName1, tagName2]
tags: [macos, xcode, svn, git, DS_Store]
layout: post
project: false
[comment]: <> image url
feature: 
comments: true
---

### 三指拖动

设置 --> 辅助功能 --> 鼠标与触控板 --> 触控板选项 --> 启动拖移

### 移除svn版本管理

```shell
find . -type d -name ".svn"|xargs rm -rf
或者
find . -type d -iname ".svn" -exec rm -rf {} \; 
```

### 移除git库中的`.DS_Store`

* 删除`.DS_Store`

```shell
find . -name .DS_Store -print0 | xargs -0 git rm -f --ignore-unmatch
```

* 将`.DS_Store`添加到`.gitignore`

```shell
echo .DS_Store >> ~/.gitignore
```

### Terminal进入Finder的当前目录

```shell
open .
```

### MacOS Sierra安装包损坏

MacOS Sierra安装未知来源软件的时候会提示`安装包已损坏`

```shell
sudo spctl --master-disable
```

### Homebrew

Homebrew的默认安装路径是`/usr/local/Cellar`

### 测试硬盘读写速度

* 测试写入速度

```shell
time dd if=/dev/zero bs=1024k of=tstfile count=1024
```

* 测试读取速度

```shell
time dd if=tstfile bs=1024k of=/dev/null count=1024
```

将最后结果除以1024再除以1024，就是`Mb/sec`的结果。

### 软件包指纹校验

* MD5校验：md5 + 软件包所在全路径

* sha1校验：shasum + 软件包所在全路径

### Xcode 设置

#### CodeSnippets位置

```
~/Library/Developer/Xcode/UserData/CodeSnippets
```

#### Provisioning Profiles位置

```
~/Library/MobileDevice/Provisioning Profiles
```

#### 校验安装的Xcode

```shell
spctl --assess --verbose /Applications/Xcode.app
```

根据不同的返回结果即可验证 Xcode 签名是否有效。具体如下：

* 若应用为 Mac App Store 下载的版本则会返回：

```
/Applications/Xcode.app: accepted
source=Mac App Store
```

* 若应用为 Apple Developer 下载的版本则会返回：

```
/Applications/Xcode.app: accepted

source=Apple
```

或者

```

/Applications/Xcode.app: accepted

source=Apple System
```

* 这三种情况之外的返回结果均表示Xcode签名无效，意味着有可能已被恶意篡改。

#### 制作U盘启动盘

* 开启root权限

```shell
// 输入电脑密码，再两次输入root密码。
sudo passwd root
```

* 开启非Apple硬盘的trim功能

```shell
sudo trimforce enable
```

* 制作启动u盘

1、下载系统安装镜像。最好从 AppStore下载。并确保下载完的 “安装 OS X EI Captian.app”在应用程序目录下。

2、执行安装命令

```shell
sudo /Applications/Install\ OS\ X\ El\ Capitan.app/Contents/Resources/createinstallmedia --volume /Volumes/OSX --applicationpath /Applications/Install\ OS\ X\ El\ Capitan.app --nointeraction
```

> 指令解析：
>
> `安装文件名"安装 OS X EI Captian.app"中间空格用 "\" 转译。` 
>
> `OSX 为u盘名称，可以为其他的，但必须为英文。`

3、开机按住option（⌥），选中制作的u盘启动，就可以装系统了。