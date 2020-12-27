export class QueueWorker {
    /** 
    * Provide queue function in Promise
    * @param {Number} maxBurst the max worker number
    */
    constructor(maxBurst = 1) {
        this.job_list = [];
        this.maxBurst = maxBurst;
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
   async do(onFinish = (res, err) => {}, onError = (func, err) => {}) {
        if (this.job_list.length <= 0) {
            return false;
        }

        let res = null;
        let err = null;
        let batch = [];

        try {
            while (this.job_list.length > 0) {
                for (let i = 0; i < this.maxBurst && i < this.job_list.length; i++) {
                    let current = this.job_list[i];
                    batch.push(new Promise((resolve, reject) => {
                        resolve(current.job(...current.args));
                    }));
                }

                await Promise.allSettled(batch).then(res => {
                    for (let i = 0; i < batch.length; i++) {
                        if (res[i].status === "rejected") {
                            if (typeof callback === "function") {
                                callback(batch[i], res[i].reason);
                            }
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
            onFinish(res, err);
        }
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