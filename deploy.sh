#!/bin/zsh

DOCKER_BUILDKIT=1 docker-compose up --build --remove-orphans --detach
