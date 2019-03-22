---
title: "runtime探究--消息发送机制"
date: 2018-07-20 16:43:11
[comment]: <> (文章简介，列表页显示)
introduction: "探究iOS方法调用之消息发送机制"
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
我们知道，Object-C的方法调用都会转化为消息发送的形式。我们来探究runtime究竟是怎么执行的呢？看看从一个方法的调用到真正执行，中间都经历了什么。

### clang -rewrite-objc

先用上述命令看看clang编译器将我们写好的`.m`文件编译成了什么样子。

```objc
clang -rewrite-objc -Wno-deprecated-declarations TestRuntime.m
```

一个简单的类：包含两个属性、一个实例方法和一个类方法

```objc
@interface TestRuntime ()

@property (nonatomic, copy) NSString *name;
@property (nonatomic, assign) NSInteger age;

@end

@implementation TestRuntime

- (void)testInstanceFunction
{
    self.name = @"testInstanceFunction";
    self.age = 18;
}

+ (void)testClassFunction
{
    NSLog(@"%s", __FUNCTION__);
}

@end
```

指令执行完成会在当前目录下生成一个同名的`.cpp`文件，打开看一下就崩溃了。我的天10万行，WTF???。删除掉其他我们不太关心的代码，只留下和类`TestRuntime `相关的东西之后，其实也没买多了。一点点看，一点点来分析。

将多余的类型转换等等删除掉，首先看到的就是两个静态常量（将长长的变量替换一下）：

```objc
static __NSConstantStringImpl string_0 = {__CFConstantStringClassReference,0x000007c8,"testInstanceFunction",20};

static __NSConstantStringImpl string_1 = {__CFConstantStringClassReference,0x000007c8,"%s",2};
```
分别对应 `TestRuntime `类中两个方法调用中使用的字符串。再一次证明字符串是以字符串常量的形式单独储存的。

继续往下看会看到 `TestRuntime `类的定义和属性的定义等。我们比较关心生成的两个方法是什么样的。

```objc
static void _I_TestRuntime_testInstanceFunction(TestRuntime * self, SEL _cmd) {
    objc_msgSend(self, sel_registerName("setName:"), string_0);
    objc_msgSend(self, sel_registerName("setAge:"), 18);
}

static void _C_TestRuntime_testClassFunction(Class self, SEL _cmd) {
    NSLog(string_1, __FUNCTION__);
}
```

> #### 小结:
> * 实例方法以`"_I_"`开头命名，而类方法以`"_C_"`开头命名。
> * 两个方法都有默认参数`self`和`SEL`。不同的是：实例方法的self是`TestRuntime `类型的（很容易理解，他是个对象嘛）；类方法的self是`Class `类型的（Class就是`objc_class `，而`objc_class `是继承`objc_object `，当然也是一个对象）。
> * 不管是实例方法还是类方法都是cpp的static函数。

继续往下看，我们看到name和age的`"set"`和`"get"`方法（另附`objc_setProperty `声明）

```objc
objc_setProperty(id self, SEL _cmd, ptrdiff_t offset, id newValue, BOOL atomic, signed char shouldCopy)

static NSString * _I_TestRuntime_name(TestRuntime * self, SEL _cmd) {
    return (char *)self + OBJC_IVAR_$_TestRuntime$_name;
}

static void _I_TestRuntime_setName_(TestRuntime * self, SEL _cmd, NSString *name) {
    objc_setProperty(self, _cmd, &((TestRuntime *)0)->_name, name, 0, 1);
}

static NSInteger _I_TestRuntime_age(TestRuntime * self, SEL _cmd) {
    return (char *)self + OBJC_IVAR_$_TestRuntime$_age;
}

static void _I_TestRuntime_setAge_(TestRuntime * self, SEL _cmd, NSInteger age) {
    (*(NSInteger *)((char *)self + OBJC_IVAR_$_TestRuntime$_age)) = age;
}
```

> #### 小结:
> * get方法都是一样的，都是从self的内存地址找到对应成员变量的地址，然后将结果返回。
> * set方法有些不同了：基础数据类型是直接将新值存到了`_age`对应的内存地址上；而NSString类型的值是调用了`objc_setProperty `方法。(这个涉及到了`@property`的知识，这里就不展开讨论了。)

继续往下看，我们会看到两个结构体：

* 实例方法结构体

```objc
static struct /*_method_list_t*/ {
	unsigned int entsize;  // sizeof(struct _objc_method)
	unsigned int method_count;
	struct _objc_method method_list[5];
} _OBJC_$_INSTANCE_METHODS_TestRuntime = {
	sizeof(_objc_method),
	5,
	{
	{(struct objc_selector *)"testInstanceFunction", "v16@0:8", (void *)_I_TestRuntime_testInstanceFunction},
	{(struct objc_selector *)"name", "@16@0:8", (void *)_I_TestRuntime_name},
	{(struct objc_selector *)"setName:", "v24@0:8@16", (void *)_I_TestRuntime_setName_},
	{(struct objc_selector *)"age", "q16@0:8", (void *)_I_TestRuntime_age},
	{(struct objc_selector *)"setAge:", "v24@0:8q16", (void *)_I_TestRuntime_setAge_}
	}
};
```

* 类方法结构体

```objc
static struct /*_method_list_t*/ {
	unsigned int entsize;  // sizeof(struct _objc_method)
	unsigned int method_count;
	struct _objc_method method_list[1];
} _OBJC_$_CLASS_METHODS_TestRuntime = {
	sizeof(_objc_method),
	1,
	{
	{(struct objc_selector *)"testClassFunction", "v16@0:8", (void *)_C_TestRuntime_testClassFunction}
	}
};
```

还有两个`_class_ro_t`（也就是`class_ro_t`）结构体

```objc
static struct _class_ro_t _OBJC_METACLASS_RO_$_TestRuntime = {
	1, sizeof(struct _class_t), sizeof(struct _class_t), 
	(unsigned int)0, 
	0, 
	"TestRuntime",
	(const struct _method_list_t *)&_OBJC_$_CLASS_METHODS_TestRuntime,
	0, 
	0, 
	0, 
	0, 
};

static struct _class_ro_t _OBJC_CLASS_RO_$_TestRuntime = {
	0, ((long long) &((TestRuntime *)0)->_name), sizeof(struct TestRuntime_IMPL),
	(unsigned int)0, 
	0, 
	"TestRuntime",
	(const struct _method_list_t *)&_OBJC_$_INSTANCE_METHODS_TestRuntime,
	0, 
	(const struct _ivar_list_t *)&_OBJC_$_INSTANCE_VARIABLES_TestRuntime,
	0, 
	0, 
};
```

> #### 小结:
> * 我们编写的OC代码最终会被clang转换成多种形式的结构体。
> * `class_ro_t `的数据确实是在编译期间就确定了。
> * objc方法结构解析参考[这里](https://blog.csdn.net/fishmai/article/details/71157861)

### objc_msgSend
回到正题，我们重点研究消息发送的方法：

```objc
static void _I_TestRuntime_testInstanceFunction(TestRuntime * self, SEL _cmd) {
    objc_msgSend(self, sel_registerName("setName:"), string_0);
    objc_msgSend(self, sel_registerName("setAge:"), 18);
}
```

通过添加 `objc_msgSend` Symbolic断点，我们会发现系统会去调用`lookUpImpOrForward`方法（在objc-runtime-new.mm中）。

`lookUpImpOrForward `查找方法的具体过程是:

* 先从当前Class的cache里查找IMP，如果找到就返回。
* 当前Class的cache里没有，查找当前Class的methodList，如果找到，保存到cache并返回。
* 当前Class的methodList里没有，查找superClass的cache，如果找到就返回。
* superClass的cache里没有，查找superClass的methodList，如果找到保存到cache并返回。
* 当前Class的methodList里没有，就需要method resolver处理。
	* resolver处理: 就是查找当前Class里的 `resolveClassMethod:`或者 `resolveInstanceMethod:`方法。在该方法中通过 `class_addMethod `添加方法实现，最后方法返回YES。这个时候会再调用一次消息发送。
* 如果resolver没法处理就forwarding处理（也就是最后阶段的消息转发）。
	* 调用 `forwardingTargetForSelector:`并且返回一个新对象。并且调用新对象里对应的方法。
	* `forwardingTargetForSelector:`不能处理，就要调用 `methodSignatureForSelector:`获取方法签名，然后调用`forwardInvocation:`方法，转发结束。（`forwardInvocation :`方法需要注意的是：`invokeWithTarget:`的target不能是self，要不然就循环执行这两个方法了；target要有方法的具体实现，如果没有的话，又要在target里重新走消息转发过程啦。。。）
* 如果forwarding不成功，那就报出经典的错误 `"unrecognized selector sent to instance x0..."`

> #### 小结：resolve和forward的对比
> * resolve是需要在当前类添加方法的实现，并且会再调用一次。（也就是给当前类补救的机会）
> * forward是需要有新对象的介入。（也就是说，我们可以将当前类的方法交给其他类处理了。而且新对象可以设计成变化的，那么有合适的应用场景就可以应用了。）
> * 总结方法调用：当前类能找到（不管是cache还是superClass或者superClass cache），那就直接调用；如果不能调用，给当前类resolve动态添加方法调用的机会；如果当前类处理不了，就要交给其他类（对象）来处理了（前提是当前类做了这种情况的兼容）；最后谁都处理不了，那就没办法了，crash!!!

## 总结
* 通过clang重写 `.m`，我们了解到编译器是怎么处理了我们写好的代码，我们的Class，Method等是以什么形式在内存中保存的。
* OC的每一个方法，都是以消息发送的形式调用的。
* 通过查看 `lookUpImpOrForward`源代码，我们了解了一个方法从一开始调用到最后真正执行到底经历了怎样的过程。
* 多看看源代码，多写写总结，收获还是很多的。