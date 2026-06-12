# Milestone 2: Backend API Deployment Guide

This guide walks through deploying the Lambda function and API Gateway endpoint for the scavenger hunt backend.

---

## Step 1: Seed the DynamoDB Table

First, ensure your `Clues` table exists and contains the seed data.

### Create the DynamoDB Table (if not already created)

In the AWS Management Console:
1. Go to **DynamoDB** → **Tables** → **Create table**
2. **Table name:** `Clues`
3. **Partition key:** `id` (String)
4. **Billing mode:** Pay-per-request (easier for testing)
5. Click **Create table**

### Seed the Table

Once the table is created:

```bash
# Install boto3 (if not already installed)
pip install boto3

# Run the seed script against AWS
python seed.py --table Clues --seed seed.json

# Or, to test locally with DynamoDB Local:
# python seed.py --table Clues --seed seed.json --local
```

Verify in the AWS Console that all 5 clues are in the table.

---

## Step 2: Create an IAM Role for Lambda

Lambda needs permission to read from the DynamoDB table.

### Step 1: Create the Policy First

1. Go to **IAM** → **Policies** → **Create policy**
2. Choose **JSON** tab
3. Paste:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "dynamodb:GetItem"
         ],
         "Resource": "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/Clues"
       }
     ]
   }
   ```
4. Replace `REGION` and `ACCOUNT_ID` with your values (e.g., `us-east-1`, `123456789012`)
5. Click **Next**
6. **Policy name:** `scavenger-hunt-dynamodb-read`
7. Click **Create policy**

### Step 2: Create the Role and Attach the Policy

1. Go to **IAM** → **Roles** → **Create role**
2. **Trusted entity type:** AWS service
3. **Service:** Lambda
4. Click **Next**
5. In "Add permissions", search for `scavenger-hunt-dynamodb-read`
6. Check the box next to it
7. Click **Next**
8. **Role name:** `Mermaids-And-Pirates-Role`
9. Click **Create role**
10. Copy the **Role ARN** (you'll need it in Step 3)

---

## Step 3: Create the Lambda Function

### Via AWS Console:

1. Go to **Lambda** → **Functions** → **Create function**
2. **Function name:** `scavenger-hunt-answer-validator`
3. **Runtime:** Node.js 20.x
4. **Architecture:** x86_64
5. **Execution role:** Choose the role from Step 2 (`Mermaids-And-Pirates-Role`)
6. Click **Create function**

### Deploy the Code:

1. Copy the contents of `lambda/index.js` to the Lambda editor
2. Click **Deploy**

### Set Environment Variable:

1. Scroll down to **Environment variables**
2. Click **Edit**
3. Add:
   - **Key:** `TABLE_NAME`
   - **Value:** `Clues`
4. Click **Save**

---

## Step 4: Configure API Gateway

### Create REST API:

1. Go to **API Gateway** → **APIs** → **Create API**
2. Choose **REST API** (not HTTP API)
3. Click **Build**
4. **API name:** `scavenger-hunt-api`
5. Click **Create API**

### Create POST /answer Resource:

1. In the API, click on the root resource `/`
2. Click **Create resource**
   - **Resource name:** `answer`
   - Path auto-fills: `/answer`
   - Click **Create resource**

3. Select `/answer` resource, click **Create method** → **POST**
4. **Integration type:** Lambda function
5. Turn on **Lambda proxy integration** if the console shows the option
6. **Lambda function:** `scavenger-hunt-answer-validator`
7. Click **Create method**

### How to verify proxy integration

- Open the `POST` method for `/answer`
- Select **Integration request**
- Confirm the integration type says **Lambda Proxy integration** or **Use Lambda Proxy integration = true**
- If it does not, edit the integration and enable proxy mode, then redeploy the API
- Proxy mode is what passes through the raw method, path, headers, and body to Lambda

### Enable CORS:

1. Select `/answer` resource
2. Click **Enable CORS** (or create OPTIONS method manually)
3. For a quick setup, click the CORS button and confirm defaults
4. This adds the necessary `Access-Control-*` headers

### Deploy the API:

1. Click **Deploy API**
2. **Stage:** Create new stage
   - **Stage name:** `prod`
3. Click **Deploy**
4. Copy the **Invoke URL** (e.g., `https://abc123.execute-api.us-east-1.amazonaws.com/prod`)

### Add GET /clue Resource (fetch a clue)

1. In the API, click **Create resource**
  - **Resource name:** `clue`
  - Path auto-fills: `/clue`
  - Click **Create resource**

2. Select `/clue` resource, click **Create method** → **GET**
  - **Integration type:** Lambda function
  - Turn on **Lambda proxy integration** if the console shows the option
  - **Lambda function:** `scavenger-hunt-answer-validator`
  - Click **Create method**

3. Configure Method Request to accept a query string parameter named `id` (optional but helpful for documentation).

4. Enable CORS on `/clue` (or create an OPTIONS method) so browsers can fetch clues from the frontend origin.

5. Deploy the API again to the `prod` stage.

You can test GET using:

```bash
curl "https://YOUR_API_URL/prod/clue?id=1"
```

Expected response (no correctAnswer field returned):

```json
{
  "id": "1",
  "question": "Welcome, matey! Where should you start the hunt?",
  "choices": ["Old Oak Tree", "Harbor Beacon", "Town Square", "Captain's House"],
  "nextClueId": "2"
}
```

---

## Step 5: Test the API

### Using curl or Postman:

If you're in Windows PowerShell, `curl` is usually an alias for `Invoke-WebRequest`, so the Unix-style flags shown below will fail. Use `Invoke-RestMethod` instead, or call `curl.exe` explicitly.

**Correct Answer:**
```bash
curl -X POST https://YOUR_API_URL/prod/answer \
  -H "Content-Type: application/json" \
  -d '{"clueId": "1", "answer": "Old Oak Tree"}'
```

PowerShell equivalent:

```powershell
$body = @'
{"clueId":"1","answer":"Old Oak Tree"}
'@

Invoke-RestMethod -Method Post `
  -Uri "https://YOUR_API_URL/prod/answer" `
  -ContentType "application/json" `
  -Body $body
```

Or, if you want to keep the same curl syntax on Windows, use `curl.exe`:

```powershell
curl.exe -X POST "https://YOUR_API_URL/prod/answer" -H "Content-Type: application/json" -d "{\"clueId\":\"1\",\"answer\":\"Old Oak Tree\"}"
```

Expected response:
```json
{
  "correct": true,
  "nextClueId": "2",
  "message": "Correct!"
}
```

**Incorrect Answer:**
```bash
curl -X POST https://YOUR_API_URL/prod/answer \
  -H "Content-Type: application/json" \
  -d '{"clueId": "1", "answer": "Wrong Answer"}'
```

PowerShell equivalent:

```powershell
$body = @'
{"clueId":"1","answer":"Wrong Answer"}
'@

Invoke-RestMethod -Method Post `
  -Uri "https://YOUR_API_URL/prod/answer" `
  -ContentType "application/json" `
  -Body $body
```

Expected response:
```json
{
  "correct": false,
  "nextClueId": null,
  "message": "Try again!"
}
```

---

## Step 6: Verify Acceptance Criteria

- [ ] API Gateway endpoint is live and accessible
- [ ] Lambda can query DynamoDB without permission errors
- [ ] POST `/answer` returns `{ correct, nextClueId, message }`
- [ ] CORS headers are present in responses
- [ ] Invalid inputs are handled gracefully (400, 404, 500 errors)
- [ ] Lambda logs show proper validation logic

---

## Troubleshooting

### `405 Method not allowed`
- This is not a CORS problem.
- CORS problems usually show up in the browser or on an `OPTIONS` preflight, not as a backend `405` on the POST request.
- If you see this error, check that API Gateway is actually sending the `POST` request to the Lambda you deployed.
- Confirm the Lambda code was redeployed after the method-handling change.
- If you are using a REST API, make sure `POST /answer` exists and is attached to the Lambda with proxy integration enabled.

### "Forbidden" or "Unable to assume role"
- Check that the IAM role has the correct DynamoDB permission
- Verify role name in Lambda execution role settings

### "ResourceNotFoundException" from DynamoDB
- Ensure `Clues` table exists and is active
- Verify `TABLE_NAME` environment variable matches table name
- Check that seed script ran successfully

### `is not authorized to perform: dynamodb:GetItem`
- This means the Lambda execution role does not have DynamoDB read permission yet.
- Open **IAM** → **Roles** → `Mermaids-And-Pirates-Role` (or the role shown in the error)
- Confirm a policy is attached that allows `dynamodb:GetItem` on `arn:aws:dynamodb:us-east-2:390132056352:table/Clues`
- If the policy exists but is not attached to the role, attach it and redeploy the Lambda
- If needed, create a policy with this JSON and attach it to the role:
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["dynamodb:GetItem"],
        "Resource": "arn:aws:dynamodb:us-east-2:390132056352:table/Clues"
      }
    ]
  }
  ```

### CORS errors in browser
- Verify API Gateway has CORS enabled on `/answer` resource
- Check that `Access-Control-Allow-Origin` header is present in response

### Lambda timeout
- Check CloudWatch logs for errors
- Verify DynamoDB table throughput (pay-per-request should be fine)

---

## Next Steps

Once Milestone 2 is complete and acceptance criteria verified:
- Move to **Milestone 3: Frontend** to build the UI that consumes this API
- Frontend will read `?id=N` from query string, fetch the clue, and POST answers to `/answer`

---

## Quick Reference

| Resource | Value |
|----------|-------|
| Lambda Function | `scavenger-hunt-answer-validator` |
| DynamoDB Table | `Clues` |
| API Endpoint | `/prod/answer` |
| IAM Role | `Mermaids-And-Pirates-Role` |
| Runtime | Node.js 20.x |
