---
title: "CocoaPods创建私有仓库和Lib"
date: 2019-07-02 14:39:06
[comment]: <> (文章简介，列表页显示)
introduction: CocoaPods创建私有仓库和Lib
[comment]: <> - tagName
tag:
- iOS
- Cocoapods
[comment]: <> [tagName1, tagName2]
tags: [iOS, Cocoapods, pod]
layout: post
project: false
[comment]: <> image url
feature: 
comments: true
---

使用Cocoapods私有库来模块化iOS工程。
核心点：需要创建两个git库，一个为Spec Repo的库，一个为Lib代码库。

### 创建私有Spec Repo库

1、创建一个名为 MySpec 的git仓库。

2、初始化仓库。(可以使用README初始化，这一步很重要)

3、然后添加到pod：

```
## pod repo add [Private Repo Name] [GitHub HTTPS clone URL]
pod repo add MySpec git@github.com:aliriolau/MySpec.git
```

### 创建AlirioTestLib工程

1、创建名为`AlirioTestLib`的工程。

2、在工程里创建`AlirioTestLib.podspec`、`LICENSE`、`README`文件。

3、添加源代码到项目。

4、将 MyLib提交到 Lib git库，并且打tag，Spec Repo是按照tag索引 Lib。

### 验证 .podspec文件

```
pod lib lint ***.podspec
```

### 将Lib添加到私有Spec Repo中

```
## pod repo push [Repo名] [podspec 文件名字]
pod repo push MySpec AlirioTestLib.podspec --sources='git@github.com:aliriolau/MySpec.git,https://github.com/CocoaPods/Specs.git'
```

* 如果有`.a`库还需要添加`--use-libraries`参数

```
pod repo push MySpec AlirioTestLib.podspec --sources='git@github.com:aliriolau/MySpec.git,https://github.com/CocoaPods/Specs.git' --use-libraries --allow-warnings
```

### 验证

```
pod search AlirioTestLib
```

如果能够搜索到就可以正常使用了。

### 使用

1、在`podfile`中添加`source 'git@gitee.com:alirio/MySpec.git'`

2、`pod 'AlirioTestLib'`

3、`pod install`

### 删除 Lib

```
cd ~/.cocoapods/repos/MySpec
```

```
rm -rf AlirioTestLib
```

```
git add .
git commit -a "delete lib"
git push origin master
```

### 参考资料

[private-cocoapods](http://guides.cocoapods.org/making/private-cocoapods.html)