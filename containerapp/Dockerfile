FROM ubuntu:jammy

# Install Git
RUN apt-get update && \
    apt-get install sudo -y && \
    apt-get install git -y

# Install Docker
RUN apt-get install ca-certificates curl gnupg -y && \
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y

# Install Nodejs v20 npm
RUN sudo apt-get update && \
    sudo apt-get install -y ca-certificates curl gnupg && \
    sudo mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg 

RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list && \
    sudo apt-get update && \
    sudo apt-get install nodejs -y

# Install gpt-crawler
RUN cd /home && git clone https://github.com/builderio/gpt-crawler && cd gpt-crawler && \
    npm i && \
    npx playwright install && \
    npx playwright install-deps

# Directory to mount in the docker container to get the output.json data
RUN cd /home && mkdir data


WORKDIR /home