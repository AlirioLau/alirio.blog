---
title: "iOS的CPU架构问题"
date: 2019-08-01 14:57:53
[comment]: <> (文章简介，列表页显示)
introduction: iOS的指令集和设备信息
[comment]: <> [tagName1, tagName2] (搜索key)
tags: [ios, cpu, architecture]
layout: post
project: false
[comment]: <> image url
feature: 
comments: true
---

### CPU架构

CPU架构是CPU厂商给属于同一系列的CPU产品定的一个规范，主要目的是为了区分不同类型CPU的重要标示。目前市面上的CPU分类主要分有两大阵营，一个是intel、AMD为首的复杂指令集CPU，另一个是以IBM、ARM为首的精简指令集CPU。两个不同品牌的CPU，其产品的架构也不相同，例如，Intel、AMD的CPU是X86架构的，而IBM公司的CPU是PowerPC架构，ARM公司是ARM架构。摘自[百度](https://baike.baidu.com/item/%E5%A4%84%E7%90%86%E5%99%A8%E6%9E%B6%E6%9E%84/8535061)

### iOS指令集

#### 模拟器

i386：iphone5和iphone5c及以下的模拟器（32位）。
x86_64：iPhone5s及以上的模拟器（64位）。

#### 真机

armv6：iPhone、iPhone2、iPhone3G、iPod Touch(第一代)、iPod Touch(第二代)（32位）。
armv7：iPhone3Gs、iPhone4、iPhone4s、iPad、iPad 2（32位）。
armv7s：iPhone5、iPhone5c（32位）。
arm64：iPhone5s、iPhone6、iPhone6p、iPhone6s、iPhone6sp、iPhone7、iPhone7p、iPhone8、iPhone8p、iPhoneX（64位）。
arm64e：iPhone XS、iPhone XS Max、iPhone XR（64位）。

### Xcode编译

Xcode编译指令集设置选项在：（Build Settings --> Architectures）。如下图所示：

![01](/assets/images/2019-08-01-ios-cpu-architectures-01.jpg)

* `Architectures`: 指定工程可支持的全部指令集类型，默认为: Standard architectures - $(ARCHS_STANDARD)。
* `Build Active Architecture Only`: 指定是否只对当前连接设备支持的指令集编译。设置为Yes时，编译速度更快，因为它只编译当前连接设备的CPU架构版本；而设置为no时，会编译所有的版本。一般Debug的时候设置为Yes，Release的时候设置为No。如果target是`.a`库或者`Framework`库那就需要编译多个架构的。
* `Valid Architectures`: 限制可能被支持的指令集的范围。Xcode最终编译出哪种指令集的包，将由`Architectures`与`Valid Architectures`的交集来确定。