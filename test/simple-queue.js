// test/string.js
var expect  = require('chai').expect,
    SQS     = require('../lib/simple-queue'),
    AWS     = require('aws-sdk'),
    sinon   = require('sinon');

describe('SimpleQueue', function () {
    describe('_getQueueUrl()', function () {
        it('must be call aws more than once in objects life', function (done) {

            var sqs = new SQS({ name: 'my-queue', accessKeyId: 'abc', secretAccessKey: 'xyz' }),
                data= {QueueUrl: 'http://my-queue.aws.amazon.com'};

            sinon.stub(sqs.client, 'getQueueUrl').yields(null, data);

            sqs._getQueueUrl()
                .then(function (url) { done(); })
                .catch(done);

        });
    });
});