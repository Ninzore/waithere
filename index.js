import events from "events";

export class Waithere {
    /** 
    * Provide queue function in Promise
    * @param {Number} maxBurst the max worker number
    */
    constructor(maxBurst = 1, delay = 0) {
        this.job_list = [];
        this.maxBurst = maxBurst;
        this.delay = delay;
        this.emitter = new events.EventEmitter();
    }

    /**
    * Add one job to the end of the job list
    * 
    * @param {Function} job a function waits to be done
    * @param {any} args arguments to be passed to the function
    * @return {boolean} true on success
    */
    add(job, ...args) {
        if (typeof job === "function") {
            this.job_list.push({job, args});
            return true;
        }
        else throw new TypeError("job must be a function");
    }

    /**
    * Do the first work in the job list, resolve
    * the final result, if the length of the job list
    * if 0, return false
    * 
    * @callback callback
    * @return {Promise} resolve the final result,
    * reject on error
    */
    async doFirst(callback = (res, err) => {}) {
        if (this.job_list.length <= 0) {
            return false;
        }
        
        let current = this.job_list[0];
        let res = null;
        let err = null;
        return new Promise(async (resolve, reject) => {
            try {
                res = await current.job(...current.args);
                resolve(res);
            }
            catch(error) {
                err = error;
                reject(error);
            }
            finally {
                if (typeof callback === "function") {
                    callback(res, err);
                }
            }
        });
    }

    /**
    * Do all works in the job list, resolve
    * the final result, if the length of the job list
    * if 0, return false
    * No stop when error occurs, alternatively the 
    * onError callback function will be called
    * 
    * @callback onFinish the callback function when all works are finished
    * @callback onError the callback function when error occurs
    * @return {Promise} resolve the final result,
    * reject on error
    */
    async do(onFinish = (res) => {}, onError = (func, err) => {}) {
        if (this.job_list.length <= 0) {
            return false;
        }

        let worker_res = {nSuccess : 0, successed: [], failed : []};
        let batch = [];

        try {
            while (this.job_list.length > 0) {
                for (let i = 0; i < this.maxBurst && i < this.job_list.length; i++) {
                    let current = this.job_list[i];
                    batch.push(new Promise((resolve, reject) => {
                        try {
                            resolve(current.job(...current.args));
                        }
                        catch(err) {
                            reject(err);
                        }
                    }));

                    if (this.delay > 0) {
                        await new Promise(resolve => {
                            setTimeout(() => {
                                resolve();
                            }, this.delay / this.maxBurst);
                        });
                    }
                }

                await Promise.allSettled(batch).then(res => {
                    for (let i = 0; i < batch.length; i++) {
                        if (res[i].status === "rejected") {
                            if (typeof onError === "function") {
                                onError(batch[i], res[i].reason);
                                worker_res.failed.push({function : batch[i], reason : res[i].reason});
                            }
                        } else {
                            worker_res.successed.push({function : batch[i], value : res[i].value});
                            worker_res.nSuccess ++;
                        }
                    }
                });
                
                this.job_list = this.job_list.slice(batch.length);
                batch = [];
            }
        }
        catch(err) {
            console.error(err);
        }

        if (typeof onFinish === "function") {
            onFinish(worker_res);
        }

        if (worker_res.failed.length > 0) this.emitter.emit("error", worker_res);
        else this.emitter.emit("success", worker_res);
    }

    /**
    * Remove the first job in the queue and return it
    * @return {Object} the first job
    */
    firstDone() {
        return this.job_list.shift();
    }

    /**
    * Remove all jobs in the queue
    */
    clearQueue() {
        this.job_list = [];
    }

    /**
    * Return the number of queue
    * @return {Number} size of current queue
    */
    jobRemain() {
        return this.job_list.length;
    }
}