#!/bin/bash

# Check if there is a Docker image named "crawler"
if ! sudo docker images | grep -w 'crawler' > /dev/null; then
    echo "Docker repository 'crawler' not found. Building the image..."
    # Build the Docker image with the name 'crawler'
    sudo docker build -t crawler .
else
    echo "Docker image already built."
fi

# Ensure that init.sh script is executable
sudo chmod +x ./data/init.sh

# Starting docker, mount docker.sock to work with docker-in-docker function, mount data directory for input/output from container
sudo docker run --rm -it -v /var/run/docker.sock:/var/run/docker.sock -v ./data:/home/data crawler bash -c "/home/data/init.sh"
