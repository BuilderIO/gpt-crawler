#!/bin/bash

# copy the config when starting the container
cp /home/data/config.ts /home/gpt-crawler/

# start the crawler
cd /home/gpt-crawler && npm start

# Print message after crawling and exit
echo "Crawling complete.."
exit