---
title: "iOS--内存管理知多少"
date: 2018-07-25 11:02:06
[comment]: <> (文章简介，列表页显示)
introduction: "iOS内存管理知识"
[comment]: <> - tagName
tag:
- iOS
- memorylayout
[comment]: <> [tagName1, tagName2]
tags: [iOS, memorylayout]
layout: post
project: false
[comment]: <> image url
feature: 
comments: true
---

## 前言
沉淀总结一下iOS的内存管理知识。

### 内存管理

内存管理的原则：

* 自己生成的对象，自己持有。
* 非自己生成的对象，自己也能持有。
* 不再需要自己持有的对象时，自己立即释放。
* 非自己持有的对象，自己不能释放。

|对象操作|OC对应方法|
|:----|:----|
|生成并持有对象|alloc/new/copy/mutableCopy等方法（或者以这些开头的方法）|
|---
|持有对象|retain方法|
|---
|释放对象|release方法|
|---
|销毁对象|dealloc方法|
|---
{: rules="groups"}

```objc
// 持有自己生成的对象
id obj = [[NSObject alloc] init];

// 持有非自己生成的对象。[NSMutableArray arry]等方法，就是这样实现的，当然有优化的。
+ (id)object
{
    id obj = [[NSObject alloc] init];
		
    return [obj autorelease];
}
```
> 1. 上面的区别在于`autorelease `，`autorelease `的作用就是使对象在超出指定的生存范围时，能够自动并正确的释放。
> 2. release是立即释放对象。
> 3. autorelease是将对象添加到autorelease pool中，在autorelease pool销毁时对pool里面的每一个对象调用`release`方法。

### alloc/retain/release/dealloc实现
苹果的开源代码在[这里](https://opensource.apple.com/tarballs/)。

#### alloc的实现

```objc
+ (id)alloc {
    return _objc_rootAlloc(self);
}

// Replaced by ObjectAlloc
+ (id)allocWithZone:(struct _NSZone *)zone {
    return _objc_rootAllocWithZone(self, (malloc_zone_t *)zone);
}
```

> 1. `alloc`最终调用的也是`allocWithZone:`。
> 2. `allocWithZone:`调用`_class_createInstanceFromZone`。
> 3. 在`_class_createInstanceFromZone`通过`calloc`分配内存空间，将内存地址初始化为0。然后初始化ISA。

#### retain和release的实现

```objc
- (NSUInteger)retainCount {
    return ((id)self)->rootRetainCount();
}

uintptr_t objc_object::sidetable_retainCount()
{
    SideTable& table = SideTables()[this];

    size_t refcnt_result = 1;
    
    table.lock();
    RefcountMap::iterator it = table.refcnts.find(this);
    if (it != table.refcnts.end()) {
        // this is valid for SIDE_TABLE_RC_PINNED too
        refcnt_result += it->second >> SIDE_TABLE_RC_SHIFT;
    }
    table.unlock();
    
    return refcnt_result;
}

- (id)retain {
    return ((id)self)->rootRetain();
}

id objc_object::sidetable_retain()
{
    SideTable& table = SideTables()[this];
    
    table.lock();
    size_t& refcntStorage = table.refcnts[this];
    if (! (refcntStorage & SIDE_TABLE_RC_PINNED)) {
        refcntStorage += SIDE_TABLE_RC_ONE;
    }
    table.unlock();

    return (id)this;
}

- (oneway void)release {
    ((id)self)->rootRelease();
}

uintptr_t objc_object::sidetable_release(bool performDealloc)
{
    SideTable& table = SideTables()[this];

    bool do_dealloc = false;

    table.lock();
    RefcountMap::iterator it = table.refcnts.find(this);
    if (it == table.refcnts.end()) {
        do_dealloc = true;
        table.refcnts[this] = SIDE_TABLE_DEALLOCATING;
    } else if (it->second < SIDE_TABLE_DEALLOCATING) {
        // SIDE_TABLE_WEAKLY_REFERENCED may be set. Don't change it.
        do_dealloc = true;
        it->second |= SIDE_TABLE_DEALLOCATING;
    } else if (! (it->second & SIDE_TABLE_RC_PINNED)) {
        it->second -= SIDE_TABLE_RC_ONE;
    }
    table.unlock();
    
    if (do_dealloc  &&  performDealloc) {
        ((void(*)(objc_object *, SEL))objc_msgSend)(this, SEL_dealloc);
    }
    
    return do_dealloc;
}
```

> 1. 引用计数是保存到一个全局的Hash表里（SideTable结构体的成员变量，全局的弱引用表也在这里）。
> 2. 创建对象时retainCount是0，在`sidetable_retainCount()`中获取到真实的retainCount后加1才会返回，所以对象创建完成默认的retainCount为1。
> 3. retain时retainCount + 1。
> 4. release时retainCount == 0，调用dealloc销毁对象；否则retainCount - 1。
> 5. retain和relase时都会加锁，所以都是线程安全的。

### dealloc的实现

```objc
- (void)dealloc {
    _objc_rootDealloc(self);
}

id object_dispose(id obj)
{
    if (!obj) return nil;

    objc_destructInstance(obj);    
    free(obj);

    return nil;
}

void *objc_destructInstance(id obj) 
{
    if (obj) {
        // Read all of the flags at once for performance.
        bool cxx = obj->hasCxxDtor();
        bool assoc = obj->hasAssociatedObjects();

        // This order is important.
        if (cxx) object_cxxDestruct(obj);
        if (assoc) _object_remove_assocations(obj);
        obj->clearDeallocating();
    }

    return obj;
}
```

> 通过`objc_setAssociatedObject()`方法添加的关联属性就是在这个`_object_remove_assocations(obj)`中移除的。
> 
> 在`clearDeallocating()`方法会清除引用计数表里的记录，也会清除弱引用表里的记录。

### autorelease的实现
实现代码在 [objc4](https://opensource.apple.com/tarballs/objc4/) 的 `NSObject.mm`和 `objc-object.h`中。

```objc
- (id)autorelease {
    return ((id)self)->rootAutorelease();
}

inline id objc_object::rootAutorelease()
{
    if (isTaggedPointer()) return (id)this;
    if (prepareOptimizedReturn(ReturnAtPlus1)) return (id)this;

    return rootAutorelease2();
}

id objc_object::rootAutorelease2()
{
    return AutoreleasePoolPage::autorelease((id)this);
}

// AutoreleasePoolPage
static inline id autorelease(id obj)
{
	// 获取当前page。
    AutoreleasePoolPage *page = hotPage();
    return page->add(obj);
}

// 相当于NSAutoreleasePool的 +(void)addObject:方法，添加对象到链表。
id *add(id obj)
{
    assert(!full());
    unprotect();
    id *ret = next;  // faster than `return next-1` because of aliasing
    *next++ = obj;
    protect();
    return ret;
}

id objc_autorelease(id obj)
{
    return AutoreleasePoolPage::autorelease(obj);
}

void *objc_autoreleasePoolPush(void)
{
    return AutoreleasePoolPage::push();
}

void objc_autoreleasePoolPop(void *ctxt)
{
    AutoreleasePoolPage::pop(ctxt);
}
```

> 1. 在当前线程第一次使用AutoreleasePoolPage时，会调用`objc_autoreleasePoolPush()`创建一个新的AutoreleasePoolPage并add一个`POOL_BOUNDARY`进栈。
> 2. 每个AutoreleasePoolPage所能存储的对象数量是固定的，达到最大值时，会创建新的AutoreleasePoolPage。新page的next指针会指向存储对象栈底的位置（也就是`begin()`的位置）。多个AutoreleasePoolPage是以双向链表的形式存储的，对应指针是`parent`和`child`。（最大数量是根据内存空间大小计算来的`static size_t const COUNT = SIZE / sizeof(id);`。AutoreleasePoolPage总的内存空间大小是4096个byte，除了page成员变量占用的空间，剩下的就是存储添加进来的对象。）
> 3. 当对象调用`autorelease`时，会将这个对象加入到当前AutoreleasePoolPage的栈顶next指针指向的位置。
> 4. 当线程结束或者@autoreleasepool{}块结束时，会执行`objc_autoreleasePoolPop()`。
> 5. 在pop时，会对`POOL_BOUNDARY`之前的所有对象`objc_release()`操作。如果涉及到多个page也会跨page清除`POOL_BOUNDARY `之前的对象。
> 6. push的时候添加`POOL_BOUNDARY `，pop的时候移除`POOL_BOUNDARY `之前的所有对象。所以多个AutoreleasePoolPage嵌套也是互不影响的。
> 7. [参考资料](https://blog.sunnyxx.com/2014/10/15/behind-autorelease/)

使用NSAutoreleasePool和autorelease的代码示例：

```objc
// 相当于 objc_autoreleasePoolPush();
NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];

id obj = [[NSObject alloc] init];

// 相当于 objc_autorelease(obj);
[obj autorelease];

// 相当于 objc_autoreleasePoolPop(pool);
[pool drain];
```
> 1. NSAutoreleasePool重载了 `- (id)autorelease`方法。调用会报错：`Cannot autorelease an autorelease pool`
>  2. TIPS：
> 可以调用运行时的 `_objc_autoreleasePoolPrint()`私有函数查看当前线程的autorelease pool。怎么使用呢？先声明函数，再调用就好了。
> 声明：`_objc_autoreleasePoolPrint()`；调用：`_objc_autoreleasePoolPrint()`。运行就能看到打印了。


### ARC
什么是ARC？ARC（Automatic Refrence Counting）就是内存管理中，对内存采用自动引用计数的技术。OBJC的ARC实现：让编译器来进行内存管理。Apple LLVM编译器设置ARC为有效状态，就不用再自己添加retain和release代码。将更多地精力放到代码和业务逻辑中。

现在Xcode默认都是ARC的，如果想使用MRC，可以在 `TERGETS -> Build Settings -> Objective-C Automatic Refrence Counting`修改。可以单独文件使用ARC或者MRC，在 `TERGETS  -> Build Phases`中，给单独文件添加 `-fobjc-arc`或者 `-fno-objc-arc`。

### ARC所有权修饰符

* `__strong`修饰符
* `__weak`修饰符
* `__unsafe_unretained`修饰符
* `__autoreleasing`修饰符

#### `__strong`修饰符
id类型和对象类型默认的所有权修饰符。

```objc
id obj = [[NSObject alloc] init];

// 等同于
id __strong obj = [[NSObject alloc] init];
```

> `__strong `、`__weak `和`__autoreleasing `等修饰的对象会被默认赋值为nil。

```objc
id __strong obj1;
id __weak obj2;
id __autoreleasing obj3;

// 等同于
id __strong obj1 = nil;
id __weak obj2 = nil;
id __autoreleasing obj3 = nil;
```

#### `__weak`修饰符
解决 **循环引用** 问题时使用。

#### `__unsafe_unretained`修饰符
`__unsafe_unretained`修饰的变量不属于编译器的内存管理对象，是不安全的修饰符。将`__unsafe_unretained`修饰的变量赋值给`__strong`的变量时要确保变量不为空值。

#### `__autoreleasing`修饰符
将对象注册添加到`autorelease pool`中，同MRC时`[obj autorelease]` 功能一样。id和对象的指针（二级指针）默认的所有权修饰符是`__autoreleasing`。

### ARC使用规则

* 不能使用retain/release/retainCount/autorelease。
* 必须遵守内存管理的命名规则。
	* 以`alloc/new/copy/mutableCopy`开头的方法，必须返回调用方应当持有的对象。
	* 以`init`开头的方法，必须返回id类型或者该方法声明类的对象类型，抑或是该类的超类型或者子类型。
* 不能显示调用dealloc
* 使用`@autoreleasepool { }`代替`NSAutoreleasePool`。
* 不能使用区域（NSZone）。
* 对象类型不能作为C语言结构体（struct/union）的成员变量。
* 显示地转换`void *`和`id`。

#### `void *`和`id`转换

1、`__bridge`转换

```objc
id obj = [[NSObject alloc] init];

void *p = (__bridge void*)obj;

id o = (__bridge id)p;
```
> `__bridge`转换与`__unsafe_unretained`一样不安全。因为不会影响对象的引用计数，所以野指针发生的可能性很高。所以应该使用更安全的`__bridge_retained`和`__bridge_transfer`。

2、安全转换

```objc
id obj = [[NSObject alloc] init];

void *p = (__bridge_retained void*)obj;

id o = (__bridge_transfer id)p;
```
> `__bridge_retained `相当于 `[(id)p retain]`。
> 
> `__bridge_transfer `相当于`[o retain]; [(id)p release];`
> 
> Objective-C对象和Core Foundation对象转换是不消耗CPU的（Toll-Free Bridge）。
>
```objc
CFTypeRef _Nullable CFBridgingRetain(id _Nullable X) {
    return (__bridge_retained CFTypeRef)X;
}
>
id _Nullable CFBridgingRelease(CFTypeRef _Nullable X) {
    return (__bridge_transfer id)X;
}
```

### 属性
#### 属性与所有权修饰符的关系
[参考资料](https://clang.llvm.org/docs/AutomaticReferenceCounting.html#property-declarations)

|声明的属性|所有权修饰符|
|:--|:--|
|assign|`__unsafe_unretained`修饰符|
|copy|`__strong `修饰符(赋值是被复制的对象)|
|retain|`__strong `修饰符|
|strong|`__strong `修饰符|
|unsafe_unretained| `__unsafe_unretained`修饰符 |
|weak|`__weak`修饰符|

### ARC实现原理
[参考资料](https://clang.llvm.org/docs/AutomaticReferenceCounting.html#ownership-qualification)

可以使用 `clang -S -fobjc-arc -emit-llvm XXX.m -o TestOutput.m` 查看程序的中间语言输出。

#### __strong的实现

```objc
- (void)test1
{
    {
        id __strong obj = [[NSObject alloc] init];
    }
}
```

编译器处理后的代码

```objc
define internal void @"\01-[ALObject test1]"(%0*, i8*) #0 {
  %3 = alloca %0*, align 8
  %4 = alloca i8*, align 8
  %5 = alloca i8*, align 8
  store %0* %0, %0** %3, align 8
  store i8* %1, i8** %4, align 8
  %6 = load %struct._class_t*, %struct._class_t** @"OBJC_CLASSLIST_REFERENCES_$_", align 8
  %7 = load i8*, i8** @OBJC_SELECTOR_REFERENCES_, align 8, !invariant.load !8
  %8 = bitcast %struct._class_t* %6 to i8*
  %9 = call i8* bitcast (i8* (i8*, i8*, ...)* @objc_msgSend to i8* (i8*, i8*)*)(i8* %8, i8* %7)
  %10 = bitcast i8* %9 to %1*
  %11 = load i8*, i8** @OBJC_SELECTOR_REFERENCES_.2, align 8, !invariant.load !8
  %12 = bitcast %1* %10 to i8*
  %13 = call i8* bitcast (i8* (i8*, i8*, ...)* @objc_msgSend to i8* (i8*, i8*)*)(i8* %12, i8* %11)
  %14 = bitcast i8* %13 to %1*
  %15 = bitcast %1* %14 to i8*
  store i8* %15, i8** %5, align 8
  call void @objc_storeStrong(i8** %5, i8* null) #2
  ret void
}
```

再来看看 `objc_storeStrong`的源代码

```objc
void
objc_storeStrong(id *location, id obj)
{
    id prev = *location;
    if (obj == prev) {
        return;
    }
    objc_retain(obj);
    *location = obj;
    objc_release(prev);
}
```

> `objc_storeStrong `就是对新对象retain，release掉旧的对象。那么`objc_storeStrong(i8** %5, i8* null)`这里就是release掉旧的对象，并清空内存地址。也就是相当于编译器为我们添加了`objc_release()`。

#### 赋值操作

```objc
- (void)test1
{
    {
        id __strong obj = [[NSObject alloc] init];
        id __strong obj2 = obj;
    }
}
```

编译后的代码

```objc
define internal void @"\01-[ALObject test1]"(%0*, i8*) #0 {
  ...
  
  %18 = call i8* @objc_retain(i8* %17) #2
 
  ...
 
  call void @objc_storeStrong(i8** %6, i8* null) #2
  call void @objc_storeStrong(i8** %5, i8* null) #2
  ret void
}
```

> 我们发现比上面单纯的创建对象多了个 `objc_retain()`和`objc_storeStrong()`也就是`objc_release()`。说明编译器为我们做的就是按照`一定的规则`添加retain和release等内存管理的方法。
> 

```objc
// Class ALObject
+ (instancetype)newInstance
{
    id obj = [[self alloc] init];

    return obj;
}

+ (instancetype)createInstance
{
    id obj = [[self alloc] init];

    return obj;
}

- (void)test1
{
    id obj1 = [ALObject newInstance];
    id obj2 = [ALObject createInstance];
}
```

编译后的伪代码如下：

```objc
+ (instancetype)newInstance
{
    id obj = objc_msgSend(ALObject, @selector(alloc));
    objc_msgSend(obj, @selector(init));
    
    id tmp = objc_retain(obj);
    objc_storeStrong(&obj, null);
    
    return tmp;
}

+ (instancetype)createInstance
{
    id obj = objc_msgSend(ALObject, @selector(alloc));
    objc_msgSend(obj, @selector(init));
    
    id tmp = objc_retain(obj);
    objc_storeStrong(&obj, null);
    
    id tmp2 = objc_autoreleaseReturnValue(tmp);
    
    return tmp2;
}

- (void)test1
{
    id obj1;
    id tmp = objc_msgSend(ALObject, @selector(newInstance));
    obj1 = tmp;
    
    id obj2;
    id tmp2 = objc_msgSend(ALObject, @selector(createInstance));
    obj2 = objc_retainAutoreleasedReturnValue(tmp2);
    
    objc_storeStrong(&obj1, null);
    objc_storeStrong(&obj2, null);
}
```

> 参考以上代码，来看看 **编译器按照方法的命名规则添加内存管理** 怎么实现的：
> 
> 1. `alloc/new/copy/mutableCopy`开头的方法函数直接返回应该持有的对象。如果调用方不赋值给其他变量持有，那么编译器会自动添加`objc_release()`释放对象（相当于生成中间tmp变量）；如果有变量持有该返回的对象，那么就在变量超出作用域范围时才会释放对象。可以将调用方法和赋值看成两个步骤。（这是编译器对retain和release的优化）
> 2. **不是**`alloc/new/copy/mutableCopy`开头的方法，返回值对象会自动调用`objc_autoreleaseReturnValue()`，将对象注册到`autorelease pool`中。在调用方会调用`objc_retainAutoreleasedReturnValue()`获取对象。绕了一圈是为什么呢？当然是为了性能，要不然每个这样创建的对象都会添加到`autorelease pool`中系统开销会很大，具体细节可以参考[这里](https://blog.sunnyxx.com/2014/10/15/behind-autorelease/)。

#### __weak的实现

```objc
- (void)test1
{
    {
        id __weak obj = [[NSObject alloc] init];
    }
}
```

编译后的代码

```objc
define internal void @"\01-[ALObject test1]"(%0*, i8*) #0 {
  ...
  
  %9 = call i8* bitcast (i8* (i8*, i8*, ...)* @objc_msgSend to i8* (i8*, i8*)*)(i8* %8, i8* %7)

  ...

  %13 = call i8* bitcast (i8* (i8*, i8*, ...)* @objc_msgSend to i8* (i8*, i8*)*)(i8* %12, i8* %11)
  %14 = bitcast i8* %13 to %1*
  %15 = bitcast %1* %14 to i8*
  %16 = call i8* @objc_initWeak(i8** %5, i8* %15) #2
  %17 = bitcast %1* %14 to i8*
  call void @objc_release(i8* %17) #2, !clang.imprecise_release !8
  call void @objc_destroyWeak(i8** %5) #2
  ret void
}
```

类似于以下伪代码

```objc
{
	id obj;
	id tmp = objc_msgSend(NSObject, @selector(alloc));
	objc_msgSend(tmp, @selector(init));
	objc_initWeak(&obj, tmp);
	objc_release(tmp);
	objc_destroyWeak(obj);
}
```

> * `__weak`变量会通过`storeWeak()`方法将weak对象存储到一个类似于存储引用计数器的hash表里，以对象为key，value是指向该对象的weak引用的地址，将value存储到一个数组里（可能有多个）。
> * 在使用`__weak`变量时，是通过`objc_loadWeakRetained()`获取weak的对象。每一次调用都会从hash表里查找对象，也就有相应的CPU消耗，所以应当减少`__weak`的使用。
> * 在对象销毁时，会依次调用以下方法：
> 1. `objc_release()`
> 2. `-(void)dealloc{}`
> 3. `_objc_rootDealloc(self);`
> 4. `rootDealloc();`
> 5. `object_dispose((id)this);`
> 6. `objc_destructInstance(obj);`
> 7. `clearDeallocating();`
> * 在`clearDeallocating();`中会从全局weak表里找到weak对象的地址，设置为nil，并从表里移除。（引用计数表里的记录也会被清除）

> Tips:
> `__weak`修饰的变量使用 `clang -rewrite-objc` 时会报错误，这是因为rewrite `__weak` 修饰的变量时需要运行时环境配合，应该添加 `-fobjc-runtime=macosx-10.10` 参数。
> 
> ```objc
> clang -rewrite-objc -fobjc-arc -fobjc-runtime=macosx-10.10 -Wno-deprecated-declarations XXX.m -o Output.m
> ```

#### __autoreleasing的实现

```objc
- (void)test1
{
    {
        id __autoreleasing obj = [[NSObject alloc] init];
    }
}
```

编译后的代码

```objc
define internal void @"\01-[ALObject test1]"(%0*, i8*) #0 {
  ...
  
  %9 = call i8* bitcast (i8* (i8*, i8*, ...)* @objc_msgSend to i8* (i8*, i8*)*)(i8* %8, i8* %7)

  ...

  %13 = call i8* bitcast (i8* (i8*, i8*, ...)* @objc_msgSend to i8* (i8*, i8*)*)(i8* %12, i8* %11)
  %14 = bitcast i8* %13 to %1*
  %15 = bitcast %1* %14 to i8*
  %16 = call i8* @objc_autorelease(i8* %15) #2
  store i8* %16, i8** %5, align 8
  ret void
}
```

> 与`__strong`的区别就是`objc_autorelease()`，将对象注册到`autorelease pool`，对象的释放交给`autorelease  pool`，也就不会有`objc_storeStrong()`了。

## 总结

* 学习了MRC手动管理内存的方式，明白了内存管理的原则和原理。
* 通过查看clang编译后的代码知道了编译器在ARC的时候是怎么帮我们添加内存管理代码的。
* ARC时，编译器也不是简单的添加retain和release，会有根据方法命名规则内存管理的优化，也有ARC和MRC混合环境的内存管理的优化等等。
* [参考链接](http://clang.llvm.org/docs/AutomaticReferenceCounting.html)