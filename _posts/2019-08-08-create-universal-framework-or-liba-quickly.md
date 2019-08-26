---
title: "iOS快速创建同时支持真机和模拟器的Framework或者liba"
date: 2019-08-08 10:32:13
[comment]: <> (文章简介，列表页显示)
introduction: 方便快捷地创建同时支持真机和模拟器的Framework或者liba
[comment]: <> [tagName1, tagName2] (搜索key)
tags: [framework, .a, xcode, iOS, xcconfig]
layout: post
project: false
[comment]: <> image url
feature: 
comments: true
---

### 简介

创建同时支持真机和模拟器的Framework/liba时，需要真机和模拟器分别编译，编译完成后再手动合并，这样很麻烦。我们可以使用Xcode提供的`Aggregate`Target，和shell脚本，达到编译一次同时合并的效果。

### 创建Framework

* 创建名为`TestUniversalFramework`的Framework Target。
* 将源代码添加到的Framework Target。
* 在`TestUniversalFramework` Target的 `Build Phases`设置需要暴露的头文件。如下图所示：

![01](/assets/images/2019-08-08-create-universal-framework-or-liba-quickly-01.jpg)

* 将需要暴露的头文件添加到`TestUniversalFramework.h`中（需要以`#import <TestUniversalFramework/PublicHeader.h>`的形式）。
* 创建`Configuration Settings File`，命名为`TestUniversalFramework.xcconfig`。内容如下：

```
SUPPORTED_PLATFORMS = iphoneos iphonesimulator;
IPHONEOS_DEPLOYMENT_TARGET = 8.0;

VALID_ARCHS = armv7 armv7s arm64 arm64e x86_64;
ONLY_ACTIVE_ARCH = NO;

MACH_O_TYPE = staticlib;
DEFINES_MODULE = YES;

OTHER_CFLAGS = -Wno-incomplete-umbrella
```

* 创建真机编译的设置文件`Configuration Settings File`，命名为`TestUniversalFramework ARM.xcconfig`。内容如下：

```
#include "TestUniversalFramework.xcconfig"

ARCHS_STANDARD = armv7 armv7s arm64 arm64e;
```

* （以上两步是通过配置文件的形式设置`Build Settings`，也可以在Target的`Build Settings`处设置同样的值）在`PROJECT` `Info`里的`Configurations`处选择`Debug`或者`Release`模式下的配置文件（创建的`.xcconfig`文件会以列表的形式在这里列出），这里我们选择刚才创建好的`TestUniversalFramework ARM.xcconfig`。如下图所示：

![02](/assets/images/2019-08-08-create-universal-framework-or-liba-quickly-02.jpg)

> Tips: 
> > `.xcconfig`设置`Build Settings`和直接设置Target的`Build Settings`效果是一样的。
> > 
> > 以文件的形式可读性会更好，修改和统一配置会更方便。
> > 
> > `.xcconfig`配置文件的Key值分为两种：系统默认和自定义的。系统默认的Key值可以参考[这里](https://developer.apple.com/library/archive/documentation/DeveloperTools/Reference/XcodeBuildSettingRef/1-Build_Setting_Reference/build_setting_ref.html#//apple_ref/doc/uid/TP40003931-CH3-SW48)，自定义的Key Value要以`${}`或者`$()`的引用形式使用（可以在当前配置文件使用，也可以在`Build Settings`里使用）。
> > 
> > 系统默认的Key也可以通过在`Build Settings`中，选中对应的项，然后复制（⌘+c），再粘贴（⌘+v）就可以看到。

到这里Framework和相应的设置就已经完事儿了，直接编译就可以生成对应的Framework了。要达到编译完成并自动合并输出需要借助`Aggregate`和`shell`脚本。

### 创建Aggregate

* 在当前工程下新建Target Aggregate，命名为`TestUniversalFramework-Universal`。如下图所示：

![03](/assets/images/2019-08-08-create-universal-framework-or-liba-quickly-03.jpg)

* 在`TestUniversalFramework-Universal` Target的`Build Phases`中，选择`Target Dependencies`，添加Target的依赖，依赖于上面创建好的Framework。
* 在`Build Phases`中，点击左上角的`+`，添加`Run Script`。如下图所示：

![04](/assets/images/2019-08-08-create-universal-framework-or-liba-quickly-04.jpg)

* 选择`Run Script`，添加执行脚本（复制脚本，然后粘贴进去）。脚本示例如下：

```shell
## build universal
LIB_TARGET_NAME=${PROJECT_NAME}

UNIVERSAL_OUTPUTFOLDER=${SRCROOT}/Framework/${CONFIGURATION}-universal

OUTPUT_DIR=${UNIVERSAL_OUTPUTFOLDER}

mkdir -p ${OUTPUT_DIR}

xcodebuild -target ${LIB_TARGET_NAME} ONLY_ACTIVE_ARCH=NO -configuration ${CONFIGURATION} -sdk iphoneos BUILD_DIR="${BUILD_DIR}" BUILD_ROOT="${BUILD_DIR}"
xcodebuild -target ${LIB_TARGET_NAME} ONLY_ACTIVE_ARCH=YES -arch x86_64 -sdk iphonesimulator -configuration ${CONFIGURATION} BUILD_DIR="${BUILD_DIR}" BUILD_ROOT="${BUILD_DIR}"

if [ -d "${IPHONEOS_OUTPUTFOLDER}" ]
then
rm -rf "${IPHONEOS_OUTPUTFOLDER}"
fi

mkdir -p ${OUTPUT_DIR}

cp -rf "${BUILD_DIR}/${CONFIGURATION}-iphoneos/${LIB_TARGET_NAME}.framework" "${OUTPUT_DIR}/"

lipo -create -output "${OUTPUT_DIR}/${LIB_TARGET_NAME}.framework/${LIB_TARGET_NAME}" "${BUILD_DIR}/${CONFIGURATION}-iphoneos/${LIB_TARGET_NAME}.framework/${LIB_TARGET_NAME}" "${BUILD_DIR}/${CONFIGURATION}-iphonesimulator/${LIB_TARGET_NAME}.framework/${LIB_TARGET_NAME}"
```

* 选择`TestUniversalFramework-Universal`，然后**真机编译**即可。最终创建好的同时支持真机和模拟器的Framework在`${SRCROOT}/Framework/${CONFIGURATION}-universal`目录中（也就是当前工程的Framework文件夹下）。

### 参考链接 

[TestUniversalFramework工程](https://github.com/aliriolau/TestUniversalFramework)

[Xcode Build System Guide](https://developer.apple.com/library/archive/documentation/DeveloperTools/Reference/XcodeBuildSettingRef/0-Introduction/introduction.html#//apple_ref/doc/uid/TP40003931-CH3-SW105)

[Build Setting Reference](https://developer.apple.com/library/archive/documentation/DeveloperTools/Reference/XcodeBuildSettingRef/1-Build_Setting_Reference/build_setting_ref.html#//apple_ref/doc/uid/TP40003931-CH3-SW48)

[xcodebuild相关命令参数说明](https://www.jianshu.com/p/4f4d16326152)