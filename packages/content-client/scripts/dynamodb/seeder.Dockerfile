FROM amazon/aws-cli:latest
COPY dynamodb-table-definition.json dynamodb-table-definition.json
COPY .env .env
COPY scripts/dynamodb/seed-database.sh seed-database.sh

ENTRYPOINT ["bash", "seed-database.sh"]

#ENTRYPOINT ["bash", "-c", "sleep 3 && aws dynamodb create-table --cli-input-json file://dynamodb-table-definition.json --endpoint-url http://dynamodb-local:8000 --region us-east-1"]

#ENTRYPOINT ["bash", "-c", "cat dynamodb-table-definition.json"]
