#!/usr/bin/env bash

if [[ -z $HWEBS_CLIENT_DYNAMODB_SEED ]]; then
	sleep 3 && aws dynamodb create-table --cli-input-json file://dynamodb-table-definition.json --endpoint-url http://dynamodb-local:8000 --region us-east-1
else
	echo "Not seeding dynamodb table"
fi
