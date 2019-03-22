---
title: Swift 指针使用
date: 2019-01-15 10:29:44
[comment]: <> (文章简介，列表页显示)
introduction: Swift 指针使用
[comment]: <> - tagName
tag:
- Swift
- Pointer
[comment]: <> [tagName1, tagName2]
tags: [Swift, Pointer]
layout: post
project: false
[comment]: <> image url
feature: 
comments: true
---

### MemoryLayout<T>

Swift提供了MemoryLayout来检测类型(或者变量)的内存大小、对齐方式和步长。

```swift
let size = MemoryLayout<Int>.size			// size = 8
let stride = MemoryLayout<Int>.stride		// stride = 8
let alignment = MemoryLayout<Int>.alignment	// alignment = 8
```

> `size` `stride` `alignment`更多细节可以参考[这里](https://swiftunboxed.com/internals/size-stride-alignment/)

### 指针

Swift使用 `Struct` 来描述一个指针，并且所有的指针都以 `Unsafe` 开头命名。这个命名表明Swift在提醒你，编译器不会对这种操作进行检查，你需要对自己的代码承担全部的责任。

Swift定义了三种类型的指针，分别是：`UnsafePointer` `UnsafeRawPointer` `UnsafeRawBufferPointer`，每个都有对应的 `Mutable` 版本。

Swift指针与C指针的类型对应关系：

`UnsafePointer<Int>`                对应 `const int *`
`UnsafeMutablePointer<Int>`   对应 `int *`
`UnsafeRawPointer`                  对应 `const void *`
`UnsafeMutableRawPointer`     对应 `void *`

### 指针初始化和内存管理

Swift中指针的创建只能创建 `Mutable` 的指针，并且指针的管理是需要我们手动进行内存分配和释放的。指针生命周期内分为三个阶段：

* 内存没有被分配，这意味着这是一个 null 指针，或者是之前已经释放过
* 内存进行了分配，但是值还没有被初始化
* 内存进行了分配，并且值已经被初始化

```swift
// 1. 创建
let strPtr = UnsafeMutablePointer<String>.allocate(capacity: 1)

// 4. 释放内存
defer {
	strPtr.deinitialize(count: 1)

	strPtr.deallocate()
}

// 2. 初始化
strPtr.initialize(to: "初始化")

// 3. 使用
strPtr.pointee = "修改strPtr"

print(strPtr.pointee)
```

### 指向数组的指针

Apple的[博客](https://developer.apple.com/swift/blog/?id=6)有一个例子，在调用 `C API` 时已经帮我们完成了转换。

```swift
import Accelerate

let a: [Float] = [1, 2, 3, 4]
let b: [Float] = [0.5, 0.25, 0.125, 0.0625]
var result: [Float] = [0, 0, 0, 0]

// 函数原型 void vDSP_vadd(const float *__A, long long __IA, const float *__B, long long __IB, float *__C, long long __IC, unsigned long __N)
vDSP_vadd(a, 1, b, 1, &result, 1, 4)

// result now contains [1.5, 2.25, 3.125, 4.0625]
```

> `C API` `cons Type *` 对应Swift `UnsafePointer<T>`，`Type *` 对应Swift `UnsafeMutablePointer<T>`。
>
> 参数需要 `const` ，直接传入Swift数组；参数不需要 `const` 的参数，传入 `&` 数组。

可以通过 `UnsafeMutableBufferPointer` 指针来操作数组

```swift
var arrary = [1, 2, 3, 4]

let arraryPtr = UnsafeMutableBufferPointer<Int>(start: &arrary, count: arrary.count)

// baseAddress是第一个元素的指针，类型为UnsafeMutablePointer
// basePtr.pointee = 1
guard let basePtr = arraryPtr.baseAddress else {
	return
}

basePtr.pointee = 100

// 下一个元素的指针
// nextPtr.pointee = 2
let nextPtr = basePtr.successor()

nextPtr.pointee = 200

// UnsafeMutableBufferPointer实现了map方法，可以通过map遍历数组元素
arraryPtr.map {
	print($0) // 100, 200, 3, 4
}

// 也可以使用 for in 遍历数组元素
for ptr in arraryPtr {
	print(ptr) // 100, 200, 3, 4
}
```

### 指针操作和转换

Swift中是不能直接通过 `&` 来获取某个变量的指针的。比如

```swift
// 这是不能通过编译的
let a = 10
let b = &a
```

要想获取某个变量的指针需要通过 `withUnsafePointer()` 或者 `withUnsafeMutablePointer()` 方法。两个方法第一个参数都是 `inout` 的任意类型，第二个参数是一个闭包。Swift将第一个参数转化为指针然后调用闭包，闭包的参数就是Swift转化的指针。两个方法的区别就是转化后的指针可变与不可变。

```swift
var a = 10
let b = withUnsafeMutablePointer(to: &a) { (ptr: UnsafeMutablePointer<Int>) -> Int in
    ptr.pointee = 100
    return ptr.pointee
}

print(a)	// a = 100
print(b)	// b = 100
```
> `withUnsafePointer` 方法有两个版本：`withUnsafePointer(to: &T, body: (UnsafePointer<T>) throws -> Result)` 和 `withUnsafePointer(to: T, body: (UnsafePointer<T>) throws -> Result)`，通过查看Swift源代码可以发现这两个本质没有区别。区别只在获取 `T` 的内存地址上不同：前者是通过 `Builtin.addressof(&value)` 获取；后者是通过 `Builtin.addressOfBorrow(value)` 获取。

要获取某个变量的字节数据需要通过 `withUnsafeBytes()` 或者 `withUnsafeMutableBytes()`方法。和 `withUnsafePointer()` 类似 `withUnsafeBytes()` 也有两个重载版本。使用示例如下：

```swift
var a = 1000

withUnsafeBytes(of: &a) { (rawBufferPtr) in
    for rawPtr in rawBufferPtr {
        print(rawPtr)
    }
}

// 输出： 232 3 0 0 0 0 0 0
// 字节类型是 UInt8，8个二进制位。取值范围是 0~255，满255向高位进一。Int类型站8个字节。
// 那么 1000 = 232 + 2^8 * 3 + 2^16 * 0 + 2^24 * 0 + ...
// $1000 = 2^{8 \times 0} \times 232 + 2^{8 \times 1} \times 3 + 2^{8 \times 2} \times 0 + 2^{8 \times 3} \times 0 + 2^{8 \times 4} \times 0 + 2^{8 \times 5} \times 0 + 2^{8 \times 6} \times 0 + 2^{8 \times 7} \times 0$
```

`Data` 也可以通过 `for in` 得到字节数据。 `Data` 本质是一个 `raw byte buffer`

```swift
var a = 1000

var aData = Data(bytes: &a, count: MemoryLayout.size(ofValue: a))

for sub in aData {
    print(sub)
}

// 输出： 232 3 0 0 0 0 0 0
```

将 `Data` 转换为原始 `Int` 数据

```swift
var a = 1000

var aData = Data(bytes: &a, count: MemoryLayout.size(ofValue: a))

aData.withUnsafeMutableBytes { (ptr: UnsafeMutablePointer<UInt8>) in
    ptr.pointee = 100

    ptr.withMemoryRebound(to: Int.self, capacity: MemoryLayout.size(ofValue: a), { (ptrInt) in
        print(ptrInt.pointee) // 868
    })
}

// 输出 868
// ptr.pointee指向首字节地址，将第一个字节修改为100，那么最后结果是：100 + 256 * 3 = 868
```

#### 字节数组转化为原始数据

```swift
// 第一种方式：通过 Array 的 withUnsafeBytes() 方法
let buf: [UInt8] = [1, 187]

let port1 = buf.withUnsafeBytes { (rawBufferPtr) -> UInt16 in
    let value = rawBufferPtr.baseAddress!.assumingMemoryBound(to: UInt16.self).pointee
    return UInt16(bigEndian: value)
}

print(port1)

// 第二种方式：通过 Data 作为数据中间介转化。
let data = Data(bytes: buf)

let port2 = data.withUnsafeBytes { (ptr: UnsafePointer<UInt8>) in
    ptr.withMemoryRebound(to: UInt16.self, capacity: 1, { (ptr) in
        return UInt16(bigEndian: ptr.pointee)
    })
}

print(port2)

// 第三种方式：通过直接创建 UnsafeMutablePointer()
let mPtr = UnsafeMutablePointer<UInt8>.allocate(capacity: 2)
mPtr.initialize(from: buf, count: buf.count)

defer {
    mPtr.deinitialize(count: 1)
    mPtr.deallocate()
}

let port3 = mPtr.withMemoryRebound(to: UInt16.self, capacity: 1, { (ptr: UnsafeMutablePointer<UInt16>) in
    return UInt16(bigEndian: ptr.pointee)
})

print(port3)

// 第四种方式：通过创建 UnsafeMutableBufferPointer()
let bufferPtr = UnsafeMutableBufferPointer<UInt8>(start: &buf, count: buf.count)

let port4 = bufferPtr.baseAddress!.withMemoryRebound(to: UInt16.self, capacity: 1) { (ptr) in
    return UInt16(bigEndian: ptr.pointee)
}

print(port4)
```

> 字节数组的数据排序方式和 **大端** 排序方式一致。

### 其他

#### 查看Swift源代码
Swift的标准库代码在 [`stdlib/public/core`](https://github.com/apple/swift/tree/master/stdlib/public/core) 中，但是，大约 1/3 的文件都是 `.swift.gyb` 的后缀，阅读很麻烦。

目前有两种方式处理 `GYB` 文件：

1、使用脚本处理，脚本在[这里](https://gist.github.com/tonisuter/e47267a25b3dcc90fe75a24d3ed2063a)

```shell
#!/bin/bash
for f in `ls *.gyb`
do
	echo "Processing $f"
	name=${f%.gyb}
	../../../utils/gyb -D CMAKE_SIZEOF_VOID_P=8 -o $name $f --line-directive ""
done
```

处理完毕 `.gyb` 文件会去除后缀，并且放到原来位置。这种方式还是很简单方便的。

2、clone Swift源代码并且编译，参考 [readme](https://github.com/apple/swift/blob/master/README.md)

```shell
// Install build tools
brew install cmake ninja

// Create base directory
mkdir swift-source
cd swift-source

// Clone Swift
git clone https://github.com/apple/swift.git

// Clone dependencies (LLVM, Clang, etc.)
./swift/utils/update-checkout --clone

// build 
./swift/utils/build-script -x -R
// -x 会生成一个 Xcode project
// -R 是release模式，编译相对快一些。

// 如果需要更新
./swift/utils/update-checkout --clone
./swift/utils/build-script -x -R
```

### 参考资料

[Unsafe Swift: Using Pointers And Interacting With C](https://www.raywenderlich.com/780-unsafe-swift-using-pointers-and-interacting-with-c)

[0107-unsaferawpointer.md](https://github.com/apple/swift-evolution/blob/master/proposals/0107-unsaferawpointer.md)

[0138-unsaferawbufferpointer.md](https://github.com/apple/swift-evolution/blob/master/proposals/0138-unsaferawbufferpointer.md)

[size-stride-alignment](https://swiftunboxed.com/internals/size-stride-alignment/)

[字节序](https://zh.wikipedia.org/wiki/%E5%AD%97%E8%8A%82%E5%BA%8F)