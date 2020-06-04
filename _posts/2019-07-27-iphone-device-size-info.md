---
title: "iPhone 机型尺寸信息"
date: 2019-07-27 11:15:37
[comment]: <> (文章简介，列表页显示)
introduction: iPhone 机型尺寸信息
[comment]: <> - tagName
tag:
[comment]: <> [tagName1, tagName2]
tags: [iPhone, sizeInfo]
layout: post
project: false
[comment]: <> image url
feature: 
comments: true
---

### iPhone机型尺寸信息查看

```objc
// 逻辑缩放因子
[UIScreen mainScreen].scale;
// 逻辑屏幕尺寸
[UIScreen mainScreen].bounds.size;

// 实际/物理缩放因子
[UIScreen mainScreen].nativeScale;
// 实际/物理屏幕尺寸
[UIScreen mainScreen].nativeBounds.size;
```

iOS里有两个缩放因子：一个是逻辑缩放因子（UIKit Scale factor），另一个实际缩放因子（Native Scale factor）。当实际缩放因子和逻辑缩放因子不同时（比如：6p、7p、8p），系统会先试用逻辑缩放因子进行渲染，之后再按照实际缩放因子的比例缩放。

### iPhone机型尺寸信息对照表

|   机型    |   尺寸  | 逻辑缩放因子 | 实际缩放因子 | 屏幕宽度 | 屏幕分辨率 |
|:--------:|:-------:|:----------:|:----------:|:-------:|:--------:|
| 3GS      | 2.5寸   | 1.0        | 1.0        | 320x480 | 320x480  |
|---
| 4(s)     | 3.5寸   | 2.0        | 2.0        | 320x480 | 640x960  |
|---
| 5(c/s/SE)| 4寸     | 2.0        | 2.0        | 320x568 | 640x1136 |
|---
| 6(s)/7/8/SE2 | 4.7寸   | 2.0        | 2.0        | 375x667 | 750x1334 |
|---
| 6(s)p/7p/8p| 5.5寸 | 3.0        | 2.608      | 414x736 | 1080x1920|
|---
| X/XS/11 Pro | 5.8寸   | 3.0        | 3.0        | 375x812 | 1125x2436|
|---
| XR/11       | 6.1寸   | 2.0        | 2.0        | 414x896 | 828x1792 |
|---
| XS/11 Pro Max | 6.5寸   | 3.0        | 3.0        | 414x896 | 1242x2688|
{: rules="groups"}

### iPhone根据尺寸判断机型

```objc
// 4(s)
#define iPhone4 ([UIScreen mainScreen].bounds.size.height == 480.0f)

// 5(c/s/SE)
#define iPhone5 ([UIScreen mainScreen].bounds.size.height == 568.0f)

// 6(s)/7/8
#define iPhone6 ([UIScreen mainScreen].bounds.size.height == 667.0f)

// 6(s)p/7p/8p
#define iPhone6P ([UIScreen mainScreen].bounds.size.height == 736.0f)

// X/XR/XS/XS Max
#define iPhoneX ([UIScreen mainScreen].bounds.size.height == 812.0f || [UIScreen mainScreen].bounds.size.height == 896.0f)
```
