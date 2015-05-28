'use strict';
var AWS = require('aws-sdk'),
    Q = require('q'),
    assert = require('assert');

var scriptName = '[aws-sqs-promises] ';

var logger = {
    log: function (msg) {
        console.log(scriptName, msg);
    },
    error: function (msg, err) {
        console.error(scriptName, 'Error', msg, err || '');
    }
};

/***
 * AWS Simple Queue
 * @param options : {
 * name: <require>,
 * useIAMRole: <optional>
 * accessKeyId: "<required if useIAMRole = false>",
 * secretAccessKey: "<required if useIAMRole = false>",
 * region: "<default: us-east-1>",
 * apiVersion: <default: '2012-11-05',
 * maxMessages: <default: 10>>}
 * @constructor
 */
function SimpleQueue(options) {
    options = options || {};

    assert(options.name, '[aws-sqs-promises] option "name" is not assigned');

    if (!options.useIAMRole) {
        assert(options.accessKeyId, '[aws-sqs-promises] option "accessKeyId" is not assigned');
        assert(options.secretAccessKey, '[aws-sqs-promises] option "secretAccessKey" is not assigned');
    }

    options.maxMessages = options.maxMessages || 10;

    if (options.maxMessages < 0 || options.maxMessages > 10) {
        logger.log('Queue options.maxMessages is out of range, setting default value 10');
        options.maxMessages = 10;
    }

    this.name = options.name;
    this.maxMessages = options.maxMessages;
    this.queueUrl = "";
    this.waitTimeSeconds = 10;


    if (options.useIAMRole) {
        logger.log('Use IAMRole');
        this.client = new AWS.SQS({
            region: options.region || "us-east-1",
            apiVersion: options.apiVersion || '2012-11-05'
        });
    } else {
        this.client = new AWS.SQS({
            accessKeyId: options.accessKeyId,
            secretAccessKey: options.secretAccessKey,
            region: options.region || "us-east-1",
            apiVersion: options.apiVersion || '2012-11-05'
        });
    }

    this._getUrlState = {
        count: 0,
        isBusy: false,
        waitQueue: []
    };
}

module.exports = SimpleQueue;

SimpleQueue.prototype.getQueueUrl = function () {
    var deferred = Q.defer(),
        self = this,
        handleRes = function (err, data) {
            if (err) {
                var errMsg = 'Code: ' + (err.code || 'N/A' ) + '. Message: ' + (err.message || err);
                logger.error(errMsg);
                self._getUrlState.waitQueue.forEach(function (df) {
                    df.reject(err);
                });

            } else {
                self.queueUrl = data.QueueUrl;
                self._getUrlState.waitQueue.forEach(function (df) {
                    df.resolve(self.queueUrl);
                });
            }
        };

    if (!self.queueUrl) {

        // put current promise to wait queue
        self._getUrlState.waitQueue.push(deferred);

        // we don't have queue url, fetch it
        if (!self._getUrlState.isBusy) {
            self._getUrlState.isBusy = true;
            self._getUrlState.count += 1;
            self.client.getQueueUrl({QueueName: self.name}, handleRes);
        }

    } else { // we already have queue url, send it.
        deferred.resolve(self.queueUrl);
    }

    return deferred.promise;
};

SimpleQueue.prototype.getQueueAttributes = function () {

    var self = this,
        sqs = self.client;

    return Q.Promise(function (resolve, reject) {

        self.getQueueUrl()
            .then(function (queueUrl) {

                var params = {
                    QueueUrl: queueUrl,
                    AttributeNames: [
                        'MessageRetentionPeriod | ApproximateNumberOfMessages | ApproximateNumberOfMessagesNotVisible | QueueArn | ApproximateNumberOfMessagesDelayed | DelaySeconds | ReceiveMessageWaitTimeSeconds'
                    ]
                };

                sqs.getQueueAttributes(params, function (err, data) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
            })
            .catch(reject);
    });
};

SimpleQueue.prototype.sendMessage = function (msgData, delaySeconds) {
    var self = this,
        sqs = self.client;

    return Q.Promise(function (resolve, reject) {
        self.getQueueUrl()
            .then(function (queueUrl) {
                var params = {
                    QueueUrl: queueUrl,
                    MessageBody: JSON.stringify(msgData)
                };

                if (delaySeconds) {
                    params.DelaySeconds = delaySeconds;
                }

                sqs.sendMessage(params, function (err, data) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
            })
            .catch(reject);
    });
};

SimpleQueue.prototype.receiveMessage = function () {
    var self = this,
        sqs = self.client;

    return Q.Promise(function (resolve, reject) {
        console.time(scriptName + 'receiveMessage');
        self.getQueueUrl()
            .then(function (queueUrl) {
                var params = {
                    QueueUrl: queueUrl,
                    MaxNumberOfMessages: self.maxMessages,
                    WaitTimeSeconds: self.waitTimeSeconds
                };

                sqs.receiveMessage(params, function (err, data) {
                    if (err) {
                        reject(err);
                    } else {
                        console.time(scriptName + 'receiveMessage');
                        resolve(data.Messages);
                    }
                });
            })
            .catch(reject);
    });
};

var removeMsg = function (receiptHandle) {
    var self = this,
        sqs = self.client;

    return Q.Promise(function (resolve, reject) {
        self.getQueueUrl()
            .then(function (queueUrl) {
                var params = {
                    QueueUrl: queueUrl,
                    ReceiptHandle: receiptHandle
                };

                sqs.deleteMessage(params, function (err, data) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
            })
            .catch(reject);
    });
};

SimpleQueue.prototype.removeMessage = removeMsg;

SimpleQueue.prototype.deleteMessage = removeMsg;