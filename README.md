# Mermaids & Pirates Treasure Hunt

QR-based scavenger hunt for a mermaid-and-pirate themed birthday adventure.

## Local development

Start a simple static server from the project root:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/?id=1
```

The frontend will:
- Fetch clue data from the AWS API when `API_BASE_URL` is set in `index.html`
- Fall back to `seed/seed.json` for local testing
- Show the next QR location hint after a correct answer
- Copy the next QR URL in the form `https://<domain>/clue?id=N`

## Milestone 4: Hosting on AWS

Recommended hosting target:
- S3 for the static files
- CloudFront in front of S3
- A public domain or CloudFront domain for QR codes

### Hosting checklist

1. Create an S3 bucket for the site files.
2. Create a CloudFront Origin Access Control (OAC) for the bucket.
3. Add a bucket policy that allows CloudFront to read objects from the bucket.
4. Configure CloudFront to rewrite app routes like `/clue?id=N` to `index.html`.
5. Upload the static frontend assets:
	- `index.html`
	- `style.css`
	- `script.js`
6. Point `API_BASE_URL` in `index.html` at your deployed API Gateway stage.
7. Verify the browser flow:
	- Open `/clue?id=1`
	- Answer correctly
	- Confirm the hint and next QR URL appear
8. After the hosted URL is final, generate QR codes from the canonical `/clue?id=N` links.

### Step-by-step after the bucket exists

#### 1. Create the CloudFront distribution

1. Open **CloudFront** → **Create distribution**.
2. Set **Origin domain** to your S3 bucket.
   - Use the bucket's REST endpoint, not the S3 website endpoint.
3. Create or choose an **Origin access control (OAC)** so the bucket stays private.
4. Set **Default root object** to `index.html`.
5. Add a behavior for viewer requests so routes like `/clue?id=1` resolve to the frontend.

Use the viewer-request rewrite function in [cloudfront-function.js](cloudfront-function.js):

```javascript
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri === '/' || uri === '') {
    request.uri = '/index.html';
    return request;
  }

  if (uri.indexOf('.') === -1) {
    request.uri = '/index.html';
  }

  return request;
}
```

#### 2. Update the bucket policy

After CloudFront creates the distribution, attach a bucket policy like this to your S3 bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontRead",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

#### 3. Upload the frontend

Use the repo helper once you know the bucket name:

```powershell
.\deploy-frontend.ps1 -BucketName your-bucket-name -DistributionId E1234567890ABC -Region us-east-2
```

If you are still wiring CloudFront, omit `-DistributionId` for now and add it later.

#### 4. Test the hosted URL

Check these URLs in a browser:

```text
https://<your-domain>/
https://<your-domain>/clue?id=1
```

You should see the clue UI, be able to answer, and then get the hint for the next QR code.

### Recommended CloudFront behavior

- Default root object: `index.html`
- Route `/clue?id=N` to the same frontend entry point as `/`
- Cache `index.html` very lightly
- Cache `style.css` and `script.js` more aggressively than HTML

### What to verify after deploy

- `https://<domain>/clue?id=1` loads the frontend
- The API request to `GET /clue?id=1` succeeds
- A correct answer returns the next clue hint and next QR URL
- A phone can scan the QR and reach the same page outside your local machine

### QR URL convention

Use this format for every QR code:

```text
https://<your-domain>/clue?id=1
https://<your-domain>/clue?id=2
https://<your-domain>/clue?id=3
```

## Backend notes

The Lambda API exposes:
- `GET /clue?id=N` to fetch a clue from DynamoDB
- `POST /answer` to validate an answer and return the next clue plus hint

## Seed data

Seed the `Clues` table from the updated JSON file:

```bash
python seed/seed.py --table Clues --seed seed/seed.json
```
