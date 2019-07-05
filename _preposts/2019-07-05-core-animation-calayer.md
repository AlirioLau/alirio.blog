---
title: "core-animation-calayer"
date: 2019-07-05 08:52:49
[comment]: <> (文章简介，列表页显示)
introduction: Core Animation -- CALayer
[comment]: <> - tagName
tag:
- iOS
[comment]: <> [tagName1, tagName2]
tags: [iOS, CALayer]
layout: post
project: false
[comment]: <> image url
feature: 
comments: true
---

### 简介

`CALayer`在概念上和`UIView`类似，同样也是一些被层级关系树管理的矩形块，同样也可以包含一些内容（像图片，文本或者背景色），管理子图层的位置。它们有一些方法和属性用来做动画和变换。和`UIView`最大的不同是`CALayer`不处理用户的事件，并不清楚具体的响应链。

每一个`UIView`都有一个`CALayer`实例的图层属性。而视图的职责就是创建并管理这个图层，以确保当子视图在层级关系中添加或者被移除的时候，他们关联的图层也同样对应在层级关系树当中有相同的操作。

### 使用

#### contents属性

CALayer 有一个属性叫做`contents`，这个属性的类型被定义为id，意味着它可以是任何类型的对象。实际使用时需要传入`CGImage`类型。在Mac OS中也可以使用`NSImage`。

#### contentGravity属性

`contentGravity`是设置适应图层的拉伸规则，决定内容在图层的边界中怎么对齐。对应`UIImageView`的`contentMode`属性，它是一个NSString类型，`contentGravity属性`可选的常用值如下：

```
kCAGravityCenter
kCAGravityTop
kCAGravityBottom
kCAGravityLeft
kCAGravityRight
kCAGravityTopLeft
kCAGravityTopRight
kCAGravityBottomLeft
kCAGravityBottomRight
kCAGravityResize
kCAGravityResizeAspect
kCAGravityResizeAspectFill
```

#### contentsScale属性

`contentsScale`定义了寄宿图的像素尺寸和视图大小的比例。它用来判断在绘制图层的时候应该为寄宿图创建的空间大小，和需要显示的图片的拉伸度。UIView有一个类似功能但是非常少用到的`contentScaleFactor`属性。

如果`contentsScale`为1.0，以每个点1x1个像素绘制图片；如果为2.0，以每个点2x2个像素绘制图片（如: iPhone 8s）；如果为3.0，以每个点3x3个像素绘制图片（如: iPhone 8s Plus、iPhone X）。

#### contentsRect属性

`contentsRect`允许我们在图层边框里显示一个子区域。

`contentsRect`是使用单位左边计算，单位坐标制定在0到1之间的值，是一个相对值(像素和点是绝对值)。所以他是相对与寄宿图的尺寸的值。

iOS使用了以下的坐标系统：

* 点：点就像是虚拟的像素，也被称作逻辑像素。在标准设备上，一个点就是一个像素，但是在Retina设备上，一个点等于2*2个像素（或者3*3个像素）。iOS用点作为屏幕的坐标测算体系就是为了在Retina设备和普通设备上能有一致的视觉效果。
* 像素：物理像素坐标并不会用来屏幕布局，但是仍然与图片有相对关系。UIImage是一个屏幕分辨率解决方案，所以指定点来度量大小。但是一些底层的图片表示如CGImage就会使用像素，所以你要清楚在Retina设备和普通设备上，他们表现出来了不同的大小。
* 单位：对于与图片大小或是图层边界相关的显示，单位坐标是一个方便的度量方式， 当大小改变的时候，也不需要再次调整。单位坐标在OpenGL这种纹理坐标系统中用得很多，Core Animation中也用到了单位坐标。

`contentsRect`默认值是{0, 0, 1.0, 1.0}。通过修改`contentsRect`获取图片的指定区域来创建一个小图片。例如：[NumClockVC](https://github.com/aliriolau/ALLayerDemo/blob/master/ClockDemo/NumClockVC.m)通过修改显示区域实现数字钟表的数字变化。

#### contentsCenter属性

`contentsCenter`是一个CGRect，它定义了一个固定的边框和一个在图层上可拉伸的区域。只有在图片需要拉伸适配寄宿图的时候，设置`contentsCenter`才有效果。

#### drawRect:

给`contents`赋值不是唯一的设置寄宿图的方法。也可以通过实现UIView的`-drawRect:`方法，用Core Graphics直接绘制寄宿图。

`-drawRect:`方法没有默认实现，因为对于UIView来说，寄宿图不是必需的，它并不在意底层是单调的颜色或者是一个图片。如果UIView检测到`-drawRect:`方法被调用了，它就会为视图分配一个寄宿图。（这个寄宿图的大小由视图大小和`contentsScale`决定）由于CALayer不会自动重绘它的内容，这个时候UIView会调用`-display`去重绘，并提供一个`-displayLayer:`的实现，完成内容的重绘，并设置CALayer的`contents`属性。

视图显示到屏幕上时，`-drawRect:`方法会被系统调用，然后CALayer会通过调用代理的`- (void)displayLayer:(CALayer *)layer`方法来获取一个寄宿图，然后代理设置CALayer的`contents`属性展示内容。如果代理没有实现这个方法，那么CALayer会创建一个合适尺寸(bounds * contentsScale)的空寄宿图和一个Core Graphics上下文，作为参数去调用`- (void)drawLayer:(CALayer *)layer inContext:(CGContextRef)ctx`方法，绘制内容到寄宿图上然后显示内容。

如果不需要寄宿图，就不要实现这个方法，**空方法也不要写**，因为会造成CPU的浪费。

### 相关资料

[iOS Core Animation: Advanced Techniques中文译本](https://zsisme.gitbooks.io/ios-/content/chapter2/the-contents-image.html)

[实例代码](https://github.com/aliriolau/ALLayerDemo)

[Chameleon-UIView](https://github.com/BigZaphod/Chameleon/blob/master/UIKit/Classes/UIView.m)