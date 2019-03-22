---
title: "runtime探究-runtime初窥"
date: 2018-07-20 13:19:44
[comment]: <> (文章简介，列表页显示)
introduction: "揭开App从启动到main函数执行，以及runtime初始化，Class初始化、注册，selector注册等神秘的面纱"
[comment]: <> - tagName
tag:
- iOS
- runtime
[comment]: <> [tagName1, tagName2]
tags: [iOS, runtime]
layout: post
project: false
[comment]: <> image url
feature: 
comments: true
---

## 前言
iOS应用程序从点击应用到真正启动运行这段时间到底都发生了什么呢，通过查询资料，查看[*部分源代码*](https://opensource.apple.com/tarballs/)，慢慢地了解了其中的详情。(`持续学习更新中...`)

#### 简单总结：
* 初始化程序环境。
* 加载可执行文件到内存(Mach-O文件)。
* 加载动态链接库dyld(dyld是加载、管理动态链接库的工具)。
* dyld初始化系统库(libSystem)、runtime(libobjc)、GCD(libdispatch)等。
* dyld加载我们写的代码。
* dyld通过main函数地址调用main函数

`不管是系统库还是我们自己的代码都会当做Image被加载进内存`

## dyld 
dyld全称：(`the dynamic link editor`) 源码在[*这里*](https://github.com/opensource-apple/dyld)

每个库都是被当做image由ImageLoader加载进内存，那么ImageLoader是什么呢？
#### ImageLoader
image对应的是可执行文件(`也就是二进制文件`)，ImageLoader是按照每一个二进制文件对应一个ImageLoader的形式将文件加载进内存。
#### 动态库的加载过程
* load dylibs image (读取库镜像文件)
* Rebase image
* Bind image
* Objc setup
* initializers

## Objc setup
实现过程参考代码[objc4-723](https://opensource.apple.com/tarballs/objc4/objc4-723.tar.gz)。

### rumtime初始化
runtime初始化的入口是`_objc_init`，在`objc-os.mm`中，可以添加`Symbolic Breakpoint...`断点查看。

```objc
void _objc_init(void)
{
    static bool initialized = false;
    if (initialized) return;
    initialized = true;
    
    // fixme defer initialization until an objc-using image is found?
    environ_init();
    tls_init();
    static_init();
    lock_init();
    exception_init();

    _dyld_objc_notify_register(&map_images, load_images, unmap_image);
}
```
 通过查看初始化方法我们可以知道，在`dyld`初始化`runtime`时注册了三个通知，分别是`map_images `、`load_images `和`unmap_image `。
 
* `map_images `就是处理由`ImageLoader `加载到内存的images。过程中会初始化一些资源。
 	* 注册NSobject的`load`、`initialize` 等等`NSObject`协议中的Selectors。(并确保每个selector唯一)
 	* 注册当前image里的Class。并给没有初始化的Class分配内存空间（`realizeClass`），将Class编译时保存在内存中的数据`class_ro_t`赋值给新分配的内存空间，将Class添加到初始化过的HashTable`gdb_objc_realized_classes`里。
	* 获取当前image里Class里的selectors，遍历集合注册selector（`__sel_registerName`）。（存储所有唯一selector的集合也是一张HashTable）
	* 注册Class的protocols，categories等。

* `load_images `主要是调用所有Class和Category的 `+load`方法。
	* 将Classes的superClass添加到`loadable_classes`。
	* 将Classes添加到`loadable_classes`。
	* 将Categories添加到`loadable_categories`。
	* 调用`+load`方法。（通过objc_msgSend调用）

* `unmap_image `主要是与`map_images `相反的过程。

> #### ***疑问***
> `什么时候调用unmap_image呢？什么情况下移除所有注册到内存中的Class等资源呢？只有App退出时才会清理资源吗？`

#### 应用状态
[参考资料](https://developer.apple.com/documentation/uikit/core_app/managing_your_app_s_life_cycle?language=objc)

一个App在生命周期里一共有五种状态，分别是：

* Not running：应用还没有启动或者被系统停止运行。
* Inactive：应用处于前台但是不能接收事件。应用从一个状态切换到另一个状态时会短暂处于`Inactive`状态，有两个特殊状态：1、当用户直接锁屏时，应用会长时间处于此状态；2、当收到系统级阻断时（比如来电话等）会长时间处于此状态。
* Active：应用正常的运行状态，能够接收事件并处理。
* Background：应用处于后台状态，也可以执行代码，但是不能处理响应事件。应用切换到此状态时会有短暂的时间可以执行代码（几秒钟），如果需要长时间后台执行需要申请（即使申请最多执行时间也不会超过10分钟）。
* Suspended：应用挂起状态。此时应用已经处于后台状态，并且不能够执行代码。系统自动将应用转入此状态，并且不会发出通知。应用的启动加载的Class等资源此时还在内存中，当系统接收到低内存警告时，会强制将处于`Suspended`状态的应用清理出内存。

> * 通过了解应用的几种状态就可以知道：应用处于`Inactive`、`Active`、`Background`、`Suspended`等状态时，在runtime初始化时加载的Classes和Categories等会一直保存在内存中。只有用户退出应用或者系统杀死`Suspended`应用时才会清理资源。
> * 应用在不同状态间切换时，系统会发送相应的通知（可以参考[这里](https://www.cnblogs.com/pangbin/p/5412784.html)）。

### Class初始化(`realizeClass`)

#### 结构体介绍
`objc_class`结构体中有两个重要的结构体成员变量:`class_rw_t`和`class_ro_t`。

先看看 `class_rw_t`的定义：

```objc
struct class_rw_t {
    // Be warned that Symbolication knows the layout of this structure.
    uint32_t flags;
    uint32_t version;

    const class_ro_t *ro;

    method_array_t methods;
    property_array_t properties;
    protocol_array_t protocols;

    Class firstSubclass;
    Class nextSiblingClass;
    
    ...
}
```
`class_ro_t`的定义：

```objc
struct class_ro_t {
    uint32_t flags;
    uint32_t instanceStart;
    uint32_t instanceSize;
#ifdef __LP64__
    uint32_t reserved;
#endif

    const uint8_t * ivarLayout;
    
    const char * name;
    method_list_t * baseMethodList;
    protocol_list_t * baseProtocols;
    const ivar_list_t * ivars;

    const uint8_t * weakIvarLayout;
    property_list_t *baseProperties;

    method_list_t *baseMethods() const {
        return baseMethodList;
    }
};
```
我们发现`class_ro_t`作为`class_rw_t`的**只读属性**。但是在`realizeClass `中，存在一行强制类型转换的代码如下：

```objc
ro = (const class_ro_t *)cls->data();
```
`这个涉及到Apple二进制在内存中排列的知识，具体实现细节后续更新。`

代码clang编译完成之后，`class_ro_t `在内存中的位置以及占用空间就确定了。（iOS应用会涉及到rebase的过程。可以使用macOS程序和模拟器运行、验证。）

#### `realizeClass `实现
* `calloc`分配内存空间 `Allocate writeable class data.`
* 拿到内存中的`class_ro_t`、`flags`等赋值给新的`class_rw_t`
* 将data赋值给当前class
* 初始化superclass
* 初始化metaclass
* 根据metaclass初始化ISA
* `methodizeClass`

#### `methodizeClass`实现
* 将class中`class_ro_t `数据中的`baseMethodList`、`baseProtocols`、`baseProperties`等添加到`class_rw_t`中对应的集合
* 将categories中的对象方法、协议方法、属性的集合添加到`class_rw_t`中对应的集合。（多个分类按照编译顺序添加，如果当前class是metaclass还要添加类方法）

> #### *小结*
> * 编译时候的methodList等和运行时使用的methodList等是区分开的。
> * 分类里的方法列表、协议列表等，最终会放到class里面。
> * 使用runtime黑魔法替换方法更换的是`class_rw_t `中的方法。
> * 使用runtime替换方法最好在`+load`中的原因一目了然。（Class刚刚初始化完成，非常"干净"）

### 参考资料

> [今日头条iOS客户端启动速度优化](https://techblog.toutiao.com/2017/01/17/iosspeed/)

> [App 启动时间：过去，现在和未来](https://techblog.toutiao.com/2017/07/05/session413/)

## 总结
* 当细细品读源代码时，一切都显得“毫无秘密可言”。
* 写的第一篇文章，可能有很多不足，比如逻辑混乱、表述不清、语言繁琐等等。
* `万事开头难` 相信随着时间地推移，会慢慢地变得更好的！！！
