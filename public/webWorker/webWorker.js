// self.importScripts('cesium/Build/Cesium/Cesium.js')
onmessage = function (e) {
    // 接受主线程传递的消息
    const { data } = e.data
    // 进行消息处理
    // const a = data + '-webworker' + test
    const fn = () => {
        console.log('fn')
        return 'fn'
    }

    // 发送消息给主线程
    postMessage({
        // data: a
        data: fn()
    })
}