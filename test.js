import {QueueWorker} from "./index";

let test = function(word) {
    console.log(word)
    return 111111
}

let testPro = async function(word) {
    await new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, 1000 * Math.random());
    })
    console.log(word)

    return 0;
}

async function start() {
    let worker = new QueueWorker();
    // worker.add(test, 123)
    // worker.add(testPro, 111)
    // worker.add(testPro, 222)
    // worker.add(testPro, 333)
    // worker.add(testPro, 444)
    // worker.add(testPro, 555)
    // await worker.doFirst()

    for (let i = 0; i < 10; i++) {
        await new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, 200);
        })
        console.log(i)
        worker.add(testPro, i)
    }

    worker.do();
    
}

start()