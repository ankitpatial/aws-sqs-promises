'use strict';
var AWS = require('aws-sdk'),
    Q = require('q'),
    assert = require('assert');

var scriptName = process.pid + ' - [aws-sqs-promises] ';

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
    this.requestTimeOut = 13;


    if (options.useIAMRole) {
        logger.log(this.name + ' use IAMRole');
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

    this.getQueueUrl();
}

module.exports = SimpleQueue;

SimpleQueue.prototype.getQueueUrl = function () {
    var self = this;
    return Q.Promise(function (resolve, reject) {

        if (self.queueUrl) {
            return resolve(self.queueUrl);
        }

        self.client.getQueueUrl({QueueName: self.name}, function (err, data) {
            if (err) {
                var errMsg = 'Code: ' + (err.code || 'N/A' ) + '. Message: ' + (err.message || err);
                logger.error(errMsg);
                return reject(errMsg);
            }
            self.queueUrl = data.QueueUrl;
            resolve(self.queueUrl);
        });
    });
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