#!/usr/bin/env bash

DOCKER_FILE=$1
CONTAINER_NAME=$HWEBS_DYNAMODB_CONTAINER_NAME

# TODO detect if container exists but is not running

if [ $( docker ps -a | grep $CONTAINER_NAME | wc -l ) -gt 0 ]; then
	docker container rm -f $CONTAINER_NAME
fi

docker-compose -f $DOCKER_FILE up -d

