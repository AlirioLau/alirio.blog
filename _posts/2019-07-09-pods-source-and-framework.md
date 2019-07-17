---
title: "Pod私有库进阶"
date: 2019-07-09 14:55:14
[comment]: <> (文章简介，列表页显示)
introduction: 支持Source和Framework两种模式的Pod私有库
[comment]: <> - tagName
tag:
- iOS
- Pods
[comment]: <> [tagName1, tagName2]
tags: [iOS, Pods, Framework]
layout: post
project: false
[comment]: <> image url
feature: 
comments: true
---

### 简介

在项目中使用Pod私有库时，可能会拆分很多Pod私有库，最后在主工程打包编译时会花费大量的时间。为了解决这个问题，就在每个模块增加了一个Framework的Target，在开发对应模块时编译出对应的Framework，主工程直接Pod对应模块的Framework，加快打包编译的速度。

### 步骤

#### 创建Framework的Target

如下图所示，创建名为`ALPodSourceAndFrameworkSDK`的Framework。项目中的两个target，原则上是相互独立的。 

![01](/assets/images/2019-07-09-pods-source-and-framework-01.jpg)

#### 移除关联

创建完成要删除可运行target中对Framework的依赖。 共有三个地方，分别是`Build Phases`中的：`Target Dependencies`、`Link Binary With Libraries`和`Embed Frameworks`。

![02](/assets/images/2019-07-09-pods-source-and-framework-02.jpg)

#### 设置Framework

* 更改Framework生成地址`Build Settings –> Build Location –> Per-configuration Build Products Path`。

![03](/assets/images/2019-07-09-pods-source-and-framework-03.jpg)

* 设置为静态库：修改`Build Settings –> Mach-O Type`为`Static Library`。

![04](/assets/images/2019-07-09-pods-source-and-framework-04.jpg)

#### 创建源代码

* 所有源代码都要加入到两个target里。

![05](/assets/images/2019-07-09-pods-source-and-framework-05.jpg)

* 将需要暴露的头文件设置为`Public`（在`Target Membership`里设置）。

![06](/assets/images/2019-07-09-pods-source-and-framework-06.jpg)

* 将所有`Public`头文件以`#import <ALPodSourceFrameworkSDK/PublicHeader.h>`的形式加入到Framwork的头文件中。

![07](/assets/images/2019-07-09-pods-source-and-framework-07.jpg)

* 引入头文件时，要兼容`Source`和`Framework`两种模式。比如其他模块引用`ALPodSourceFramework`模块的`Manager1.h`，就应该用如下这种方式：

```
#if __has_include(<ALPodSourceFrameworkSDK/ALPodSourceFrameworkSDK.h>)
#import <ALPodSourceFrameworkSDK/ALPodSourceFrameworkSDK.h>
#else
#import "Manager1.h"
#endif
```

#### 配置 `.podspec`

设置`Source`和`Framework`两个子模块。

* 在`Source`中配置`.source_files`为模块内所有的源代码文件，包括`.h`、`.m`和`.mm`等文件。如果依赖其他模块，需要配置`.dependency`为`"xxxx/Source"`。
* 在`Framework`中配置`.vendored_frameworks`为生成的Framework文件。如果依赖其他模块，需要配置`.dependency`为`"xxxx/Framework"`。

![08](/assets/images/2019-07-09-pods-source-and-framework-08.jpg)

### 警告处理

可能会遇到的警告：`Umbrella header for module does not include header`，有两种处理方式：

* 第一种：`Build Settings -> Other C Flags` 添加 `-Wno-incomplete-umbrella`
* 第二种：在PCH预编译文件里添加 `#pragma clang diagnostic ignored "-Wincomplete-umbrella"`

### 参考资料

[Clang编译警告处理](https://clang.llvm.org/docs/DiagnosticsReference.html)