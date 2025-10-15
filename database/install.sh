#! /usr/bin/bash

ROOT=`pwd`

source .env

rm -rf dist

yarn

yarn build

cp package.json dist

cd $ROOT/dist

rm -rf __tests__
rm -rf migrations
rm -rf seeders
