#!/bin/bash
    echo $API_PATH 
    cd /code 
    git clone https://github.com/epam/miew.git 
    cd miew 
    git checkout v0.7.24 
    cd .. 
    mv miew/ ../ 
    npm install 
    npm install gulp -g 
    npm run archive -- --api-path="$SERVER:8082/v2" --miew-path=$MIEW_PATH 