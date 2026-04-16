FROM node:22-bookworm

# Install git
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json ./

# Install EVERY dependency required to build, including peer deps, 
# from the public registry only.
RUN npm install --registry=https://registry.npmjs.org --no-package-lock --legacy-peer-deps && \
    npm install react@^19.1.1 react-dom@^19.1.1 --registry=https://registry.npmjs.org --no-package-lock --legacy-peer-deps

# Ensure binaries are in the path
ENV PATH /app/node_modules/.bin:$PATH

# Copy source code
COPY . .

# Default command to build the production assets
CMD ["npm", "run", "build"]
