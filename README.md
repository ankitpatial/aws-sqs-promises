AWS SQS with promises
=======
Its a promise based wrappers around the aws-sdk -> SQS.
For now very limited function are wrapped(i wrapped the one i needed often, feel free to extend this library).

### Available method list
    - getQueueAttributes()
    - sendMessage(jsonOrStringData)
    - receiveMessage()
    - deleteMessage(receiptHandle)
    
### Code Sample
```
var SQS     = require('aws-sqs-promises'),
    options = {
        name            : 'my-queue-name',          // required
        accessKeyId     : 'aws-key',                // required
        secretAccessKey : 'aws-secret-access-key',  // required
        region          : 'us-west-2',              // optional, default is 'us-east-1'
        apiVersion      : '2012-11-05',             // optional, default is '2012-11-05'  
        maxMessages     : 5,                        // optional, default is '10', it must be between 1-10, passing out of range will set it to default
    };
    
var myQueue =  new SQS(options);

myQueue
    .receiveMessage()
    .then(function (messageArray) {
        // check out aws-sdk documentation for more detail. http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/frames.html
        // msg: {MessageId: '', ReceiptHandle: '', MD5OfBody: '', Body: ''}
        
        
        // business logic
        
    )
    .catch(function (err) {
        // got some error
    )
    
```


### Change set
 Change list timeline.
#### 0.0.2
- fix, not to call getQueueUrl multiple times if consumed in a loop. Internal functionality fix to avoid extra calls to aws, for same purpose. 
    
#### 0.0.1
- initial code commit.