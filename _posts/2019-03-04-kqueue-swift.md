---
title: kqueue的简单使用
date: 2019-03-04 10:26:43
[comment]: <> (文章简介，列表页显示)
introduction: kqueue-swift
[comment]: <> - tagName
tag:
- Socket
- Kqueue
[comment]: <> [tagName1, tagName2]
tags: [Socket, Kqueue]
layout: post
project: false
[comment]: <> image url
feature: 
comments: true
---

### 简介
`kqueue` 是在UNIX上高效的IO复用技术，类似于Linux的 `epoll`。

*IO复用*原理大概为：当网卡收到网络端的消息的时候会向CPU发起中断请求，然后通过网卡驱动程序通知操作系统kqueue处理，然后kqueue通知用户处理。

### API

相关头文件

* <sys/types.h>
* <sys/event.h>
* <sys/time.h>

#### `kqueue()`

```c
int kqueue(void); // 失败，返回 -1；成功返回文件描述符
```

`kqueue()`会创建一个内核消息队列，返回一个文件描述符fd。可以创建多个kqueue，每个kqueue又可以添加多个kevent。

#### `kevent()`

```c
int 
kevent(int kq, const struct kevent *changelist, int nchanges,
	   struct kevent *eventlist, int nevents,
	   const struct timespec *timeout);
```

`kevent()` 系统调用，注册新的 `events` 到消息队列，并且将系统收到的事件 `events` 通知给用户。

> `kq`：`kqueue()`系统调用返回的文件描述
> 
> `changelist`：`kevent`结构体的数组，数组里的所有 `kevent` 及其参数设置都会注册到消息队列。如果 `kevent` 的 `ident` 相同，那么将会覆盖原有所有设置。
> 
> `nchanges`：`changelist` 的个数。
> 
> `eventlist`：系统收到事件消息，通过`kevent`数组通知给用户。
> 
> `nevents`：用户能接收的最大事件个数。如果 `nevents` 为0，`kevent()`函数会立刻返回，即使 `timeout` 参数不为0也会立即返回，而不是等待系统事件。
> 
> `timeout`：设置监听事件的超时时间。如果为NULL，那么将会永久监听。

`kevent` 结构体：

```c
struct kevent {
  uintptr_t  ident;       /*  identifier for this event */
  short     filter;       /*  filter for event */
  u_short   flags;       /*  action flags for kqueue  */
  u_int     fflags;       /*  filter flag value */
  int64_t   data;       /*  filter data value */
  void      *udata;       /*  opaque user data identifier */
  uint64_t  ext[4];       /*  extensions */
};
```

`timespec` 结构体

```c
struct timespec {
  time_t tv_sec;        /* seconds */
  long   tv_nsec;       /* and nanoseconds */
};
```

### Swift示例

#### 注册事件

```swift
private let kq = Darwin.kqueue()

private func register(
  _ fd: CInt,
  events: Set<IOEvent>,
  udata: UnsafeMutableRawPointer? = nil
  ) -> CInt {

    var changes: [Darwin.kevent] = []

    for event in events {
      var filter: Int16 = 0
      switch event {
      case .read:
        filter = Int16(EVFILT_READ)
      case .write:
        filter = Int16(EVFILT_WRITE)
      }

      let ev = Darwin.kevent(ident: UInt(fd),
                             filter: filter,
                             flags: UInt16(EV_ADD),
                             fflags: 0,
                             data: 0,
                             udata: udata)

      changes.append(ev)
    }

    let count = CInt(changes.count)

    guard (changes.withUnsafeMutableBufferPointer {
      kevent(kq, $0.baseAddress, count, nil, 0, nil) >= 0
    }) else {
      return 0
    }

  return fd
}

// 调用
let listenFD = socket(PF_INET, SOCK_STREAM, IPPROTO_TCP)

...

register(listenFD, events: [.read])
```

### 处理回调

```swift
private func watchLoop(_ process: ([kevent], CInt) -> Void) {
  var events = [Darwin.kevent](repeating: kevent(), count: 50)

  repeat {
    // 返回值为：接收到的事件个数
    let evNum = kevent(kq, nil, 0, &events, 50, nil)
    
    if evNum == -1 {
      continue
    }

    process(events, evNum)
  } while true
}

watchLoop { (events, evNum) in
  for ev in events {
    let socketFD = ev.ident
    let data = ev.data

    if socketFD == UInt(listenFD) {
      // 对于监听的socket，data是：客户端请求连接的个数connNum
      // let connectFD = Darwin.accept(listenFD, nil, nil)
      // register(connectFD, events: [.read]) ...
      // ...
    } else {
      // 对于流socket，data是：接收缓冲区可读数据的字节数。
      // recv() ... 
      // send() ...
      // ...
    }
  }
}
```

### 参考资料

[kqueue](https://www.freebsd.org/cgi/man.cgi?query=kqueue&sektion=2)

[kqueue.pdf](https://people.freebsd.org/~jlemon/papers/kqueue.pdf)

[kqueue示例](https://www.ibm.com/developerworks/cn/aix/library/1105_huangrg_kqueue/)
