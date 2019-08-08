---
title: "Xcode编译wxsqlite3"
date: 2019-08-02 14:43:53
[comment]: <> (文章简介，列表页显示)
introduction: Xcode编译wxsqlite3，生成.a和Framework
[comment]: <> [tagName1, tagName2] (搜索key)
tags: [ios, wxsqlite3, sqlite3, framework, .a]
layout: post
project: false
[comment]: <> image url
feature: 
comments: true
---

### 编译wxsqlite3

将下载好的`wxsqlite3-4.4.3/sqlite3secure/src`目录中的所有文件添加到Xcode中，然后删除**除sqlite3.h和sqlite3secure.c以外的所有文件的引用**，这个时候再编译就可以编译通过了。

### 编译Framework

#### 编译真机版Framework

* 将`wxsqlite3`源代码添加到工程，然后删除**除sqlite3.h和sqlite3secure.c以外的所有文件的引用**。
* 创建名为`SecureSQLite3`的`Framework Target`。
* 工程中创建`Framework`文件夹。
* 设置`Build Settings`中`Pre-configuration Build Products Path`为`${SRCROOT}/Framework`。
* 设置`Build Settings`中`iOS Deployment Target`的版本号，比如：`iOS 8.0`。
* 添加`Build Settings`中`Preprocessor Macros`编译宏定义`SQLITE_HAS_CODEC`。
* 设置`Architectures`为：`arm64 arm64e armv7 armv7s`。
* 设置`Build Active Architecture Only`为：`NO`。
* 设置`Valid Architectures`为：`arm64 arm64e armv7 armv7s x86_64`。
* 将`sqlite3.h`的`Membersship`设置为`Public`，然后添加到`SecureSQLite3.h`头文件中（要这样添加`#import <xxx/sqlite3.h>`）。
* 连接真机编译，生成的Framework就会在`Framework`文件夹下。

进入到`SecureSQLite3.framework`文件夹下，查看支持平台信息：

```shell
lipo -info SecureSQLite3

// Architectures in the fat file: SecureSQLite3 are: armv7 armv7s arm64 arm64e
```

将`SecureSQLite3.framework`命名为`SecureSQLite3_fat.framework`，以备和模拟器的Framework合并。

#### 编译模拟器版Framework

步骤和`真机版Framework`基本一样，只是将`Architectures`设置为：`x86_64`（只编译生成64位模拟器版本）。

选择模拟器然后编译，生成的Framework就会在`Framework`文件夹下。

进入到`SecureSQLite3.framework`文件夹下，查看支持平台信息：

```shell
lipo -info SecureSQLite3

// Non-fat file: SecureSQLite3 is architecture: x86_64
```

#### 合并Framework

经过上面步骤，会在Framework目录下生成两个Framework，分别为：`SecureSQLite3_fat.framework`（真机版）和`SecureSQLite3.framework`（模拟器版）。

进入到Framework目录下，执行合并命令（这里是将模拟器版Framework的可执行文件合并到真机版Framework的可执行文件里）：

```shell
lipo -create SecureSQLite3.framework/SecureSQLite3 SecureSQLite3_fat.framework/SecureSQLite3 -output SecureSQLite3_fat.framework/SecureSQLite3
```

进入到`SecureSQLite3_fat.framework`文件夹下，查看支持平台信息：

```shell
lipo -info SecureSQLite3

// Architectures in the fat file: SecureSQLite3 are: x86_64 armv7 armv7s arm64 arm64e
```

Framework版本制作合并完毕！

### 编译.a

#### 编译真机版.a

* 将`wxsqlite3`源代码添加到工程，然后删除**除sqlite3.h和sqlite3secure.c以外的所有文件的引用**。
* 创建名为`SecureSQLite3`的`Static Library`。
* 工程中创建`Framework`文件夹。
* 设置`Build Settings`中`Pre-configuration Build Products Path`为`${SRCROOT}/Framework`。
* 设置`Build Settings`中`iOS Deployment Target`的版本号，比如：`iOS 8.0`。
* 添加`Build Settings`中`Preprocessor Macros`编译宏定义`SQLITE_HAS_CODEC`。
* 设置`Architectures`为：`arm64 arm64e armv7 armv7s`。
* 设置`Build Active Architecture Only`为：`NO`。
* 设置`Valid Architectures`为：`arm64 arm64e armv7 armv7s x86_64`。
* 连接真机编译，生成的`.a`就会在`Framework`文件夹下。

进入到`Framework`文件夹下，查看支持平台信息：

```shell
lipo -info libSecureSQLite3.a

// Architectures in the fat file: libSecureSQLite3.a are: arm64 arm64e armv7 armv7s
```

将`libSecureSQLite3.a`命名为`libSecureSQLite3_fat.a`，以备和模拟器的.a合并。

#### 编译模拟器版.a

步骤和`真机版.a`基本一样，只是将`Architectures`设置为：`x86_64`（只编译生成64位模拟器版本）。

选择模拟器然后编译，生成的.a就会在`Framework`文件夹下。

进入到`Framework`文件夹下，查看支持平台信息：

```shell
lipo -info libSecureSQLite3.a

// Non-fat file: libSecureSQLite3.a is architecture: x86_64
```

#### 合并.a

经过上面步骤，会在Framework目录下生成两个.a，分别为：`libSecureSQLite3_fat.a`（真机版）和`libSecureSQLite3.a`（模拟器版）。

进入到Framework目录下，执行合并命令（这里是将模拟器版.a合并到真机版的.a）：

```shell
lipo -create libSecureSQLite3.a libSecureSQLite3_fat.a -output libSecureSQLite3_fat.a
```

查看支持平台信息：

```shell
lipo -info libSecureSQLite3_fat.a

// Architectures in the fat file: libSecureSQLite3_fat.a are: armv7 armv7s x86_64 arm64 arm64e
```

.a版本制作合并完毕！

### 项目使用

#### 使用Framework

将对应的Framework添加到工程，比如：`SecureSQLite3_fat.framework`，需要将`SecureSQLite3_fat.framework`重命名为`SecureSQLite3.framework`。因为在创建Framework的时候名字为`SecureSQLite3`，与之对应的`module name`也为：`SecureSQLite3`。这样才能正确的引用到Framework可执行文件。

添加编译宏：`SQLITE_HAS_CODEC`（在`Build Settings`中`Preprocessor Macros`中添加）。

引入头文件就可以使用API了（`#import <SecureSQLite3/SecureSQLite3.h>`）。

#### 使用.a

将对应的Framework添加到工程，比如：`libSecureSQLite3_fat.a`。与Framework不同，.a库可以随意修改名字，只要工程中不重名就可以。还需要将`wxsqlite3`源代码中的`sqlite3.h`头文件添加到工程。

添加编译宏：`SQLITE_HAS_CODEC`（在`Build Settings`中`Preprocessor Macros`中添加）。

引入头文件就可以使用API了（`#import "sqlite3.h"`）。

### 相关链接

[wxsqlite3](https://github.com/utelle/wxsqlite3)

[sqlite3](https://www.sqlite.org/index.html)