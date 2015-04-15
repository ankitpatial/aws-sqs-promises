var Queue = require('../index');

var jobQueue = new Queue({name: 'test1', useIAMRole: true});

jobQueue
    .receiveMessage()
    .then(function (msgs) {
        if (!msgs || msgs.length === 0) {
            return console.log('No message found in queue');
        }
        console.log('Got ' + msgs.length + 'message(s)');
    })
    .catch(function (err) {
        console.log('** ' + err);
    });