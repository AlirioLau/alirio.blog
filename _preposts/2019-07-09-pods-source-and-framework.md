---
title: "pods-source-and-framework"
date: 2019-07-09 14:55:14
[comment]: <> (文章简介，列表页显示)
introduction: Pod私有库Source和Framework混合
[comment]: <> - tagName
tag:
- iOS
- Pods
[comment]: <> [tagName1, tagName2]
tags: [iOS, Pods, Source, Framework]
layout: post
project: false
[comment]: <> image url
feature: 
comments: true
---

### 简介

项目中使用Pod私有库，可能会拆分很多Pod私有库，最后在主工程打包编译时会花费大量的时间。为了解决这个问题，就在每个模块增加了一个Framework Target，在开发对应模块时编译出对应的Framework，主工程直接Pod对应模块的Framework，加快打包编译的速度。

### 步骤

#### 创建Framework的Target

如下图所示，创建名为`ALPodSourceAndFrameworkSDK`的Framework。



项目中两个target，原则上是互不相关的。 

移除关联
创建完成要删除可运行target中的  Build Phases 中 Target Dependencies, Link Binary With Libraries, Embed Frameworks中的依赖。

所有源代码都要加入到两个target，framework的里


设置Framework生成地址 Build Settings – Build Location – Per-configuration Build Products Path

设置User Header Search Paths  ${SRCROOT} recursive

设置为静态库  Build Settings – Mach-O Type 设置为Static Library

所有头文件加入到Framwork的头文件 #import <ALPodSourceFrameworkSDK/PublicHeader.h>

头文件要设置为 public（在 Target Membership里设置），要不在ALPodSourceFrameworkSDK.h中引入时会找不到。

使用的时候头文件引入需要兼容

```
#if __has_include(<ALPodSourceFrameworkSDK/ALPodSourceFrameworkSDK.h>)
#import <ALPodSourceFrameworkSDK/ALPodSourceFrameworkSDK.h>
#else
#import "Manager1.h"
#endif
```

消除 "Umbrella header for module does not include header"警告

第一种：Build Settings - Other C Flags 添加 -Wno-incomplete-umbrella

第二种：在PCH预编译文件里添加 #pragma clang diagnostic ignored "-Wincomplete-umbrella"

[Clang编译警告处理](https://clang.llvm.org/docs/DiagnosticsReference.html)