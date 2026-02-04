//
// Function used to run workflow. This function will be used by ProcessManager object
//
const path = require('path');
const { exec, spawn } = require('child_process');
const fs = require('fs');

runJob = function (jobObject) {

    // base script
    let script = `${global.pythonPath} "./src/TurboPutative-2.0-built/TPWrapper.py"`;

    // job folder path
    let jobFolder = path.join(__dirname, '../../public/jobs', jobObject.jobID);

    // tmTable
    let tmTable = jobObject.tmTableName == "" ? jobObject.tmTableName : `-tm "${jobObject.tmTableName}"`;

    // build full command
    //let fullCommand = `${script} -wd "${jobFolder}" -wf ${jobObject.modules} -i "${jobObject.msTableName}" ${tmTable}`;

    //console.log(`** Executing workflow: ${fullCommand}`);

    // execute workflow
    global.processManager.running.push(jobObject);


    const params = [
        "./src/TurboPutative-2.0-built/TPWrapper.py",
        `--workdir=${jobFolder}`,
        `--workflow=${jobObject.modules}`,
        `--infile=${jobObject.msTableName}`
    ]

    jobObject.tmTableName != "" && params.push(`--tmfile=${jobObject.tmTableName}`);

    console.log(`** ${global.pythonPath} ${params.join(' ')}`);

    const process = spawn(
        global.pythonPath,
        params,
        { encoding: 'urf-8' }
    );

    process.stdout.on('data', data => fs.appendFileSync(
        path.join(jobFolder, 'log.info'),
        `stdout: ${data}`)
    );

    process.stderr.on('data', data => fs.appendFileSync(
        path.join(jobFolder, 'log.info'),
        `stderr: ${data}`)
    );

    process.on('close', code => {
        if (code == 0) {
            console.log(`Finished workflow execution: ${jobObject.jobID}`);
            
        } else {
            // If error.log was not created, the error is uncontrolled
            if (!fs.existsSync(path.join(jobFolder, 'error.log')))
                fs.writeFileSync(path.join(jobFolder, 'error.log'), '{"code": "999", "msg": "An unrecognized error occurred during workflow execution"}');
        }

        global.processManager.completed(jobObject.jobID);
    })

    return;
}

// Export function
module.exports = runJob