AWS SQS with promises
=======
Its a promise based wrappers around the aws-sdk -> SQS.
For now very limited function are wrapped(i wrapped the one i needed often, feel free to extend this library).

### Available method list (all methods will return a promise)
    - getQueueAttributes()
    - sendMessage(jsonOrStringData)
    - receiveMessage()
    - deleteMessage(receiptHandle)
    
### Code Sample
```
var SQS     = require('aws-sqs-promises'),
    options = {
        name            : 'my-queue-name',          // required
        useIAMRole      : true                      // optional
        accessKeyId     : 'aws-key',                // required if useIAMRole = false 
        secretAccessKey : 'aws-secret-access-key',  // required if useIAMRole = false
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
 Change list.

#### 0.1.5
- added receive request timeout for 13 seconds`

#### 0.1.4
- code refactoring

#### 0.1.1
- added new params delaySeconds
 ```
 myQueue.sendMessage(jsonOrStringData, delaySeconds)
 ```
#### 0.1.0
- moved method getQueueUrl from internal to public.
- jslint
- bumped version from 0.0.4, i think its be in good state now.
#### 0.0.4
- Add new option.useIAMRole(boolean) for production use , it will make use of EC2 instance IAM Role, if EC2 instance is not using role then it will fall back to shared credentials file (~/.aws/credentials)
if is not configured then it will check for environment variables.
Here is documentation explaining it [http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html] 
- Upgraded packages.
- Removed unwanted packages and incomplete test cases.
#### 0.0.3
- bumped version
#### 0.0.2
- fix, not to call getQueueUrl multiple times if consumed in a loop. Internal functionality fix to avoid extra calls to aws, for same purpose. 
    
#### 0.0.1
- initial code commit.