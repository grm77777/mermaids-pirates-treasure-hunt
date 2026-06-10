#!/usr/bin/env python3
"""
Seed script for DynamoDB `Clues` table.

Usage:
  - Configure AWS credentials (recommended): `aws configure` or set env vars `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`.
  - Install dependency: `pip install boto3`

Run against real AWS:
  python seed.py --table Clues --seed seed.json

Run against DynamoDB Local (must be running on http://localhost:8000):
  python seed.py --table Clues --seed seed.json --local
"""

import argparse
import json
import os
import sys
import boto3
from botocore.exceptions import ClientError, EndpointConnectionError


def load_seed(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def get_dynamodb_resource(region, use_local):
    kwargs = {}
    if region:
        kwargs['region_name'] = region
    if use_local:
        kwargs['endpoint_url'] = 'http://localhost:8000'
    return boto3.resource('dynamodb', **kwargs)


def ensure_table(dynamodb, table_name):
    table = dynamodb.Table(table_name)
    try:
        table.load()
        print(f"Found table: {table_name}")
        return table
    except EndpointConnectionError:
        print(
            "Could not reach DynamoDB Local at http://localhost:8000. "
            "Start DynamoDB Local first, or rerun without --local to use AWS."
        )
        sys.exit(1)
    except ClientError as e:
        print(f"Error accessing table '{table_name}': {e}")
        sys.exit(1)


def seed_table(table, items):
    count = 0
    with table.batch_writer() as batch:
        for item in items:
            # DynamoDB expects native Python types (str, list, None) and boto3 will convert them
            batch.put_item(Item=item)
            count += 1
    print(f"Seeded {count} items into table {table.name}")


def main():
    parser = argparse.ArgumentParser(description='Seed DynamoDB Clues table from JSON file')
    parser.add_argument('--table', default='Clues', help='DynamoDB table name (default: Clues)')
    parser.add_argument('--seed', default='seed.json', help='Path to seed JSON file (default: seed.json)')
    parser.add_argument('--region', default=os.environ.get('AWS_DEFAULT_REGION', 'us-east-1'), help='AWS region (default: us-east-1)')
    parser.add_argument('--local', action='store_true', help='Use DynamoDB Local at http://localhost:8000')
    args = parser.parse_args()

    if not os.path.exists(args.seed):
        print(f"Seed file not found: {args.seed}")
        sys.exit(1)

    items = load_seed(args.seed)
    dynamodb = get_dynamodb_resource(args.region, args.local)
    table = ensure_table(dynamodb, args.table)
    seed_table(table, items)


if __name__ == '__main__':
    main()
