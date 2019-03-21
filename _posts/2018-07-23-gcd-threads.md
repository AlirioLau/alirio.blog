---
title: "iOS-多线程"
date: 2018-07-23 07:13:39
[comment]: <> (文章简介，列表页显示)
introduction: "多线程技术探究"
[comment]: <> - tagName
tag:
- iOS
[comment]: <> [tagName1, tagName2]
tags: [iOS]
layout: post
project: false
[comment]: <> image url
feature: http://i.imgur.com/Ds6S7lJ.png
comments: true
---

## 概念
文章介绍前，先要明确几个基本的概念。

> **进程**：我们的应用程序就是一个进程，是操作系统进行资源分配和调度的基本单位，进程是线程的容器。
> 
> **线程**：线程是进程中实时调度和派发任务的基本单位。
> 
> **串行**：一个任务执行完再执行下一个任务。（`等待执行中的任务处理结束`）
> 
> **并行**：多个任务可以同时执行。（`不等待执行中的任务处理结束`）
> 
> **同步**：在**当前线程**中执行任务，***不具备***开启新线程能力。
> 
> **异步**：在**新(子)线程**中执行任务，***具备***开启线程能力。

#### 注意
`不管是串行还是并行，任务都是按顺序放到线程中执行。只是任务执行结束时间不一定相同。`

### iOS多线程API
iOS提供的多线程API有：pthread、NSThread、GCD、NSOperationQueue。

* pthread：来自clang，纯C语言，需要手动创建线程、销毁线程，手动进行线程管理。使用很少...（系统自带的库使用挺多的哈，比如runtime中）
* NSThread：Objective-C 对 pthread 的一个封装。当然也是直接操作线程，所以需要手动创建线程、销毁线程，手动进行线程管理。
* GCD(Grand Central Dispatch)：API很简单，但是功能很强大。开发者不必直接跟线程打交道，取而代之的是队列。GCD有一个由系统管理的线程池，线程管理不需要开发者关心。
* NSOperationQueue：是GCD的封装，增加了一些GCD没有的功能：operation的取消、添加前后依赖等。
* NSObject的两个方法：`performSelectorOnMainThread: withObject: waitUntilDone:`和`performSelectorInBackground: withObject:`

### GCD

#### 先看看同步、异步与队列的关系

|----
|主队列(串行队列)|全局队列(并行队列)|串行队列|并行队列|
|:----|:----|:----|:----|:----|
|同步(sync)|**串行**执行、**没有**新线程|**串行**执行、**没有**新线程|**串行**执行、**没有**新线程|**串行**执行、**没有**新线程|
|----
|异步(async)|**串行**执行、**没有**新线程|**并行**执行、**有**新线程(多)|**串行**执行、**有**新线程(一)|**并行**执行、**有**新线程(多) |
|----
{: rules="groups"}

> 主队列不管是同步还是异步都不具备开启新线程的能力，执行方式都是同步执行。
> 
> 全局队列是由系统管理的并行队列。
> 
> 在异步执行时，开不开启新线程要看队列：如果是串行队列就开启一条新线程；如果是并行队列就开启多条线程。

### 创建队列

`dispatch_queue_create(label, attr)` label：是

> 创建队列时注意：
