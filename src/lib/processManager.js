//
// Object containing information related with RUNNING and WAITING processes
//
const path = require ('path');
const runJob = require (path.join(__dirname, '../routes/lib/runJob.js'));

/*
jobObject:
{
    IP: string,
    jobID: string,
    modules: string
    msTableName: string,
    tmTableName: string
}
*/

var processManager = {

    MAX_RUNNING_PROCESS: 8, // Maximum number of running processes simultaneously

    n_running: 0, // number of process that are being run

    running: [], // array with objects that are running
    waiting: [], // array with objects that are waiting

    client_IP_NProccess: {}, // object associating client IP with number of its waiting process
    leadingIP: "", // IP of the client with maximum number of waiting process
    leadingNProcess: 0, // Number of waiting process of the leadingClient
    MAX_WAITING_PROCESS: 10, // Maximum number of waiting process for IP

    addProcess: function (jobObject) {

        // Add job to waiting list
        console.log (`** Adding new process to WAITING: ${jobObject.jobID}`);
        
        // Update IP --> NProcess object
        if (this.client_IP_NProccess[jobObject.IP] === undefined)
            this.client_IP_NProccess[jobObject.IP] = 1;
        else
            this.client_IP_NProccess[jobObject.IP]++;

        // Check (and update) if IP is the new leading
        this.checkLeading(jobObject.IP);

        // Locate waiting process considering leading IP. (Just before the next leading IP)
        let index = 0;
        let tmp = 0; // number of leading IPs found
        let found = false // it will be false if IP is the leading IP or if it has the same WP as the leading IP
        for (let i=0; i<this.waiting.length; i++)
        {
            index = i;
            if (this.waiting[i].IP == this.leadingIP) tmp++; // Sum 1 to tmp when you find leading IP
            if (tmp == this.client_IP_NProccess[jobObject.IP]+1) {
                found = true; 
                break;
            }
        }
        
        // If not found, it must be added at the end. If found, add in the given index
        found ? this.waiting.splice(index, 0, jobObject) : this.waiting.push(jobObject);

        // Run job
        this.launch();
        return;
    },

    completed: function (jobID_completed) {
        // Remove from running the process that is completed (using jobID)
        for (let i=0; i<this.running.length; i++)
        {
            if (this.running[i].jobID == jobID_completed) 
            {
                console.log (`** RUNNING process finished: ${jobID_completed}`);
                this.running.splice(i, 1); 
                this.n_running--;
                this.launch();
                return;
            }
        }
    },

    launch: function () {
        // Run waiting process (if any)
        if (this.waiting.length == 0) return; // there is not waiting process
        if (this.n_running == this.MAX_RUNNING_PROCESS) return; // maximum number of processes are being run
        
        console.log (`** Move process from WAITING to RUNNING: ${this.waiting[0].jobID}`);
        // console.log(this);

        // Update leading and IP nProcess
        this.client_IP_NProccess[this.waiting[0].IP]--;
        if (this.leadingIP == this.waiting[0].IP) this.findLeading();

        // run waiting process
        runJob(this.waiting[0]);
        this.waiting.splice(0,1);
        this.n_running++;
        return;
    },

    status: function (jobID_status) {
        // Get status (RUNNING/WAITING) of a job

        console.log('** Process Manager:');
        console.log(this);
        
        let status = 'UNKNOWN';

        // check if running
        this.running.forEach(element => {
            if (jobID_status == element.jobID) status = 'RUNNING';
        });

        // check if waiting
        this.waiting.forEach(element => {
            if (jobID_status == element.jobID) status = 'WAITING';
        });

        return status;
    },
    
    IPexceed: function (IP) {
        // Return true if IP equals maximum number of allowed waiting process
        if (this.client_IP_NProccess[IP] === undefined) return false;
        if (this.client_IP_NProccess[IP] >= this.MAX_WAITING_PROCESS) return true;
        return false;
    },

    checkLeading: function (IP) {
        // Check if IP is the new leading IP
        
        if (this.client_IP_NProccess[IP] > this.leadingNProcess) {
            this.leadingNProcess = this.client_IP_NProccess[IP];
            this.leadingIP = IP;
            return true;
        }

        return false;
    },

    findLeading: function () {
        // Find new leadings after a reduction of the leading...
        this.leadingNProcess = 0;
        this.leadingIP = "";

        for (let [IP, NProcess] of Object.entries(this.client_IP_NProccess))
        {
            if (NProcess > this.leadingNProcess)
            {
                this.leadingNProcess = NProcess;
                this.leadingIP = IP;
            }
        }

        return;
    }

}

// Export object
module.exports = processManager;