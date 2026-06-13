param(
  [Parameter(Mandatory = $true)]
  [string]$BucketName,

  [Parameter(Mandatory = $false)]
  [string]$DistributionId,

  [Parameter(Mandatory = $false)]
  [string]$Region = $env:AWS_DEFAULT_REGION
)

$ErrorActionPreference = 'Stop'

if (-not $Region) {
  $Region = 'us-east-1'
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dist = Join-Path $root 'dist'

if (Test-Path $dist) {
  Remove-Item $dist -Recurse -Force
}

New-Item -ItemType Directory -Path $dist | Out-Null

Copy-Item (Join-Path $root 'src/index.html') $dist
Copy-Item (Join-Path $root 'src/style.css') $dist
Copy-Item (Join-Path $root 'src/script.js') $dist

Write-Host "Uploading site files to s3://$BucketName ..."
aws s3 sync $dist "s3://$BucketName" --delete --region $Region --cache-control "public,max-age=300"

Write-Host "Refreshing index.html cache policy ..."
aws s3 cp (Join-Path $dist 'index.html') "s3://$BucketName/index.html" --region $Region --cache-control "no-cache,no-store,must-revalidate" --content-type "text/html; charset=utf-8"

if ($DistributionId) {
  $invalidationPath = @('/clue*', '/index.html', '/script.js', '/style.css')
  Write-Host "Creating CloudFront invalidation for distribution $DistributionId ..."
  aws cloudfront create-invalidation --distribution-id $DistributionId --paths $invalidationPath
}

Write-Host 'Deployment complete.'
Write-Host "Bucket: s3://$BucketName"
if ($DistributionId) {
  Write-Host "CloudFront distribution: $DistributionId"
}
