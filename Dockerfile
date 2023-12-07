# Use an official Node.js runtime as the base image
FROM node:18-slim

# Create and set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the rest of the application source code to the container
COPY . .

# Expose the port that the Express app will run on (typically 3000)
EXPOSE 5000

# Define the command to start your Express app
CMD ["node", "index.js", "local"]
