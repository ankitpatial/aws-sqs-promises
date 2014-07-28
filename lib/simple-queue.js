var AWS     = require('aws-sdk'),
    Q       = require('q'),
    logger  = require('./logger');

module.exports = SimpleQueue;

/***
 * AWS Simple Queue
 * @param options : {name: <require>, accessKeyId: "<required>", secretAccessKey: "<required>", region: "<default: us-east-1>", apiVersion: <default: '2012-11-05', maxMessages: <default: 10>>}
 * @constructor
 */
function SimpleQueue(options) {
    if(!options || !options.name  || !options.accessKeyId || !options.secretAccessKey) {
        logger.warn('One of required queue option is missing');
        throw  "SQS Client requires queueName, accessKeyId and secretAccessKey. One of required option is missing"
    }

    options.maxMessages = options.maxMessages || 10;
    if (options.maxMessages < 0 || options.maxMessages > 10) {
        logger.warn('Queue options.maxMessages is out of range, setting default value 10');
        options.maxMessages = 10;
    }

    this.waitTimeSeconds = 10;

    this.name           = options.name;
    this.maxMessages    = options.maxMessages;
    this.queueUrl       = "";
    this.client         =  new AWS.SQS({
        accessKeyId     : options.accessKeyId,
        secretAccessKey : options.secretAccessKey,
        region          : options.region || "us-east-1",
        apiVersion      : options.apiVersion || '2012-11-05'
    });

    this._getUrlState        = {
        count: 0,
        isBusy          : false,
        waitQueue       : []
    }
}

SimpleQueue.prototype._getQueueUrl = function () {
    logger.debug('In _getQueueUrl()');
    var deferred    = Q.defer(),
        self        = this,
        handleRes   = function(err, data) {
            if (err) {
                logger.error('Error fetching QueueUrl', err);
                self._getUrlState.waitQueue.forEach(function(df) {
                    df.reject(err);
                })

            } else {
                logger.debug('Successfully got QueueUrl');
                self.queueUrl = data.QueueUrl;
                self._getUrlState.waitQueue.forEach(function(df) {
                    df.resolve(self.queueUrl);
                })
            }
        };

    if (!self.queueUrl) {

        // put current promise to wait queue
        self._getUrlState.waitQueue.push(deferred);

        // we don't have queue url, fetch it
        if (!self._getUrlState.isBusy) {
            self._getUrlState.isBusy = true;
            self._getUrlState.count +=1;
            self.client.getQueueUrl({ QueueName: self.name }, handleRes);
        }

    } else { // we already have queue url, send it.
        logger.debug('Queue url is already present, returned it');
        deferred.resolve(self.queueUrl);
    }

    return deferred.promise;
}

SimpleQueue.prototype.getQueueAttributes = function () {
    logger.debug('In getQueueAttributes()');

    var self        = this,
        deferred    = Q.defer(),
        sqs         = self.client;

    self._getQueueUrl()
        .then(function (queueUrl) {

            var params = {
                QueueUrl: queueUrl,
                AttributeNames: [
                    'MessageRetentionPeriod | ApproximateNumberOfMessages | ApproximateNumberOfMessagesNotVisible | QueueArn | ApproximateNumberOfMessagesDelayed | DelaySeconds | ReceiveMessageWaitTimeSeconds',
                ]
            };

            sqs.getQueueAttributes(params, function(err, data) {
                if (err) {
                    logger.error('error on getQueueAttributes response', err);
                    deferred.reject(err);
                }  else {
                    logger.debug('got getQueueAttributes response');
                    deferred.resolve(data);
                }
            });
        })
        .catch(function (err) {
           deferred.reject(err);
        });

    return deferred.promise;
}

SimpleQueue.prototype.sendMessage = function (msgData) {
    logger.debug('In sendMessage()');

    var deferred    = Q.defer(),
        self        = this,
        sqs         = self.client;

    self._getQueueUrl()
        .then(function (queueUrl) {
            var params = {
                QueueUrl        : queueUrl,
                MessageBody     : JSON.stringify(msgData)
            }

            sqs.sendMessage(params, function (err, data) {
                if (err) {
                    logger.error('sendMessage() :', err);
                    deferred.reject(err);
                } else {
                    logger.debug('saved message successfully');
                    deferred.resolve(data);
                }
            });
        })
        .catch(function (err) {
            deferred.reject(err);
        });

    return deferred.promise;
}

SimpleQueue.prototype.receiveMessage = function () {
    logger.debug('In receiveMessage()');

    var deferred    = Q.defer(),
        self        = this,
        sqs         = self.client;

    self._getQueueUrl()
        .then(function (queueUrl) {
            var params = {
                QueueUrl            : queueUrl,
                MaxNumberOfMessages : self.maxMessages,
                WaitTimeSeconds     : self.waitTimeSeconds
            }

            sqs.receiveMessage(params, function (err, data) {
                if (err) {
                    logger.error('receiveMessage :', err);
                    deferred.reject(err);
                } else {
                    logger.debug('Got %s message(s)', data.Messages ? data.Messages.length : 0);
                    deferred.resolve(data.Messages);
                }
            });
        })
        .catch(function (err) {
            deferred.reject(err);
        });

    return deferred.promise;
}

SimpleQueue.prototype.deleteMessage = function (receiptHandle) {
    logger.debug('In deleteMessage()');

    var deferred    = Q.defer(),
        self        = this,
        sqs         = self.client;

    self._getQueueUrl()
        .then(function (queueUrl) {
            var params = {
                QueueUrl      : queueUrl,
                ReceiptHandle : receiptHandle
            }

            sqs.deleteMessage(params, function (err, data) {
                if (err) {
                    logger.error('deleteMessage :', err);
                    deferred.reject(err);
                } else {
                    deferred.resolve();
                }
            });
        })
        .catch(function (err) {
            deferred.reject(err);
        });

    return deferred.promise;
}