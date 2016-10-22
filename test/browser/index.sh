#!/bin/bash

CUR_DIR=$(cd `dirname $0`;pwd);

cd $CUR_DIR

# build

../../node_modules/.bin/webpack

# copy library

cp ../../node_modules/mocha/mocha.js ./
cp ../../node_modules/chai/chai.js ./

# launch server
../../node_modules/.bin/webpack-dev-server
